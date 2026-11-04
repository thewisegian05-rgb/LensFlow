import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";

/* The URL where the client portal lives (the path of its route in your router, without "/*") */
export const CLIENT_BASE = "/customer";

/* pathMode  -> router has  path="/customer/*"  -> tabs are /customer/schedule
   queryMode -> router has  path="/customer"    -> tabs are /customer?tab=schedule
   Both work, ClientPortalPage detects which one your router uses. */
export const ClientNavContext = createContext({ queryMode: false });

export function useClientNav() {
  const { queryMode } = useContext(ClientNavContext);
  const { pathname, search } = useLocation();
  const tabUrl = (id) => (queryMode ? `${CLIENT_BASE}?tab=${id}` : `${CLIENT_BASE}/${id}`);
  const current = queryMode
    ? new URLSearchParams(search).get("tab") || "home"
    : pathname.split("/").filter(Boolean).pop() || "home";
  return { queryMode, tabUrl, current };
}