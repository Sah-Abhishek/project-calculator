
import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProjectPage from "./pages/Project";
import Layout from "./Layout";
import Productivity from "./pages/Productivity";
import Calculator from "./pages/Calculator";
import BillingPage from "./pages/Billing";
import ResourcesPage from "./pages/Resources";
import MasterDatabase from "./pages/MasterDatabase";
import Invoices from "./pages/Invoices";
import SettingsPage from "./pages/Settings";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Login page (default route) */}
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>

        <Route path="/projects" element={<ProjectPage />} />
        <Route path="/productivity" element={<Productivity />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/" element={<Calculator />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/masterdatabase" element={<MasterDatabase />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Dashboard (after login) */}

      {/* You can add more routes later, e.g. /projects, /settings */}
    </Routes>
  );
};

export default AppRoutes;
