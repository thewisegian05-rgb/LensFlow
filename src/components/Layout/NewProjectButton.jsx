import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

// Opens the Schedule page with the New Event form already open.
// Styled exactly like the original header button.
function NewProjectButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/schedule?new=1")}
      className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-600 sm:px-4"
    >
      <FaPlus />

      <span className="hidden sm:inline">New Project</span>
    </button>
  );
}

export default NewProjectButton;