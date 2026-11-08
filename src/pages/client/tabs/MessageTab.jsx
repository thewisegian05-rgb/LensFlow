
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useOutletContext } from "react-router-dom";

import {
  FaSearch,
  FaCamera,
  FaArrowLeft,
  FaCommentDots,
  FaTrash,
} from "react-icons/fa";

import Avatar from "../components/ui/Avatar";
import ChatThread from "../../../components/Chat/ChatThread";

import { supabase } from "../../../lib/supabaseClient";

import {
  getFeaturedPhotoSignedUrl,
  getProfile,
} from "../utils/portalUrls";

// ==========================================
// MESSAGE SETTINGS
// ==========================================

const MSG_COLUMNS =
  "id, photographer_id, sender_id, body, read_at, created_at";

const cardClass = `
  min-w-0 overflow-hidden rounded-2xl

  border border-slate-200
  bg-white
  text-slate-900

  shadow-sm

  dark:border-slate-700/80
  dark:bg-[#0B1628]
  dark:text-slate-100
  dark:shadow-black/10
`;

// ==========================================
// UTILITIES
// ==========================================

function formatWhen(iso) {
  if (!iso) return "";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
}

// ==========================================
// PHOTOGRAPHER THUMBNAIL
// ==========================================

function Thumb({
  url,
  size = "h-11 w-11",
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className={`
        ${size}
        shrink-0 rounded-full
        border border-slate-200
        object-cover

        dark:border-slate-700
      `}
    />
  ) : (
    <span
      className={`
        ${size}
        flex shrink-0
        items-center justify-center

        rounded-full
        border border-slate-200
        bg-slate-100

        text-slate-500

        dark:border-slate-700
        dark:bg-slate-800
        dark:text-slate-400
      `}
    >
      <FaCamera className="text-sm" />
    </span>
  );
}

// ==========================================
// MESSAGES PAGE
// ==========================================

export default function MessageTab() {
  const { portal, activeId } =
    useOutletContext() || {};

  // ========================================
  // STATE
  // ========================================

  const [userId, setUserId] = useState(null);

  const [connections, setConnections] =
    useState([]);

  const [connLoading, setConnLoading] =
    useState(true);

  const [profiles, setProfiles] = useState({});

  const [all, setAll] = useState([]);
  const [msgLoading, setMsgLoading] = useState(true);

  const [selectedId, setSelectedId] =
    useState(null);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [hidden, setHidden] = useState({});

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const didInit = useRef(false);

  // ========================================
  // GET SIGNED-IN CUSTOMER
  // ========================================

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data, error: authError }) => {
        if (cancelled) return;

        if (authError) {
          console.error(
            "Unable to get customer:",
            authError
          );

          setError(
            "Unable to load your account."
          );
        }

        const id = data?.user?.id ?? null;

        setUserId(id);

        if (!id) {
          setMsgLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;

        console.error(
          "Unable to load customer:",
          err
        );

        setMsgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ========================================
  // RESTORE HIDDEN CONVERSATIONS
  // ========================================

  useEffect(() => {
    if (!userId) return;

    try {
      const saved = localStorage.getItem(
        `hiddenConvos:${userId}`
      );

      setHidden(
        saved ? JSON.parse(saved) : {}
      );
    } catch {
      setHidden({});
    }
  }, [userId]);

  // ========================================
  // LOAD CONNECTED PHOTOGRAPHERS
  // ========================================

  useEffect(() => {
    let cancelled = false;

    const loadConnections = async () => {
      try {
        const {
          data,
          error: connError,
        } = await supabase.rpc(
          "my_connections"
        );

        if (cancelled) return;

        if (connError) {
          throw connError;
        }

        const rows = Array.isArray(data)
          ? data
          : [];

        setConnections(rows);
        setConnLoading(false);

        rows.forEach(async (connection) => {
          const id =
            connection.photographer_id;

          if (!id) return;

          try {
            const {
              data: photographerPortal,
              error: portalError,
            } = await supabase.rpc(
              "get_portal",
              {
                p_photographer_id: id,
              }
            );

            if (
              cancelled ||
              portalError ||
              !photographerPortal
            ) {
              return;
            }

            let profile = {};

            try {
              profile =
                getProfile(photographerPortal) ||
                {};
            } catch {
              profile = {};
            }

            const path =
              profile.avatar_path ||
              photographerPortal.avatar_path ||
              null;

            let avatarUrl = null;

            if (path) {
              try {
                avatarUrl = /^https?:\/\//i.test(path)
                  ? path
                  : await getFeaturedPhotoSignedUrl(
                      path
                    );
              } catch {
                avatarUrl = null;
              }
            }

            if (cancelled) return;

            setProfiles((previous) => ({
              ...previous,

              [id]: {
                name:
                  profile.display_name ||
                  profile.username ||
                  profile.name ||
                  null,

                avatarUrl,
              },
            }));
          } catch (err) {
            console.error(
              "Unable to load photographer details:",
              err
            );
          }
        });
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Unable to load connections:",
          err
        );

        setError(
          "Couldn't load your conversations."
        );

        setConnLoading(false);
      }
    };

    loadConnections();

    return () => {
      cancelled = true;
    };
  }, []);

  // ========================================
  // SELECT ACTIVE PHOTOGRAPHER INITIALLY
  // ========================================

  useEffect(() => {
    if (
      didInit.current ||
      connections.length === 0
    ) {
      return;
    }

    didInit.current = true;

    if (
      activeId &&
      connections.some(
        (connection) =>
          connection.photographer_id === activeId
      )
    ) {
      setSelectedId(activeId);
    }
  }, [connections, activeId]);

  // ========================================
  // LOAD MESSAGES AND SUBSCRIBE TO REALTIME
  // ========================================

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadMessages = async () => {
      setMsgLoading(true);

      const {
        data,
        error: loadError,
      } = await supabase
        .from("messages")
        .select(MSG_COLUMNS)
        .eq("client_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1000);

      if (cancelled) return;

      if (loadError) {
        console.error(
          "Failed to load messages:",
          loadError
        );

        setError(
          "Couldn't load your messages. Check your connection and try again."
        );
      } else {
        setAll(
          (data || []).slice().reverse()
        );
      }

      setMsgLoading(false);
    };

    loadMessages();

    const filter = `client_id=eq.${userId}`;

    const channel = supabase
      .channel(`inbox:${userId}`)

      // New messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter,
        },
        (payload) => {
          const row = payload.new;

          setAll((previous) =>
            previous.some(
              (message) =>
                message.id === row.id
            )
              ? previous
              : [...previous, row]
          );
        }
      )

      // Read receipts
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter,
        },
        (payload) => {
          const row = payload.new;

          setAll((previous) =>
            previous.map((message) =>
              message.id === row.id
                ? {
                    ...message,
                    read_at: row.read_at,
                  }
                : message
            )
          );
        }
      )

      // Deleted messages
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const id = payload.old?.id;

          if (!id) return;

          setAll((previous) =>
            previous.filter(
              (message) =>
                message.id !== id
            )
          );
        }
      )

      .subscribe();

    return () => {
      cancelled = true;

      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ========================================
  // CONVERSATION LIST
  // ========================================

  const conversations = useMemo(() => {
    const list = connections
      .filter(
        (connection) =>
          connection.photographer_id
      )
      .map((connection) => {
        const id =
          connection.photographer_id;

        const messages = all.filter(
          (message) =>
            message.photographer_id === id
        );

        const last =
          messages[messages.length - 1] ||
          null;

        const unread = messages.filter(
          (message) =>
            message.sender_id !== userId &&
            !message.read_at &&
            !message.pending
        ).length;

        return {
          id,

          name:
            profiles[id]?.name ||
            connection.display_name ||
            "Photographer",

          avatarUrl:
            profiles[id]?.avatarUrl ||
            null,

          last,
          unread,
        };
      })
      .filter((conversation) => {
        const hiddenAt =
          hidden[conversation.id];

        if (!hiddenAt) return true;

        // A new message restores the conversation.
        return conversation.last
          ? new Date(
              conversation.last.created_at
            ).getTime() > hiddenAt
          : false;
      });

    // Latest conversation first.
    list.sort((a, b) => {
      const timeA = a.last
        ? new Date(a.last.created_at).getTime()
        : 0;

      const timeB = b.last
        ? new Date(b.last.created_at).getTime()
        : 0;

      return (
        timeB - timeA ||
        a.name.localeCompare(b.name)
      );
    });

    const term =
      search.trim().toLowerCase();

    if (!term) return list;

    return list.filter(
      (conversation) =>
        conversation.name
          .toLowerCase()
          .includes(term) ||
        (conversation.last?.body || "")
          .toLowerCase()
          .includes(term)
    );
  }, [
    connections,
    all,
    profiles,
    userId,
    search,
    hidden,
  ]);

  const selected = selectedId
    ? conversations.find(
        (conversation) =>
          conversation.id === selectedId
      ) || null
    : null;

  const threadMessages = useMemo(
    () =>
      selectedId
        ? all.filter(
            (message) =>
              message.photographer_id ===
              selectedId
          )
        : [],
    [all, selectedId]
  );

  const isSelf = Boolean(
    userId &&
      selectedId &&
      userId === selectedId
  );

  // ========================================
  // MARK OPEN CONVERSATION AS READ
  // ========================================

  useEffect(() => {
    if (!userId || !selectedId) return;

    const ids = threadMessages
      .filter(
        (message) =>
          message.sender_id !== userId &&
          !message.read_at &&
          !message.pending
      )
      .map((message) => message.id);

    if (!ids.length) return;

    const now =
      new Date().toISOString();

    // Optimistically mark messages as read.
    setAll((previous) =>
      previous.map((message) =>
        ids.includes(message.id)
          ? {
              ...message,
              read_at: now,
            }
          : message
      )
    );

    supabase
      .from("messages")
      .update({
        read_at: now,
      })
      .in("id", ids)
      .then(({ error: readError }) => {
        if (readError) {
          console.warn(
            "Couldn't mark messages as read:",
            readError.message
          );
        }
      });
  }, [
    threadMessages,
    userId,
    selectedId,
  ]);

  // ========================================
  // SEND MESSAGE
  // ========================================

  const send = async (body) => {
    if (!selectedId || !userId) {
      return false;
    }

    const tempId =
      `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    setError("");

    // Optimistic message.
    setAll((previous) => [
      ...previous,
      {
        id: tempId,
        photographer_id: selectedId,
        sender_id: userId,
        body,
        created_at:
          new Date().toISOString(),
        pending: true,
      },
    ]);

    const {
      data,
      error: sendError,
    } = await supabase
      .from("messages")
      .insert({
        photographer_id: selectedId,
        client_id: userId,
        sender_id: userId,
        body,
      })
      .select(MSG_COLUMNS)
      .single();

    if (sendError) {
      console.error(
        "Failed to send message:",
        sendError
      );

      setAll((previous) =>
        previous.filter(
          (message) =>
            message.id !== tempId
        )
      );

      setError(
        sendError.code === "23514"
          ? "You can't message yourself. Use a different client account."
          : `Message not sent: ${
              sendError.message ||
              "unknown error"
            }${
              sendError.code
                ? ` (code ${sendError.code})`
                : ""
            }`
      );

      return false;
    }

    setAll((previous) => {
      const withoutTemp =
        previous.filter(
          (message) =>
            message.id !== tempId
        );

      return withoutTemp.some(
        (message) =>
          message.id === data.id
      )
        ? withoutTemp
        : [...withoutTemp, data];
    });

    return true;
  };

  // ========================================
  // SAVE HIDDEN CONVERSATIONS
  // ========================================

  const persistHidden = (next) => {
    setHidden(next);

    try {
      localStorage.setItem(
        `hiddenConvos:${userId}`,
        JSON.stringify(next)
      );
    } catch {
      // Local storage may be unavailable.
    }
  };

  // ========================================
  // HIDE CONVERSATION
  // ========================================

  const hideConversation = () => {
    if (!selectedId) return;

    const last =
      threadMessages[
        threadMessages.length - 1
      ];

    const stamp = last
      ? new Date(
          last.created_at
        ).getTime()
      : 1;

    persistHidden({
      ...hidden,
      [selectedId]: stamp,
    });

    setConfirmOpen(false);
    setSelectedId(null);
  };

  // ========================================
  // PERMANENTLY DELETE CONVERSATION
  // ========================================

  const deleteConversationAndMessages =
    async () => {
      if (
        !userId ||
        !selectedId ||
        deleting
      ) {
        return;
      }

      setDeleting(true);
      setError("");

      const hadMessages =
        threadMessages.some(
          (message) =>
            !message.pending
        );

      const {
        data,
        error: deleteError,
      } = await supabase
        .from("messages")
        .delete()
        .eq("client_id", userId)
        .eq(
          "photographer_id",
          selectedId
        )
        .select("id");

      setDeleting(false);
      setConfirmOpen(false);

      if (
        deleteError ||
        (hadMessages &&
          (!data || data.length === 0))
      ) {
        console.error(
          "Failed to delete messages:",
          deleteError
        );

        setError(
          deleteError
            ? `Couldn't delete messages: ${deleteError.message}`
            : "Couldn't delete messages (permission denied)."
        );

        return;
      }

      setAll((previous) =>
        previous.filter(
          (message) =>
            message.photographer_id !==
            selectedId
        )
      );

      const nextHidden = {
        ...hidden,
      };

      delete nextHidden[selectedId];

      persistHidden(nextHidden);
      setSelectedId(null);
    };

  // ========================================
  // PAGE
  // ========================================

  return (
    <div
      className="
        grid h-[calc(100dvh-8rem)]
        min-h-[480px] min-w-0
        gap-3

        text-slate-900
        dark:text-slate-100

        lg:grid-cols-[280px_minmax(0,1fr)]
      "
    >
      {/* ======================================
          CONVERSATION LIST
         ====================================== */}

      <section
        className={`
          ${cardClass}

          ${
            selectedId
              ? "hidden lg:flex"
              : "flex"
          }

          min-h-0 flex-col
        `}
      >
        {/* LIST HEADER */}
        <div
          className="
            space-y-3
            border-b border-slate-200
            p-3

            dark:border-slate-800
          "
        >
          <h2
            className="
              text-sm font-bold
              text-slate-900

              dark:text-white
            "
          >
            Messages
          </h2>

          {/* SEARCH INPUT */}
          <label
            className="
              flex items-center gap-2
              rounded-full border

              border-slate-200
              bg-slate-50
              px-3 py-2

              text-xs text-slate-500

              transition-colors

              focus-within:border-sky-500
              focus-within:ring-1
              focus-within:ring-sky-500/20

              dark:border-slate-700
              dark:bg-[#0B1120]
              dark:text-slate-400
            "
          >
            <FaSearch
              className="shrink-0 text-[11px]"
              aria-hidden="true"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="
                min-w-0 flex-1
                bg-transparent

                text-slate-900
                outline-none

                placeholder:text-slate-400

                dark:text-slate-200
                dark:placeholder:text-slate-500
              "
            />
          </label>
        </div>

        {/* SCROLLABLE CONVERSATIONS */}
        <div
          className="
            custom-scrollbar
            min-h-0 flex-1
            overflow-y-auto
          "
        >
          {connLoading ? (
            <p
              className="
                px-4 py-10
                text-center text-xs

                text-slate-500
                dark:text-slate-400
              "
            >
              Loading conversations...
            </p>
          ) : conversations.length === 0 ? (
            <div
              className="
                flex flex-col
                items-center gap-1

                px-4 py-10
                text-center
              "
            >
              <FaCommentDots
                className="
                  mb-2 text-xl
                  text-slate-400
                  dark:text-slate-600
                "
              />

              <p
                className="
                  text-sm font-semibold
                  text-slate-800

                  dark:text-slate-200
                "
              >
                {search.trim()
                  ? "No matches"
                  : "No conversations yet"}
              </p>

              <p
                className="
                  text-xs text-slate-500
                  dark:text-slate-400
                "
              >
                {search.trim()
                  ? "Try a different name or word."
                  : "Connect with a photographer to start chatting."}
              </p>
            </div>
          ) : (
            <ul>
              {conversations.map(
                (conversation) => {
                  const active =
                    conversation.id === selectedId;

                  return (
                    <li
                      key={conversation.id}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSelectedId(
                            conversation.id
                          );
                        }}
                        aria-current={
                          active
                            ? "true"
                            : undefined
                        }
                        className={`
                          flex w-full
                          items-center gap-3

                          border-l-4
                          px-3 py-3

                          text-left

                          transition-colors duration-200

                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-sky-500

                          ${
                            active
                              ? `
                                border-sky-500
                                bg-sky-50

                                dark:bg-sky-500/10
                              `
                              : `
                                border-transparent

                                hover:bg-slate-50

                                dark:hover:bg-white/[0.04]
                              `
                          }
                        `}
                      >
                        <Thumb
                          url={
                            conversation.avatarUrl
                          }
                        />

                        <span
                          className="
                            min-w-0 flex-1
                          "
                        >
                          <span
                            className="
                              flex items-center
                              justify-between gap-2
                            "
                          >
                            <span
                              className="
                                truncate text-sm
                                font-semibold

                                text-slate-900
                                dark:text-slate-100
                              "
                            >
                              {conversation.name}
                            </span>

                            <span
                              className="
                                shrink-0
                                text-[10px]
                                text-slate-500
                              "
                            >
                              {formatWhen(
                                conversation.last
                                  ?.created_at
                              )}
                            </span>
                          </span>

                          <span
                            className="
                              mt-0.5 flex
                              items-center
                              justify-between gap-2
                            "
                          >
                            <span
                              className={`
                                truncate text-xs

                                ${
                                  conversation.unread > 0
                                    ? `
                                      font-semibold
                                      text-slate-800

                                      dark:text-slate-200
                                    `
                                    : `
                                      text-slate-500
                                      dark:text-slate-400
                                    `
                                }
                              `}
                            >
                              {conversation.last
                                ? `${
                                    conversation.last
                                      .sender_id ===
                                    userId
                                      ? "You: "
                                      : ""
                                  }${
                                    conversation.last
                                      .body
                                  }`
                                : "No messages yet"}
                            </span>

                            {conversation.unread > 0 && (
                              <span
                                className="
                                  flex h-5 min-w-[20px]
                                  shrink-0 items-center
                                  justify-center

                                  rounded-full
                                  bg-sky-500
                                  px-1.5

                                  text-[10px]
                                  font-bold
                                  text-white

                                  dark:text-slate-950
                                "
                              >
                                {conversation.unread > 9
                                  ? "9+"
                                  : conversation.unread}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                }
              )}
            </ul>
          )}
        </div>
      </section>

      {/* ======================================
          SELECTED CONVERSATION
         ====================================== */}

      <section
        className={`
          ${cardClass}

          ${
            selectedId
              ? "flex"
              : "hidden lg:flex"
          }

          min-h-0 flex-col
        `}
      >
        {selected ? (
          <>
            {/* CONVERSATION ACTION BAR */}
            <div
              className="
                flex items-center
                justify-between

                border-b border-slate-200
                px-3 py-2

                dark:border-slate-800
              "
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedId(null)
                }
                className="
                  flex items-center gap-2
                  text-xs

                  text-slate-600
                  hover:text-slate-900

                  lg:hidden

                  dark:text-slate-400
                  dark:hover:text-white
                "
              >
                <FaArrowLeft />
                All conversations
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmOpen(true)
                }
                className="
                  ml-auto flex
                  items-center gap-2

                  rounded-full
                  px-3 py-1.5
                  text-xs

                  text-slate-500
                  transition-colors

                  hover:bg-red-50
                  hover:text-red-600

                  dark:text-slate-400
                  dark:hover:bg-red-500/10
                  dark:hover:text-red-400
                "
              >
                <FaTrash className="text-[11px]" />
                Delete
              </button>
            </div>

            {/* CHAT THREAD */}
            <div
              className="
                min-h-0 flex-1
                bg-white
                text-slate-900

                dark:bg-[#0B1628]
                dark:text-slate-100
              "
            >
              <ChatThread
                key={selected.id}
                name={selected.name}
                subtitle="Your photographer"
                avatar={
                  <div
                    className="
                      h-10 w-10 shrink-0
                      rounded-full
                      ring-2 ring-blue-500/40
                    "
                  >
                    <Avatar
                      path={
                        selected.avatarUrl ||
                        (selected.id === activeId
                          ? portal?.avatar_signed_url
                          : null)
                      }
                      name={selected.name}
                      className="
                        h-full w-full
                        rounded-full
                      "
                    />
                  </div>
                }
                messages={threadMessages}
                myId={userId}
                onSend={send}
                loading={msgLoading}
                error={
                  isSelf
                    ? "You're signed in as this photographer, so you can't message yourself. Use a different client account."
                    : error
                }
                disabled={
                  !userId || isSelf
                }
                emptyTitle="No messages yet"
                emptyText={`Say hello to ${selected.name} to start the conversation.`}
              />
            </div>
          </>
        ) : (
          /* NO CONVERSATION SELECTED */
          <div
            className="
              flex flex-1 flex-col
              items-center justify-center
              gap-2 px-6

              text-center
            "
          >
            <FaCommentDots
              className="
                text-2xl
                text-slate-400
                dark:text-slate-600
              "
            />

            <p
              className="
                text-xs text-slate-500
                dark:text-slate-400
              "
            >
              Select a conversation to start chatting.
            </p>
          </div>
        )}
      </section>

      {/* ======================================
          DELETE CONVERSATION MODAL
         ====================================== */}

      {confirmOpen && selected && (
        <div
          className="
            fixed inset-0
            z-[100]

            flex items-center
            justify-center

            bg-slate-950/60 p-4
            backdrop-blur-sm
          "
          onClick={() => {
            if (!deleting) {
              setConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            className="
              w-full max-w-sm
              rounded-2xl

              border border-slate-200
              bg-white p-5
              text-slate-900

              shadow-2xl

              dark:border-slate-700
              dark:bg-[#0B1628]
              dark:text-slate-100
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h3
              id="delete-chat-title"
              className="
                text-sm font-bold
                text-slate-900

                dark:text-white
              "
            >
              Delete conversation with{" "}
              {selected.name}?
            </h3>

            <p
              className="
                mt-1 text-xs
                text-slate-500

                dark:text-slate-400
              "
            >
              Choose what you'd like to delete.
            </p>

            <div className="mt-4 space-y-2">
              {/* HIDE ONLY */}
              <button
                type="button"
                disabled={deleting}
                onClick={hideConversation}
                className="
                  w-full rounded-xl

                  border border-slate-200
                  bg-white

                  px-4 py-3
                  text-left

                  transition-colors

                  hover:bg-slate-50
                  disabled:opacity-50

                  dark:border-slate-700
                  dark:bg-transparent
                  dark:hover:bg-white/[0.04]
                "
              >
                <span
                  className="
                    block text-sm
                    font-semibold

                    text-slate-900
                    dark:text-slate-100
                  "
                >
                  Delete conversation
                </span>

                <span
                  className="
                    mt-1 block text-xs
                    leading-relaxed

                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Removes it from your inbox.
                  Messages are kept, and the
                  conversation returns if a new
                  message arrives.
                </span>
              </button>

              {/* PERMANENT DELETE */}
              <button
                type="button"
                disabled={deleting}
                onClick={
                  deleteConversationAndMessages
                }
                className="
                  w-full rounded-xl

                  border border-red-200
                  bg-red-50

                  px-4 py-3
                  text-left

                  transition-colors

                  hover:bg-red-100
                  disabled:opacity-50

                  dark:border-red-500/40
                  dark:bg-red-500/10
                  dark:hover:bg-red-500/20
                "
              >
                <span
                  className="
                    block text-sm
                    font-semibold

                    text-red-700
                    dark:text-red-300
                  "
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete conversation and messages"}
                </span>

                <span
                  className="
                    mt-1 block text-xs
                    leading-relaxed

                    text-red-600/80
                    dark:text-red-300/70
                  "
                >
                  Permanently deletes all
                  messages. This also removes
                  them for {selected.name} and
                  can't be undone.
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={deleting}
              onClick={() =>
                setConfirmOpen(false)
              }
              className="
                mt-3 w-full
                rounded-full py-2

                text-xs text-slate-500
                transition-colors

                hover:bg-slate-100
                hover:text-slate-900

                dark:text-slate-400
                dark:hover:bg-slate-800
                dark:hover:text-white
              "
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
