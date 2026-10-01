import os
import shutil
from uuid import uuid4
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
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

# Allow the local React/Vite frontend to call this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
    )

    defects = detect_defects(
        subject_result["maximum_blink_score"],
        technical_result["bright_pixels_percent"],
        technical_result["dark_pixels_percent"],
        quality_scores["technical_score"],
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

# ============================================================
# Routes
# ============================================================

@app.get("/")
def root():
    """Simple health check used to confirm that the API is running."""

    return {
        "status": "ok",
        "message": "LensFlow backend is running",
    }


@app.post("/cull")
def cull(
    request: CullRequest,
    authorization: str | None = Header(default=None),
    x_refresh_token: str | None = Header(default=None),
):
    """
    Runs the complete LensFlow culling pipeline for one folder.

    Overall flow:
        1. Authenticate the user.
        2. Retrieve the selected folder's photos.
        3. Download temporary image copies.
        4. Analyze each photo individually.
        5. Group visually similar photos using DINOv2.
        6. Generate KEEP / REVIEW / REJECT recommendations.
        7. Return the results to the React frontend.
    """

    print("CULL ENDPOINT HIT")

    # Create a separate temporary folder for this culling run.
    run_temp_dir = TEMP_DIR / f"cull_{uuid4().hex}"

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
        # 3. Download and analyze each photo
        # ----------------------------------------------------

        image_paths = []
        analysis_results = []

        for index, photo in enumerate(photos, start=1):
            print(
                f"[{index}/{len(photos)}] "
                f"Processing: {photo['file_name']}"
            )

            temp_path = download_photo_to_temp(
                user_supabase,
                photo,
                run_temp_dir,
            )

            image_paths.append(temp_path)

            analysis_result = analyze_photo(
                photo,
                temp_path,
            )

            analysis_results.append(
                analysis_result
            )

            print("Per-photo analysis complete.")

        # ----------------------------------------------------
        # 4. DINOv2 similarity grouping
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # 5. Final LensFlow decision engine
        # ----------------------------------------------------

        print("Generating LensFlow decisions...")

        final_results = generate_culling_decisions(
            analysis_results,
            similarity_result,
        )

        print("Saving culling results to Supabase...")

        save_culling_results(
            user_supabase,
            final_results,
        )

        print("Culling results saved.")

        print("Final LensFlow decisions:")

        for result in final_results:
            score = result["base_quality_score"]

            print(
                result["file_name"],
                "|",
                result["similarity_group"],
                "| Score:",
                round(score, 3)
                if score is not None
                else None,
                "|",
                result["lensflow_decision"],
                "|",
                result["decision_reason"],
            )

        # ----------------------------------------------------
        # 6. Remove backend-only fields before sending to React
        # ----------------------------------------------------

        response_results = []

        for result in final_results:
            public_result = result.copy()
            public_result.pop("temp_path", None)
            response_results.append(public_result)

        # ----------------------------------------------------
        # 7. Return completed results
        # ----------------------------------------------------

        return {
            "success": True,
            "folder_id": request.folder_id,
            "photo_count": len(photos),
            "results": response_results,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("CULL ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    finally:

        # Always remove temporary files from this culling run.
        # This also runs if the culling process fails.
        try:
            if run_temp_dir.exists():
                shutil.rmtree(run_temp_dir, ignore_errors=True)
                print("Temporary culling files cleaned up.")
        except Exception as cleanup_error:
            print("TEMP CLEANUP ERROR:", repr(cleanup_error))
