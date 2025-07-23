import admin from 'firebase-admin';
import { DateTime } from 'luxon';

// ─── initialise Firebase Admin once ─────────────────────────────
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
const fcm = admin.messaging();

// ─── cron tuning ────────────────────────────────────────────────
const CRON_INTERVAL_MIN = 15;      // how often this endpoint is called
const REMIND_FRACTION = 2 / 3;   // send when ⅔ of time to due-date has passed
// ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const tokenHdr = req.headers.authorization || '';
    const secret = tokenHdr.split(' ')[1];
    if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const nowUtc = DateTime.utc();
        const windowUpper = nowUtc.plus({ minutes: CRON_INTERVAL_MIN });

        // <users/{uid}/meta/fcm> documents
        const tokenSnap = await db.collectionGroup('fcm').get();

        const jobs = tokenSnap.docs.map(async (tokenDoc) => {
            const uid = tokenDoc.ref.parent.parent.id;
            const token = tokenDoc.data().token;

            // user’s preferred zone
            const prefDoc = await db.doc(`users/${uid}/meta/preferences`).get();
            const timeZone = prefDoc.data()?.timeZone || 'UTC';

            // candidate tasks
            const taskSnap = await db
                .collection(`users/${uid}/tasks`)
                .where('done', '==', false)
                .where('reminderSent', '==', false)
                .get();

            const dueTasks = taskSnap.docs.filter((t) => {
                const data = t.data();
                const dueLocal = DateTime.fromFormat(data.due, 'yyyy-MM-dd HH:mm:ss', { zone: timeZone });
                if (dueLocal <= nowUtc) return false;   // already past

                const createdMs = data.createdMs ?? t.createTime.toMillis();
                const created = DateTime.fromMillis(createdMs, { zone: timeZone });

                const totalMs = dueLocal.diff(created).as('milliseconds');
                const remindAt = created.plus({ milliseconds: totalMs * REMIND_FRACTION });

                return remindAt >= nowUtc && remindAt <= windowUpper;
            });

            if (!dueTasks.length) return;

            // build FCM multi-cast
            const msgs = dueTasks.map((t) => ({
                token,
                notification: {
                    title: '⏰ Task Reminder',
                    body: `📝 "${t.data().title}" is due soon.`,
                    icon: '/images/robot-404.png',
                },
                data: { url: `/tasks/${t.id}` },
                webpush: { fcmOptions: { link: '/dashboard' } },
            }));

            await fcm.sendAll(msgs);

            // flag them as "sent"
            const batch = db.batch();
            dueTasks.forEach((t) => batch.update(t.ref, { reminderSent: true }));
            await batch.commit();
        });

        await Promise.all(jobs);
        res.status(200).json({ message: `✅ Reminders sent at ${nowUtc.toISO()}` });
    } catch (err) {
        console.error('Reminder error:', err);
        res.status(500).json({ error: 'Reminder send failed', details: err.message });
    }
}
