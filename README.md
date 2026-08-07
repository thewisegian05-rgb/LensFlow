# LensFlow — AI-Assisted Studio Management & Culling Platform

> **Thesis Project:** *LensFlow: An AI-Assisted Studio Management and Automated Computer Vision Culling Platform for Digital Media Professionals*

LensFlow is an all-in-one web platform engineered for freelance photographers, videographers, and creative media studios. It bridges the gap between client relationship management (CRM), financial operations, cloud asset storage, and high-performance media processing by incorporating a zero-server-compute, client-side computer vision culling engine.

---

## 📌 Problem & Solution

* **The Problem:** Digital media professionals face fragmented workflows—jumping between disparate tools for scheduling, contract management, client communication, photo culling, and gallery delivery. Traditional AI photo culling tools require uploading gigabytes of RAW files to third-party cloud servers, resulting in heavy bandwidth costs, high latency, and privacy concerns.
* **The Solution:** LensFlow unifies full-suite studio management (invoicing, scheduling, CRM, and gallery proofing) with an in-browser WebAssembly/Web Worker computer vision engine. LensFlow processes and culls thousands of local images in seconds with zero server compute costs and zero upload overhead before selection.

---

## 🚀 Key Features Matrix

### 1. 📊 Central Executive Dashboard
* **Real-Time Analytics:** Visual revenue performance widgets, financial forecasting, and invoice status breakdowns.
* **Task Management:** Overview of upcoming shoots, pending client deliverables, and active tasks.
* **Quick Actions:** One-click modals to launch new shoot briefs, generate client invoices, or initiate an AI culling session.

### 2. 📅 Schedules & Smart Calendar
* **Timeline View:** Unified calendar mapping pre-production, client consultation meetings, shoot dates, editing milestones, and gallery delivery deadlines.
* **Interactive Gear Checklists:** Dynamic pre-shoot packing lists tailored to specific shoot profiles (e.g., Wedding, Commercial Portrait, Real Estate, Drone Videography).

### 3. 👥 Client CRM & Automated Invoicing
* **Client Directory:** Centralized contact ledger with linked shoot history, communication archives, and active project states.
* **Contract Management:** E-signature pipeline with automated status tracking (*Drafted*, *Sent*, *Signed*).
* **Flexible Invoicing:** Dynamic billing engine calculating package rates, custom add-ons, tax liabilities, and payment milestones (*Unpaid*, *Deposit Received*, *Paid in Full*).

### 4. 🎯 Client-Side ML Image Culling (Flagship Feature)
* **Blur Detection:** Utilizes OpenCV.js and Laplacian Variance scoring to immediately identify and flag out-of-focus or motion-blurred frames.
* **Blink & Expression Analysis:** Employs lightweight computer vision models (MediaPipe / Face-API.js) to detect subject faces, facial orientation, and closed eyes.
* **Duplicate/Burst Grouping:** Employs Perceptual Hashing (pHash) to cluster high-speed burst shots for rapid side-by-side selection.
* **Privacy & Zero Compute Cost:** Runs entirely inside the client's browser using Web Workers and WebAssembly (WASM). Images never leave the user's local machine during culling.

### 5. 📁 Cloud Storage & Past Shoot Archives
* **Relational Storage Tree:** Nested folder structure using a `parent_id` hierarchy to organize multi-year shoot archives.
* **Object Storage Integration:** Direct-to-bucket client uploads leveraging Cloudflare R2 or Amazon S3 via pre-signed URLs to prevent egress fees and server bottlenecks.

### 6. 🖼️ Client Proofing & Gallery Delivery
* **Tokenized Access:** Secure, shareable client proofing portals via hashed public URLs (`/gallery/view?token=...`).
* **Interactive Proofing Grid:** Watermarked preview galleries allowing clients to favorite, comment on, and select final photos for post-processing.

### 7. 🔔 Notifications & System Settings
* **Automated Alerts:** Reminders for upcoming shoot dates, unpaid invoices, contract sign-offs, and project deadlines.
* **Storage Telemetry:** Storage allocation monitoring across client galleries with configurable quota notifications.

---

## 🛠️ Technology Stack

| Category | Technology / Library |
| :--- | :--- |
| **Framework & Build** | React 18, Vite |
| **Styling & UI** | Tailwind CSS, Glassmorphism UI Design |
| **Typography** | Space Grotesk, Instrument Serif, JetBrains Mono |
| **Icons & Charts** | Lucide Icons, Chart.js |
| **In-Browser ML / CV** | OpenCV.js (WASM), MediaPipe / Face-API.js, pHash |
| **Concurrency** | Web Workers |
| **Storage Architecture** | Cloudflare R2 / AWS S3 (Direct Uploads via Pre-Signed URLs) |

---

## ⚙️ Architecture: In-Browser Culling Engine
