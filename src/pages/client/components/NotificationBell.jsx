
import { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";

export default function NotificationBell({
  items = [],
  compact = false,
  menuClassName = "right-0 w-72",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);

  const unread = items.filter(
    (notification) =>
      !notification.read && !notification.read_at
  ).length;

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (
        ref.current &&
        !ref.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative shrink-0"
    >
      {/* ======================================
          NOTIFICATION BELL BUTTON
         ====================================== */}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={`Notifications${
          unread ? `, ${unread} unread` : ""
        }`}
        aria-expanded={open}
        aria-controls="client-notification-menu"
        aria-haspopup="true"
        className={`
          relative flex shrink-0
          items-center justify-center
          rounded-full border

          border-slate-200
          bg-white
          text-slate-600

          shadow-sm

          transition-all duration-200

          hover:border-sky-300
          hover:bg-slate-100
          hover:text-sky-600

          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-sky-400

          dark:border-slate-700
          dark:bg-[#0B1628]
          dark:text-slate-300
          dark:shadow-none

          dark:hover:border-slate-600
          dark:hover:bg-slate-800
          dark:hover:text-white

          ${
            compact
              ? "h-9 w-9 text-xs"
              : "h-10 w-10 text-sm"
          }

          ${
            open
              ? "border-sky-400 text-sky-600 dark:border-sky-500 dark:text-sky-300"
              : ""
          }
        `}
      >
        <FaBell aria-hidden="true" />

        {unread > 0 && (
          <span
            className="
              absolute -right-1 -top-1

              flex h-5 min-w-[20px]
              items-center justify-center

              rounded-full bg-rose-500
              px-1

              text-[10px] font-bold text-white

              shadow-sm
            "
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ======================================
          NOTIFICATION DROPDOWN
         ====================================== */}

      {open && (
        <div
          id="client-notification-menu"
          className={`
            absolute z-[80] mt-2

            overflow-hidden rounded-xl
            border border-slate-200

            bg-white p-2
            text-slate-900

            shadow-xl shadow-slate-900/10

            dark:border-slate-700
            dark:bg-[#0B1628]
            dark:text-slate-100
            dark:shadow-black/40

            ${menuClassName}
          `}
        >
          {/* MENU HEADER */}
          <div
            className="
              mb-1 flex items-center
              justify-between gap-2

              border-b border-slate-200
              px-3 py-2

              dark:border-slate-700
            "
          >
            <h3
              className="
                text-xs font-bold
                text-slate-900

                dark:text-white
              "
            >
              Notifications
            </h3>

            {unread > 0 && (
              <span
                className="
                  rounded-full
                  bg-sky-100
                  px-2 py-0.5

                  text-[10px] font-semibold
                  text-sky-700

                  dark:bg-sky-500/10
                  dark:text-sky-400
                "
              >
                {unread} new
              </span>
            )}
          </div>

          {/* EMPTY STATE */}
          {items.length === 0 ? (
            <div
              className="
                flex flex-col items-center
                gap-2 px-3 py-6
                text-center
              "
            >
              <div
                className="
                  flex h-10 w-10
                  items-center justify-center

                  rounded-full
                  bg-slate-100
                  text-slate-400

                  dark:bg-slate-800
                  dark:text-slate-500
                "
              >
                <FaBell aria-hidden="true" />
              </div>

              <p
                className="
                  text-xs text-slate-500
                  dark:text-slate-400
                "
              >
                You're all caught up.
              </p>
            </div>
          ) : (
            /* NOTIFICATION LIST */
            <ul
              className="
                custom-scrollbar
                max-h-72 space-y-1
                overflow-y-auto
              "
            >
              {items.slice(0, 8).map((notification, index) => {
                const isUnread =
                  !notification.read &&
                  !notification.read_at;

                return (
                  <li
                    key={notification.id ?? index}
                    className={`
                      rounded-lg px-3 py-2.5

                      text-sm
                      transition-colors duration-150

                      ${
                        isUnread
                          ? `
                            bg-sky-50
                            dark:bg-sky-500/10
                          `
                          : ""
                      }

                      hover:bg-slate-100
                      dark:hover:bg-slate-800/70
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`
                            break-words text-xs
                            leading-relaxed

                            ${
                              isUnread
                                ? "font-semibold text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-200"
                            }
                          `}
                        >
                          {notification.title ||
                            notification.message ||
                            "Notification"}
                        </p>

                        {notification.title &&
                          notification.message && (
                            <p
                              className="
                                mt-1 break-words
                                text-xs
                                leading-relaxed

                                text-slate-500
                                dark:text-slate-400
                              "
                            >
                              {notification.message}
                            </p>
                          )}
                      </div>

                      {isUnread && (
                        <span
                          className="
                            mt-1 h-2 w-2 shrink-0
                            rounded-full bg-sky-500
                          "
                          title="Unread notification"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
