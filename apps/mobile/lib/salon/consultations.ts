import type { Service } from "./types";

export type ConsultationStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "completed"
  | "converted"
  | "cancelled";

export type ConsultationRequest = {
  id: string;
  customer_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  whatsapp_phone: string;
  selected_services: { id: string; name: string; category: string }[];
  primary_service: { id: string; name: string; category: string };
  desired_outcomes: string[];
  visit_special: string;
  occasion: string;
  event_date?: string | null;
  previous_experience: string;
  comfort_note: string;
  comfort_private: boolean;
  availability_days: string[];
  availability_times: string[];
  preferred_date?: string | null;
  additional_notes: string;
  allergy_status: string;
  allergy_details: string;
  accessibility_needs: string[];
  accessibility_details: string;
  screening: Record<string, string>;
  inspiration_paths: string[];
  summary: string;
  status: ConsultationStatus;
  owner_alert_status: "manual_required" | "draft_opened";
  appointment_id?: string | null;
  converted_appointment_id?: string | null;
  created_at: string;
  updated_at: string;
};

export const serviceGroup = (service: Pick<Service, "name" | "category">) => {
  const value = `${service.category} ${service.name}`.toLowerCase();
  if (/foot|pedi/.test(value)) return "Foot Health";
  if (/lash|brow/.test(value)) return "Lashes/Brows";
  if (/wax/.test(value)) return "Waxing";
  if (/facial/.test(value)) return "Facials";
  if (/skin|peel|micro|derma/.test(value)) return "Skin Treatments";
  if (/body|wrap/.test(value)) return "Body Treatments";
  if (/massage/.test(value)) return "Massage";
  if (/barber|beard|cut/.test(value)) return "Barbering";
  if (/nail|mani/.test(value)) return "Nails";
  return "Hair";
};

export const outcomeChoices: Record<string, string[]> = {
  Hair: [
    "Healthier hair",
    "Length retention",
    "Colour change",
    "Smooth finish",
    "Protective style",
  ],
  Nails: ["Neat natural nails", "Longer-lasting colour", "Nail art", "Stronger-looking nails"],
  "Lashes/Brows": [
    "Natural definition",
    "Fuller-looking finish",
    "A refined shape",
    "Event-ready look",
  ],
  Waxing: ["Smooth finish", "Precise shaping", "A comfortable care plan"],
  Facials: [
    "Hydration",
    "A brighter-looking complexion",
    "A calmer-looking complexion",
    "Relaxation",
  ],
  "Skin Treatments": [
    "Smoother-looking texture",
    "More even-looking tone",
    "A personalised care plan",
  ],
  "Foot Health": ["Comfort", "Well-groomed feet", "A regular care plan"],
  "Body Treatments": ["Relaxation", "Softer-feeling skin", "A restorative experience"],
  Massage: ["Relaxation", "Ease everyday tension", "Rest and recovery"],
  Barbering: ["Fresh cut", "Clean shape-up", "Beard grooming", "Easy maintenance"],
};

export const screeningQuestions: Record<string, { id: string; label: string }[]> = {
  Hair: [
    { id: "scalp", label: "Any current scalp irritation or tenderness?" },
    { id: "hair_allergies", label: "Any known product or colour allergies?" },
    {
      id: "recent_chemicals",
      label: "Any recent colour, relaxer, bleach, or other chemical service?",
    },
  ],
  Nails: [
    { id: "nail_irritation", label: "Any current nail or surrounding skin irritation?" },
    { id: "nail_infection", label: "Any suspected nail infection?" },
    { id: "nail_sensitivity", label: "Any known sensitivity to nail products?" },
  ],
  "Lashes/Brows": [
    { id: "adhesive_dye", label: "Any previous reaction to lash adhesive, tint, or dye?" },
  ],
  Waxing: [
    { id: "wax_irritation", label: "Any irritation in the area to be waxed?" },
    { id: "wax_treatments", label: "Any recent skin treatment in that area?" },
    { id: "wax_products", label: "Using any products that make your skin more sensitive?" },
  ],
  Facials: [
    { id: "facial_allergies", label: "Any known skincare allergies?" },
    { id: "facial_sensitivity", label: "Does your skin feel especially sensitive right now?" },
    { id: "facial_procedures", label: "Any recent facial or skin procedure?" },
  ],
  "Skin Treatments": [
    { id: "skin_concerns", label: "Any active skin concern you would like to discuss?" },
    { id: "skin_procedures", label: "Any recent skin procedure?" },
    {
      id: "skin_medications",
      label: "Any relevant medication you would prefer Lady J to consider?",
    },
  ],
  "Foot Health": [
    { id: "foot_diabetes", label: "Diabetes or a blood-sugar condition relevant to foot care?" },
    { id: "foot_circulation", label: "Any circulation concern or reduced sensation?" },
    { id: "foot_wounds", label: "Any current wound, irritation, or suspected infection?" },
  ],
  "Body Treatments": [
    { id: "body_allergies", label: "Any known product allergies?" },
    { id: "body_procedures", label: "Any recent body procedure?" },
    { id: "body_health", label: "Any health consideration you would like handled privately?" },
  ],
  Massage: [
    { id: "massage_injury", label: "Any current injury or painful area?" },
    { id: "massage_surgery", label: "Any recent surgery?" },
    { id: "massage_pregnancy", label: "Any pregnancy-related comfort considerations?" },
    { id: "massage_restrictions", label: "Any movement, pressure, or positioning restrictions?" },
  ],
  Barbering: [
    { id: "barber_scalp", label: "Any current scalp irritation?" },
    { id: "barber_allergies", label: "Any known grooming-product allergies?" },
    { id: "barber_sensitivity", label: "Any skin sensitivity around the service area?" },
  ],
};

export function safeConsultationWhatsApp(request: ConsultationRequest, dashboardLink: string) {
  return [
    "NEW CONSULTATION REQUEST",
    `Client: ${request.client_name}`,
    `Contact: ${request.whatsapp_phone} · ${request.client_email}`,
    `Services: ${request.selected_services.map((v) => v.name).join(", ")}`,
    `Primary: ${request.primary_service.name}`,
    `Desired outcome: ${request.desired_outcomes.join(", ")}`,
    `Occasion: ${request.occasion}${request.event_date ? ` (${request.event_date})` : ""}`,
    `Previous experience: ${request.previous_experience}`,
    `Preferred availability: ${request.availability_days.join(", ")} · ${request.availability_times.join(", ")}${request.preferred_date ? ` · ${request.preferred_date}` : ""}`,
    request.additional_notes ? `General comments: ${request.additional_notes}` : "",
    `WHAT MATTERS MOST TO THIS CLIENT: ${request.summary}`,
    `Secure dashboard: ${dashboardLink}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const consultationStatusLabel: Record<ConsultationStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  completed: "Completed",
  converted: "Converted to Booking",
  cancelled: "Cancelled",
};
