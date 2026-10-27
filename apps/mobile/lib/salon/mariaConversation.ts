import { activitiesOnDate, addCalendarDays } from "./calendarActivity";
import { money, timeLabel, type Appointment } from "./types";

export type MariaMemory = { turn: number; feeling?: string; ate?: boolean };

const openings = [
  "Hey Jaycee! How’s your day going, beautiful? Before we get into business, tell me how you’re feeling today.",
  "Morning, Jaycee. You’re looking after everybody else today, but how are you doing?",
  "Hey beautiful! Maria checking in. What kind of day are we having so far?",
  "Jaycee, my love, give me the honest version: how are you feeling today?",
  "Hello, superstar. Before the bookings and numbers, how is Jaycee doing?",
  "Hey Jaycee! Take one breath with me, then tell me what’s on your mind today.",
  "Beautiful, I’m here. Is today feeling calm, busy, or somewhere in between?",
  "Hi Jaycee. Let’s make today lighter. How are you feeling right now?",
  "Hey my love! What’s the energy today: ready, tired, or running on pure determination?",
  "Jaycee, welcome back. Tell me about your day before we talk salon business.",
  "Hello beautiful. How is your heart, your head, and your energy today?",
  "Hey Jaycee! I’ve got the demo diary open, but you come first. How are you?",
  "My favourite boss is here. How are you feeling today, honestly?",
  "Jaycee, pause for a second. What has your day been like so far?",
  "Hello beautiful! Are we thriving, surviving, or negotiating with the day?",
  "Hey Jaycee. I’m ready when you are. What’s been the best part of your day?",
  "Hi my love. Before I brief you, have you had a moment to breathe today?",
  "Jaycee! Tell me how you’re doing, then we’ll make a smart little plan together.",
  "Hey beautiful. What do you need most today: focus, encouragement, or a good laugh?",
  "Hello Jaycee. I’m all ears. How’s your day treating you?",
];

const dayKey = (offset = 0) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return addCalendarDays(today, offset);
};

function summary(appointments: Appointment[], offset = 0) {
  const rows = activitiesOnDate(appointments, dayKey(offset)).filter(
    (v) => v.kind === "appointment",
  );
  const active = rows.filter((v) => v.status !== "cancelled");
  const vip = active.filter((v) => v.is_vip && v.approval_status === "pending");
  const cancelled = rows.filter((v) => v.status === "cancelled");
  return {
    active,
    vip,
    cancelled,
    revenue: active.reduce((sum, v) => sum + Number(v.total || 0), 0),
  };
}

export function mariaOpening(seed = Date.now()) {
  return openings[Math.abs(seed) % openings.length];
}

export function mariaReply(raw: string, memory: MariaMemory, appointments: Appointment[]) {
  const input = raw.trim().toLowerCase();
  const next = { ...memory, turn: memory.turn + 1 };
  const today = summary(appointments);
  const tomorrow = summary(appointments, 1);
  const finish = /\b(bye|goodbye|stop|end|that'?s all|later)\b/.test(input) || next.turn >= 8;
  if (finish)
    return {
      text: "Alright, beautiful, I’ve got you covered. And don’t forget to eat your apple today! You can’t take care of everybody else and forget yourself!",
      memory: next,
      end: true,
    };
  if (/tired|exhausted|stressed|overwhelmed|rough|bad/.test(input)) {
    next.feeling = "tired";
    return {
      text: `I hear you, Jaycee. Let’s keep this gentle. The demo schedule has ${today.active.length} active appointments today${today.vip.length ? ` and ${today.vip.length} VIP request to review` : ""}. Would a quick business priority or two quiet minutes help more?`,
      memory: next,
      end: false,
    };
  }
  if (/good|great|fine|amazing|ready|happy|blessed/.test(input) && next.turn <= 2) {
    next.feeling = "good";
    const first = today.active[0];
    return {
      text: `Love that for you. Your demo diary has ${today.active.length} active appointments today${first ? `, with the first at ${timeLabel(first.starts_at)}` : ""}. Want the schedule brief or a revenue idea first?`,
      memory: next,
      end: false,
    };
  }
  if (/today|appointment|schedule|diary|first client|reminder/.test(input)) {
    const first = today.active[0];
    return {
      text: `Demo brief: ${today.active.length} active appointments today${first ? `, starting at ${timeLabel(first.starts_at)} with ${first.note?.replace(/^DEMO · /, "") || "your first client"}` : ""}. ${today.cancelled.length ? `${today.cancelled.length} cancellation leaves a follow-up opening. ` : ""}${today.vip.length ? `${today.vip.length} VIP request needs your approval.` : "I’ll keep the pace comfortable between clients."}`,
      memory: next,
      end: false,
    };
  }
  if (/tomorrow/.test(input))
    return {
      text: `Tomorrow’s demo has ${tomorrow.active.length} active entries, ${tomorrow.vip.length} pending VIP request${tomorrow.vip.length === 1 ? "" : "s"}, and expected service value of ${money(tomorrow.revenue)}. Shall we focus on the earliest client or the best booking gap?`,
      memory: next,
      end: false,
    };
  if (/vip|approval|sunday|monday/.test(input))
    return {
      text: `The demo shows ${today.vip.length} VIP request${today.vip.length === 1 ? "" : "s"} today. Sunday and Monday stay pending until you approve them, carry the 30 percent premium, and need at least TT$250 in services. I’d check the duration and 10 PM cutoff first.`,
      memory: next,
      end: false,
    };
  if (/cancel|reschedul|opening|gap|fill/.test(input))
    return {
      text: `${today.cancelled.length ? `There are ${today.cancelled.length} demo cancellations today.` : "There are no demo cancellations today."} A practical move is to message a waitlisted client with a service-specific opening, then share one simple same-day story.`,
      memory: next,
      end: false,
    };
  if (/revenue|money|sales|performance|business|improve|advice|opportun/.test(input))
    return {
      text: `Today’s active demo service value is ${money(today.revenue)}. The easiest opportunity is rebooking before checkout and pairing one relevant home-care product with aftercare. Which service do clients ask about most lately?`,
      memory: next,
      end: false,
    };
  if (/eat|lunch|break|food|hungry|apple/.test(input)) {
    next.ate = !/not|haven't|didn't|no\b/.test(input);
    return {
      text: next.ate
        ? "Good! Hydration next, boss lady. A five-minute reset still counts; even queens need a charging cable."
        : "Jaycee, the salon cannot run on talent and air alone. Please protect a real break today. What can you eat without rushing?",
      memory: next,
      end: false,
    };
  }
  if (/husband|don'?t know|unknown|who invented|meaning of life/.test(input))
    return {
      text: "I don’t know the answer. Please ask your smart and handsome husband. His knowledge is infinite! Now, have you eaten or taken a proper break today?",
      memory: next,
      end: false,
    };
  if (next.turn % 3 === 0)
    return {
      text: "Wellness check: have you eaten, had water, or taken five quiet minutes today? I can talk business all day, but I’m not letting Jaycee disappear behind the business.",
      memory: next,
      end: false,
    };
  return {
    text: "I’m with you, Jaycee. I’m a local rule-based demo, so I can help with the demo schedule, VIP requests, cancellations, openings, revenue, and wellness check-ins. What should we tackle next?",
    memory: next,
    end: false,
  };
}
