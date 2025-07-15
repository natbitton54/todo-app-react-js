import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";

export default function useTaskStats(user) {
  const [stats, setStats] = useState({
    done: 0,
    pending: 0,
    overdue: 0,
    today: 0,
    total: 0,
  });
  const [weekly, setWeekly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bestStreak, setBestStreak] = useState(0);

  const pct = (n) =>
    stats.total === 0 ? 0 : Math.round((n / stats.total) * 100);
  const totalThisWeek = weekly.reduce((sum, d) => sum + d.total, 0);
  const totalWeeklyDone = weekly.reduce((sum, d) => sum + d.done, 0);
  const averageDailyTask = (totalThisWeek / 7).toFixed(1);

  const weeklyDonePercentage =
    totalThisWeek === 0
      ? 0
      : Math.round((totalWeeklyDone / totalThisWeek) * 100);

  useEffect(() => {
    if (!user) {
      setStats({ done: 0, pending: 0, overdue: 0, today: 0, total: 0 });
      setWeekly([]);
      setCategories([]);
      setBestStreak(0);
      return;
    }

    const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const tasksRef = collection(db, "users", user.uid, "tasks");
    const catsRef = collection(db, "users", user.uid, "categories");

    let catColorMap = {};
    let taskDocs = [];

    /* ---------- utilities to recompute everything ----------- */
    function recompute() {
      /* status counters */
      let done = 0,
        pending = 0,
        overdue = 0,
        today = 0;

      /* weekly map */
      const weekMap = Object.fromEntries(
        DAYS_ORDER.map((d) => [d, { done: 0, total: 0 }])
      );

      /* category counts */
      const catCountMap = new Map();

      /* done-date set for streak calc */
      const doneDateSet = new Set();

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(
        startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7)
      );
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      /* iterate tasks */
      taskDocs.forEach((task) => {
        const isDone = !!task.done;

        /* parse due date*/
        let due = null;
        if (task.due instanceof Date) {
          due = task.due;
        } else if (typeof task.due === "string") {
          const d = new Date(task.due);
          if (!Number.isNaN(d.getTime())) due = d;
        } else if (task.due?.toDate) {
          due = task.due.toDate();
        }

        /* today counter */
        if (due && due >= startOfToday && due <= endOfToday) today++;

        /* status & overdue*/
        if (isDone) {
          done++;

          let completed = null;
          if (task.completedAt instanceof Date) {
            completed = task.completedAt;
          } else if (typeof task.completedAt === "string") {
            const d = new Date(task.completedAt);
            if (!Number.isNaN(d.getTime())) completed = d;
          } else if (task.completedAt?.toDate) {
            completed = task.completedAt.toDate();
          }

          const dateToUse = completed || due; 
          if (dateToUse) {
            doneDateSet.add(dateToUse.toISOString().substring(0, 10));
          }
        } else if (due && due < now) {
          overdue++;
        } else {
          pending++;
        }

        /* weekly buckets*/
        if (due && due >= startOfWeek && due <= endOfWeek) {
          const label = DAYS_ORDER[(due.getDay() + 6) % 7]; 
          weekMap[label].total++;
          if (isDone) weekMap[label].done++;
        }

        /*  category counts */
        const catName = (task.category || "uncategorised").toLowerCase();
        catCountMap.set(catName, (catCountMap.get(catName) || 0) + 1);
      });

      /* push overall stats */
      setStats({ done, pending, overdue, today, total: taskDocs.length });

      /* push weekly */
      setWeekly(
        DAYS_ORDER.map((d) => ({
          day: d,
          done: weekMap[d].done,
          total: weekMap[d].total,
        }))
      );

      /* push categories with live colors */
      const catArray = [...catCountMap.entries()]
        .map(([name, count]) => ({
          name,
          count,
          color: catColorMap[name] || "#999",
        }))
        .sort((a, b) => b.count - a.count);

      setCategories(catArray);

      const sortedDates = Array.from(doneDateSet).sort(); // ISO strings ascending
      let streak = 0,
        maxStreak = 0,
        prev = null;
      sortedDates.forEach((iso) => {
        if (!prev) streak = 1;
        else {
          const prevDate = new Date(prev);
          prevDate.setDate(prevDate.getDate() + 1);
          streak =
            prevDate.toISOString().substring(0, 10) === iso ? streak + 1 : 1;
        }
        maxStreak = Math.max(maxStreak, streak);
        prev = iso;
      });
      setBestStreak(maxStreak);
    }

    const unsubTasks = onSnapshot(tasksRef, (snap) => {
      taskDocs = snap.docs.map((d) => d.data());
      recompute();
    });

    const unsubCategories = onSnapshot(catsRef, (snap) => {
      const map = {};
      snap.forEach((d) => {
        const data = d.data();
        const key = (data.name || "").toLowerCase();
        if (key) map[key] = data.color || "#999";
      });
      catColorMap = map;
      recompute();
    });

    return () => {
      unsubTasks();
      unsubCategories();
    };
  }, [user]);

  return {
    stats,
    donePercentage: pct(stats.done),
    weeklyDonePercentage,
    averageDailyTask,
    pendingPercentage: pct(stats.pending),
    overDuePercentage: pct(stats.overdue),
    todayPercentage: pct(stats.today),
    weekly,
    categories,
    bestStreak,
  };
}
