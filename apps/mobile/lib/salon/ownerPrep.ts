import { formatDuration } from "./duration";
import { Appointment, Service } from "./types";
export function appointmentDuration(startsAt: string, endsAt: string) {
  return formatDuration((Date.parse(endsAt) - Date.parse(startsAt)) / 60000);
}

export function contactIsMinor(birthday?: string | null, markedMinor = false, now = new Date()) {
  if (!birthday) return markedMinor;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = today.split("-").map(Number);
  const birth = new Date(birthday + "T12:00:00Z");
  if (Number.isNaN(birth.getTime()) || birthday > today) return markedMinor;
  const age =
    year -
    birth.getUTCFullYear() -
    (month < birth.getUTCMonth() + 1 ||
    (month === birth.getUTCMonth() + 1 && day < birth.getUTCDate())
      ? 1
      : 0);
  return age < 18;
}
export type PrepArea = { area: string; detail: string };
function prepFor(category: string, name: string): PrepArea {
  const knownCategory = /hair|nail|lash|skin|facial|makeup|brow|wax|massage/i.test(category);
  const key = (knownCategory ? category : category + " " + name).toLowerCase();
  if (/nail|manicure|pedicure/.test(key))
    return {
      area: "Nail station",
      detail: "Prepare clean tools, fresh towels and the booked nail-care supplies.",
    };
  if (/lash/.test(key))
    return {
      area: "Lash station",
      detail: "Prepare the treatment bed, lighting and clean lash tools.",
    };
  if (/brow|wax/.test(key))
    return {
      area: "Brow & waxing station",
      detail: "Prepare clean applicators, fresh covers and the booked service supplies.",
    };
  if (/skin|facial/.test(key))
    return {
      area: "Skin-care area",
      detail: "Prepare the treatment bed, clean towels and the booked facial supplies.",
    };
  if (/massage|spa package/.test(key))
    return {
      area: "Spa treatment area",
      detail: "Prepare clean linens and a quiet treatment space; review each booked treatment.",
    };
  if (/makeup|bridal|glam/.test(key))
    return {
      area: "Makeup station",
      detail: "Prepare clean brushes, good lighting and the booked makeup supplies.",
    };
  if (/hair|braid|silk|press|cut|colour|color|keratin|blow|styling/.test(key))
    return {
      area: "Hair station",
      detail:
        "Prepare the styling chair, clean tools and fresh towels. Have the wash area ready if the service includes washing.",
    };
  return {
    area: "Client-care area",
    detail:
      "Review the booked services and confirm the required work area and supplies before the client arrives.",
  };
}
export function appointmentPrep(appointment: Appointment, catalog: Service[]): PrepArea[] {
  const result: PrepArea[] = [];
  for (const booked of appointment.services || []) {
    const service = catalog.find((item) => item.name === booked.name);
    const included = service?.is_special
      ? catalog.filter((item) => service.included_service_ids?.includes(item.id))
      : [];
    for (const item of included.length
      ? included
      : [{ name: booked.name, category: service?.category || "" }]) {
      const prep = prepFor(item.category, item.name);
      if (!result.some((existing) => existing.area === prep.area)) result.push(prep);
    }
  }
  return result.length ? result : [prepFor("", "")];
}
export function nextClientPrep(appointments: Appointment[], catalog: Service[], now = new Date()) {
  const active = appointments
    .filter(
      (item) =>
        item.kind === "appointment" &&
        ["pending", "confirmed"].includes(item.status) &&
        Date.parse(item.ends_at) > now.getTime(),
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const current = active.find((item) => Date.parse(item.starts_at) <= now.getTime());
  const next = active.find((item) => Date.parse(item.starts_at) > now.getTime());
  const target = next || current;
  return {
    current,
    next,
    target,
    remaining: active.length,
    prep: target ? appointmentPrep(target, catalog) : [],
  };
}
