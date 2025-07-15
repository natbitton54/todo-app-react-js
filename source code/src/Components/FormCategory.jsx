// FormCategory.jsx
import React, { useEffect, useState } from "react";
import { showError } from "../utils/alerts"; // ⬅️ same helper you use elsewhere

export default function FormCategory({
  onSubmit,
  onCancel,
  existingNames = [], 
  initialValue = "", 
  initialColor = "#a78bfa", 
  isEditing = false,
}) {
  const [name, setName] = useState(initialValue);
  const [color, setColor] = useState(initialColor);

  // keep state in sync when dialog re-opens
  useEffect(() => {
    setName(initialValue);
    setColor(initialColor);
  }, [initialValue, initialColor]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();

    /* —— 1. Validate name —— */
    if (!trimmed) {
      showError("Category name is required.");
      return;
    }

    /* —— 2. Check duplicates —— */
    const nameChanged = trimmed.toLowerCase() !== initialValue.toLowerCase();
    const duplicate = existingNames
      .map((n) => n.toLowerCase())
      .includes(trimmed.toLowerCase());

    if ((!isEditing && duplicate) || (isEditing && nameChanged && duplicate)) {
      showError("Category name already exists.");
      return;
    }

    /* —— 3. All good —— */
    onSubmit(trimmed, color);

    // reset only when adding a fresh category
    if (!isEditing) {
      setName("");
      setColor("#a78bfa");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3 text-sm">
      {/* NAME INPUT – editable in both modes */}
      <input
        type="text"
        placeholder="Category Name"
        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* COLOUR PICKER */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="colorPicker"
          className="text-gray-700 dark:text-gray-300 font-medium"
        >
          Pick a colour:
        </label>
        <input
          id="colorPicker"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-purple-600 text-white px-4 py-1.5 rounded-md hover:bg-purple-700 transition"
        >
          {isEditing ? "Save" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 dark:text-gray-400 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
