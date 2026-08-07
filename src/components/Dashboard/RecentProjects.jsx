import {
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaSpinner,
} from "react-icons/fa";

const projects = [
  {
    id: 1,
    title: "Smith Wedding",
    client: "John & Jane Smith",
    status: "Editing",
    progress: 65,
    icon: <FaSpinner />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    id: 2,
    title: "TechCorp Event",
    client: "TechCorp Ltd.",
    status: "Completed",
    progress: 100,
    icon: <FaCheckCircle />,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    id: 3,
    title: "Garcia Prenup",
    client: "Mark & Angela Garcia",
    status: "Scheduled",
    progress: 15,
    icon: <FaClock />,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
];

function RecentProjects() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-semibold text-white">
          Recent Projects
        </h3>

        <button className="text-sm text-sky-400 hover:text-sky-300">
          View All
        </button>
      </div>

      <div className="space-y-5">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex gap-4 items-center"
          >
            <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center text-sky-400">
              <FaCamera size={22} />
            </div>

            <div className="flex-1">
              <h4 className="text-white font-medium">
                {project.title}
              </h4>

              <p className="text-slate-400 text-sm">
                {project.client}
              </p>

              <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full"
                  style={{
                    width: `${project.progress}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-right">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${project.bg} ${project.color}`}
              >
                {project.icon}
                {project.status}
              </div>

              <p className="text-slate-500 text-xs mt-2">
                {project.progress}% Complete
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentProjects;