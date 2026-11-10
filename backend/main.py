import os
import time
import shutil
from uuid import uuid4
from pathlib import Path
from io import BytesIO
import rawpy
from PIL import Image
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client
from culling_engine import (
    analyze_subject_quality,
    analyze_technical_quality,
    calculate_aesthetic_score,
    calculate_quality_scores,
    detect_defects,
    generate_culling_decisions,
    group_similar_photos,
)

print("LENSFLOW: Starting culling_engine imports...", flush=True)

from culling_engine import (
    analyze_subject_quality,
    analyze_technical_quality,
    calculate_aesthetic_score,
    calculate_quality_scores,
    detect_defects,
    generate_culling_decisions,
    group_similar_photos,
)

print("LENSFLOW: culling_engine imports completed!", flush=True)
# ============================================================
# Environment / Project Configuration
# ============================================================
# main.py is inside /backend, while .env is in the project root.
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
TEMP_DIR = BACKEND_DIR / "temp"
load_dotenv(ROOT_DIR / ".env")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Supabase environment variables are missing."
    )
# Base client used only to validate the access token.
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
)
# ============================================================
# FastAPI Application
# ============================================================
app = FastAPI(
    title="LensFlow API",
    description="Backend API for LensFlow photo culling.",
)
# ============================================================
# In-memory culling job progress
# ============================================================
# These jobs are temporary runtime state used by the local React
# frontend while a culling operation is running. They are not
# stored in Supabase and are cleared after they expire.
CULL_JOBS = {}
CULL_JOB_TTL_SECONDS = 60 * 60
def update_cull_job(job_id: str, **updates):
    """Update the in-memory status of a running culling job."""
    job = CULL_JOBS.get(job_id)
    if not job:
        return None
    job.update(updates)
    if "progress" in job:
        try:
            job["progress"] = max(0, min(100, int(job["progress"])))
        except (TypeError, ValueError):
            job["progress"] = 0
    if "total" in job:
        try:
            job["total"] = max(0, int(job["total"]))
        except (TypeError, ValueError):
            job["total"] = 0
    if "current" in job:
        try:
            current = max(0, int(job["current"]))
            total = job.get("total", 0)
            job["current"] = min(current, total) if total else current
        except (TypeError, ValueError):
            job["current"] = 0
    return job
def cleanup_old_cull_jobs():
    """Remove completed/failed culling jobs that are older than one hour."""
    now = time.time()
    expired_job_ids = []
    for job_id, job in list(CULL_JOBS.items()):
        finished_at = job.get("finished_at")
        if finished_at and now - finished_at > CULL_JOB_TTL_SECONDS:
            expired_job_ids.append(job_id)
    for job_id in expired_job_ids:
        CULL_JOBS.pop(job_id, None)
# Allow the local React/Vite frontend to call this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://lensflow.space",
        "https://www.lensflow.space",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ============================================================
# Request Models
# ============================================================
class CullRequest(BaseModel):
    """
    Request body sent by the React frontend when the user starts
    culling a selected folder.
    """
    folder_id: str
class ExportRequest(BaseModel):
    """
    Request body sent by the React frontend when the photographer
    exports the finalized photo selection.
    """
    folder_id: str
# ============================================================
# Helper Functions
# ============================================================
def get_authenticated_client(
    authorization: str | None,
    refresh_token: str | None,
):
    """
    Validates the Supabase session and creates a user-authenticated
    Supabase client.
    The authenticated client is required so both database RLS and
    Storage policies recognize the currently logged-in user.
    Returns:
        tuple: (authenticated_user, authenticated_supabase_client)
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization token",
        )
    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Missing refresh token",
        )
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization token",
        )
    auth_response = supabase.auth.get_user(token)
    if not auth_response.user:
        raise HTTPException(
            status_code=401,
            detail="Invalid Supabase session",
        )
    user_supabase: Client = create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
    )
    # Authenticate the whole Supabase client so both PostgREST
    # and Storage requests use the user's session.
    user_supabase.auth.set_session(
        token,
        refresh_token,
    )
    return auth_response.user, user_supabase
def get_folder_photos(
    user_supabase: Client,
    folder_id: str,
    user_id: str,
):
    """
    Retrieves the photos owned by the logged-in user from the selected
    folder.
    Returns:
        list[dict]: Photo records from the Supabase 'photos' table.
    """
    response = (
        user_supabase
        .table("photos")
        .select(
            """
            id,
            folder_id,
            user_id,
            file_name,
            storage_path,
            previewable,
            size_bytes
            """
        )
        .eq("folder_id", folder_id)
        .eq("user_id", user_id)
        .execute()
    )
    return response.data or []
def download_photo_to_temp(
    user_supabase: Client,
    photo: dict,
    temp_dir: Path = TEMP_DIR,
):
    """
    Downloads one photo from Supabase Storage into the temporary
    directory for the current culling run.
    The photo ID is included in the temporary filename to avoid
    collisions when different uploads have the same original filename.
    Returns:
        Path: Local path of the downloaded temporary image.
    """
    temp_dir.mkdir(parents=True, exist_ok=True)
    file_bytes = (
        user_supabase
        .storage
        .from_("photos")
        .download(photo["storage_path"])
    )
    original_name = Path(photo["file_name"])
    temp_name = (
        f"{photo['id']}_"
        f"{original_name.name}"
    )
    temp_path = temp_dir / temp_name
    temp_path.write_bytes(file_bytes)
    return temp_path
RAW_EXTENSIONS = {
    ".cr2",
    ".cr3",
    ".nef",
    ".arw",
    ".dng",
    ".raf",
    ".rw2",
    ".orf",
    ".pef",
    ".srw",
    ".raw",
}
def is_raw_file_name(file_name: str) -> bool:
    return Path(file_name).suffix.lower() in RAW_EXTENSIONS
def convert_raw_to_jpeg(
    raw_path: Path,
    temp_dir: Path,
) -> Path:
    """
    Decode a RAW camera file into a temporary JPEG that
    the LensFlow AI pipeline can analyze.
    """
    output_path = temp_dir / f"{raw_path.stem}_decoded.jpg"
    print(f"Converting RAW for culling: {raw_path.name}")
    with rawpy.imread(str(raw_path)) as raw:
        rgb_image = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=True,
            output_bps=8,
        )
    image = Image.fromarray(rgb_image).convert("RGB")
    print(
        f"RAW decoded dimensions: "
        f"{rgb_image.shape[1]} x {rgb_image.shape[0]}"
    )
    image.save(
        output_path,
        format="JPEG",
        quality=95,
    )
    if not output_path.exists():
        raise RuntimeError(
            f"Could not create temporary JPEG from RAW file: {raw_path.name}"
        )
    print(f"RAW converted successfully: {output_path.name}")
    return output_path
def prepare_culling_image(
    image_path: Path,
    temp_dir: Path,
) -> Path:
    """
    Return an image path that the AI pipeline can read.
    Normal images are returned unchanged.
    RAW images are decoded into a temporary JPEG.
    """
    if image_path.suffix.lower() not in RAW_EXTENSIONS:
        return image_path
    print(f"RAW image detected: {image_path.name}")
    return convert_raw_to_jpeg(
        image_path,
        temp_dir,
    )
def generate_raw_thumbnail(
    user_supabase: Client,
    photo: dict,
    user_id: str,
) -> str:
    """Decode a RAW photo and save a browser-friendly WebP preview."""
    file_name = photo["file_name"]
    storage_path = photo["storage_path"]
    photo_id = photo["id"]
    folder_id = photo["folder_id"]
    print(f"Generating RAW preview: {file_name}")
    raw_bytes = (
        user_supabase
        .storage
        .from_("photos")
        .download(storage_path)
    )
    temp_raw_path = TEMP_DIR / f"preview_{photo_id}_{Path(file_name).name}"
    temp_raw_path.parent.mkdir(parents=True, exist_ok=True)
    temp_raw_path.write_bytes(raw_bytes)
    try:
        with rawpy.imread(str(temp_raw_path)) as raw:
            rgb = raw.postprocess(
                use_camera_wb=True,
                no_auto_bright=True,
                output_bps=8,
            )
        image = Image.fromarray(rgb).convert("RGB")
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        image.save(
            buffer,
            format="WEBP",
            quality=82,
            method=4,
        )
        buffer.seek(0)
        thumb_path = f"{user_id}/{folder_id}/thumbs/{photo_id}.webp"
        user_supabase.storage.from_("photos").upload(
            thumb_path,
            buffer.getvalue(),
            {
                "content-type": "image/webp",
                "upsert": "true",
            },
        )
        user_supabase.table("photos").update(
            {"thumb_path": thumb_path}
        ).eq("id", photo_id).execute()
        print(f"RAW preview created: {thumb_path}")
        return thumb_path
    finally:
        try:
            if temp_raw_path.exists():
                temp_raw_path.unlink()
        except Exception as cleanup_error:
            print("RAW preview cleanup error:", repr(cleanup_error))
def analyze_photo(photo: dict, temp_path: Path):
    """
    Runs all per-photo LensFlow analysis stages except DINOv2 grouping.
    Stages included:
        1. OpenCV technical quality
        2. MediaPipe subject quality
        3. OpenCLIP + LAION aesthetic quality
        4. Absolute quality scoring
        5. Defect detection
    Returns:
        dict: Combined measurements and scores for one photo.
    """
    technical_result = analyze_technical_quality(
        temp_path
    )
        # ========================================================
    # DEBUG: Print the exact image representation and
    # technical metrics used by LensFlow AI.
    # ========================================================
    try:
        with Image.open(temp_path) as debug_image:
            debug_width, debug_height = debug_image.size
        print("\n" + "=" * 60)
        print("LENSFLOW TECHNICAL ANALYSIS DEBUG")
        print("=" * 60)
        print(f"Original file : {photo['file_name']}")
        print(f"Analyzed file : {temp_path.name}")
        print(f"Dimensions    : {debug_width} x {debug_height}")
        print(f"Sharpness     : {technical_result['sharpness']:.2f}")
        print(f"Brightness    : {technical_result['brightness']:.2f}")
        print(
            f"Dark pixels   : "
            f"{technical_result['dark_pixels_percent']:.2f}%"
        )
        print(
            f"Bright pixels : "
            f"{technical_result['bright_pixels_percent']:.2f}%"
        )
        print(f"Contrast      : {technical_result['contrast']:.2f}")
        print("=" * 60 + "\n")
    except Exception as debug_error:
        print(
            "TECHNICAL ANALYSIS DEBUG ERROR:",
            repr(debug_error)
        )
    subject_result = analyze_subject_quality(
        temp_path
    )
    aesthetic_score = calculate_aesthetic_score(
        temp_path
    )
    quality_scores = calculate_quality_scores(
        technical_result["sharpness"],
        subject_result["average_face_sharpness"],
        subject_result["maximum_blink_score"],
        aesthetic_score,
        technical_result["dark_pixels_percent"],
        technical_result["bright_pixels_percent"],
    )
    defects = detect_defects(
        subject_result["maximum_blink_score"],
        technical_result["bright_pixels_percent"],
        technical_result["dark_pixels_percent"],
        quality_scores["sharpness_score"],  # Still assess blur from sharpness alone
        technical_result["sharpness"],
        average_face_sharpness=subject_result["average_face_sharpness"],
    )
    return {
        "photo_id": photo["id"],
        "file_name": photo["file_name"],
        "storage_path": photo["storage_path"],
        # Used internally to match DINOv2 groups back to photos.
        "temp_path": str(temp_path),
        **technical_result,
        **subject_result,
        "aesthetic_score": aesthetic_score,
        **quality_scores,
        "defects": defects,
    }
def save_culling_results(
    user_supabase: Client,
    final_results: list,
):
    """
    Saves the latest LensFlow AI result for each photo.
    Existing results are updated using photo_id so repeated culling
    does not create duplicate rows.
    """
    rows = []
    for result in final_results:
        rows.append({
            "photo_id": result["photo_id"],
            "similarity_group": result.get("similarity_group"),
            "group_rank": result.get("group_rank"),
            "base_quality_score": result.get(
                "base_quality_score"
            ),
            "ai_decision": result.get(
                "lensflow_decision"
            ),
            "decision_reason": result.get(
                "decision_reason"
            ),
            "metrics": {
                "sharpness": result.get("sharpness"),
                "brightness": result.get("brightness"),
                "dark_pixels_percent": result.get(
                    "dark_pixels_percent"
                ),
                "bright_pixels_percent": result.get(
                    "bright_pixels_percent"
                ),
                "contrast": result.get("contrast"),
                "face_count": result.get("face_count"),
                "average_face_sharpness": result.get(
                    "average_face_sharpness"
                ),
                "minimum_face_sharpness": result.get(
                    "minimum_face_sharpness"
                ),
                "maximum_blink_score": result.get(
                    "maximum_blink_score"
                ),
                "blink_asymmetry": result.get(
                    "blink_asymmetry"
                ),
                "aesthetic_score": result.get(
                    "aesthetic_score"
                ),
                "technical_score": result.get(
                    "technical_score"
                ),
                "sharpness_score": result.get("sharpness_score"),
                "exposure_score": result.get("exposure_score"),
                "face_quality_score": result.get(
                    "face_quality_score"
                ),
                "eye_quality_score": result.get(
                    "eye_quality_score"
                ),
                "aesthetic_quality_score": result.get(
                    "aesthetic_quality_score"
                ),
                "defects": result.get("defects", []),
            },
        })
    if not rows:
        return
    (
        user_supabase
        .table("culling_results")
        .upsert(
            rows,
            on_conflict="photo_id",
        )
        .execute()
    )
def build_export_storage_path(
    storage_path: str,
    user_id: str,
    destination_folder_id: str,
) -> str:
    """
    Replace the folder ID portion of a LensFlow storage path
    while preserving the filename and any remaining path.
    Expected structure:
        user_id/folder_id/file.ext
    Example:
        user123/main-folder/IMG_001.CR2
        ->
        user123/culled-folder/IMG_001.CR2
    """
    parts = str(storage_path).strip("/").split("/")
    if len(parts) < 3:
        raise ValueError(
            f"Unexpected storage path format: {storage_path}"
        )
    if parts[0] != str(user_id):
        raise ValueError(
            f"Storage path does not belong to the authenticated user: "
            f"{storage_path}"
        )
    parts[1] = str(destination_folder_id)
    return "/".join(parts)
def copy_storage_object(
    user_supabase: Client,
    source_path: str,
    destination_path: str,
):
    """Copy one object inside the photos bucket without deleting the source."""
    if not source_path or source_path == destination_path:
        return
    user_supabase.storage.from_("photos").copy(
        source_path,
        destination_path,
    )
def remove_storage_objects(
    user_supabase: Client,
    storage_paths: list[str],
):
    """Remove a list of objects from the photos bucket during rollback."""
    if not storage_paths:
        return
    user_supabase.storage.from_("photos").remove(storage_paths)
# Routes
# ============================================================
@app.get("/")
def root():
    """Simple health check used to confirm that the API is running."""
    return {
        "status": "ok",
        "message": "LensFlow backend is running",
    }
def run_culling_job(
    job_id: str,
    folder_id: str,
    user_id: str,
    user_supabase: Client,
    photos: list,
):
    """Run the complete culling pipeline and update the job progress as it runs."""
    run_temp_dir = TEMP_DIR / f"cull_{uuid4().hex}"
    total = len(photos)
    try:
        print("CULL JOB STARTED:", job_id)
        update_cull_job(
            job_id,
            status="running",
            progress=2,
            current=0,
            total=total,
            file_name="",
            stage="Preparing photos...",
        )
        image_paths = []
        analysis_results = []
        # ----------------------------------------------------
        # 1. Download and analyze each photo
        # ----------------------------------------------------
        for index, photo in enumerate(photos, start=1):
            file_name = photo["file_name"]
            print(f"[{index}/{total}] Processing: {file_name}")
            # Per-photo analysis occupies roughly the first 80% of the
            # progress bar. The remaining stages are handled below.
            start_progress = round(((index - 1) / total) * 80)
            update_cull_job(
                job_id,
                progress=max(2, start_progress),
                current=index - 1,
                total=total,
                file_name=file_name,
                stage="Analyzing image quality...",
            )
            downloaded_path = download_photo_to_temp(
                user_supabase,
                photo,
                run_temp_dir,
            )
            # RAW files must be decoded before OpenCV/MediaPipe/OpenCLIP
            # can analyze them.
            if is_raw_file_name(file_name):
                update_cull_job(
                    job_id,
                    progress=max(2, start_progress),
                    current=index - 1,
                    total=total,
                    file_name=file_name,
                    stage="Converting RAW image...",
                )
            temp_path = prepare_culling_image(
                downloaded_path,
                run_temp_dir,
            )
            image_paths.append(temp_path)
            analysis_result = analyze_photo(
                photo,
                temp_path,
            )
            analysis_results.append(analysis_result)
            completed_progress = round((index / total) * 80)
            update_cull_job(
                job_id,
                progress=max(2, completed_progress),
                current=index,
                total=total,
                file_name=file_name,
                stage="Photo analysis complete.",
            )
            print("Per-photo analysis complete.")
        # ----------------------------------------------------
        # 2. DINOv2 similarity grouping
        # ----------------------------------------------------
        update_cull_job(
            job_id,
            progress=82,
            current=total,
            total=total,
            file_name="",
            stage="Comparing visually similar photos...",
        )
        print("Running DINOv2 similarity grouping...")
        similarity_result = group_similar_photos(
            image_paths
        )
        print(
            "Similarity groups:",
            len(similarity_result["groups"]),
        )
        print(
            "Independent photos:",
            len(similarity_result["independent"]),
        )
        update_cull_job(
            job_id,
            progress=90,
            stage="Similarity analysis complete.",
        )
        # ----------------------------------------------------
        # 3. Final LensFlow decision engine
        # ----------------------------------------------------
        update_cull_job(
            job_id,
            progress=92,
            stage="Generating culling recommendations...",
        )
        print("Generating LensFlow decisions...")
        final_results = generate_culling_decisions(
            analysis_results,
            similarity_result,
        )
        update_cull_job(
            job_id,
            progress=96,
            stage="Saving culling results...",
        )
        print("Saving culling results to Supabase...")
        save_culling_results(
            user_supabase,
            final_results,
        )
        print("Culling results saved.")
        # ----------------------------------------------------
        # 4. Prepare results for React
        # ----------------------------------------------------
        response_results = []
        for result in final_results:
            public_result = result.copy()
            public_result.pop("temp_path", None)
            response_results.append(public_result)
        print("Culling job completed:", job_id)
        import time
        update_cull_job(
            job_id,
            status="completed",
            progress=100,
            current=total,
            total=total,
            file_name="",
            stage="Culling complete.",
            folder_id=folder_id,
            results=response_results,
            finished_at=time.time(),
        )
    except Exception as error:
        import time
        print("CULL ERROR:", repr(error))
        update_cull_job(
            job_id,
            status="failed",
            stage="Culling failed.",
            error=str(error),
            finished_at=time.time(),
        )
    finally:
        try:
            if run_temp_dir.exists():
                shutil.rmtree(run_temp_dir, ignore_errors=True)
                print("Temporary culling files cleaned up.")
        except Exception as cleanup_error:
            print("TEMP CLEANUP ERROR:", repr(cleanup_error))
@app.post("/export")
def export_folder(
    request: ExportRequest,
    authorization: str | None = Header(default=None),
    x_refresh_token: str | None = Header(default=None),
):
    """
    Export the photographer's finalized selection from a Raw folder.
    Expected folder structure:
        Main/
            Raw/
                original photos...
            Culled/
                copies of starred photos...
    Rules:
        - The request folder_id must be the Raw folder.
        - Raw and Culled are sibling folders under the same Main folder.
        - Starred photos are COPIED to Culled.
        - Rejected photos remain in Raw and are not copied.
        - Unrated photos remain in Raw and are not copied.
        - Original Raw files, thumbnails, photo rows, and culling results are
          never moved or deleted by export.
        - Repeating export is safe: photos already copied to Culled are skipped.
    """
    try:
        # --------------------------------------------------------
        # 1. Authenticate
        # --------------------------------------------------------
        user, user_supabase = get_authenticated_client(
            authorization,
            x_refresh_token,
        )
        user_id = str(user.id)
        raw_folder_id = request.folder_id
        # --------------------------------------------------------
        # 2. Verify that the requested folder is the user's Raw folder
        # --------------------------------------------------------
        folder_response = (
            user_supabase
            .table("folders")
            .select("id, name, parent_id")
            .eq("id", raw_folder_id)
            .eq("user_id", user_id)
            .execute()
        )
        raw_folder = (folder_response.data or [None])[0]
        if not raw_folder:
            raise HTTPException(
                status_code=404,
                detail="Raw folder not found.",
            )
        if str(raw_folder.get("name", "")).strip().lower() != "raw":
            raise HTTPException(
                status_code=400,
                detail="Export must be started from a Raw folder.",
            )
        main_folder_id = raw_folder.get("parent_id")
        if not main_folder_id:
            raise HTTPException(
                status_code=400,
                detail="The Raw folder must be inside a main folder.",
            )
        # --------------------------------------------------------
        # 3. Verify the parent/main folder belongs to this user
        # --------------------------------------------------------
        main_response = (
            user_supabase
            .table("folders")
            .select("id, name, parent_id")
            .eq("id", main_folder_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not main_response.data:
            raise HTTPException(
                status_code=404,
                detail="Main folder not found.",
            )
        # --------------------------------------------------------
        # 4. Get all photos that are actually inside Raw
        # --------------------------------------------------------
        photo_response = (
            user_supabase
            .table("photos")
            .select(
                """
                id,
                folder_id,
                user_id,
                file_name,
                storage_path,
                thumb_path,
                previewable,
                size_bytes,
                rating
                """
            )
            .eq("folder_id", raw_folder_id)
            .eq("user_id", user_id)
            .execute()
        )
        photos = photo_response.data or []
        if not photos:
            return {
                "success": True,
                "folder_id": raw_folder_id,
                "main_folder_id": main_folder_id,
                "raw_folder_id": raw_folder_id,
                "culled_folder_id": None,
                "raw_count": 0,
                "culled_count": 0,
                "rejected_count": 0,
                "unrated_count": 0,
                "message": "There are no photos in the Raw folder to export.",
            }
        starred_photos = [
            photo for photo in photos
            if photo.get("rating") == "star"
        ]
        rejected_count = sum(
            1 for photo in photos if photo.get("rating") == "reject"
        )
        unrated_count = sum(
            1 for photo in photos
            if photo.get("rating") not in ("star", "reject")
        )
        if not starred_photos:
            raise HTTPException(
                status_code=400,
                detail="Star at least one photo before exporting to Culled.",
            )
        # --------------------------------------------------------
        # 5. Find or create Culled as a SIBLING of Raw
        # --------------------------------------------------------
        child_response = (
            user_supabase
            .table("folders")
            .select("id, name, parent_id")
            .eq("parent_id", main_folder_id)
            .eq("user_id", user_id)
            .execute()
        )
        children = child_response.data or []
        culled_folder = next(
            (
                folder
                for folder in children
                if str(folder.get("name", "")).strip().lower() == "culled"
            ),
            None,
        )
        if culled_folder:
            culled_folder_id = culled_folder["id"]
        else:
            insert_response = (
                user_supabase
                .table("folders")
                .insert(
                    {
                        "name": "Culled",
                        "user_id": user_id,
                        "parent_id": main_folder_id,
                    }
                )
                .select("id, name, parent_id")
                .execute()
            )
            if not insert_response.data:
                raise Exception("Failed to create the Culled folder.")
            culled_folder_id = insert_response.data[0]["id"]
        # --------------------------------------------------------
        # 6. Find existing Culled photo records for idempotency
        # --------------------------------------------------------
        existing_culled_response = (
            user_supabase
            .table("photos")
            .select("id, storage_path")
            .eq("folder_id", culled_folder_id)
            .eq("user_id", user_id)
            .execute()
        )
        existing_culled_paths = {
            row.get("storage_path")
            for row in (existing_culled_response.data or [])
            if row.get("storage_path")
        }
        copied_objects: list[str] = []
        inserted_photo_ids: list[str] = []
        exported_count = 0
        skipped_count = 0
        try:
            # ----------------------------------------------------
            # 7. Copy only starred photos from Raw -> Culled
            # ----------------------------------------------------
            for photo in starred_photos:
                old_storage_path = photo.get("storage_path")
                if not old_storage_path:
                    raise ValueError(
                        f"Photo {photo.get('id')} has no storage path."
                    )
                new_storage_path = build_export_storage_path(
                    old_storage_path,
                    user_id,
                    culled_folder_id,
                )
                # If this exact destination already exists, the photo was
                # exported previously. Do not create another copy.
                if new_storage_path in existing_culled_paths:
                    skipped_count += 1
                    continue
                # --------------------------------------------
                # Copy the original photo.
                # --------------------------------------------
                copy_storage_object(
                    user_supabase,
                    old_storage_path,
                    new_storage_path,
                )
                copied_objects.append(new_storage_path)
                # --------------------------------------------
                # Copy the generated thumbnail when present.
                # --------------------------------------------
                old_thumb_path = photo.get("thumb_path")
                new_thumb_path = None
                if old_thumb_path:
                    new_thumb_path = build_export_storage_path(
                        old_thumb_path,
                        user_id,
                        culled_folder_id,
                    )
                    copy_storage_object(
                        user_supabase,
                        old_thumb_path,
                        new_thumb_path,
                    )
                    copied_objects.append(new_thumb_path)
                # --------------------------------------------
                # Create a NEW photo record for the Culled copy.
                # The original Raw photo row remains untouched.
                # --------------------------------------------
                new_photo_data = {
                    "folder_id": culled_folder_id,
                    "user_id": user_id,
                    "file_name": photo["file_name"],
                    "storage_path": new_storage_path,
                    "thumb_path": new_thumb_path,
                    "size_bytes": photo.get("size_bytes"),
                    "previewable": photo.get("previewable", False),
                    "rating": "star",
                }
                insert_photo_response = (
                    user_supabase
                    .table("photos")
                    .insert(new_photo_data)
                    .select("id")
                    .execute()
                )
                if not insert_photo_response.data:
                    raise Exception(
                        f"Failed to create Culled photo record for "
                        f"{photo['file_name']}."
                    )
                inserted_photo_ids.append(insert_photo_response.data[0]["id"])
                existing_culled_paths.add(new_storage_path)
                exported_count += 1
        except Exception as export_error:
            print(
                "EXPORT FAILED — attempting rollback:",
                repr(export_error),
            )
            # --------------------------------------------
            # Roll back newly inserted Culled photo rows.
            # --------------------------------------------
            for photo_id in reversed(inserted_photo_ids):
                try:
                    (
                        user_supabase
                        .table("photos")
                        .delete()
                        .eq("id", photo_id)
                        .eq("user_id", user_id)
                        .execute()
                    )
                except Exception as rollback_db_error:
                    print(
                        "EXPORT DATABASE ROLLBACK ERROR:",
                        repr(rollback_db_error),
                    )
            # --------------------------------------------
            # Roll back only objects created by THIS export.
            # Raw originals are never touched.
            # --------------------------------------------
            for storage_path in reversed(copied_objects):
                try:
                    remove_storage_objects(
                        user_supabase,
                        [storage_path],
                    )
                except Exception as rollback_storage_error:
                    print(
                        "EXPORT STORAGE ROLLBACK ERROR:",
                        repr(rollback_storage_error),
                    )
            raise export_error
        # --------------------------------------------------------
        # 8. Return export summary
        # --------------------------------------------------------
        print(
            f"EXPORT COMPLETE: {exported_count} copied to Culled, "
            f"{skipped_count} already existed, "
            f"{rejected_count} rejected remain in Raw, "
            f"{unrated_count} unrated remain in Raw"
        )
        return {
            "success": True,
            "folder_id": raw_folder_id,
            "main_folder_id": main_folder_id,
            "raw_folder_id": raw_folder_id,
            "culled_folder_id": culled_folder_id,
            "raw_count": len(photos),
            "culled_count": exported_count,
            "already_exported_count": skipped_count,
            "rejected_count": rejected_count,
            "unrated_count": unrated_count,
            "message": (
                f"Export complete. {exported_count} photo(s) copied to Culled. "
                f"The original Raw collection remains untouched."
            ),
        }
    except HTTPException:
        raise
    except Exception as error:
        print("EXPORT ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error
@app.post("/generate-preview")
def generate_preview(
    request: dict,
    authorization: str | None = Header(default=None),
    x_refresh_token: str | None = Header(default=None),
):
    """Generate a browser-friendly preview for a RAW photo."""
    try:
        user, user_supabase = get_authenticated_client(
            authorization,
            x_refresh_token,
        )
        photo_id = request.get("photo_id")
        if not photo_id:
            raise HTTPException(
                status_code=400,
                detail="Missing photo_id",
            )
        response = (
            user_supabase
            .table("photos")
            .select(
                "id, user_id, folder_id, file_name, storage_path, thumb_path"
            )
            .eq("id", photo_id)
            .eq("user_id", user.id)
            .execute()
        )
        photo = (response.data or [None])[0]
        if not photo:
            raise HTTPException(
                status_code=404,
                detail="Photo not found",
            )
        if not is_raw_file_name(photo["file_name"]):
            raise HTTPException(
                status_code=400,
                detail="Photo is not a RAW image",
            )
        if photo.get("thumb_path"):
            return {
                "success": True,
                "photo_id": photo_id,
                "thumb_path": photo["thumb_path"],
                "message": "Preview already exists",
            }
        thumb_path = generate_raw_thumbnail(
            user_supabase,
            photo,
            user.id,
        )
        return {
            "success": True,
            "photo_id": photo_id,
            "thumb_path": thumb_path,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("RAW PREVIEW ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error
@app.post("/cull")
def cull(
    request: CullRequest,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
    x_refresh_token: str | None = Header(default=None),
):
    """
    Starts the LensFlow culling pipeline for one folder.
    The endpoint returns a job ID immediately. The React frontend polls
    /cull/progress/{job_id} so the UI can show real processing progress.
    """
    print("CULL ENDPOINT HIT")
    cleanup_old_cull_jobs()
    try:
        # ----------------------------------------------------
        # 1. Authenticate user
        # ----------------------------------------------------
        user, user_supabase = get_authenticated_client(
            authorization,
            x_refresh_token,
        )
        print("Authenticated user:", user.id)
        print("Received folder ID:", request.folder_id)
        # ----------------------------------------------------
        # 2. Retrieve photos from selected folder
        # ----------------------------------------------------
        photos = get_folder_photos(
            user_supabase,
            request.folder_id,
            user.id,
        )
        print(f"Found {len(photos)} photos")
        if not photos:
            return {
                "success": False,
                "folder_id": request.folder_id,
                "photo_count": 0,
                "message": "No photos found in this folder",
            }
        # ----------------------------------------------------
        # 3. Create a background culling job
        # ----------------------------------------------------
        job_id = uuid4().hex
        CULL_JOBS[job_id] = {
            "job_id": job_id,
            "user_id": user.id,
            "folder_id": request.folder_id,
            "status": "queued",
            "progress": 0,
            "current": 0,
            "total": len(photos),
            "file_name": "",
            "stage": "Starting LensFlow...",
            "error": None,
            "results": None,
            "finished_at": None,
        }
        background_tasks.add_task(
            run_culling_job,
            job_id,
            request.folder_id,
            user.id,
            user_supabase,
            photos,
        )
        return {
            "success": True,
            "job_id": job_id,
            "folder_id": request.folder_id,
            "photo_count": len(photos),
            "status": "started",
        }
    except HTTPException:
        raise
    except Exception as error:
        print("CULL START ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error
@app.get("/cull/progress/{job_id}")
def cull_progress(
    job_id: str,
    authorization: str | None = Header(default=None),
    x_refresh_token: str | None = Header(default=None),
):
    """Return the current progress/result of a LensFlow culling job."""
    job = CULL_JOBS.get(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Culling job not found or has expired.",
        )
    user, _ = get_authenticated_client(
        authorization,
        x_refresh_token,
    )
    if job.get("user_id") != user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this culling job.",
        )
    return {
        "success": True,
        "job_id": job["job_id"],
        "folder_id": job["folder_id"],
        "status": job["status"],
        "progress": job["progress"],
        "current": job["current"],
        "total": job["total"],
        "file_name": job["file_name"],
        "stage": job["stage"],
        "error": job["error"],
        "results": job["results"],
    }
