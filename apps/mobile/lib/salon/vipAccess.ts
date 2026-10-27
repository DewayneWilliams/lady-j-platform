export const VIP_PURPLE = "#7543B8";
export const BOOKING_TIME_ZONE = "America/Port_of_Spain";

/** Iconography is intentionally based on the appointment start, never availability or pricing. */
export function shouldShowVipIcon(dayOfWeek: number, time: string): boolean {
  // Sunday = 0, Monday = 1
  if (dayOfWeek === 0 || dayOfWeek === 1) {
    return true; // Closed-day appointments require VIP approval
  }

  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;

  // Absolute prohibition during regular hours
  if (totalMinutes >= 600 && totalMinutes <= 1065) {
    return false;
  }

  return (
    (totalMinutes >= 360 && totalMinutes <= 585) ||
    (totalMinutes >= 1080 && totalMinutes <= 1305)
  );
}

function localMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0) % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

export function vipRequiresApproval(startsAt: string) {
  return Boolean(startsAt);
}

export function isSpecialVipRequest(startsAt: string) {
  return localMinutes(startsAt) > 19 * 60;
}
