import React from "react";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
const tabs = ["Today", "Calendar", "Consultations", "Clients", "Business", "Maria"];
/** Recover the registered owner tab after a browser reload of its navigator-generated link. */
export default function OwnerTabRoute() {
  const { ownerPath } = useLocalSearchParams<{ ownerPath: string[] }>();
  const requested = (Array.isArray(ownerPath) ? ownerPath : [ownerPath])
    .filter(Boolean)
    .reverse()
    .find((value) => tabs.includes(value));
  return (
    <>
      <Stack.Screen options={{ title: "Owner Workspace" }} />
      <Redirect href={{ pathname: "/owner", params: requested ? { tab: requested } : {} }} />
    </>
  );
}
