
import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Login page (default route) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard (after login) */}

      {/* You can add more routes later, e.g. /projects, /settings */}
    </Routes>
  );
};

export default AppRoutes;
