import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-gray-50">
      <img
        src={`${process.env.PUBLIC_URL}/images/robot-404.png`}
        alt="404 - Not Found Robot"
        className="w-72 h-auto mb-6"
      />
      <h1 className="text-4xl font-bold text-blue-700 mb-2">
        404 - Page Not Found
      </h1>
      <p className="text-gray-600 mb-6">
        Oops! We couldn’t find the page you were looking for.
      </p>
      <Link
        to="/"
        className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
      >
        Go Back to Dashboard
      </Link>
    </div>
  );
}
