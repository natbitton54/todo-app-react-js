import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, loginWithGoogle } from "../firebase/authService";
import { showError, showSuccess } from "../utils/alerts";
import GoogleButton from "react-google-button";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false)
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
      showSuccess("Logged in successfully");
      navigate("/dashboard");
    } catch (err) {
      let message = "Something went wrong. Please try again.";

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        message = "Email or password is incorrect.";
      } else if (err.code === "auth/too-many-requests") {
        message =
          "Too many login attempts. Please wait a moment and try again.";
      } else if (err.code === "auth/invalid-email") {
        message = "The email address is badly formatted.";
      } else if (err.code === "auth/internal-error") {
        message = "Internal server error. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your internet connection.";
      } else if (err.code === "auth/invalid-credential") {
        message = "Invalid login credentials.";
      }

      showError(message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle(rememberMe);
      showSuccess("Logged in successfully");
      navigate("/dashboard");
    } catch (err) {
      showError(err.message);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-200"
          >
            Login
          </button>
        </form>

        <hr className="my-6 mb-4" />
        <div className="flex mb-4">
          <input
            type="checkbox"
            className="mr-2 ml-2 cursor-pointer"
            id="remember-me"
            value={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label
            className="cursor-pointer hover:text-[#305ae6] hover:underline"
            htmlFor="remember-me"
          >
            Remember me?
          </label>
        </div>
        <div className="flex items-center justify-center space-x-4">
          <GoogleButton onClick={handleGoogleAuth} />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
          <span>
            Don’t have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register here
            </Link>
          </span>

          <Link
            to="/forgot-password"
            className="mt-2 sm:mt-0 text-blue-600 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
