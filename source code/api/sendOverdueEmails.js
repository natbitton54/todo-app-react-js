// /api/sendOverdueEmails.js
import admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }


    const authHeader = req.headers.authorization;
    const expected = `Bearer ${process.env.GITHUB_ACTION_SECRET}`;

    if (authHeader !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const now = new Date();
        const usersSnapshot = await db.collection('users').get();

        let emailsSent = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const uid = userData.uid;
            const email = userData.email;
            const firstName = userData.firstName || 'there';

            const tasksSnapshot = await db.collection(`users/${uid}/tasks`).get();

            for (const taskDoc of tasksSnapshot.docs) {
                const task = taskDoc.data();

                if (!task.done && task.due) {
                    const dueDate = new Date(task.due);
                    if (dueDate < now) {
                        const msg = {
                            to: email,
                            from: 'nathanielbitton18@gmail.com',
                            templateId: 'd-dd0da754afc3465fa287d0917c472518',
                            dynamicTemplateData: {
                                firstName,
                                taskTitle: task.title,
                                dueDate: dueDate.toLocaleString(),
                            },
                        };

                        await sgMail.send(msg);
                        emailsSent++;
                    }
                }
            }
        }

        res.status(200).json({ success: true, sent: emailsSent });
    } catch (error) {
        console.error('Overdue email error:', error);
        res.status(500).json({ error: error.message });
    }
}
