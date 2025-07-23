import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// 1. service-account key downloaded from Firebase console
initializeApp({
    credential: cert(JSON.parse(fs.readFileSync("serviceAccount.json", "utf8"))),
});

const db = getFirestore();

async function backfill() {
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
        const tasksSnap = await userDoc.ref.collection("tasks").get();

        const batch = db.batch();
        tasksSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (!data.titleLower && data.title) {
                batch.update(doc.ref, {
                    titleLower: data.title.trim().toLowerCase(),
                });
            }
        });

        if (!batch._ops.length) continue;
        await batch.commit();
        console.log(`✔ back-filled ${batch._ops.length} tasks for ${userDoc.id}`);
    }
    console.log("✅ all done");
}

backfill().catch(console.error);
