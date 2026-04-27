# PeerReview — Academic Paper Review Platform

PeerReview is a web platform that digitizes the academic paper review process. Authors submit their research papers (with PDF), and an admin automatically assigns two reviewers to each one. Reviewers then read the paper and submit a star rating, comments, and a recommendation. The admin reviews all feedback and makes the final Accept or Reject decision. Authors can log back in anytime to see their paper's status, reviewer feedback, and the final editorial decision.

## Tech Stack

| Layer       | Technology                               |
| ----------- | ---------------------------------------- |
| Frontend    | HTML, CSS (inline), Vanilla JS           |
| Fonts       | Segoe UI, Consolas (VSCode system fonts) |
| Backend     | Node.js + Express                        |
| Database    | MongoDB + Mongoose, Cloudinary (optional for PDFs) |
| Auth        | JWT (jsonwebtoken)                       |
| Passwords   | bcryptjs (hashed)                        |
| File Upload | Multer                                   |

## Project Structure

```
peerreview-final/
│
├── client/                   ← Frontend (open these in browser)
│   ├── app.js                ← Shared JS: Auth, API, Toast, Navbar, Stars
│   ├── index.html            ← Login page
│   ├── register.html         ← Register page
│   ├── dashboard.html        ← Main dashboard (author / reviewer / admin)
│   ├── submit.html           ← Submit a paper (author only)
│   └── review.html           ← Write a review (reviewer only)
│
├── server/                   ← Backend (Node.js + Express)
│   ├── server.js             ← App entry point
│   ├── package.json          ← Dependencies
│   ├── .env.example          ← Copy this to .env and fill in values
│   ├── models/
│   │   ├── User.js           ← User schema (author / reviewer / admin)
│   │   ├── Paper.js          ← Paper schema
│   │   └── Review.js         ← Review schema
│   ├── routes/
│   │   ├── auth.js           ← POST /register, POST /login
│   │   ├── papers.js         ← Submit, list, assign, decide
│   │   ├── reviews.js        ← Submit review, list reviews
│   │   └── users.js          ← Profile, stats, reviewer list
│   └── middleware/
│       ├── auth.js           ← JWT verification + role check
│       └── upload.js         ← PDF upload via Multer
│
└── uploads/                  ← PDF files saved here automatically
```

## Complete Setup & Run Guide

## Step 1 — Install Node.js

Download and install from: https://nodejs.org  
Choose the **LTS** version. After install, confirm in terminal:

```bash
node --version    # should print v18.x.x or higher
npm --version     # should print 9.x.x or higher
```

---

## Step 2 — Install and Start MongoDB

## Local MongoDB (run on your own computer)

1. Download MongoDB Community from: https://www.mongodb.com/try/download/community
2. Install it
3. Start MongoDB:

```bash
# Windows (run PowerShell as Administrator)
net start MongoDB

# If that fails, run directly (keep this terminal open):
mongod --dbpath "C:\data\db"

```

## Step 3 — Configure Environment Variables

```bash
# Go into the server folder
cd peerreview-final/server

# Copy the example file
cp .env.example .env
```

Now open `.env` in any text editor and fill in:

```env
# Your MongoDB connection string
MONGO_URI=mongodb://localhost:27017/academic_review

# A long random secret string for JWT tokens
# Generate one by running: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=paste_your_random_secret_here

# Port the server runs on
PORT=5000

# Cloudinary Configuration (optional for PDF uploads)
# Sign up at https://cloudinary.com for free account
# CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
# Or set individually:
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
```

**Note:** Cloudinary is optional. If not configured, PDFs will be saved locally in the `uploads/` folder. If you want cloud storage for PDFs, set up a free Cloudinary account and add the credentials above.

---

## Step 4 — Install Server Dependencies

```bash
# Make sure you are inside the server folder
cd peerreview-final/server

npm install
```

This installs: express, mongoose, jsonwebtoken, bcryptjs, multer, cors, dotenv

---

## Step 5 — Start the Server

```bash
# From inside peerreview-final/server
npm start
```

You should see:

```
✅ Connected to MongoDB
👤 Default admin created: admin@review.com / admin123
🚀 Server running on http://localhost:5000
```

The server auto-creates a default admin account on first run.

## Step 6 — Open the Frontend

Open `client/index.html` directly in your browser.

**Recommended:** Use VS Code with the **Live Server** extension  
(right-click `index.html` → "Open with Live Server")

## Default Login Accounts

| Role     | Email            | Password |
| -------- | ---------------- | -------- |
| Admin    | admin@review.com | admin123 |
| Author   | Register via UI  | —        |
| Reviewer | Register via UI  | —        |

## How to Use — Full Workflow

```
1. Register as Author  →  login  →  Submit Paper (title + abstract + PDF)

2. Login as Admin      →  Dashboard  →  click "Auto-Assign" on a paper
                          (system picks 2 random reviewers)

3. Register/Login as Reviewer  →  see assigned papers  →  click "Write Review"
                                   fill rating + comments + recommendation

4. Login as Admin      →  see reviews on the paper card
                          →  write editor comments  →  click Accept or Reject

5. Login as Author     →  see final decision + all reviewer feedback on dashboard
```

## API Endpoints Reference

| Method | Endpoint              | Who can call     |
| ------ | --------------------- | ---------------- |
| POST   | /api/register         | Anyone           |
| POST   | /api/login            | Anyone           |
| POST   | /api/submit-paper     | Author           |
| GET    | /api/my-papers        | Author           |
| GET    | /api/assigned-papers  | Reviewer         |
| POST   | /api/submit-review    | Reviewer         |
| GET    | /api/all-papers       | Admin            |
| POST   | /api/assign-reviewers | Admin            |
| POST   | /api/final-decision   | Admin            |
| GET    | /api/stats            | Admin            |
| GET    | /api/reviewers        | Admin            |
| GET    | /api/me               | Anyone logged in |
