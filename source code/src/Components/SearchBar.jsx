import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function SearchBar({
  setSearchResults,
  filter = "all",
  category = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  const handleSearchTask = useCallback(async () => {
    if (!user?.uid) return;

    const rawTerm = searchTerm.trim();
    const constraints = [];

    let term = rawTerm;
    let sortField = null;
    let sortDirection = null;
    let sortFilterField = null;
    let sortFilterValue = null;

    const advancedSortMatch = term.match(/^sort&(\w+)='([^']+)'-(asc|desc)$/);
    const basicSortMatch = term.match(/^sort&(\w+)-(asc|desc)$/);

    if (advancedSortMatch) {
      sortFilterField = advancedSortMatch[1];
      sortFilterValue = advancedSortMatch[2]; // Keep original case
      sortDirection = advancedSortMatch[3];
      sortField = "createdMs";
      term = "";
    } else if (basicSortMatch) {
      sortField = basicSortMatch[1];
      sortDirection = basicSortMatch[2];
      term = "";
    } else if (term.startsWith("sort&")) {
      setSearchResults([]);
      return;
    }

    // 🔍 Only do a lowercase search for titles
    if (term) {
      const lowered = term.toLowerCase();
      constraints.push(orderBy("titleLower"));
      constraints.push(where("titleLower", ">=", lowered));
      constraints.push(where("titleLower", "<=", lowered + "\uf8ff"));
    } else if (sortField) {
      if (sortFilterField && sortFilterValue) {
        if (sortFilterField === "category") {
          constraints.push(where("category", "==", sortFilterValue));
        } else if (sortFilterField === "done") {
          constraints.push(where("done", "==", sortFilterValue === "true"));
        } else {
          constraints.push(where(sortFilterField, "==", sortFilterValue));
        }
      } else if (category) {
        constraints.push(where("category", "==", category));
      }

      const filterOverridden = sortFilterField === "done";
      if (!filterOverridden) {
        if (filter === "done") {
          constraints.push(where("done", "==", true));
        } else if (filter === "notDone") {
          constraints.push(where("done", "==", false));
        }
      }

      constraints.push(orderBy(sortField, sortDirection));
    } else {
      return;
    }

    try {
      const q = query(
        collection(db, "users", user.uid, "tasks"),
        ...constraints
      );
      const snap = await getDocs(q);
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSearchResults(tasks);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  }, [searchTerm, setSearchResults, user, filter, category]);

  useEffect(() => {
    const id = setTimeout(handleSearchTask, 300);
    return () => clearTimeout(id);
  }, [handleSearchTask]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearchTask();
      }}
      className="relative flex-grow"
    >
      <button
        type="submit"
        className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
        title="Search"
      >
        <FaSearch />
      </button>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search task name or use: sort&title-asc, sort&title-desc, sort&category='Gaming'-desc (case-sensitive)"
        style={{ WebkitOverflowScrolling: "touch" }}
        className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-x-auto overflow-y-hidden whitespace-nowrap"
      />

      {searchTerm && (
        <button
          onClick={() => {
            setSearchTerm("");
            setSearchResults(null);
          }}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          <FaTimes />
        </button>
      )}
    </form>
  );
}
