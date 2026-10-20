/** A chat opens in WhatsApp; no message is sent automatically. */
export function whatsappContactUrl(phone?: string | null, message = ""): string | null {
  if (phone && !/^[+0-9 ().-]+$/.test(phone)) return null;
  const digits = phone?.replace(/[^0-9]/g, "") || "";
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) return null;
  return "https://wa.me/" + digits + (message ? "?text=" + encodeURIComponent(message) : "");
}
export function whatsappSupportUrl(phone?: string | null) {
  return whatsappContactUrl(
    phone,
    "Hello Lady J, I have a question about your services, products or workshops.",
  );
}

export function internationalNumber(phone?: string | null): string | null {
  if (!phone || !/^[+0-9 ().-]+$/.test(phone)) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  return /^[1-9][0-9]{7,14}$/.test(digits) ? digits : null;
}
