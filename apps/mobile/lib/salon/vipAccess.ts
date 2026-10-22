export const VIP_PURPLE = "#7543B8";
export const BOOKING_TIME_ZONE = "America/Port_of_Spain";

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
