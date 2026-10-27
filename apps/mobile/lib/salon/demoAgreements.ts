import { useSyncExternalStore } from "react";
import { agreementVersion, type SignatureStroke } from "./agreementPolicy";

export type DemoAgreement = {
  id: string;
  customer_id: string;
  signer_name: string;
  signed_at: string;
  policy_version: string;
  signature: SignatureStroke[];
  services: string[];
  demo: true;
};

const sampleSignature: SignatureStroke[] = [
  [
    { x: 20, y: 100 },
    { x: 55, y: 65 },
    { x: 85, y: 110 },
    { x: 120, y: 55 },
    { x: 155, y: 95 },
    { x: 205, y: 70 },
  ],
];
let agreements: DemoAgreement[] = [
  "Mary Magdalene",
  "Esther of Susa",
  "Ruth of Moab",
  "David of Bethlehem",
  "Martha of Bethany",
].map((signer_name, index) => ({
  id: `demo-agreement-seed-${index + 1}`,
  customer_id: `demo-client-${index + 1}`,
  signer_name,
  signed_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  policy_version: agreementVersion,
  signature: sampleSignature,
  services: ["demo-service-consent"],
  demo: true,
}));
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((subscriber) => subscriber());

export function saveDemoAgreement(input: Omit<DemoAgreement, "id" | "signed_at" | "demo">) {
  const agreement: DemoAgreement = {
    ...input,
    id: `demo-agreement-${Date.now()}`,
    signed_at: new Date().toISOString(),
    demo: true,
  };
  agreements = [agreement, ...agreements];
  notify();
  return agreement;
}

export function useDemoAgreements() {
  return useSyncExternalStore(
    (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    () => agreements,
    () => agreements,
  );
}
