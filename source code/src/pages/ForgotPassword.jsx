import { sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import { showSuccess } from "../utils/alerts";
import { auth } from "../firebase/config";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showSuccess(
        "If an account exists, a reset link has been sent. " +
          "It may take a minute—check your inbox and spam folder."
      );
      setEmail("");
    } catch {
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <form
          onSubmit={handleForgotPassword}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md w-full max-w-md p-8"
        >
          <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-100">
            Forgot Password
          </h1>

          <label className="block mb-4">
            <span className="text-gray-700 dark:text-gray-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <p className="text-end mt-4">
            <Link to="/login" className="mt-4 text-blue-600 hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
