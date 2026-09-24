# LensFlow Backend

This folder contains the FastAPI backend and the LensFlow AI-assisted photo culling engine.

The backend is responsible for:

- authenticating the current user
- retrieving photos from Supabase
- downloading temporary image copies
- running the culling pipeline
- generating similarity groups
- calculating quality scores
- detecting quality issues
- producing `KEEP`, `REVIEW`, or `REJECT`
- saving culling results
- returning results to the React frontend

---

## Backend Structure

```text
backend/
├── README.md
├── main.py
├── culling_engine.py
├── requirements.txt
├── models/
│   ├── blaze_face_short_range.tflite
│   ├── face_landmarker.task
│   └── sa_0_4_vit_l_14_linear.pth
└── temp/
```

### `main.py`

Handles:

- FastAPI routes
- Supabase authentication
- photo retrieval
- Supabase Storage downloads
- calling the culling engine
- saving culling results
- returning results to the frontend

### `culling_engine.py`

Contains:

- OpenCV technical quality analysis
- MediaPipe subject analysis
- OpenCLIP + LAION aesthetic analysis
- DINOv2 similarity analysis
- Base Quality scoring
- defect detection
- LensFlow decision logic

---

# LensFlow Culling Pipeline

```text
INPUT PHOTOS
     │
     ├── Stage 1: Technical Quality
     │      OpenCV
     │
     ├── Stage 2: Subject Quality
     │      MediaPipe + OpenCV
     │
     ├── Stage 3: Aesthetic Quality
     │      OpenCLIP + LAION
     │
     ├── Stage 4: Similarity Analysis
     │      DINOv2 + Cosine Similarity
     │
     ├── Stage 5: Base Quality Scoring
     │
     ├── Stage 6: Defect Analysis
     │
     └── Stage 7: Decision Engine
             KEEP / REVIEW / REJECT
```

---

# Stage 1 — Technical Quality

Technology:

```text
OpenCV
```

The technical analysis measures:

- global sharpness
- brightness
- contrast
- dark-pixel percentage
- bright-pixel percentage

Sharpness is calculated using variance of the Laplacian.

These measurements help LensFlow identify possible:

- blur
- underexposure
- overexposure

---

# Stage 2 — Subject Quality

Technologies:

```text
MediaPipe
OpenCV
```

LensFlow measures:

- face count
- average face sharpness
- minimum face sharpness
- left-eye blink score
- right-eye blink score
- maximum blink score
- blink asymmetry

OpenCV calculates sharpness inside detected face regions.

This helps detect:

- out-of-focus faces
- partial blinks
- possible closed eyes

A missing face is treated as unavailable information rather than automatically being considered a defect.

---

# Stage 3 — Aesthetic Quality

Technologies:

```text
OpenCLIP ViT-L/14
LAION Aesthetic Predictor
```

Process:

```text
Photo
  ↓
OpenCLIP
  ↓
Normalized Image Embedding
  ↓
LAION Aesthetic Predictor
  ↓
Aesthetic Score
```

The aesthetic score is converted into a normalized component for the Base Quality Score.

---

# Stage 4 — Similarity Analysis

Technology:

```text
DINOv2 ViT-S/14
```

DINOv2 converts every photo into a normalized visual embedding.

LensFlow calculates cosine similarity between embeddings.

Current prototype similarity threshold:

```text
0.90
```

The similarity matrix is converted into a distance matrix and grouped using:

```text
Complete-linkage Agglomerative Clustering
```

Example:

```text
G01
├── IMG_001.jpg
├── IMG_002.jpg
└── IMG_003.jpg
```

Photos that do not belong to a similarity group are treated as independent photos.

DINOv2 is used for visual similarity only. It does not determine image quality.

---

# Stage 5 — Base Quality Score

LensFlow converts measurements into normalized scores between:

```text
0.0 - 1.0
```

Current components:

```text
Technical Quality
Face Quality
Eye Quality
Aesthetic Quality
```

Current prototype weights:

```text
Technical Quality   35%
Face Quality        25%
Eye Quality         25%
Aesthetic Quality   15%
```

The final weighted result is the:

```text
Base Quality Score
```

If a component is unavailable, it is excluded and the remaining weights are rebalanced.

Missing face information is not automatically considered a defect.

---

# Stage 6 — Defect Analysis

Defect evidence is kept separate from the Base Quality Score.

LensFlow currently checks for:

```text
Partial blink
Possible closed eyes
Strong closed-eye indication
Low sharpness
Very low sharpness
Possible overexposure
Possible underexposure
```

This allows LensFlow to represent cases where a photo has a good overall score but still contains a specific problem.

---

# Stage 7 — LensFlow Decision Engine

LensFlow combines:

```text
Base Quality Score
        +
Detected Defects
        +
Similar-Photo Comparison
```

to produce:

```text
KEEP
REVIEW
REJECT
```

## KEEP

Usually used when:

- the photo is one of the strongest candidates in its similarity group
- the quality difference from the strongest candidate is small
- no meaningful defect is detected

## REVIEW

Usually used when:

- the quality difference is uncertain
- a possible blink is detected
- exposure may be problematic
- sharpness may be low
- an independent photo has a quality concern

`REVIEW` means human judgment is recommended.

## REJECT

Usually used when:

- a stronger similar alternative exists
- the photo is significantly weaker
- supporting defect or quality evidence exists

A `REJECT` result is still only a recommendation.

The photo is not automatically permanently deleted.

---

# Similarity Group Ranking

Photos inside a similarity group are ranked by Base Quality Score.

Example:

```text
G01

Rank 1   0.84   KEEP
Rank 2   0.80   KEEP
Rank 3   0.62   REVIEW
Rank 4   0.39   REJECT
```

Rank 1 represents the strongest quality candidate in the group.

---

# Independent Photos

An independent photo has no similar alternative detected by DINOv2.

Independent photos are handled more conservatively.

```text
No major detected issue
→ KEEP
```

```text
Quality concern detected
→ REVIEW
```

Independent photos are not automatically rejected solely because they have a low score.

---

# Models Used

## MediaPipe Face Detector

```text
blaze_face_short_range.tflite
```

Used for face detection.

## MediaPipe Face Landmarker

```text
face_landmarker.task
```

Used for face landmarks, blendshapes, and blink analysis.

## OpenCLIP

```text
ViT-L/14
```

Used to generate the embedding for aesthetic scoring.

## LAION Aesthetic Predictor

```text
sa_0_4_vit_l_14_linear.pth
```

Used to produce the aesthetic score.

## DINOv2

```text
dinov2_vits14
```

Used for visual similarity and grouping.

---

# Temporary Files

Photos downloaded from Supabase are temporarily stored inside:

```text
backend/temp/
```

These files are only used during processing.

The backend recreates the folder automatically if necessary.

Do not commit temporary photos.

Add this to the root `.gitignore`:

```gitignore
backend/temp/
```

---

# Culling Result Output

The backend returns information similar to:

```json
{
  "photo_id": "...",
  "similarity_group": "G01",
  "group_rank": 1,
  "base_quality_score": 0.82,
  "lensflow_decision": "KEEP",
  "decision_reason": "Strongest quality candidate in similar-photo group"
}
```

Additional technical, subject, aesthetic, and defect measurements may also be included for debugging and evaluation.

---

# Human-in-the-Loop Design

LensFlow is a decision-support tool rather than a replacement for the photographer.

```text
LensFlow AI Decision
        ↓
Photographer Review
        ↓
Final Human Decision
```

The photographer can override the AI recommendation at any time.

---

# Prototype Calibration

The current culling engine still uses prototype values for:

```text
Similarity threshold
Sharpness calibration
Face sharpness calibration
Blink thresholds
Aesthetic calibration
Quality weights
KEEP margin
REJECT margin
Exposure thresholds
```

These values should eventually be evaluated using a larger image set and photographer decisions.
