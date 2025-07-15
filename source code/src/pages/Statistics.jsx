import React from "react";
import Sidenav from "./Sidenav";
import { FaBullseye } from "react-icons/fa";
import {
  AlertCircle,
  BarChart,
  Calendar,
  CheckCircle,
  Clock,
  Group,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import useTaskStats from "../hooks/useTaskStats";
import { useAuth } from "../context/AuthContext";
import { average } from "firebase/firestore";

export default function Statistics() {
  const { user } = useAuth();
  const {
    stats,
    donePercentage,
    weekly,
    categories,
    weeklyDonePercentage,
    averageDailyTask,
    bestStreak,
  } = useTaskStats(user);

  return (
    <div className="flex min-h-screen dark:bg-[#1c2230]">
      <Sidenav />

      <div className="flex-1 px-4 sm:px-8 max-w-7xl mx-auto">
        <h1 className="mt-10 text-center text-4xl font-semibold text-black dark:text-white">
          Task Statistics
        </h1>
        <p className="mt-2 text-center text-gray-500 dark:text-gray-300">
          Your productivity insights and task management overview
        </p>

        <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-5">
          <div className="flex items-center rounded-xl border border-gray-200 p-5 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="bg-blue-100 dark:bg-blue-700/20 text-blue-600 dark:text-blue-400 flex h-12 w-12 items-center justify-center rounded-xl">
              <FaBullseye className="text-2xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Tasks
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-gray-200 p-4 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="bg-green-100 dark:bg-green-700/20 text-green-600 dark:text-green-400 flex h-12 w-12 items-center justify-center rounded-xl">
              <CheckCircle className="text-2xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Completed
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.done}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-gray-200 p-4 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="bg-yellow-100 dark:bg-yellow-700/20 text-yellow-600 dark:text-yellow-400 flex h-12 w-12 items-center justify-center rounded-xl">
              <Clock className="text-2xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pending
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.pending}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-gray-200 p-4 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="bg-red-100 dark:bg-red-700/20 text-red-600 dark:text-red-400 flex h-12 w-12 items-center justify-center rounded-xl">
              <AlertCircle className="text-2xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Overdue
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.overdue}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-gray-200 p-4 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="bg-orange-100 dark:bg-orange-700/20 text-orange-600 dark:text-orange-400 flex h-12 w-12 items-center justify-center rounded-xl">
              <Calendar className="text-2xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Today
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.today}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="flex items-center rounded-xl border border-gray-200 p-5 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="w-full">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2 text-gray-800 dark:text-white" />
                <h3 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Overall Completion Rate
                </h3>
              </div>

              <div className="flex justify-between text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  Completed Tasks
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {donePercentage}%
                </p>
              </div>

              <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${donePercentage}%` }}
                />
              </div>

              <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                {stats.done} out of {stats.total} completed
              </p>
            </div>
          </div>

          <div className="flex items-start rounded-xl border border-gray-200 p-5 shadow dark:border-gray-700 dark:bg-[#1e2836]">
            <div className="w-full">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 mr-2 text-gray-800 dark:text-white" />
                <h3 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Weekly Progress
                </h3>
              </div>

              {weekly?.map(({ day, done, total }) => {
                const pct = total ? (done / total) * 100 : 0;
                return (
                  <div key={day} className="flex items-center text-sm mb-2">
                    <span className="w-12 text-gray-700 dark:text-gray-300">
                      {day}
                    </span>

                    <div className="flex-1 mx-2 bg-gray-600 dark:bg-gray-600 h-2 rounded-full">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <span className="w-12 text-right text-gray-700 dark:text-gray-300">
                      {done}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 shadow dark:border-gray-700 dark:bg-[#1e2836] mt-6">
          <div className="w-full">
            <div className="flex items-center mb-4">
              <Group className="w-5 h-5 mr-2 text-gray-800 dark:text-white" />
              <h3 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Tasks by Category
              </h3>
            </div>

            {/* Stacked progress bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-gray-300 dark:bg-gray-600 mb-6">
              {categories.map((category) => {
                const percentage = stats.total
                  ? (category.count / stats.total) * 100
                  : 0;

                return (
                  <div
                    key={category.name}
                    style={{
                      width: `${percentage}%`,
                      background: category.color || "#999",
                    }}
                  />
                );
              })}
            </div>

            <div className="space-y-3">
              {categories.map((category) => {
                const percentage = stats.total
                  ? (category.count / stats.total) * 100
                  : 0;

                return (
                  <div
                    key={category.name}
                    className="flex items-center justify-between"
                  >
                    {/* Left: dot + name + task count */}
                    <div className="flex items-start space-x-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full mt-1.5"
                        style={{ background: category.color || "#999" }}
                      />
                      <div>
                        <p className="font-medium capitalize text-gray-900 dark:text-white">
                          {category.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {category.count} {""}
                          {category.count === 1 ? "task" : "tasks"}
                        </p>
                      </div>
                    </div>

                    {/* right - percentage */}
                    <span className="text-sm text-gray-800 dark:text-gray-300">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-6 shadow dark:border-gray-700 dark:bg-[#1e2836] mt-6">
          <div className="flex items-center mb-6">
            <BarChart className="w-6 h-6 mr-2 text-gray-800 dark:text-white" />
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Productivity Insights
            </h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 py-8">
              <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                {weeklyDonePercentage}%
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This&nbsp;Week
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 py-8">
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {averageDailyTask}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Average Daily Task
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 py-8">
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {bestStreak}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Best Task Completion Streak (Days)
              </p>
            </div>
          </div>
        </div>
        <div className="mb-5"></div>
      </div>
    </div>
  );
}
