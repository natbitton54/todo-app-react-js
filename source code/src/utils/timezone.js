import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const saveUserTimezone = async(uid) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await setDoc(doc(db, `users/${uid}/meta/preferences`), 
    {timezone},
    { merge: true });
}
