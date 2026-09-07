      {/* =================================================
          STAGE-SPECIFIC ACTION BUTTON
          ================================================= */}

      {project.stage === "shoot-completed" && (
        <button
          type="button"
          onClick={() => onMoveStage(project.id, "editing")}
          className="
            w-full mt-3 py-2 rounded-lg
            bg-amber-500 hover:bg-amber-600
            text-slate-900 font-semibold text-sm
            transition
          "
        >
          Start Edit
        </button>
      )}

      {project.stage === "editing" && (
        <button
          type="button"
          onClick={() => onMoveStage(project.id, "delivered")}
          className="
            w-full mt-3 py-2 rounded-lg
            bg-emerald-500 hover:bg-emerald-600
            text-slate-900 font-semibold text-sm
            transition
          "
        >
          Album Sent
        </button>
      )}