import { useEffect, useState } from "react";
import { loginWithGoogle, register } from "../firebase/authService";
import { Link, useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../utils/alerts";
import GoogleButton from "react-google-button";

import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

    const { user } = useAuth();
  
    useEffect(() => {
      if (user) navigate("/dashboard");
    }, [user, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(email, password, firstName, lastName);
      showSuccess("Account created successfully");
      navigate("/login");
    } catch (err) {
      let message = "Something went wrong. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        message = "This email is already registered.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email format.";
      } else if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      } else if (err.code === "auth/operation-not-allowed") {
        message = "Email/password accounts are not enabled.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      }

      showError(message);
    }    
  };

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      showSuccess("Signed in with Google!");
      navigate("/dashboard");
    } catch (err) {
      showError(err.message);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded shadow-md">

      <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium">First Name</label>
          <input
            type="text"
            placeholder="First Name"
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Last Name</label>
          <input
            type="text"
            placeholder="Last Name"
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="Email"
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
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-200"
        >
          Register
        </button>
      </form>

      <hr className="my-6" />

      <GoogleButton onClick={handleGoogleAuth} className="mx-auto"/>
      <p className="mt-6 text-sm text-center text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in here
        </Link>
      </p>
      </div>
    </div>
  );
}
