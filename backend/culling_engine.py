from collections import defaultdict
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np
import open_clip
import torch
import torch.nn as nn
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from PIL import Image
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
from torchvision import transforms
# ============================================================
# Configuration
# ============================================================
CONFIG = {
    # Similarity grouping
    "similarity_threshold": 0.90,
    # OpenCV exposure measurements
    "dark_pixel_threshold": 30,
    "bright_pixel_threshold": 225,
    # Technical score subweights: sharpness is still dominant.
    "technical_weight_sharpness": 0.80,
    "technical_weight_exposure": 0.20,
    # Percentage of extreme pixels where exposure gets the full penalty.
    # These initial values must be calibrated on representative photos.
    "dark_pixels_full_penalty": 70.0,
    "bright_pixels_full_penalty": 70.0,
    # Absolute quality calibration
    "sharpness_low": 30.0,
    "sharpness_high": 75.0,
    "face_sharpness_low": 10.0,
    "face_sharpness_high": 60.0,
    # Starting point; calibrate against representative clear/blurry face photos.
    "face_sharpness_review_threshold": 12.0,
    "aesthetic_low": 2.0,
    "aesthetic_high": 5.0,
    # Base quality weights
    "weight_technical": 0.35,
    "weight_face": 0.25,
    "weight_eyes": 0.25,
    "weight_aesthetic": 0.15,
    # Defect thresholds
    "partial_blink": 0.35,
    "probable_closed_eyes": 0.50,
    "strong_closed_eyes": 0.70,
    "overexposed_pixels": 30.0,
    "underexposed_pixels": 20.0,
    "very_low_sharpness": 0.15,
    "low_sharpness": 0.40,
    # Decision thresholds
    "keep_margin": 0.08,
    "reject_margin": 0.20,
    "low_quality": 0.40,
}
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
FACE_MODEL_PATH = MODELS_DIR / "blaze_face_short_range.tflite"
LANDMARKER_MODEL_PATH = MODELS_DIR / "face_landmarker.task"
AESTHETIC_MODEL_PATH = MODELS_DIR / "sa_0_4_vit_l_14_linear.pth"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# ============================================================
# Model Initialization
# ============================================================
print("LensFlow device:", DEVICE)
print("START: loading MediaPipe models")
face_detector = vision.FaceDetector.create_from_options(
    vision.FaceDetectorOptions(
        base_options=python.BaseOptions(
            model_asset_path=str(FACE_MODEL_PATH)
        ),
        running_mode=vision.RunningMode.IMAGE,
        # Lower confidence improves recall for soft/blurry faces.
        # False positives are filtered by multi-pass box merging below.
        min_detection_confidence=0.30,
    )
)
face_landmarker = vision.FaceLandmarker.create_from_options(
    vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(
            model_asset_path=str(LANDMARKER_MODEL_PATH)
        ),
        running_mode=vision.RunningMode.IMAGE,
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=False,
        num_faces=10,
    )
)
print("DONE: MediaPipe models")
print("START: loading OpenCLIP")
clip_model, _, clip_preprocess = open_clip.create_model_and_transforms(
    "ViT-L-14",
    pretrained="laion2b_s32b_b82k",
)
clip_model = clip_model.to(DEVICE)
clip_model.eval()
aesthetic_model = nn.Linear(768, 1)
aesthetic_model.load_state_dict(
    torch.load(
        AESTHETIC_MODEL_PATH,
        map_location=DEVICE,
        weights_only=True,
    )
)
aesthetic_model = aesthetic_model.to(DEVICE)
aesthetic_model.eval()
print("DONE: OpenCLIP + LAION aesthetic predictor")
print("START: loading DINOv2")
dino_model = torch.hub.load(
    "facebookresearch/dinov2",
    "dinov2_vits14",
)
dino_model = dino_model.to(DEVICE)
dino_model.eval()
print("DONE: DINOv2")
print("Embedding dimension:", dino_model.embed_dim)
dino_transform = transforms.Compose(
    [
        transforms.Resize(
            256,
            interpolation=transforms.InterpolationMode.BICUBIC,
        ),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)
# ============================================================
# Technical Quality — OpenCV
# ============================================================
def analyze_technical_quality(image_path):
    """
    Measures basic technical image quality using OpenCV.
    Returns:
        dict: Global sharpness, brightness, dark-pixel percentage,
        bright-pixel percentage, and contrast.
    """
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return {
        "sharpness": float(
            cv2.Laplacian(gray, cv2.CV_64F).var()
        ),
        "brightness": float(np.mean(gray)),
        "dark_pixels_percent": float(
            np.mean(gray < CONFIG["dark_pixel_threshold"]) * 100
        ),
        "bright_pixels_percent": float(
            np.mean(gray > CONFIG["bright_pixel_threshold"]) * 100
        ),
        "contrast": float(np.std(gray)),
    }
# ============================================================
# Subject Quality — MediaPipe + OpenCV
# ============================================================
def detect_faces(image_path):
    """Detect faces with several image variants to improve recall on blur.

    MediaPipe BlazeFace can miss soft, small, or low-contrast faces when it
    sees only the original image. This function tries the original, an
    upscaled version, and a lightly sharpened/contrast-enhanced version.
    All boxes are mapped back to original-image coordinates and overlapping
    detections are merged. Preprocessing can improve detection, but cannot
    recover facial detail that is completely absent from the image.

    Returns:
        list[dict]: Original-image bounding boxes and detection confidence.
    """
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    height, width = image.shape[:2]
    rgb_original = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    variants = [(rgb_original, 1.0)]

    # Upscaling can help the detector find faces that occupy few pixels.
    scale = 1.5
    upscaled = cv2.resize(
        rgb_original, None, fx=scale, fy=scale,
        interpolation=cv2.INTER_CUBIC,
    )
    variants.append((upscaled, scale))

    # Gentle unsharp masking plus local contrast enhancement can help
    # detection on soft or low-contrast faces; sharpness is measured on the
    # untouched original image later, not on this enhanced copy.
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l_channel)
    enhanced = cv2.cvtColor(
        cv2.merge((enhanced_l, a_channel, b_channel)),
        cv2.COLOR_LAB2BGR,
    )
    blurred = cv2.GaussianBlur(enhanced, (0, 0), 1.0)
    enhanced = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)
    variants.append((cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB), 1.0))

    candidates = []
    for rgb_image, scale_factor in variants:
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=np.ascontiguousarray(rgb_image),
        )
        result = face_detector.detect(mp_image)
        for detection in (result.detections or []):
            box = detection.bounding_box
            x = int(round(box.origin_x / scale_factor))
            y = int(round(box.origin_y / scale_factor))
            w = int(round(box.width / scale_factor))
            h = int(round(box.height / scale_factor))
            x1 = max(0, min(width - 1, x))
            y1 = max(0, min(height - 1, y))
            x2 = max(x1 + 1, min(width, x + w))
            y2 = max(y1 + 1, min(height, y + h))
            candidates.append({
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1,
                "confidence": float(detection.categories[0].score),
            })

    # Merge duplicate boxes from the different passes using IoU. Keep the
    # highest-confidence box for each overlapping face.
    candidates.sort(key=lambda item: item["confidence"], reverse=True)
    merged = []
    for candidate in candidates:
        cx1, cy1 = candidate["x"], candidate["y"]
        cx2 = cx1 + candidate["width"]
        cy2 = cy1 + candidate["height"]
        duplicate = False
        for kept in merged:
            kx1, ky1 = kept["x"], kept["y"]
            kx2 = kx1 + kept["width"]
            ky2 = ky1 + kept["height"]
            ix1, iy1 = max(cx1, kx1), max(cy1, ky1)
            ix2, iy2 = min(cx2, kx2), min(cy2, ky2)
            intersection = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            union = (
                candidate["width"] * candidate["height"]
                + kept["width"] * kept["height"] - intersection
            )
            iou = intersection / union if union else 0.0
            if iou >= 0.45:
                duplicate = True
                break
        if not duplicate:
            merged.append(candidate)

    return merged
def calculate_face_sharpness(image, face):
    """
    Measures sharpness only inside a detected face region.
    This helps LensFlow judge whether the main subject is in focus
    instead of relying only on the sharpness of the whole image.
    """
    x = face["x"]
    y = face["y"]
    width = face["width"]
    height = face["height"]
    image_height, image_width = image.shape[:2]
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(image_width, x + width)
    y2 = min(image_height, y + height)
    face_crop = image[y1:y2, x1:x2]
    if face_crop.size == 0:
        return None
    gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    return float(
        cv2.Laplacian(gray_face, cv2.CV_64F).var()
    )
def analyze_eye_state(image_path):
    """
    Estimates whether detected subjects may be blinking.
    MediaPipe face blendshapes provide left-eye and right-eye blink
    scores. Higher values indicate a stronger closed-eye signal.
    Returns:
        dict: Blink-related measurements for the detected faces.
    """
    mp_image = mp.Image.create_from_file(str(image_path))
    result = face_landmarker.detect(mp_image)
    if not result.face_blendshapes:
        return {
            "eye_face_count": 0,
            "left_blink_score": None,
            "right_blink_score": None,
            "average_blink_score": None,
            "maximum_blink_score": None,
            "blink_asymmetry": None,
        }
    left_scores = []
    right_scores = []
    average_scores = []
    maximum_scores = []
    asymmetry_scores = []
    for face_blendshapes in result.face_blendshapes:
        blendshapes = {
            item.category_name: item.score
            for item in face_blendshapes
        }
        left = float(blendshapes.get("eyeBlinkLeft", 0.0))
        right = float(blendshapes.get("eyeBlinkRight", 0.0))
        left_scores.append(left)
        right_scores.append(right)
        average_scores.append((left + right) / 2)
        maximum_scores.append(max(left, right))
        asymmetry_scores.append(abs(left - right))
    return {
        "eye_face_count": len(result.face_blendshapes),
        "left_blink_score": max(left_scores),
        "right_blink_score": max(right_scores),
        "average_blink_score": max(average_scores),
        "maximum_blink_score": max(maximum_scores),
        "blink_asymmetry": max(asymmetry_scores),
    }
def analyze_subject_quality(image_path):
    """
    Combines face detection, face sharpness, and blink analysis.
    Returns:
        dict: Face count, face sharpness statistics, and eye-state metrics.
    """
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Unable to load image: {image_path}")
    detected_faces = detect_faces(image_path)
    face_sharpness_values = [
        value
        for face in detected_faces
        if (
            value := calculate_face_sharpness(image, face)
        ) is not None
    ]
    return {
        "face_count": len(detected_faces),
        "average_face_sharpness": (
            float(np.mean(face_sharpness_values))
            if face_sharpness_values
            else None
        ),
        "minimum_face_sharpness": (
            float(np.min(face_sharpness_values))
            if face_sharpness_values
            else None
        ),
        **analyze_eye_state(image_path),
    }
# ============================================================
# Aesthetic Quality — OpenCLIP + LAION
# ============================================================
def calculate_aesthetic_score(image_path):
    """
    Calculates an aesthetic-quality score using OpenCLIP + LAION.
    OpenCLIP produces a normalized image embedding, which is passed
    into the LAION aesthetic predictor to estimate visual appeal.
    """
    image = Image.open(image_path).convert("RGB")
    image_tensor = (
        clip_preprocess(image)
        .unsqueeze(0)
        .to(DEVICE)
    )
    with torch.no_grad():
        embedding = clip_model.encode_image(image_tensor)
        embedding = embedding / embedding.norm(
            dim=-1,
            keepdim=True,
        )
        score = aesthetic_model(
            embedding.float()
        ).item()
    return float(score)
# ============================================================
# Similarity Grouping — DINOv2
# ============================================================
def get_dino_embedding(image_path):
    """
    Converts an image into a normalized DINOv2 visual embedding.
    The embedding represents visual appearance and is later used
    to compare photos through cosine similarity.
    """
    image = Image.open(image_path).convert("RGB")
    image_tensor = (
        dino_transform(image)
        .unsqueeze(0)
        .to(DEVICE)
    )
    with torch.no_grad():
        embedding = dino_model(image_tensor)
    return torch.nn.functional.normalize(
        embedding,
        p=2,
        dim=1,
    ).cpu()
def group_similar_photos(
    image_paths,
    similarity_threshold=None,
):
    """
    Groups visually similar photos using DINOv2 embeddings.
    Process:
        1. Generate one DINOv2 embedding per photo.
        2. Compute cosine similarity between all photos.
        3. Convert similarity to distance.
        4. Apply complete-linkage agglomerative clustering.
    Args:
        image_paths: Paths of photos to analyze.
        similarity_threshold: Minimum similarity required for grouping.
    Returns:
        dict: Similar groups, independent photos, and similarity matrix.
    """
    similarity_threshold = (
        CONFIG["similarity_threshold"]
        if similarity_threshold is None
        else similarity_threshold
    )
    if not image_paths:
        return {
            "groups": [],
            "independent": [],
            "similarity_matrix": [],
        }
    if len(image_paths) == 1:
        return {
            "groups": [],
            "independent": [str(image_paths[0])],
            "similarity_matrix": [[1.0]],
        }
    embeddings = []
    for index, path in enumerate(image_paths, start=1):
        print(f"[{index}/{len(image_paths)}] DINOv2: {path}")
        embeddings.append(get_dino_embedding(path))
    embedding_matrix = torch.cat(embeddings).numpy()
    similarity_matrix = cosine_similarity(embedding_matrix)
    cluster_model = AgglomerativeClustering(
        n_clusters=None,
        metric="precomputed",
        linkage="complete",
        distance_threshold=1 - similarity_threshold,
    )
    cluster_labels = cluster_model.fit_predict(
        1 - similarity_matrix
    )
    clusters = defaultdict(list)
    for path, label in zip(image_paths, cluster_labels):
        clusters[int(label)].append(str(path))
    similarity_groups = []
    independent_images = []
    for members in clusters.values():
        if len(members) >= 2:
            similarity_groups.append(members)
        else:
            independent_images.extend(members)
    return {
        "groups": similarity_groups,
        "independent": independent_images,
        "similarity_matrix": similarity_matrix.tolist(),
    }
# ============================================================
# Absolute Quality Scoring
# ============================================================
def linear_score(value, low, high):
    """
    Converts a raw measurement into a normalized score from 0 to 1
    using a fixed calibration range.
    Values below 'low' become 0 and values above 'high' become 1.
    """
    if value is None:
        return None
    if high <= low:
        raise ValueError("high must be greater than low")
    return float(
        np.clip(
            (value - low) / (high - low),
            0,
            1,
        )
    )
def score_sharpness(value):
    """Converts global image sharpness into a 0-to-1 sharpness score."""
    return linear_score(
        value,
        CONFIG["sharpness_low"],
        CONFIG["sharpness_high"],
    )
def score_exposure(dark_pixels_percent, bright_pixels_percent):
    """Return 0-to-1 exposure quality based on extreme-pixel percentages.

    The existing defect thresholds are treated as the points where an
    exposure penalty BEGINS. The full-penalty thresholds are adjustable.
    This is a heuristic, not a definitive measure of proper exposure.
    """
    if dark_pixels_percent is None or bright_pixels_percent is None:
        return None

    dark_penalty = linear_score(
        dark_pixels_percent,
        CONFIG["underexposed_pixels"],
        CONFIG["dark_pixels_full_penalty"],
    )
    bright_penalty = linear_score(
        bright_pixels_percent,
        CONFIG["overexposed_pixels"],
        CONFIG["bright_pixels_full_penalty"],
    )
    # Use the worse extreme to avoid double-penalizing mixed lighting.
    return float(1.0 - max(dark_penalty, bright_penalty))


def calculate_technical_score(sharpness_score, exposure_score):
    """Combine available sharpness and exposure quality components."""
    components = [
        (sharpness_score, CONFIG["technical_weight_sharpness"]),
        (exposure_score, CONFIG["technical_weight_exposure"]),
    ]
    available = [(value, weight) for value, weight in components
                 if value is not None]
    if not available:
        return None
    scores, weights = zip(*available)
    return float(np.average(scores, weights=weights))


def score_face_sharpness(value):
    """Converts average face sharpness into a 0-to-1 face-quality score."""
    return linear_score(
        value,
        CONFIG["face_sharpness_low"],
        CONFIG["face_sharpness_high"],
    )
def score_eye_quality(blink):
    """
    Converts the maximum blink score into an eye-quality score.
    Lower blink values are treated as better because they indicate
    that the subject's eyes are more likely open.
    """
    if blink is None:
        return None
    if blink <= 0.20:
        return 1.00
    if blink <= 0.35:
        return 0.80
    if blink <= 0.50:
        return 0.50
    if blink <= 0.65:
        return 0.25
    return 0.00
def score_aesthetic(value):
    """Converts the raw LAION aesthetic score into a 0-to-1 score."""
    return linear_score(
        value,
        CONFIG["aesthetic_low"],
        CONFIG["aesthetic_high"],
    )
def calculate_base_quality(
    technical_score,
    face_quality_score,
    eye_quality_score,
    aesthetic_quality_score,
):
    """
    Combines available quality components into one Base Quality Score.
    Missing components, such as face-related scores for a photo with
    no detected face, are excluded and the remaining weights are
    automatically rebalanced.
    """
    candidates = [
        (technical_score, CONFIG["weight_technical"]),
        (face_quality_score, CONFIG["weight_face"]),
        (eye_quality_score, CONFIG["weight_eyes"]),
        (aesthetic_quality_score, CONFIG["weight_aesthetic"]),
    ]
    available = [
        (value, weight)
        for value, weight in candidates
        if value is not None
    ]
    if not available:
        return None
    values, weights = zip(*available)
    return float(
        np.average(values, weights=weights)
    )
def calculate_quality_scores(
    sharpness,
    average_face_sharpness,
    maximum_blink_score,
    aesthetic_score,
    dark_pixels_percent,
    bright_pixels_percent,
):
    """
    Calculate sharpness and exposure separately, then combine them into
    technical quality. Face, eye, and aesthetic scoring are unchanged.
    """
    sharpness_score = score_sharpness(sharpness)
    exposure_score = score_exposure(
        dark_pixels_percent, bright_pixels_percent
    )
    technical_score = calculate_technical_score(
        sharpness_score, exposure_score
    )
    face_quality_score = score_face_sharpness(
        average_face_sharpness
    )
    eye_quality_score = score_eye_quality(
        maximum_blink_score
    )
    aesthetic_quality_score = score_aesthetic(
        aesthetic_score
    )
    return {
        "sharpness_score": sharpness_score,
        "exposure_score": exposure_score,
        "technical_score": technical_score,
        "face_quality_score": face_quality_score,
        "eye_quality_score": eye_quality_score,
        "aesthetic_quality_score": aesthetic_quality_score,
        "base_quality_score": calculate_base_quality(
            technical_score,
            face_quality_score,
            eye_quality_score,
            aesthetic_quality_score,
        ),
    }
# ============================================================
# Defect Analysis
# ============================================================
def detect_defects(
    maximum_blink_score,
    bright_pixels_percent,
    dark_pixels_percent,
    sharpness_score,
    sharpness=None,
    average_face_sharpness=None,
):
    """
    Detects specific quality concerns separately from the Base Quality Score.
    Possible issues include:
        - partial blink or closed eyes
        - overexposure
        - underexposure
        - low or very low sharpness
    Returns:
        list[dict]: Detected issues with type, severity, and message.
    """
    defects = []
    # Flag low face-region sharpness even if the rest of the image is sharp.
    if (
        average_face_sharpness is not None
        and average_face_sharpness <= CONFIG["face_sharpness_review_threshold"]
    ):
        defects.append({
            "type": "face_blur",
            "severity": "strong",
            "message": "Blurry face",
        })
    if maximum_blink_score is not None:
        if maximum_blink_score >= CONFIG["strong_closed_eyes"]:
            defects.append({
                "type": "closed_eyes",
                "severity": "strong",
                "message": "Strong closed-eye indication",
            })
        elif maximum_blink_score >= CONFIG["probable_closed_eyes"]:
            defects.append({
                "type": "closed_eyes",
                "severity": "moderate",
                "message": "Possible closed eyes",
            })
        elif maximum_blink_score >= CONFIG["partial_blink"]:
            defects.append({
                "type": "blink",
                "severity": "mild",
                "message": "Possible partial blink",
            })
    if (
        bright_pixels_percent is not None
        and bright_pixels_percent >= CONFIG["overexposed_pixels"]
    ):
        defects.append({
            "type": "exposure",
            "severity": "moderate",
            "message": "Possible overexposure",
        })
    if (
        dark_pixels_percent is not None
        and dark_pixels_percent >= CONFIG["underexposed_pixels"]
    ):
        defects.append({
            "type": "exposure",
            "severity": "moderate",
            "message": "Possible underexposure",
        })
    if sharpness_score is not None:
        if sharpness_score < CONFIG["very_low_sharpness"]:
            defects.append({
                "type": "sharpness",
                "severity": "strong",
                "message": "Very low sharpness",
            })
        elif sharpness_score <= CONFIG["low_sharpness"]:
            defects.append({
                "type": "sharpness",
                "severity": "moderate",
                "message": "Low sharpness",
        })
    return defects
def has_severity(defects, severity):
    """Checks whether a defect list contains a specific severity level."""
    return any(
        defect["severity"] == severity
        for defect in defects
    )
def defect_messages(defects):
    """Combines defect descriptions into one readable decision message."""
    if not defects:
        return "No major issue detected"
    return "; ".join(
        defect["message"]
        for defect in defects
    )
# ============================================================
# KEEP / REVIEW / REJECT Decision Engine
# ============================================================
def classify_similar_group(group):
    """
    Classifies photos inside one similarity group.
    LensFlow compares each photo against the highest Base Quality Score
    in the group, then combines the quality difference with defect
    evidence to recommend KEEP, REVIEW, or REJECT.
    Group rank is also assigned, where rank 1 is the strongest candidate.
    """
    valid_scores = [
        photo["base_quality_score"]
        for photo in group
        if photo["base_quality_score"] is not None
    ]
    if not valid_scores:
        for photo in group:
            photo["group_rank"] = None
            photo["difference_from_best"] = None
            photo["lensflow_decision"] = "REVIEW"
            photo["decision_reason"] = (
                "Insufficient quality information"
            )
        return group
    best_score = max(valid_scores)
    ranked_photos = sorted(
        group,
        key=lambda photo: (
            photo["base_quality_score"]
            if photo["base_quality_score"] is not None
            else -1
        ),
        reverse=True,
    )
    for rank, photo in enumerate(ranked_photos, start=1):
        photo["group_rank"] = rank
    for photo in group:
        score = photo["base_quality_score"]
        if score is None:
            photo["difference_from_best"] = None
            photo["lensflow_decision"] = "REVIEW"
            photo["decision_reason"] = (
                "Insufficient quality information"
            )
            continue
        difference = float(best_score - score)
        defects = photo.get("defects", [])
        photo["difference_from_best"] = difference
        # Face blur always requires human review, regardless of group rank.
        if any(defect.get("type") == "face_blur" for defect in defects):
            photo["lensflow_decision"] = "REVIEW"
            photo["decision_reason"] = "Blurry face"
            continue
        strong_defect = has_severity(defects, "strong")
        moderate_defect = has_severity(defects, "moderate")
        if strong_defect:
            if difference >= CONFIG["reject_margin"]:
                decision = "REJECT"
                reason = (
                    "Clearly weaker similar alternative; "
                    + defect_messages(defects)
                )
            else:
                decision = "REVIEW"
                reason = (
                    "Strong quality issue detected: "
                    + defect_messages(defects)
                )
        elif moderate_defect:
            if difference >= CONFIG["reject_margin"]:
                decision = "REJECT"
                reason = (
                    "Better similar alternative available; "
                    + defect_messages(defects)
                )
            else:
                decision = "REVIEW"
                reason = (
                    "Review recommended: "
                    + defect_messages(defects)
                )
        elif difference <= CONFIG["keep_margin"]:
            decision = "KEEP"
            if np.isclose(difference, 0.0):
                reason = (
                    "Strongest quality candidate "
                    "in similar-photo group"
                )
            else:
                reason = (
                    "Quality comparable to strongest candidate"
                )
        elif difference >= CONFIG["reject_margin"]:
            if score <= CONFIG["low_quality"]:
                decision = "REJECT"
                reason = (
                    "Lower-quality similar alternative "
                    "with low absolute quality"
                )
            else:
                decision = "REVIEW"
                reason = (
                    "Lower-ranked similar alternative, "
                    "but acceptable absolute quality"
                )
        else:
            decision = "REVIEW"
            reason = (
                "Quality differs moderately from "
                "the strongest similar candidate"
            )
        photo["lensflow_decision"] = decision
        photo["decision_reason"] = reason
    return group
def classify_independent_photo(photo):
    """
    Classifies a photo that has no visually similar alternative.
    Independent photos are never automatically rejected by this logic.
    If a quality concern exists, LensFlow sends the photo to REVIEW;
    otherwise, it recommends KEEP.
    """
    defects = photo.get("defects", [])
    photo["similarity_group"] = None
    photo["group_rank"] = None
    photo["difference_from_best"] = None
    # Face blur always requires human review, including independent photos.
    if any(defect.get("type") == "face_blur" for defect in defects):
        photo["lensflow_decision"] = "REVIEW"
        photo["decision_reason"] = "Blurry face"
        return photo
    if has_severity(defects, "strong"):
        photo["lensflow_decision"] = "REVIEW"
        photo["decision_reason"] = (
            "Unique photograph with strong quality concern: "
            + defect_messages(defects)
        )
    elif (
        has_severity(defects, "moderate")
        or has_severity(defects, "mild")
    ):
        photo["lensflow_decision"] = "REVIEW"
        photo["decision_reason"] = (
            "Unique photograph requiring review: "
            + defect_messages(defects)
        )
    else:
        photo["lensflow_decision"] = "KEEP"
        photo["decision_reason"] = (
            "Unique photograph with no major issue detected"
        )
    return photo
def generate_culling_decisions(
    analysis_results,
    similarity_result,
):
    """
    Produces the final LensFlow culling results for the whole folder.
    This function:
        1. Maps DINOv2 similarity groups back to photo records.
        2. Assigns group IDs such as G01 and G02.
        3. Classifies grouped photos.
        4. Classifies remaining independent photos.
        5. Returns the completed result list.
    """
    photo_by_path = {
        photo["temp_path"]: photo
        for photo in analysis_results
    }
    processed_paths = set()
    final_results = []
    for group_number, group_paths in enumerate(
        similarity_result["groups"],
        start=1,
    ):
        group_id = f"G{group_number:02d}"
        group_photos = []
        for path in group_paths:
            path = str(path)
            if path not in photo_by_path:
                continue
            photo = photo_by_path[path]
            photo["similarity_group"] = group_id
            group_photos.append(photo)
            processed_paths.add(path)
        if group_photos:
            final_results.extend(
                classify_similar_group(group_photos)
            )
    for photo in analysis_results:
        if photo["temp_path"] in processed_paths:
            continue
        final_results.append(
            classify_independent_photo(photo)
        )
    return final_results
