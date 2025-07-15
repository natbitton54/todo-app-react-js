import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../utils/alerts";
import { logout as firebaseLogout  } from "../firebase/authService";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      try {
        await firebaseLogout();
        showSuccess("Logged out successfully.");
        navigate("/login");
      } catch (err) {
        console.error(err);
        showError("Failed to logout. Please try again.");
      }
    };
    doLogout();
  }, [navigate]);
  return null;
}
