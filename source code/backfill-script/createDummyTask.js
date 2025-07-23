import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

initializeApp({
    credential: cert(JSON.parse(fs.readFileSync("serviceAccount.json", "utf8"))),
});

const db = getFirestore()
const userUID = "HibANdZVNQVJUeAWJCSBK0eqjfn2"

async function createDummyTasks() {
    const taskRef = db.collection('users').doc(userUID).collection("tasks")
    const now = Date.now();
    const batch = db.batch()

    for(let i = 1; i <= 30; i++){
        const id = taskRef.doc().id;
        const dueDate = new Date(now + i * 86400000)

        const dueIso = dueDate.toISOString().slice(0, 16)

        const data = {
            title: `Task ${i}`,
            titleLower: `task ${i}`,
            description: `This is task number ${i}`,
            category: 'Testing',
            date: dueIso.split("T")[0],
            time: dueIso.split('T')[1].slice(0, 5),
            due: dueIso,
            createdMs: now + i,
            reminderSent: false,
            done: i % 2 === 0
        }

        const docRef = taskRef.doc(id)
        batch.set(docRef, data)
        
    }

    await batch.commit()
    console.log("✅ Successfully created 30 dummy tasks for the user.");
}

createDummyTasks().catch(console.error)