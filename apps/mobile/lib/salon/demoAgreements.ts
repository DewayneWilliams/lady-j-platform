import { useSyncExternalStore } from "react";
import type { SignatureStroke } from "./agreementPolicy";

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

let agreements: DemoAgreement[] = [];
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
