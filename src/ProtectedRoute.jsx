
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

// A simple auth check function (you can expand this)
const isAuthenticated = () => {
  return !!localStorage.getItem("token"); // or use cookies/session
};

// ProtectedRoute wrapper
const ProtectedRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
