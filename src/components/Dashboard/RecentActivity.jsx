import {
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaSpinner,
} from "react-icons/fa";

const projects = [];

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
        {projects.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <p className="text-sm text-slate-500">
              No recent projects.
            </p>
          </div>
        ) : (
          projects.map((project) => (
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
          ))
        )}
      </div>
    </div>
  );
}

export default RecentProjects;