import admin from 'firebase-admin';
import axios from 'axios';

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

/**
 * Retry sending email up to 3 times
 */
async function sendEmailWithRetry(payload, headers, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await axios.post('https://api.resend.com/emails', payload, { headers });
      return true;
    } catch (err) {
      console.error(`❌ Attempt ${attempt} failed:`, err.response?.data || err.message);
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.GITHUB_ACTION_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = Date.now();
    const usersSnapshot = await db.collection('users').get();

    let emailsSent = 0;
    console.log(`📊 Found ${usersSnapshot.size} users.`);

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const { uid, email, firstName = 'there' } = user;
      if (!uid || !email) continue;

      const tasksSnapshot = await db.collection(`users/${uid}/tasks`).get();
      console.log(`👤 Checking ${tasksSnapshot.size} tasks for ${email}`);

      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        const taskRef = taskDoc.ref;

        if (!task.done && task.dueMs && !task.notified) {
          if (task.dueMs < now) {
            const htmlBody = buildEmailHTML({
              firstName,
              taskTitle: task.title || 'Unnamed Task',
              dueDate: new Date(task.due).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            });

            const payload = {
              from: `Task Manager <onboarding@resend.dev>`,
              to: email,
              subject: '⚠️ Task Overdue Alert',
              html: htmlBody,
            };

            const headers = {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            };

            const success = await sendEmailWithRetry(payload, headers);
            if (success) {
              await taskRef.update({ notified: true });
              emailsSent++;
              console.log(`✅ Email sent to ${email} for task "${task.title}"`);
            } else {
              console.error(`❌ Failed to send email to ${email} after retries.`);
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, sent: emailsSent });
  } catch (error) {
    console.error('❌ Overdue email error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

function buildEmailHTML({ firstName, taskTitle, dueDate }) {
  const senderName = process.env.SENDER_NAME || 'Nathaniel Bitton';
  const appName = process.env.APP_NAME || 'Task Manager App';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Task Overdue Reminder</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #f9f9f9;
      color: #333;
      padding: 0;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #7c3aed;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .content {
      padding: 24px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
    }
    .task-box {
      background-color: #f1f5f9;
      padding: 16px;
      border-left: 4px solid #dc2626;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      font-size: 12px;
      color: #999;
      text-align: center;
      padding: 20px;
    }
    a.button {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      margin-top: 20px;
      text-decoration: none;
      border-radius: 4px;
    }
    @media only screen and (max-width: 600px) {
      .container { margin: 20px; border-radius: 0; }
      .header { padding: 16px; }
      .content { padding: 16px; }
      .content p { font-size: 15px; }
      a.button {
        display: block;
        width: 100%;
        text-align: center;
        padding: 14px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>⚠️ Task Overdue Alert</h1></div>
    <div class="content">
      <p>Hello ${firstName},</p>
      <p>This is a reminder that the following task is now <strong>overdue</strong>:</p>
      <div class="task-box">
        <strong>Task:</strong> ${taskTitle}<br />
        <strong>Due Date:</strong> ${dueDate}
      </div>
      <p>Please log in to your dashboard and mark the task as complete or reschedule it if needed.</p>
      <a href="https://task-manager-three-vert.vercel.app/dashboard" class="button">Go to My Tasks</a>
    </div>
    <div class="footer">
      <img src="https://task-manager-three-vert.vercel.app/images/todo-app-logo.png" alt="${appName} Logo" style="max-height: 40px; margin-bottom: 4px;" />
      <br />
      This is an automated message from <strong>${appName}</strong>, by ${senderName}. Please do not reply.
    </div>
  </div>
</body>
</html>`;
}
