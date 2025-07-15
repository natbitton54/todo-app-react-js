// Dashboard.jsx
import React, { useEffect, useReducer, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidenav from "./Sidenav";
import "../styles/dashboard.css";
import TaskList from "../Components/Task";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import useTaskStats from "../hooks/useTaskStats";
import { Link } from "react-router-dom";
import Pagination from "../Components/Pagination";

// ---------- reducer ----------
const taskReducer = (state, action) => {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "TOGGLE":
      return state.map((t) =>
        t.id === action.payload.id ? { ...t, done: action.payload.done } : t
      );
    case "DELETE":
      return state.filter((t) => t.id !== action.payload.id);
    case "EDIT":
      return state.map((t) =>
        t.id === action.payload.id ? { ...t, ...action.payload.data } : t
      );
    default:
      return state;
  }
};

// ---------- helpers ----------
const buildDueString = (d, t) => {
  if (typeof d !== "string" || !d.trim()) return "";

  const dateStr = d.trim();
  const rawTime = typeof t === "string" && t.trim() ? t.trim() : "00:00";

  const timeStr = rawTime.length === 5 ? `${rawTime}:00` : rawTime;

  return `${dateStr} ${timeStr}`;
};

export default function Dashboard() {
  const { user, tz = "UTC" } = useAuth();
  const [time, setTime] = useState(new Date());
  const [filter, setFilter] = useState("all");
  const [tasks, dispatch] = useReducer(taskReducer, []);
  const { stats, donePercentage } = useTaskStats(user);

  // live tasks listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "tasks"),
      (snap) =>
        dispatch({
          type: "LOAD",
          payload: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        })
    );
    return unsub;
  }, [user]);

  // ticking clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const getGreeting = (time, tz) => {
    const hour = Number(
      time.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: tz,
      })
    );
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  };

  const getDateString = (time, tz) =>
    time.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: tz,
    });

  const getTimeString = (time, tz) =>
    time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
      timeZone: tz,
    });

  // ---- CRUD handlers ----
  const handleToggle = async (id, done) => {
    const ref = doc(db, "users", user.uid, "tasks", id);
    await updateDoc(ref, { done });
    dispatch({ type: "TOGGLE", payload: { id, done } });
  };

  const handleAddTasks = async (newTask) => {
    const colRef = collection(db, "users", user.uid, "tasks");

    const docRef = await addDoc(colRef, {
      ...newTask,
      due: buildDueString(newTask.date, newTask.time),
      done: false,
      reminderSent: false,
    });

    return docRef;
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
    dispatch({ type: "DELETE", payload: { id } });
  };

  const handleEdit = async (id, data) => {
    const ref = doc(db, "users", user.uid, "tasks", id);
    const patch = { ...data };

    if (data.date) {
      patch.due = buildDueString(data.date, data.time);
    }

    patch.reminderSent = false;

    await updateDoc(ref, patch);
    dispatch({ type: "EDIT", payload: { id, data: patch } });
  };

  // ---- UI ----
  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-gray-900 min-h-screen">
      <Sidenav />

      <main className="flex-1 w-full mt-14 p-4 sm:p-6 overflow-x-hidden">
        <p className="greetings text-xl font-semibold text-purple-700 dark:text-purple-400">
          {getGreeting(time, tz)},{" "}
          <span className="text-[#828afa]">{user?.displayName || "User"}!</span>
        </p>

        <p className="text-gray-700 dark:text-gray-300 text-lg font-medium mb-4">
          It’s {getDateString(time, tz)} {getTimeString(time, tz)}
        </p>

        <TaskList
          tasks={tasks}
          filter={filter}
          setFilter={setFilter}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onAdd={handleAddTasks}
          onEdit={handleEdit}
        />

        <div className="flex flex-col items-end mt-4 space-y-1 mr-4">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mr-1">
            Your Statistics
          </span>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
              ✅ Completed: {stats.done} ({donePercentage}%)
            </p>
          </div>
          <Link
            to="/dashboard/statistics"
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            View more →
          </Link>
        </div>
      </main>
    </div>
  );
}
