// src/Components/TaskList.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaPencilAlt,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  startAt,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { scheduleTaskReminder } from "../utils/reminders";
import { showError } from "../utils/alerts";
import { Link } from "react-router-dom";
import ReminderToggle from "./ReminderToggle";
import { connectGoogleCalendar } from "../firebase/authService";
import {
  addEventToGoogleCalendar,
  deleteCalendarEvent,
} from "../utils/googleCalendarAPI";
import SearchBar from "./SearchBar";
import Pagination from "./Pagination";

/* ------------------------------------------------------------------ */
/*  Local-storage keys                                                */
/* ------------------------------------------------------------------ */

const LS = { CAL: "calendarConnected", NOTI: "notiConsent" };

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function TaskList({
  tasks,
  filter,
  setFilter,
  onToggle,
  onDelete,
  onEdit,
  onAdd,
}) {
  const { user } = useAuth();

  /* --------------------------- state ------------------------------ */

  const [categories, setCategories] = useState([]);
  const [categoryReady, setCategoryReady] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [showConfirmDeleteForm, setShowConfirmDeleteForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(
    localStorage.getItem(LS.CAL) === "true"
  );
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const todayLocal = new Date().toLocaleDateString("sv-SE");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
  });

  const [searchResults, setSearchResults] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("createdMs", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllTasks(docs);
      setCurrentPage(1); // reset to page 1 on any change
    });

    return () => unsubscribe(); // clean up listener on unmount
  }, [user]);

  /* -------------------- Firestore category listener --------------- */
  useEffect(() => {
    if (!user) {
      setCategories([]);
      setCategoryReady(true);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "categories"),
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCategoryReady(true);
      }
    );
    return unsub;
  }, [user]);

  /* -------------------- ask Notification permission 1× ------------ */

  useEffect(() => {
    if ("Notification" in window && !localStorage.getItem(LS.NOTI)) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") localStorage.setItem(LS.NOTI, "true");
        });
      } else if (Notification.permission === "granted") {
        localStorage.setItem(LS.NOTI, "true");
      }
    }
  }, []);

  /* -------------------- silent calendar refresh ------------------- */

  useEffect(() => {
    (async () => {
      try {
        if (localStorage.getItem(LS.CAL) !== "true") return;
        await connectGoogleCalendar({ interactive: false }); // silent refresh
        setCalendarConnected(true);
      } catch (err) {
        const recoverable =
          err?.error === "popup_blocked" ||
          err?.error === "token_failed" ||
          err?.error === undefined;

        if (recoverable) {
          console.warn("Silent calendar reconnect failed:", err);
          setCalendarConnected(false); // let user manually reconnect
        } else {
          setCalendarConnected(false); // hard failure
        }
      }
    })();
  }, []);

  /* --------------------------- helpers ---------------------------- */

  const resetForm = () =>
    setFormData({
      title: "",
      description: "",
      category: "",
      date: "",
      time: "",
    });

  const resetReminder = () => {
    setReminderOn(false);
    setReminderDate("");
    setReminderTime("");
  };

  const fmtDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const fmtTime = (d) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
      2,
      "0"
    )}`;

  const formatDue = (iso = "") => {
    if (!iso) return "";
    const [d, t] = iso.includes("T") ? iso.split("T") : iso.split(" ");
    const date = new Date(`${d}T${t}`);
    return date.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const suggestReminder = (taskDate, taskTime) => {
    if (!taskDate) return { date: "", time: "" };
    const safeTime = taskTime || "00:00";
    const dueMs = new Date(`${taskDate}T${safeTime}`).getTime();
    const oneHourMs = 60 * 60 * 1000;
    const suggestMs = dueMs - oneHourMs;
    if (suggestMs <= Date.now()) return { date: "", time: "" };
    const d = new Date(suggestMs);
    return { date: fmtDate(d), time: fmtTime(d) };
  };

  const sanitizeId = (v) =>
    (v || "")
      .toString()
      .replace(/[^A-Za-z0-9_]/g, "")
      .slice(0, 1024);

  /* -------------------- calendar connection button ---------------- */

  const handleConnectCalendar = async () => {
    try {
      await connectGoogleCalendar(); // will prompt
      localStorage.setItem("calendarConnected", "true");
      setCalendarConnected(true);
    } catch (err) {
      console.error("Google Calendar connection failed", err);
    }
  };

  /* ---------------------- calendar entry helper ------------------- */

  const createCalendarEntry = async (task, dueMs, remindMs) => {
    if (task.done) return null;
    const datePart = task.date || (task.due ?? "").split(/[T ]/)[0];
    const timePart =
      task.time || (task.due ?? "").split(/[T ]/)[1]?.slice(0, 5) || "00:00";

    const minutesBefore = Math.max(0, Math.round((dueMs - remindMs) / 60000));
    const duePretty = new Date(`${datePart}T${timePart}`).toLocaleTimeString(
      [],
      { hour: "numeric", minute: "2-digit", hour12: true }
    );

    const eventId = `task_${sanitizeId(task.id) || Date.now()}`;

    return addEventToGoogleCalendar({
      eventId,
      title: `${task.title} · Due: ${duePretty}`,
      description: task.description || `Due: ${duePretty}`,
      date: datePart,
      time: timePart,
      minutesBefore,
    }).catch((err) => {
      console.warn("gCal insert failed:", err);
      return null;
    });
  };

  /* ---------------------- checkbox toggle ------------------------- */

  const toggleDone = async (taskId, done) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;

    await onToggle(taskId, done);

    setAllTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, done } : task))
    );

    if (!calendarConnected) return;

    if (done && t.gcalId) {
      await deleteCalendarEvent(t.gcalId).catch(console.warn);
    }

    if (!done && !t.gcalId) {
      const dueMs = new Date(t.due).getTime();
      const remindMs = t.remindAt || dueMs;
      const newId = await createCalendarEntry(t, dueMs, remindMs);
      if (newId) await onEdit(taskId, { gcalId: newId });

      setAllTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, gcalId: newId } : task
        )
      );
    }
  };

  /* ---------------------- delete task helper ---------------------- */

  const deleteTask = async (taskId) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;

    if (calendarConnected && t.gcalId) {
      try {
        await deleteCalendarEvent(t.gcalId);
      } catch (err) {
        console.warn("gCal delete failed:", err);
      }
    }

    await onDelete(taskId);
  };

  /* ------------------ build ISO string from form ------------------ */

  const buildDueString = (d, t) => {
    if (typeof d !== "string" || !d.trim()) return "";

    const dateStr = d.trim();
    const rawTime = typeof t === "string" && t.trim() ? t.trim() : "00:00";
    const timeStr = rawTime.length === 5 ? `${rawTime}:00` : rawTime;

    return `${dateStr}T${timeStr}`;
  };

  /* --------------------------- submit ----------------------------- */
  /* ───── Form submit ────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData?.date) {
      showError("Date is required");
      return;
    }

    /* 1 — build ISO */
    const dueISO = buildDueString(formData.date, formData.time);
    if (!dueISO) {
      showError("Date is required.");
      return;
    }

    const dueMs = new Date(dueISO).getTime();

    /* 2 — reminder validation */
    let remindAtMs = null;
    if (reminderOn) {
      if (!reminderDate || !reminderTime) {
        showError("Pick reminder date & time.");
        return;
      }
      remindAtMs = new Date(`${reminderDate}T${reminderTime}`).getTime();
      if (remindAtMs >= dueMs) {
        showError("Reminder must be before the task's due date.");
        return;
      }
    }

    /* 3 — Firestore payload */
    const taskPayload = {
      ...formData,
      titleLower: formData.title.trim().toLowerCase(),
      due: dueISO,
      remindAt: remindAtMs,
      createdMs: Date.now(),
      reminderSent: false,
    };

    /* 4 — add / edit in Firestore */
    let docId;
    if (editMode) {
      docId = currentId;
      await onEdit(docId, taskPayload);
    } else {
      const ref = await onAdd({ ...taskPayload });

      docId = typeof ref === "string" ? ref : ref?.id ?? ref?.doc?.id ?? null;
    }


    /* 5 — close / reset UI (always!) */
    resetForm();
    resetReminder();
    setShowForm(false);
    setEditMode(false);
    setCurrentId(null);

    /* 6 — local notification */
    if (
      reminderOn &&
      user?.uid &&
      dueMs > Date.now() &&
      Notification.permission === "granted"
    ) {
      scheduleTaskReminder({
        uid: user.uid,
        title: formData.title,
        fireAt: remindAtMs,
      });
    }

    /* 7 — Google Calendar (only if we have an ID for future deletes) */
    if (reminderOn && calendarConnected && docId) {
      const gcalId = await createCalendarEntry(
        { ...taskPayload, id: docId },
        dueMs,
        remindAtMs ?? dueMs
      );
      if (gcalId) {
        await onEdit(docId, { gcalId });
      }
    }
  };

  /* ------------------------ start edit ---------------------------- */
  const startEdit = (task) => {
    const [datePart, timeRaw = ""] = task.due.includes("T")
      ? task.due.split("T")
      : task.due.split(" ");
    const timePart = timeRaw.slice(0, 5);

    setFormData({
      title: task.title,
      description: task.description,
      category: task.category,
      date: datePart,
      time: timePart,
    });

    if (task.remindAt) {
      const d = new Date(task.remindAt);
      setReminderOn(true);
      setReminderDate(fmtDate(d));
      setReminderTime(fmtTime(d));
    } else {
      resetReminder();
    }

    setCurrentId(task.id);
    setEditMode(true);
    setShowForm(true);
  };

  /* -------------------------- render ------------------------------ */

  const filteredTasks = (searchResults ?? allTasks).filter((task) => {
    if (filter === "done") return task.done;
    if (filter === "notDone") return !task.done;
    return true;
  });

  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const paginatedFilteredTasks = filteredTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="mt-10">
      {/* heading */}
      <h1 className="text-4xl font-semibold text-gray-500 dark:text-gray-300 mb-4 text-center">
        All your tasks
      </h1>

      {/* filter buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h3 className="text-3xl font-semibold text-gray-700 dark:text-gray-200">
          Tasks
        </h3>
        <div className="flex gap-2 flex-wrap">
          {["all", "done", "notDone"].map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 text-sm font-medium rounded-full border transition ${
                filter === key ? "border-2" : ""
              } ${
                key === "done"
                  ? filter === key
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-green-500 bg-green-500 text-white"
                  : key === "notDone"
                  ? filter === key
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-red-500 bg-red-500 text-white"
                  : filter === key
                  ? "border-gray-700 bg-gray-300 dark:bg-gray-500 text-black dark:text-white"
                  : "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-black dark:text-white"
              }`}
            >
              {key === "all" ? "All" : key === "done" ? "Done" : "Not done"}
            </button>
          ))}
        </div>
      </div>

      {/* add button + search bar*/}
      <div className="flex flex-col xs:flex-row items-center gap-4 mt-5 w-full">
        <div className="flex-grow w-full">
          <SearchBar setSearchResults={setSearchResults} filter={filter} />
        </div>

        <button
          onClick={() => {
            resetReminder();
            resetForm();
            setShowForm(true);
            setEditMode(false);
          }}
          className="w-full xs:w-auto flex items-center justify-center gap-2 px-5 py-3 text-xl font-medium text-gray-400 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
        >
          <FaPlus />
          Add a task
        </button>
      </div>

      {/* empty category or calendar banner */}
      {categoryReady && categories.length === 0 ? (
        <p className="mb-6 p-3 rounded bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 text-center">
          You don’t have any categories yet.{" "}
          {window.innerWidth <= 768 ? "Tap the ☰ menu" : "Open the sidebar"} to
          create one, or leave tasks as <b>Uncategorized</b>.
        </p>
      ) : !calendarConnected ? (
        <div className="mb-6 p-3 rounded bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 text-center">
          <p className="mb-2">
            Connect Google Calendar to get automatic reminders on any device.
          </p>
          <button
            onClick={handleConnectCalendar}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
          >
            Connect Google Calendar
          </button>
        </div>
      ) : null}

      {/* task list */}
      <div className="bg-white dark:bg-gray-900 shadow rounded p-4 pb-1">
        {paginatedFilteredTasks.length ? (
          paginatedFilteredTasks.map((task) => {
            const categoryInfo = categories.find(
              (c) => c.name === task.category
            );
            const dueDate = new Date(task.due);
            const isOverdue = !task.done && dueDate < new Date();

            const status = task.done
              ? "Done"
              : isOverdue
              ? "Overdue"
              : "Pending";

            const statusClass = {
              Done: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100",
              Overdue:
                "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100",
              Pending:
                "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100",
            };

            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm mb-5"
              >
                {/* left */}
                <div className="flex items-start sm:items-center gap-4">
                  <button
                    className={`flex-shrink-0 w-7 h-7 rounded-full border-2 border-black dark:border-white flex items-center justify-center transition-colors ${
                      task.done ? "bg-black dark:bg-white" : "bg-transparent"
                    }`}
                    onClick={() => toggleDone(task.id, !task.done)}
                  >
                    {task.done && (
                      <span className="w-3 h-3 bg-white dark:bg-black rounded-full" />
                    )}
                  </button>

                  <div>
                    <p
                      className={`font-medium text-gray-800 dark:text-gray-100 text-lg ${
                        task.done
                          ? "line-through decoration-2 decoration-gray-500"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>

                    <p
                      className={`text-gray-600 dark:text-gray-400 text-sm mb-1 ${
                        task.done
                          ? "line-through decoration-2 decoration-gray-500"
                          : ""
                      }`}
                    >
                      {task.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: categoryInfo
                            ? categoryInfo.color
                            : "#6b7280",
                        }}
                      />
                      <span className={task.done ? "line-through" : ""}>
                        <Link
                          to={
                            categoryInfo
                              ? `/dashboard/categories/${categoryInfo.link}`
                              : "#"
                          }
                        >
                          {categoryInfo ? categoryInfo.name : "Uncategorized"}
                        </Link>
                      </span>
                      <span className="hidden sm:inline mx-2 text-gray-400">
                        |
                      </span>
                      <span className={task.done ? "line-through" : ""}>
                        Due: {formatDue(task.due)}
                      </span>
                    </div>

                    <span
                      className={`mt-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusClass[status]}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                {/* buttons */}
                <div className="flex gap-3 md:flex justify-end">
                  <button
                    onClick={() => startEdit(task)}
                    className="text-gray-400 dark:text-gray-300 text-xl hover:text-black dark:hover:text-white p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <FaPencilAlt />
                  </button>
                  <button
                    onClick={() => {
                      setPendingDeleteId(task.id);
                      setShowConfirmDeleteForm(true);
                    }}
                    className="text-red-400 text-xl hover:text-red-500 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-center py-6">
            No tasks found.
          </p>
        )}
      </div>

      {/* pagination */}
      <div className="mt-6 flex justify-center">
        {tasks.length > 5 && (
          <Pagination
            currentPage={currentPage}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            onPrev={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            onPageClick={(pageNum) => setCurrentPage(pageNum)}
            pageSize={pageSize}
            setPageSize={(size) => {
              setPageSize(size);
              setCurrentPage(1); // reset to page 1
            }}
            totalItems={filteredTasks?.length || 0}
          />
        )}
      </div>

      {/* confirm delete */}
      {showConfirmDeleteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-sm text-center">
            <h3 className="text-lg font-semibold mb-4 dark:text-red-600">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this task?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={async () => {
                  await deleteTask(pendingDeleteId);
                  setShowConfirmDeleteForm(false);
                  setPendingDeleteId(null);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Yes, delete
              </button>
              <button
                onClick={() => {
                  setShowConfirmDeleteForm(false);
                  setPendingDeleteId(null);
                }}
                className="text-gray-500 dark:text-gray-300 px-4 py-2 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* add / edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">
              {editMode ? "Edit Task" : "New Task"}
            </h2>

            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full mb-3 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded"
              required
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full mb-3 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded"
            />

            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              disabled={categories.length === 0}
              className="w-full mb-3 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded disabled:opacity-60"
            >
              {categories.length === 0 ? (
                <option value="">
                  No categories – will use “Uncategorized”
                </option>
              ) : (
                <>
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </>
              )}
            </select>

            <div className="relative mb-3">
              <input
                ref={dateInputRef}
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                min={todayLocal}
                className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded"
                required
              />
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker()}
                className="absolute left-3 top-3 text-gray-400 dark:text-gray-300"
              >
                <FaCalendarAlt />
              </button>
            </div>

            <div className="relative mb-3">
              <input
                ref={timeInputRef}
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded"
                required
              />
              <button
                type="button"
                onClick={() => timeInputRef.current?.showPicker()}
                className="absolute left-3 top-3 text-gray-400 dark:text-gray-300"
              >
                <FaClock />
              </button>
            </div>

            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                {editMode ? "Save Changes" : "Add Task"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  resetReminder();
                }}
                className="text-gray-500 dark:text-gray-300 px-4 py-2 hover:underline"
              >
                Cancel
              </button>
            </div>

            <hr className="my-6 mb-4" />

            <ReminderToggle
              checked={reminderOn}
              onChange={(e) => {
                setReminderOn(e.target.checked);
                if (e.target.checked && !reminderDate && !reminderTime) {
                  const { date, time } = suggestReminder(
                    formData.date,
                    formData.time
                  );
                  setReminderDate(date);
                  setReminderTime(time);
                }
              }}
              reminderDate={reminderDate}
              reminderTime={reminderTime}
              setReminderDate={setReminderDate}
              setReminderTime={setReminderTime}
              taskDate={formData.date}
              taskTime={formData.time}
            />
          </form>
        </div>
      )}
    </div>
  );
}
