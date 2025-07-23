import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

initializeApp({
    credential: cert(JSON.parse(fs.readFileSync("serviceAccount.json", "utf8"))),
});

const db = getFirestore()
const userUID = "HibANdZVNQVJUeAWJCSBK0eqjfn2"

async function deleteTasks() {
    const taskRef = await db.collection('users').doc(userUID).collection("tasks").get()
    const countSnapshot = await db.collection('users').doc(userUID).collection("tasks").count().get()

    const countTasks = countSnapshot.data().count;

    if (taskRef.empty) {
        console.log("No tasks found.");
        return;
    }

    const batch = db.batch()
    taskRef.forEach((doc) => {
        batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`✅ Deleted all ${countTasks} tasks from the selected user.`);
}

deleteTasks().catch(console.error)