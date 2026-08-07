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
          value="3"
          icon={<FaUsers />}
          subtitle="↑ 12% this month"
          subtitleColor="text-green-500"
        />

        <StatCard
          title="Pending Projects"
          value="3"
          icon={<FaHourglassHalf />}
          subtitle="3 starting this week"
        />

        <StatCard
          title="Projects Editing"
          value="1"
          icon={<FaPhotoVideo />}
          subtitle="Avg 3 days to complete"
        />

        <StatCard
          title="Approx. Income"
          value="$7,700"
          icon={<FaCoins />}
          subtitle="↑ 15% vs last month"
          subtitleColor="text-green-500"
        />
      </div>

      {/* Schedule + Projects */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <TodaySchedule />
        <RecentProjects />
      </div>

      {/* Workflow Summary */}
      <WorkflowSummary />
    </div>
  );
}

export default Dashboard;