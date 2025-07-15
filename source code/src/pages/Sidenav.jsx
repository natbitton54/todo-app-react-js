import React, { useEffect, useReducer, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaClipboardCheck,
  FaFolder,
  FaBars,
  FaTimes,
  FaCalendarAlt,
  FaChartLine,
  FaChartArea,
  FaChartBar
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "../styles/sidenav.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import FormCategory from "../Components/FormCategory";
import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { showError, showSuccess } from "../utils/alerts";
import ConfirmDelete from "../Components/ConfirmDelete";
import useDarkMode from "../hooks/useDarkMode";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

function categoryReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "DELETE":
      return state.filter((c) => c.id !== action.payload.id);
    case "EDIT":
      return state.map((c) =>
        c.id === action.payload.id
          ? {
              ...c,
              name: action.payload.name,
              color: action.payload.color,
              link: slugify(action.payload.name),
            }
          : c
      );
    default:
      return state;
  }
}

export default function Sidenav() {
  const { user } = useAuth();
  const [showCategories, setShowCategories] = useState(true);
  const [categories, dispatch] = useReducer(categoryReducer, []);
  const [displayName, setDisplayName] = useState("User");
  const [showForm, setShowForm] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editInitialValue, setEditInitialValue] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [darkMode, setDarkMode] = useDarkMode();
  const [showSidebar, setShowSidebar] = useState(false); // mobile toggle
  const location = useLocation();
  const currentPath = location.pathname;

  /* ---------- Firestore & user display name ---------- */
  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "categories"),
      (ss) =>
        dispatch({
          type: "LOAD",
          payload: ss.docs.map((d) => ({ id: d.id, ...d.data() })),
        })
    );
    return unsubscribe;
  }, [user]);

  // dark mode with alt + d

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const altOrOption = isMac ? e.altKey : e.altKey;

      if(altOrOption && e.key.toLowerCase() === 'd'){
        e.preventDefault()
        setDarkMode(!darkMode)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setDarkMode, darkMode])

  /* ---------- Helpers ---------- */
  const toggleCategories = () => setShowCategories((p) => !p);

  const handleNameExist = async (name, excludeId = null) => {
    const snap = await getDocs(collection(db, "users", user.uid, "categories"));
    const exists = snap.docs.some(
      (d) =>
        d.id !== excludeId &&
        d.data().name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) showError("A category with that name already exists.");
    return exists;
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "categories", id));
      dispatch({ type: "DELETE", payload: { id } });
      showSuccess("Category deleted successfully!");
    } catch (err) {
      showError("Error deleting category: " + (err.message || err));
    }
  };

  const handleEditCategory = async (id, newName, newColor) => {
    try {
      const original = categories.find((c) => c.id === id);
      const nameChanged =
        original &&
        original.name.toLowerCase() !== newName.trim().toLowerCase();

      if (nameChanged && (await handleNameExist(newName, id))) return;

      await updateDoc(doc(db, "users", user.uid, "categories", id), {
        name: newName,
        color: newColor,
        link: slugify(newName),
      });

      dispatch({
        type: "EDIT",
        payload: { id, name: newName, color: newColor },
      });

      showSuccess("Category updated successfully!");
    } catch (err) {
      showError("Error editing category: " + (err.message || err));
    }
  };

  const handleAddCategories = async (name, color) => {
    try {
      if (await handleNameExist(name)) return;
      await addDoc(collection(db, "users", user.uid, "categories"), {
        name: name.trim(),
        color,
        link: slugify(name),
      });
      setShowForm(false);
    } catch (err) {
      showError("Error adding category: " + (err.message || err));
    }
  };

  /* ---------- JSX ---------- */
  return (
    <>
      {/* Hamburger (mobile only) */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-full
             bg-white text-gray-800
             dark:bg-[#1f2937] dark:text-white
             shadow-2xl animated-ring" /* ← add this class */
        onClick={() => setShowSidebar((p) => !p)}
      >
        {showSidebar ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 h-screen w-64
        transform transition-transform duration-300 ease-in-out
        ${showSidebar ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
        md:h-auto md:min-h-screen
        md:flex-shrink-0
        z-40 overflow-y-auto
        bg-gray-100 dark:bg-[#111827]
        text-gray-900 dark:text-gray-100
        border-r border-gray-300 dark:border-gray-700
      `}
      >
        <div className="flex flex-col justify-between w-full h-full overflow-y-auto">
          {/* ---------- Top section ---------- */}
          <div className="flex flex-col items-center py-6">
            <Link to="/" onClick={() => setShowSidebar(false)}>
              <img
                src={`${process.env.PUBLIC_URL}/images/todo-app-logo.png`}
                alt="App logo"
                className="w-28 h-28 object-contain"
              />
            </Link>
            <p className="mt-2">{displayName}</p>

            {/* Tasks link */}
            <Link
              to="/dashboard"
              className="w-full mt-6"
              onClick={() => setShowSidebar(false)}
            >
              <div
                className={`w-full flex items-center gap-2 px-6 py-2 font-semibold rounded transition
                ${
                  currentPath === "/dashboard"
                    ? "bg-purple-600 text-white"
                    : "text-[#a859f7] dark:text-[#a859f7] hover:bg-purple-100 dark:hover:bg-purple-800"
                }`}
              >
                <FaClipboardCheck />
                <span>Tasks</span>
              </div>
            </Link>

            <Link
              to="/dashboard/calendar"
              className="w-full mt-0"
              onClick={() => setShowSidebar(false)}
            >
              <div
                className={`w-full flex items-center gap-2 px-6 py-2 font-semibold rounded transition
                ${
                  currentPath === "/dashboard/calendar"
                    ? "bg-purple-600 text-white"
                    : "text-yellow-600 dark:text-yellow-600 hover:bg-purple-100 dark:hover:bg-purple-800"
                }`}
              >
                <FaCalendarAlt />
                <span>Calendar</span>
              </div>
            </Link>

            {/* Account link */}
            <Link
              to="/dashboard/account"
              className="w-full mt-2"
              onClick={() => setShowSidebar(false)}
            >
              <div
                className={`w-full flex items-center gap-2 px-6 py-2 font-semibold rounded transition
                ${
                  currentPath === "/dashboard/account"
                    ? "bg-purple-600 text-white"
                    : "text-blue-400 dark:text-blue-300 hover:bg-purple-100 dark:hover:bg-purple-800"
                }`}
              >
                <FontAwesomeIcon icon={faUser} />
                <span>Account</span>
              </div>
            </Link>

            <Link
              to="/dashboard/statistics"
              className="w-full mt-2"
              onClick={() => setShowSidebar(false)}
            >
              <div
                className={`w-full flex items-center gap-2 px-6 py-2 font-semibold rounded transition
                ${
                  currentPath === "/dashboard/statistics"
                    ? "bg-purple-600 text-white"
                    : "text-green-400 dark:text-green-300 hover:bg-purple-100 dark:hover:bg-purple-800"
                }`}
              >
                <FaChartBar/>
                <span>Statistics</span>
              </div>
            </Link>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full mt-2 flex items-center gap-2 px-5 py-2 font-semibold rounded text-black dark:text-white hover:bg-purple-100 dark:hover:bg-purple-800 transition"
            >
              {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
            </button>

            {/* ---------- Categories ---------- */}
            <div className="w-full px-6 mt-4">
              <button
                onClick={toggleCategories}
                className="flex items-center justify-between w-full font-semibold mb-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <FaFolder />
                  Categories
                </span>
                <span>{showCategories ? "▲" : "▼"}</span>
              </button>

              {showCategories && (
                <ul className="space-y-2 text-sm pl-6 text-gray-700 dark:text-gray-300">
                  {categories.map((c) => (
                    <div key={c.id} className="flex flex-col">
                      {editCategoryId === c.id ? (
                        <FormCategory
                          initialValue={editInitialValue.name}
                          initialColor={editInitialValue.color}
                          isEditing
                          onSubmit={(newName, newColor) => {
                            handleEditCategory(c.id, newName, newColor);
                            setEditCategoryId(null);
                          }}
                          onCancel={() => setEditCategoryId(null)}
                        />
                      ) : (
                        <>
                          <div className="flex items-center justify-between pr-2 hover:bg-purple-50 dark:hover:bg-gray-800 rounded">
                            <Link
                              to={`/dashboard/categories/${c.link}`}
                              className={`flex items-center gap-2 py-1 px-2 ${
                                currentPath ===
                                `/dashboard/categories/${c.link}`
                                  ? "bg-purple-100 dark:bg-purple-700 text-purple-800 dark:text-white font-semibold"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                              onClick={() => setShowSidebar(false)}
                            >
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: c.color }}
                              />
                              {c.name}
                            </Link>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditCategoryId(c.id);
                                  setEditInitialValue({
                                    name: c.name,
                                    color: c.color,
                                  });
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              {deleteCategoryId !== c.id && (
                                <button
                                  onClick={() => setDeleteCategoryId(c.id)}
                                  className="text-xs ml-2 text-red-600 dark:text-red-400 hover:underline"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          {deleteCategoryId === c.id && (
                            <div className="flex justify-end mr-2">
                              <ConfirmDelete
                                onConfirm={() => {
                                  handleDeleteCategory(c.id);
                                  setDeleteCategoryId(null);
                                }}
                                onCancel={() => setDeleteCategoryId(null)}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {showForm ? (
                    <li>
                      <FormCategory
                        onSubmit={handleAddCategories}
                        onCancel={() => setShowForm(false)}
                      />
                    </li>
                  ) : (
                    <li
                      onClick={() => setShowForm(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Add new
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* ---------- Logout ---------- */}
          <div className="px-6 mb-4 flex flex-col items-center">
            <Link
              to="/logout"
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition"
              onClick={() => setShowSidebar(false)}
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Logout
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
