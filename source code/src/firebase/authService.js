import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    setPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
    browserLocalPersistence
} from 'firebase/auth'

import { auth, db } from './config.js'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { showError } from '../utils/alerts.js';
import {
    connectGoogleCalendar as _connect,
    calendarScopeGranted
} from "../utils/googleCalendarAPI";

const LS_KEY = "calendarConnected";

function capitalizeName(name) {
    return name
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
}

const applyPersistence = async (remember) => {
    await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
    )
}

export const getCurrentUserEmail = async () => {
    try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            showError("No user is currently logged in.")
            return [];
        }
        const userRef = doc(db, 'users', currentUser.uid);
        const snapshot = await getDoc(userRef)

        if (snapshot.exists()) {
            const data = snapshot.data()
            console.log(data.email)
            return data.email || ''
        } else {
            showError("User document not found.");
            return '';
        }
    } catch (err) {
        console.error("Failed to fetch current user email: ", err.message);
        showError("Unable to fetch your email.");
        return '';
    }
};

export const connectGoogleCalendar = ({ interactive = true } = {}) =>
    _connect({ interactive });

/** UI helper – quick yes/no */
export const hasCalendarAccess = () =>
    calendarScopeGranted() || localStorage.getItem(LS_KEY) === "true";

//? Email/password
export const register = async (email, password, firstName, lastName) => {
    await applyPersistence(false)
    const normalizedEmail = email.trim().toLowerCase();

    const userCredentials = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
    const user = userCredentials.user
    const capFirstName = capitalizeName(firstName);
    const capLastName = capitalizeName(lastName);
    const displayName = `${capFirstName} ${capLastName}`;

    await updateProfile(user, {
        displayName
    })

    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        firstName: capFirstName,
        lastName: capLastName,
        email: user.email,
        createdAt: serverTimestamp()
    })

    return userCredentials;
}

export const login = async (email, password, remember = false) => {
    await applyPersistence(remember);
    const normalizedEmail = email.trim().toLowerCase();
    return signInWithEmailAndPassword(auth, normalizedEmail, password)
}

//? Gmail auth
export const loginWithGoogle = async (remember = false) => {
    await applyPersistence(remember);

    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar.events");

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const nameParts = user.displayName?.trim().split(/\s+/) || [];
    const firstName = capitalizeName(nameParts[0] || "");
    const lastName = capitalizeName(nameParts.slice(1).join(" ") || "");

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            firstName,
            lastName,
            email: user.email || "",
            createdAt: serverTimestamp(),
        });
    } else {
        await updateDoc(userRef, {
            firstName,
            lastName,
            email: user.email || "",
        });
    }

    // 🔁 Try silent calendar connection
    try {
        await connectGoogleCalendar({ interactive: false });
    } catch {
        console.warn("Calendar not connected silently.");
    }

    return result;
};


export const handleForgetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
        alert("Password reset email sent!");
    } catch (error) {
        console.error("Error resetting password:", error.message);
        showError("Failed to send reset email");
    }

}

export const logout = () => signOut(auth);