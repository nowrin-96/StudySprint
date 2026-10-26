# ⚡ StudySprint — Smart Student Productivity Web Application

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://nowrin-96.github.io/StudySprint/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Docker Support](https://img.shields.io/badge/Docker-enabled-blue.svg)](Dockerfile)
[![Firebase](https://img.shields.io/badge/Backend-Firebase%20v10-orange.svg)](https://firebase.google.com/)

**StudySprint** is a modern, responsive web application designed to help students streamline their academic life. It brings together assignment tracking, deadline reminders, Pomodoro focus sessions, daily habit tracking, and course management into a single unified dashboard.

---

## 🌟 Key Features

- **📊 Comprehensive Student Dashboard**: High-level overview of pending assignments, daily habit streaks, and upcoming deadlines.
- **⏰ Smart Deadline Reminders**: Automatic urgency tagging (Urgent, Approaching, Normal) with visual color badges and countdown calculations.
- **🍅 Pomodoro Focus Timer**: Customizable work and break intervals (Focus, Short Break, Long Break) with automatic session logging.
- **📅 Daily Habit Tracker**: Track revision, problem-solving, and study routines with streak counts and daily completion toggles.
- **📚 Course & Subject Management**: Organize tasks and study materials categorized by subject.
- **🔒 Secure Authentication & Cloud Storage**: Integrated with Firebase Authentication (Email/Password) and Cloud Firestore with strict per-user security rules.
- **📱 Fully Responsive & Fast**: Built with clean vanilla CSS tokens, glassmorphism UI elements, and zero heavy framework dependencies.

---

## 🚀 Live Demo

You can access and test the live application here:  
👉 **[https://nowrin-96.github.io/StudySprint/](https://nowrin-96.github.io/StudySprint/)**

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System with CSS Variables), Modular JavaScript (ES6+ Modules)
- **Backend & Database**: Google Firebase Authentication & Cloud Firestore (Modular Web SDK v10)
- **Deployment & Containerization**: GitHub Pages, Docker & Nginx Alpine

---

## 💻 Running Locally

### Option A: Using npm (Recommended)
Make sure [Node.js](https://nodejs.org/) is installed, then run:

```bash
# Clone the repository
git clone https://github.com/nowrin-96/StudySprint.git
cd StudySprint

# Start the live development server
npm start
```
Your default browser will automatically open at `http://localhost:3000`.

### Option B: Using Python
```bash
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

### Option C: Using Docker
```bash
# Build the Docker image
docker build -t studysprint .

# Run the container
docker run -d -p 8080:80 studysprint
```
Open `http://localhost:8080` in your browser.

---

## 🔧 Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication**:
   - Go to **Build** → **Authentication** → **Sign-in method**.
   - Enable **Email/Password**.
3. Enable **Cloud Firestore**:
   - Go to **Build** → **Firestore Database** → **Create database**.
   - Copy the security rules from `firestore.rules` into the **Rules** tab and publish.
4. Add your domain to **Authorized Domains**:
   - Go to **Authentication** → **Settings** → **Authorized domains**.
   - Add `localhost` and `nowrin-96.github.io`.
5. Update your Firebase config in `js/firebase-config.js` with your project identifiers.

---

## 📄 License

This project is licensed under the MIT License.
