import {
  FaUsers,
  FaHourglassHalf,
  FaPhotoVideo,
  FaCoins,
} from "react-icons/fa";

import StatCard from "./StatCard";
import TodaySchedule from "./TodaySchedule";
import RecentProjects from "./RecentProjects";
import WorkflowSummary from "./WorkflowSummary";
import RevenueChart from "./RevenueChart";

function Dashboard() {
  return (
    <div>
      {/* Title */}
      <h2 className="text-2xl font-semibold text-white mb-6">
        Dashboard Overview
      </h2>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Clients"
          value="0"
          icon={<FaUsers />}
          subtitle="No clients yet"
        />

        <StatCard
          title="Pending Projects"
          value="0"
          icon={<FaHourglassHalf />}
          subtitle="No pending projects"
        />

        <StatCard
          title="Projects Editing"
          value="0"
          icon={<FaPhotoVideo />}
          subtitle="No projects in editing"
        />

        <StatCard
          title="Approx. Income"
          value="₱0"
          icon={<FaCoins />}
          subtitle="No recorded income yet"
        />
      </div>

      {/* Schedule + Projects */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <TodaySchedule />
        <RecentProjects />
      </div>

      {/* Workflow + Revenue */}
      <div className="grid lg:grid-cols-2 gap-6">
        <WorkflowSummary />
        <RevenueChart />
      </div>
    </div>
  );
}

export default Dashboard;