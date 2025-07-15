import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Sidenav from "./Sidenav";
import { showError } from "../utils/alerts";

export default function Account() {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        } else {
          showError("User data not found.");
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        showError("Failed to load user data. Please try again later.");
      }
      setLoading(false);
    };
    fetchUserData();
  }, [user]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors flex">
      <Sidenav />
      <div className="flex-1 flex items-start justify-center p-6 mt-16">
        <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-lg p-8 space-y-6 border border-gray-200 dark:border-none">
          <h1 className="text-3xl font-bold text-center">Account Details</h1>

          {loading ? (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Loading user data...
            </p>
          ) : userInfo ? (
            <form className="space-y-5">
              {[
                { label: "First Name", value: userInfo.firstName },
                { label: "Last Name", value: userInfo.lastName },
                { label: "Email", value: userInfo.email },
                {
                  label: "Joined",
                  value: userInfo.createdAt?.seconds
                    ? new Date(
                        userInfo.createdAt.seconds * 1000
                      ).toLocaleString()
                    : "N/A",
                },
              ].map((field, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={field.value}
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 cursor-not-allowed"
                  />
                </div>
              ))}
            </form>
          ) : (
            <p className="text-red-500 text-center mt-20">
              Failed to load user data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
