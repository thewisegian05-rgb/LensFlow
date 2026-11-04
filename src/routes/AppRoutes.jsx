import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Login from "../components/Auth/Login";
import Layout from "../components/Layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../landingPage/LandingPage";
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
import ClientPortalPage from "../pages/ClientPortalPage";
import EmailVerifiedPage from "../pages/EmailVerifiedPage";
import PhotographersInbox from "../pages/PhotographersInbox.jsx";

function Landing() {
  const navigate = useNavigate();
  return <LandingPage onLogin={() => navigate("/login")} />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/email-verified" element={<EmailVerifiedPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* Protected dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="workflow" element={<WorkflowPage />} />
            <Route path="culling" element={<CullingPage />} />
            <Route path="clients" element={<ClientPage />} />
            <Route path="messages" element={<PhotographersInbox />} />
            <Route path="storage" element={<MediaStorage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Client portal — /* enables real path tabs like /customer/portfolio */}
        <Route path="/customer/*" element={<ClientPortalPage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;