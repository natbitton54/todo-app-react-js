import React from "react";

export default function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div className="text-sm flex gap-2 mt-1">
      <button className="text-red-600 hover:underline" onClick={onConfirm}>
        Delete
      </button>
      <button className="text-gray-500 hover:underline" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
