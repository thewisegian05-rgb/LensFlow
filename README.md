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
