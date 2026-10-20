export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
/** Human dates use the salon's date, without changing ISO values sent to the backend. */
export function displayDate(value: string | Date) {
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + "T12:00:00Z")
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Port_of_Spain",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function displayDateTime(value: string) {
  return (
    displayDate(value) +
    " · " +
    new Date(value).toLocaleTimeString("en-US", {
      timeZone: "America/Port_of_Spain",
      hour: "numeric",
      minute: "2-digit",
    })
  );
}
