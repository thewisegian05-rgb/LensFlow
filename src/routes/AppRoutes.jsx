import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../components/Auth/Login";
import Layout from "../components/Layout/Layout";

import DashboardPage from "../pages/DashboardPage";
import SchedulePage from "../pages/SchedulePage";
import WorkflowPage from "../pages/WorkflowPage";
import ClientPage from "../pages/ClientPage";
import StoragePage from "../pages/StoragePage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Dashboard Layout */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="clients" element={<ClientPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;