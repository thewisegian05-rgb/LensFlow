import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../components/Auth/Login";
import Layout from "../components/Layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

import DashboardPage from "../pages/DashboardPage";
import SchedulePage from "../pages/SchedulePage";
import WorkflowPage from "../pages/WorkflowPage";
import CullingPage from "../pages/CullingPage";
import ClientPage from "../pages/ClientPage";
import StoragePage from "../pages/StoragePage";
import MediaStorage from "../pages/MediaStorage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import SignUpPage from "../pages/SignUpPage";
import CustomerPage from "../pages/CustomerPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="workflow" element={<WorkflowPage />} />
            <Route path="culling" element={<CullingPage />} />
            <Route path="clients" element={<ClientPage />} />
            <Route path="storage" element={<MediaStorage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="/customer" element={<CustomerPage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;