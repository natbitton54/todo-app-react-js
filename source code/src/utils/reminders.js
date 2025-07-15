// src/utils/reminders.js
//--------------------------------------------------
//  Cross-platform reminder utilities
//--------------------------------------------------
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db } from "../firebase/config";          // Firestore instance
import { doc, setDoc } from "firebase/firestore";

import { showError, showSuccess } from "./alerts"; // swal/toast helpers (optional)

//--------------------------------------------------
//  1. Local notification (Android / iOS Capacitor)
//--------------------------------------------------
export const scheduleLocal = async ({ title, body, when }) => {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== "granted") {
        showError("Please enable notifications in Settings.");
        return;
    }

    await LocalNotifications.schedule({
        notifications: [
            {
                id: Date.now(),
                title,
                body,
                schedule: { at: new Date(when) }, // JS Date
            },
        ],
    });
};

//--------------------------------------------------
//  2. Web-push token registration  (desktop / PWA)
//--------------------------------------------------
export const registerWebToken = async (uid) => {
    try {
        // 🛠️ Use the *already-ready* service worker
        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(getMessaging(), {
            vapidKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
            serviceWorkerRegistration: registration,
        });

        if (!token) {
            console.warn("No FCM token returned (permission blocked?)");
            return;
        }

        // 🔐 store token so Cloud Function can target this device
        await setDoc(doc(db, "users", uid, "meta", "fcm"), { token }, { merge: true });

        console.log("Web-push token saved:", token);
    } catch (err) {
        console.error("FCM token error:", err);
        showError("Enable browser notifications to receive reminders.");
    }
};

//--------------------------------------------------
//  3. Unified helper → call after saving a task
//--------------------------------------------------
/**
 * Schedules a reminder 1 hour before `dueMs`.
 * @param {Object} p
 * @param {string} p.uid   Current user UID
 * @param {string} p.title Task title
 * @param {number} p.dueMs Task due-time in ms epoch
 */
export const scheduleTaskReminder = async ({ uid, title, dueMs }) => {
    const now = Date.now();
    const remaining = dueMs - now;

    if (remaining < 5 * 60 * 1000) return; // too close

    // 2/3 mark into the wait time
    const rawRemindAt = now + (2 / 3) * remaining;

    // Round to next 15-minute mark (for frontend alignment with backend logic)
    const remindAt = Math.ceil(rawRemindAt / (15 * 60 * 1000)) * (15 * 60 * 1000);

    const platform = Capacitor.getPlatform();

    if (platform === "android" || platform === "ios") {
        await scheduleLocal({
            title: "📝 Upcoming Task",
            body: `"${title}" is due soon!`,
            when: remindAt,
        });
    } else {
        await registerWebToken(uid); // for backend to send push
    }
};


//--------------------------------------------------
//  4. Foreground-message listener (web only)
//--------------------------------------------------
export const initForegroundPushListener = () => {
    onMessage(getMessaging(), (payload) => {
        const { title, body } = payload.notification ?? {};
        if (title) {
            showSuccess(`${title}\n${body ?? ""}`);
        }
        console.log("Foreground FCM payload:", payload);
    });
};
