# 📝 Task Manager – React + Firebase + Vercel

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  
[![Vercel Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)  
[![Platform](https://img.shields.io/badge/platform-Web%2C%20iOS%2C%20Android-green)]()  
[![Firebase](https://img.shields.io/badge/Firebase-Backend-orange?logo=firebase)](https://firebase.google.com/)

A full-stack **to-do / task planner** that runs everywhere:

- 🌐 **Web PWA** – installable on desktop & mobile  
- 📱 **Mobile apps** – via Capacitor (iOS & Android)  
- ☁️ **Serverless backend** – Firebase Auth + Firestore + Cloud Messaging  
- 🔔 **Smart reminders** – local and push notifications, Google Calendar integration (via GitHub Actions)

---

## ✨ Features

| Category               | Details                                                                                                                        |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| 🔐 **Auth**            | Email/password & Google login (Firebase Authentication)                                                                        |
| 🗂 **Categories**      | Unlimited user-defined categories with color tags                                                                              |
| ⏰ **Due Date & Time** | Native pickers & readable formatting (e.g. Jul 4, 2025, 6:30 PM)                                                               |
| 🔔 **Smart Reminders** | 📱 Local notifications via Capacitor<br>📆 Google Calendar events created via GitHub Actions when enabled                       |
| 📧 **Overdue Emails**  | Automatically sends emails to users when tasks become overdue (via Vercel serverless API + Resend)                            |
| ✔️ **Task Actions**    | Add • Edit • Toggle Done • Delete (with confirmation)                                                                          |
| 🔍 **Filters**         | All • Done • Not Done                                                                                                          |
| 🔎 **Search**          | Search tasks by title (case-insensitive) globally and within each category                                                     |
| 📄 **Pagination**      | Dynamic pagination with page numbers, selectable page size, and current page indicator (`Page x of y`)                        |
| 🌗 **Dark Mode**       | Follows system preference; toggle with `Alt + D` or sidebar button                                                             |
| 📱 **Installable**     | Full PWA with manifest, favicon, and offline support                                                                           |
| 📊 **Stats Page**      | Bar and pie charts showing task completion, overdue stats, and filters by category & time period                              |
| 🔒 **Per-user Data**   | Firestore security rules restrict access to each user’s data                                                                   |

---

## 🧩 Project Structure

### 🖥 Frontend – React + Capacitor

- **React** with Create React App
- **PWA ready** (service worker + manifest)
- **Capacitor shell** for iOS/Android builds
- **Search bar** for filtering tasks by title
- **Category-specific search** on the Category page
- **Pagination component** with page selection and dynamic page count
- **Dark/light theme** based on user system

### ☁️ Backend – Firebase + Vercel Serverless

- **Firebase Auth** for secure login
- **Firestore** for task storage
- **Cloud Messaging** for push notifications
- **Serverless API endpoint** (`/api/sendReminders`) for overdue email detection
- **GitHub Actions** for scheduling reminders & Google Calendar integration

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/<your-user>/to-do-app-react-js.git
cd to-do-app-react-js
npm install


### 2. Firebase Console

1. Create project → "Task Manager"
2. Enable Auth → Email/Password + (optional) Google
3. Create Firestore → Start in test mode (lock down later)
4. Register web app → copy config into `.env.local`
5. Generate VAPID key → Cloud Messaging → Web Push

### 3. Environment Variables

Create:

```
.env.local   # frontend
.env         # serverless backend (never commit this)
```

<details><summary>Example contents</summary>

```env
# .env.local
REACT_APP_VAPID_PUBLIC_KEY=BNxyz...

# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"
CRON_SECRET=your-secret-token
```

</details>

> 🔑 Get service account JSON:
> Firebase → IAM → Service Accounts → Generate new key

---

## 🧪 Local Development

```bash
npm run build         # Prepares /build for Capacitor & Vercel
npm start             # CRA dev server
npx vercel dev        # Local test of serverless API
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 🌩 Deploy to Vercel

1. `vercel login`
2. `vercel` → Choose framework: **Create-React-App**
3. In dashboard → Environment Variables:

   * `REACT_APP_VAPID_PUBLIC_KEY`
   * Firebase service account keys
   * `CRON_SECRET`
4. Add `vercel.json`:

```jsonc
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }],
  "crons": [
    { "path": "/api/sendReminders", "schedule": "*/15 * * * *" }
  ]
}
```

5. Deploy:

```bash
vercel --prod
```

---

## 📱 Build Native (Optional)

```bash
npm run build
npx cap sync

# Android
npm i @capacitor/android
npx cap add android
npx cap open android

# iOS (macOS required)
npm i @capacitor/ios
npx cap add ios
npx cap open ios
```

➡ Push to Play Store or TestFlight as needed.
🛎 Local notifications supported via `@capacitor/local-notifications`.

---

## 📊 Stats Page

Navigate to `/stats` to view visual breakdowns of your task data:

* 📈 **Bar chart**: Tasks done / pending / overdue per category
* 🟣 **Pie chart**: Proportion of tasks done vs remaining
* ⏱ **Real-time** updates via Firestore listeners
* 🔍 Filters by category and time period (week/month)

Powered by **Recharts** for fast, clean visual rendering.

---

## 🔎 Search

* Located at the top of the task list or header bar
* Case-insensitive match on task title 
* Dynamically filters results in real-time as you type

---

## 🛠 Scripts

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `npm start`      | CRA dev server                          |
| `npm run build`  | Production build for Vercel + Capacitor |
| `npx vercel dev` | Local test of frontend + serverless     |
| `npm run lint`   | Lint code using Google config           |
| `npx cap sync`   | Sync React build to native platforms    |

---

## 📜 License & Usage

© 2025 **Nathaniel David Bitton**
**For personal and educational use only.**
Commercial use requires permission.

📧 [nathanielbitton18@gmail.com](mailto:nathanielbitton18@gmail.com)

---

