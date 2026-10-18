export const agreementVersion = "lady-j-service-v1";
export const agreementText = `# LADY J SALON & DAY SPA
### CLIENT SERVICE AGREEMENT & INFORMED CONSENT
Your Comfort. Your Confidence. Our Commitment.

Welcome to LADY J SALON & DAY SPA. We are committed to providing exceptional service in a safe, private, and relaxing environment. Please review our policies before your appointment.

SERVICE & CLIENT CARE

1. Personalized Service: Appointment durations are estimates and may vary according to individual needs and treatment complexity.

2. Health & Safety: Clients must disclose relevant allergies, sensitivities, medical conditions, medications, and previous treatments. We reserve the right to modify or decline services when necessary for safety.

3. Treatment Consent: I understand that services may involve irritation, allergic reactions, discomfort, infection, or unexpected results. Additional consent may be required for certain procedures.

4. Results & Expectations: We strive for exceptional results; however, individual outcomes and treatment longevity vary and cannot be guaranteed.

5. Transparent Pricing: Additional charges will be explained and require approval before proceeding.

6. Aftercare: Clients agree to follow recommended aftercare instructions and promptly report unexpected reactions or concerns.

APPOINTMENT POLICIES

7. Deposits & Cancellations: A 50% deposit is required to secure appointments and is applied toward the service total.

- 24+ Hours' Notice: Full deposit refund or one complimentary rescheduling.
- Less Than 24 Hours: Deposit is non-refundable. Management may offer 50% of the deposit as future service credit.
- No-Shows: Full deposit forfeited.
- Repeated No-Shows: Future bookings may require full payment or be declined.
- Salon Cancellations: Full deposit refund or rescheduling.

All terms are subject to applicable consumer rights.

8. Punctuality: Arrivals more than 10 minutes late may require rescheduling, subject to availability and applicable deposit policies.

9. Private Environment: To preserve a peaceful, personalized experience, additional guests are welcome only with prior approval. Necessary guardians, caregivers, and accessibility support persons are accommodated by arrangement.

PRIVACY & CONSENT

10. Confidential Photography: Before-and-after photographs may be taken for confidential service documentation. Photography consent is required to receive services. Images will never be used publicly or for advertising without separate authorization. Records are securely maintained and accessible only to authorized personnel.

11. Client Responsibility: Clients agree to provide accurate information, follow safety instructions, and communicate concerns. Nothing in this agreement limits rights or remedies protected by law.

CLIENT ACKNOWLEDGMENT

By signing, I confirm that I have read and understood these terms, acknowledge the reasonably disclosed treatment risks, and voluntarily consent to the agreed services and confidential photography.

I Agree to the Service, Booking & Photography Policies.`;
export type SignaturePoint = { x: number; y: number };
export type SignatureStroke = SignaturePoint[];
export type SignedAgreement = {
  id: string;
  customer_id: string;
  signer_name: string;
  signed_at: string;
  object_path: string;
  pdf_ready: boolean;
  appointment_id: string | null;
  policy_version: string;
};
