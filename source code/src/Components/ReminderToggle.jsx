import React, { useRef } from "react";
import { FaCalendarAlt, FaClock } from "react-icons/fa";

export default function ReminderToggle({
  checked,
  onChange,
  reminderDate,
  reminderTime,
  setReminderDate,
  setReminderTime,
  taskDate,
  taskTime,
}) {
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  const openPicker = (ref) => {
    if (!ref.current) return;
    if (ref.current.showPicker) ref.current.showPicker();
    else ref.current.focus();
  };

  const today = new Date().toLocaleDateString("sv-SE");

  const validateReminder = () => {
    if (!reminderDate || !reminderTime || !taskDate || !taskTime) return true;

    const reminderISO = new Date(`${reminderDate}T${reminderTime}`);
    const taskISO = new Date(`${taskDate}T${taskTime}`);

    return reminderISO < taskISO;
  };

  const isValid = validateReminder();

  return (
    <div className="flex flex-col w-full gap-2">
      <div className="flex items-center justify-between">
        <span
          className="text-gray-700 dark:text-gray-300 font-medium select-none cursor-pointer"
          onClick={() => onChange({ target: { checked: !checked } })}
        >
          Set a Reminder?
        </span>

        <label className="relative inline-flex items-center cursor-pointer ml-auto">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
          />
          <span
            className="w-11 h-6 rounded-full bg-gray-300 dark:bg-gray-600
                       peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-500
                       transition-colors relative
                       after:content-[''] after:absolute after:top-0.5 after:left-0.5
                       after:w-5 after:h-5 after:bg-white after:rounded-full
                       after:transition-transform peer-checked:after:translate-x-5"
          />
        </label>
      </div>

      {checked && (
        <div className="grid grid-cols-2 gap-2">
          <div className="relative mb-4">
            <input
              ref={dateRef}
              type="date"
              min={today}
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className={`w-full p-2 pl-10 border rounded text-black dark:text-white 
                bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${
                  !isValid ? "border-red-500" : ""
                }`}
              required
            />
            <button
              type="button"
              aria-label="Pick reminder date"
              onClick={() => openPicker(dateRef)}
              className="absolute top-3 left-3 text-gray-400 dark:text-gray-300"
            >
              <FaCalendarAlt />
            </button>
          </div>

          <div className="relative">
            <input
              ref={timeRef}
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className={`w-full p-2 pl-10 border rounded text-black dark:text-white 
                bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${
                  !isValid ? "border-red-500" : ""
                }`}
              required
            />
            <button
              type="button"
              aria-label="Pick reminder time"
              onClick={() => openPicker(timeRef)}
              className="absolute top-3 left-3 text-gray-400 dark:text-gray-300"
            >
              <FaClock />
            </button>
          </div>
        </div>
      )}

      {checked && !isValid && (
        <p className="text-sm text-red-500">
          Reminder must be set before the task's due date.
        </p>
      )}
    </div>
  );
}
