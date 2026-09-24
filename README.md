# LensFlow — Studio Management & AI Culling Platform

> **Thesis Title:** *LensFlow: An HCI-Driven Photography Workflow Management System with Hybrid Photo Quality Assessment for Automated Photo Culling*

---

## 📌 Project Overview & Thesis Details

* **Target Audience:** Freelance Photographers, Videographers, & Creative Media Studios.
* **Core Problem:** Fragmented workflows across scheduling, client management, manual photo culling, and cloud storage management.
* **Solution:** A unified web platform combining business tools (CRM, invoicing, scheduling) with client-side AI computer vision for instant image culling.

---

## 🚀 Core Features Matrix

### 1. 📊 Central Dashboard
* **Overview:** Summarizes upcoming shoots, pending invoices, and active tasks at a glance.
* **Widgets:** Includes real-time revenue and financial performance monitoring widgets.
* **Quick Actions:** One-click action buttons to instantly create shoots or upload galleries.

### 2. 📅 Schedules & Calendar
* **Timeline:** Visual timeline mapping out shoots, client consultation meetings, and editing deadlines.
* **Gear Checklists:** Interactive pre-shoot checklists tied to specific shoot profiles (e.g., Wedding, Portrait, Drone Video).

### 3. 👥 Client Management (CRM) & Invoicing
* **Directory:** Client directory containing contact history and linked shoot archives.
* **Contracts:** Contract status tracker (*Drafted*, *Sent*, *Signed*).
* **Invoicing:** Automated invoice generator calculating package prices, add-ons, and payment milestones (*Unpaid*, *Deposit Received*, *Paid in Full*).

### 4. 🎯 Machine Learning Image Culling (Client-Side)
* **Blur Detection:** Uses Laplacian Variance (`OpenCV.js`) to detect out-of-focus or motion-blurred shots instantly.
* **Eye-Blink & Face Detection:** Detects subject facial features and closed eyes using lightweight models (`MediaPipe` / `Face-API.js`).
* **Duplicate Detection:** Employs perceptual hashing (`pHash`) to group rapid-fire sequence shots for fast manual selection.
* **Processing Location:** Runs 100% inside the client's browser (0 server/cloud compute cost).

### 5. 📁 Cloud Storage & Past Shoot Archives
* **Directory Hierarchy:** Cloud folder hierarchy (`parent_id` structure) for organizing past albums and delivered RAW/JPG files.
* **Object Storage:** Direct upload integration to Cloudflare R2 / S3 object storage.

### 6. 🖼️ Client Proofing & Delivery
* **Shareable Links:** Secure, public client links (`/gallery/view?token=...`).
* **Interactive Proofing:** Watermarked preview grids allowing clients to "favorite" and select final photos for editing.

### 7. 🔔 Notifications & Settings
* **Reminders:** Alerts for upcoming shoot dates, unpaid invoices, and task deadlines.
* **System Control:** Storage allocation monitoring, system configurations, and profile management.

---

## 🛠️ Recommended Tech Stack & Deployment ($0 Cost Architecture)

| Component | Technology | Hosting / Infrastructure | Cost |
| :--- | :--- | :--- | :--- |
| **Front-End** | React (Vite) + Tailwind CSS | Vercel / Render | $0.00 |
| **Database** | PostgreSQL or MySQL | Supabase / Neon (Cloud SQL) | $0.00 |
| **Machine Learning** | TensorFlow.js / OpenCV.js | Client Browser (Local CPU) | $0.00 |
| **Cloud File Storage** | Cloudflare R2 | 10 GB Free Tier | $0.00 |
| **API Backend** | Node.js / Express or Serverless | Vercel API Routes / Render | $0.00 |

---

## 🗄️ Database Schema Design Overview

* `users` — `id`, `name`, `email`, `password_hash`, `created_at`
* `clients` — `id`, `user_id`, `name`, `email`, `phone`, `company`
* `shoots` — `id`, `client_id`, `title`, `shoot_date`, `status`, `location`
* `invoices` — `id`, `shoot_id`, `total_amount`, `amount_paid`, `status`
* `gear_checklists` — `id`, `shoot_id`, `item_name`, `is_packed`
* `folders` — `id`, `shoot_id`, `name`, `parent_id`
* `photos` — `id`, `folder_id`, `file_url`, `is_culled`, `ai_score`, `is_favorite`

---

## 📋 Action Plan & Next Steps

- [ ] Initialize GitHub repository and set up React (Vite) + Tailwind CSS.
- [ ] Connect local Docker SQL / Supabase instance to the React app.
- [ ] Build basic sidebar navigation and Dashboard UI components.
- [ ] Prototype client-side OpenCV.js / TensorFlow.js blur detection module.
- [ ] Set up Cloudflare R2 bucket for file upload testing.

# LensFlow Culling

LensFlow is a photography workflow management system with an AI-assisted photo culling feature.

The current culling engine produces three AI recommendations:

- `KEEP`
- `REVIEW`
- `REJECT`

These recommendations are suggestions only. The photographer still makes the final decision.

---

## Project Structure

```text
LensFlow/
├── .env
├── README.md
├── package.json
├── public/
├── src/
└── backend/
    ├── README.md
    ├── main.py
    ├── culling_engine.py
    ├── requirements.txt
    ├── models/
    └── temp/
```

For details about the culling pipeline, see `backend/README.md`.

---

## Requirements

### Frontend
- Node.js
- npm

### Backend
Recommended:

```text
Python 3.11
```

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd LensFlow
```

### 2. Create the environment file

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Do not commit `.env`.

Make sure `.gitignore` contains:

```gitignore
.env
backend/temp/
```

---

## Backend Setup

Open a terminal and go to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

The backend requires these model files inside `backend/models/`:

```text
backend/models/
├── blaze_face_short_range.tflite
├── face_landmarker.task
└── sa_0_4_vit_l_14_linear.pth
```

### MediaPipe Face Detector

```text
https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite
```

### MediaPipe Face Landmarker

```text
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
```

### LAION Aesthetic Predictor

```text
https://github.com/LAION-AI/aesthetic-predictor/raw/refs/heads/main/sa_0_4_vit_l_14_linear.pth
```
The required MediaPipe and LAION model files are already included in backend/models/.
DINOv2 and OpenCLIP pretrained weights may download automatically on first startup.

---

## Running the Backend

From the `backend` folder:

```bash
python -m uvicorn main:app
```

Backend URL:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

You can also use:

```bash
python -m uvicorn main:app --reload
```

However, `--reload` may reload large AI models multiple times on Windows, so the recommended command for normal testing is:

```bash
python -m uvicorn main:app
```

---

## Frontend Setup

Open another terminal from the project root.

Install frontend dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

Use the URL shown by Vite if it uses a different port.

---

# How to Test LensFlow Culling

## 1. Start the backend

```bash
cd backend
python -m uvicorn main:app
```

Wait until all AI models finish loading.

## 2. Start the frontend

In another terminal from the project root:

```bash
npm run dev
```

## 3. Log in

Sign in using a valid LensFlow / Supabase account.

## 4. Open the Culling page

Create or open a folder.

## 5. Upload test photos

For useful testing, include:

- similar burst shots
- different poses from the same scene
- sharp photos
- blurry photos
- open-eye photos
- closed-eye or blinking photos
- bright photos
- dark photos
- unrelated photos

Example:

```text
Test Folder
├── pose_01.jpg
├── pose_02.jpg
├── pose_03.jpg
├── blurry.jpg
├── closed_eyes.jpg
├── dark.jpg
└── unrelated.jpg
```

## 6. Run the culling engine

Click:

```text
Run LensFlow Culling
```

The backend will analyze the photos in the currently opened folder.

Processing time depends on:

- number of photos
- image resolution
- CPU/GPU performance
- whether pretrained weights are already cached

CPU processing may take significantly longer.

---

## Expected Results

Each analyzed photo should receive one LensFlow recommendation:

```text
KEEP
REVIEW
REJECT
```

Photo cards may also show the Base Quality Score.

Example:

```text
AI: KEEP
82%
```

The Culling page also displays LensFlow counters for:

```text
Keep
Review
Reject
```

The photographer's manual decisions remain separate from AI recommendations.

---

## Culling Filters

### Photographer

```text
All
Starred
Rejected
Unrated
```

### LensFlow AI

```text
Keep
Review
Reject
```

This keeps human decisions separate from AI recommendations.

---

## Similar Photo Review

After running culling, open the `Duplicates` tab.

DINOv2 similarity groups should appear as groups such as:

```text
G01
G02
G03
```

Photos inside each group are ranked using the Base Quality Score.

Example:

```text
G01

Rank 1 — KEEP
Rank 2 — KEEP
Rank 3 — REVIEW
Rank 4 — REJECT
```

Rank 1 represents LensFlow's strongest quality candidate in the group.

The photographer can still choose a different photo manually.

---

## Photographer Override

LensFlow AI decisions and photographer decisions are intentionally separate.

Example:

```text
LensFlow AI:
REJECT

Photographer:
STAR / KEEP
```

The AI does not automatically replace the photographer's decision.

---

# Testing Different AI Versions

During development, group members may create different versions of the culling algorithm.

When comparing versions, use the same test photo set.

Suggested comparison criteria:

```text
Similarity grouping quality
Closed-eye detection
Sharpness / blur detection
Exposure detection
Aesthetic ranking
KEEP / REVIEW / REJECT decisions
Processing speed
False KEEP decisions
False REJECT decisions
Agreement with photographer decisions
```

The final implementation should eventually be evaluated using a larger image set and photographer feedback.

---

## Temporary Files

Photos downloaded from Supabase for backend analysis are temporarily stored in:

```text
backend/temp/
```

These are runtime files only.

Do not commit them.

Make sure `.gitignore` contains:

```gitignore
backend/temp/
```

---

## Notes

The current thresholds and weights are prototype calibration values.

These include:

```text
DINOv2 similarity threshold
Sharpness calibration
Face sharpness calibration
Blink thresholds
Aesthetic calibration
Base Quality weights
KEEP / REJECT margins
Exposure thresholds
```

These values should be evaluated and adjusted using a larger image set and photographer feedback.

---

## Backend Pipeline Documentation

For a detailed explanation of the AI and computer vision pipeline, see:

```text
backend/README.md
```
