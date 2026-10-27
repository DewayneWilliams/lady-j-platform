export const agreementVersion = "lady-j-service-v2";
export const agreementText = `# LADY J SALON & DAY SPA
### CLIENT SERVICE AGREEMENT & INFORMED CONSENT
Welcome to Lady J Salon & Day Spa. Your comfort, safety, and satisfaction are our priorities. Please review the following terms before receiving services.

1. Health & Medical Disclosure
Clients must disclose relevant medical conditions, allergies, medications, infections, injuries, or sensitivities that may affect treatment. Services may require medical clearance or be declined for safety reasons.

2. Informed Consent & Treatment Risks
Salon, spa, beauty, and foot care treatments may involve discomfort, irritation, allergic reactions, or other risks. Results vary and cannot be guaranteed. Clients may ask questions or withdraw treatment consent at any time.

3. Service Results & Satisfaction
Results may differ from requested styles or reference photos due to hair condition, texture, previous treatments, or individual responses. Changes to the original service may become necessary during treatment and will be discussed with the client before proceeding. Dissatisfied clients should notify management and may request their preferred resolution.

4. Refunds & Corrective Services
Completed services are non-refundable solely due to personal dissatisfaction. Any complimentary corrections, adjustments, or additional services are subject to management’s assessment and discretion. Corrective services are not guaranteed. This policy does not affect rights under applicable consumer protection laws.

5. Treatment Photography
Before-and-after photographs are required for applicable services for confidential treatment documentation and monitoring. Photos will not be published or used for marketing without separate written consent. Agreement to required photography is a condition of receiving applicable services.

6. Aftercare & Client Responsibilities
Clients agree to follow recommended aftercare instructions and promptly report unusual reactions or concerns. Results may be affected when aftercare instructions are not followed.

7. Privacy & Confidentiality
Personal information, health disclosures, and treatment records are kept confidential and used for client care, safety, and legitimate business purposes. Information is shared only when authorized or legally permitted.

8. Private Appointments & Guests
Appointments are reserved exclusively for the scheduled client. Additional guests, including children, require prior management approval.

9. Late Arrivals
A 10-minute grace period applies. Later arrivals may require cancellation or rescheduling, subject to applicable deposit policies.

10. Appointments & Deposits
A 50% deposit is required to confirm all appointments. The remaining balance is payable upon completion of services.

11. Cancellations, Rescheduling & No-Shows
At least 24 hours’ notice: Full deposit refund or one complimentary rescheduling. Less than 24 hours’ notice: Deposits are non-refundable. Management may, at its discretion, offer a credit equal to 50% of the deposit toward a future appointment. No-shows: The entire deposit is forfeited.

12. Pricing & Payments
Prices may change, and additional charges may apply for extra time, products, or treatments. Clients will be informed of additional costs before proceeding. All balances are due upon service completion.

### Client Acknowledgment & Consent
By signing, I confirm that I have read, understood, and agree to these terms, including the treatment risks, photography requirements, refund policies, and appointment conditions. I consent to electronic storage of this agreement and understand that it remains valid for future appointments unless updated terms or treatment-specific consent is required. My statutory rights under Trinidad and Tobago law remain protected.

### Legal Acknowledgment & Binding Agreement
By signing below, I confirm that I have read, understood, and voluntarily accepted all terms and conditions of the Lady J Salon & Day Spa Client Service Agreement & Informed Consent.

I acknowledge that my electronic signature represents my legally binding agreement to these terms, to the extent permitted by applicable law, and carries the same legal effect as my handwritten signature. I consent to the electronic execution and secure storage of this agreement.

I understand that this agreement is subject to applicable laws of Trinidad and Tobago and does not waive any rights or protections that cannot legally be waived.`;
export type SignaturePoint = { x: number; y: number };
export type SignatureStroke = SignaturePoint[];
export type SignedAgreement = {
  id: string;
  customer_id: string | null;
  client_id?: string | null;
  signer_name: string;
  signed_at: string;
  object_path: string;
  pdf_ready: boolean;
  appointment_id: string | null;
  policy_version: string;
};
