import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { saveUserTimezone } from "../utils/timezone";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone); 

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false); //

            if (firebaseUser) {
                await saveUserTimezone(firebaseUser.uid);

                try {
                    const prefDoc = await getDoc(
                        doc(db, "users", firebaseUser.uid, "meta", "preferences")
                    )
                    setTz(prefDoc.data()?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
                } catch (err) {
                    console.warn("Could not save timezone:", err);
                }
            } else {
                setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
            }
        });
        return () => unsub();
    }, []);

    return (
        <AuthContext.Provider value={{ user, tz, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
