// Calendar.jsx  • descriptions removed • dot/colour restored
import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import Sidenav from "./Sidenav";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "../styles/fullcalendar-dark.css";

const isSmallScreen = () => window.innerWidth < 868 || window.innerHeight < 500;

export default function Calendar() {
  const { user } = useAuth();
  const calendarRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState({});
  const [mobile, setMobile] = useState(isSmallScreen());

  /* ─── categories ─── */
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "users", user.uid, "categories"), (snap) =>
      setCategories(
        snap.docs.reduce((acc, d) => {
          const { name, color = "#6366f1" } = d.data();
          acc[name] = color;
          return acc;
        }, {})
      )
    );
  }, [user]);

  /* ─── tasks ─── */
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "users", user.uid, "tasks"), (snap) =>
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  /* ─── events ─── */
  const events = useMemo(() => {
    const now = new Date();
    return tasks.map((t) => {
      const due = new Date(t.due);
      const status = t.done ? "done" : due < now ? "overdue" : "pending";
      return {
        id: t.id,
        title: t.title,
        start: t.due,
        end: new Date(new Date(t.due).getTime() + 1 * 60 * 1000), // 1 minute duration
        allDay: false,
        backgroundColor: categories[t.category] || "#6366f1",
        borderColor: categories[t.category] || "#6366f1",
        extendedProps: { status },
      };      
    });
  }, [tasks, categories]);

  /* ─── responsive view swap ─── */
  useEffect(() => {
    const handleResize = () => {
      const phone = isSmallScreen();
      setMobile(phone);
      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        const wanted = phone ? "listDay" : "dayGridMonth";
        if (api.view.type !== wanted) api.changeView(wanted);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ─── quick pop-up list ─── */
  const listTasksForDate = (d) => {
    const y = d.getFullYear(),
      m = d.getMonth(),
      day = d.getDate();
    const msg =
      tasks
        .filter(({ due }) => {
          const t = new Date(due);
          return (
            t.getFullYear() === y && t.getMonth() === m && t.getDate() === day
          );
        })
        .sort((a, b) => new Date(a.due) - new Date(b.due))
        .map(
          (t) =>
            `• ${new Date(t.due).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} — ${t.title}`
        )
        .join("\n") || "No tasks due.";
    window.alert(msg);
  };

  /* ─── UI ─── */
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <Sidenav />

      <main className="flex-1 overflow-y-auto mt-20 ml-4 mr-2 md:mt-10">
        <FullCalendar
          noEventsContent="No tasks to display"
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          initialView={mobile ? "listDay" : "dayGridMonth"}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: mobile ? "" : "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="auto"
          events={events}
          eventDisplay={mobile ? "list-item" : "block"}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", hour12: true }}
          /* tooltip (status + title) */
          eventDidMount={({ el, event }) => {
            const label =
              { overdue: "⏰ Overdue", pending: "🔖 Pending", done: "✅ Done" }[
                event.extendedProps.status
              ] || "";
            tippy(el, { content: `${label} — ${event.title}`, arrow: false });
          }}
          /* date click: navigate or list */
          dateClick={({ date }) => {
            const api = calendarRef.current.getApi();
            if (api.view.type === "dayGridMonth")
              api.changeView("listDay", date);
            else listTasksForDate(date);
          }}
        />
      </main>
    </div>
  );
}
