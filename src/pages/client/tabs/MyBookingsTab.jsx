import Section from "../components/ui/Section";
import { useOutletContext } from "react-router-dom";
import TabHeader from "../components/ui/TabHeader";
import MyBookings from "../../../components/Schedule/MyBookings";

export default function MyBookingsTab() {
  const { activeId, reload } = /** @type {any} */ (useOutletContext());
  return (
    <div className="min-w-0 space-y-4">
      <TabHeader
        eyebrow="Bookings"
        title="My Bookings"
        text="Track the sessions you requested and see their status."
      />
      <Section title="My Bookings" dot="bg-violet-400">
        {/* the tab remounts on every visit, so it always loads fresh data */}
        <MyBookings photographerId={activeId} refreshKey={0} onChanged={reload} />
      </Section>
    </div>
  );
}