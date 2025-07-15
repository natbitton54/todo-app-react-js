import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotFound from "../pages/NotFound";
import Logout from "../pages/Logout";

export default function CatchAllRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if(loading) return null

  if (location.pathname.endsWith("logout")) {
    if (!user) {
      return <NotFound />;
    }

    return <Logout />;
  }

  return <NotFound />;
}
