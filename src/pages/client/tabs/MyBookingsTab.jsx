
import { useOutletContext } from "react-router-dom";

import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";

import MyBookings from "../../../components/Schedule/MyBookings";

export default function MyBookingsTab() {
  const { activeId, reload } = useOutletContext() || {};

  return (
    <div
      className="
        min-w-0 space-y-4 pb-8

        text-slate-900
        transition-colors duration-300

        dark:text-slate-100
      "
    >
      {/* ======================================
          PAGE HEADER
         ====================================== */}

      <TabHeader
        eyebrow="Bookings"
        title="My Bookings"
        text="Track the sessions you requested and see their status."
      />

      {/* ======================================
          MY BOOKINGS SECTION
         ====================================== */}

      <Section
        title="My Bookings"
        dot="bg-violet-400"
      >
        <div
          className="
            min-w-0

            text-slate-900
            dark:text-slate-100
          "
        >
          {/* The tab remounts on every visit,
              so it always loads fresh data. */}

          <MyBookings
            photographerId={activeId}
            refreshKey={0}
            onChanged={reload}
          />
        </div>
      </Section>
    </div>
  );
}
