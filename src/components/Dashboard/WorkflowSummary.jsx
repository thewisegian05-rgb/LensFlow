import {
  FaHourglassHalf,
  FaUserClock,
  FaBoxOpen,
  FaCheckCircle,
} from "react-icons/fa";

const workflow = [
  {
    title: "Editing",
    count: 3,
    color: "bg-yellow-500",
    icon: <FaHourglassHalf />,
  },
  {
    title: "Waiting Approval",
    count: 2,
    color: "bg-sky-500",
    icon: <FaUserClock />,
  },
  {
    title: "Ready for Delivery",
    count: 4,
    color: "bg-purple-500",
    icon: <FaBoxOpen />,
  },
  {
    title: "Completed",
    count: 15,
    color: "bg-green-500",
    icon: <FaCheckCircle />,
  },
];

function WorkflowSummary() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="text-xl font-semibold text-white mb-5">
        Workflow Summary
      </h3>

      <div className="space-y-4">
        {workflow.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center text-white`}
              >
                {item.icon}
              </div>

              <span className="text-slate-300">
                {item.title}
              </span>
            </div>

            <span className="text-white font-bold text-lg">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkflowSummary;