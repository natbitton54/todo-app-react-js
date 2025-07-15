import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    // return <div className="text-center mt-10">Checking login status...</div>;
    return
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
