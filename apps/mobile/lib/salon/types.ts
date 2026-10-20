import { displayDate } from "./dates";
export type Service = {
  duration_label?: string | null;
  price_label?: string | null;
  price_kind?: "fixed" | "from" | "per_item" | null;
  price_unit?: "nail" | "toe" | "couple" | null;
  is_add_on?: boolean;
  bookable?: boolean;
  catalog_visible?: boolean;
  catalog_sort_order?: number | null;
  photos?: string[];
  is_special?: boolean;
  included_service_ids?: string[];
  promote_on_home?: boolean;
  homepage_expires_at?: string | null;
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  price: number;
  image: string;
  active: boolean;
  is_demo: boolean;
};
export type Product = {
  reorder_level?: number;
  photos?: string[];
  brand?: string;
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  active: boolean;
  is_demo: boolean;
};
export type Workshop = {
  photos?: string[];
  id: string;
  name: string;
  description: string;
  instructor: string;
  starts_at: string | null;
  duration: number;
  price: number;
  capacity: number;
  format: "In person" | "Online";
  image: string;
  active: boolean;
  is_demo: boolean;
};
export type Appointment = {
  block_reason?: string;
  block_description?: string;
  all_day?: boolean;
  block_series_id?: string | null;
  block_repeat?: string;
  block_repeat_until?: string | null;
  block_weekdays?: number[];
  updated_at?: string;
  id: string;
  customer_id: string | null;
  client_id?: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  kind: string;
  services: {
    name: string;
    price: number;
    original_price?: number;
    discount_percentage?: number;
  }[];
  discount_total?: number;
  promo_code?: string | null;
  total: number;
  deposit: number;
  deposit_paid: boolean;
  note: string;
};
export type Purchase = {
  id: string;
  kind: string;
  customer_id: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    original_price?: number;
    discount_percentage?: number;
  }[];
  discount_total?: number;
  promo_code?: string | null;
  delivery_fee?: number;
  total: number;
  status: string;
  fulfillment: string;
  delivery_address?: string;
  created_at: string;
};
export type Transaction = {
  id: string;
  customer_id: string | null;
  client_id?: string | null;
  amount: number;
  method: string;
  reference: string;
  received_at?: string | null;
  refunded_at?: string | null;
  recorded_by?: string | null;
  status: string;
  appointment_id: string | null;
  purchase_id: string | null;
  created_at: string;
};
export type Profile = {
  medical_conditions?: string;
  email?: string;
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  birthday: string | null;
  preferences: string;
  marketing_consent: boolean;
};
export type Client = {
  medical_conditions?: string;
  deleted_at?: string | null;
  is_minor?: boolean;
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_phone?: string;
  guardian_email?: string;
  whatsapp_phone?: string;
  id: string;
  customer_id?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  preferences: string;
  sensitivities: string;
  birthday?: string | null;
  private_notes: string;
  photo_consent: boolean;
};
export type Settings = {
  max_daily_bookings_per_client?: number;
  id: string;
  business_name: string;
  bank_instructions: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_phone?: string;
  address: string;
  delivery_fee: number;
};
export type Credit = { id: string; amount: number; reason: string };
export type Promotion = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  photos?: string[];
};
export const money = (value: number) =>
  `$${Number(value).toLocaleString("en-TT", { maximumFractionDigits: 2 })}`;
export const servicePriceLabel = (service: Pick<Service, "price" | "price_label">) =>
  service.price_label?.trim() || money(service.price);
export const dateLabel = (date: string, _options?: Intl.DateTimeFormatOptions) => displayDate(date);
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString("en-TT", {
    timeZone: "America/Port_of_Spain",
    hour: "numeric",
    minute: "2-digit",
  });
