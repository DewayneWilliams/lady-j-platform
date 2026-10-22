import { useSalon } from "@/lib/salon/SalonProvider";
import React, { useState } from "react";
import Shell, { useNav } from "../Shell";
import { Heading, Action, Txt } from "../ui";
import ClientMediaGallery from "./ClientMediaGallery";
export default function ClientMediaScreen() {
  const s = useSalon();
  const [open, setOpen] = useState(true);
  const go = useNav();
  return (
    <Shell>
      <Heading sub="Photos & videos shared privately with you.">My media</Heading>
      <Txt>
        Your gallery is read-only. Only items Lady J has approved for your account appear here.
      </Txt>
      <Action label="Open my gallery" onPress={() => setOpen(true)} />
      {open && (
        <ClientMediaGallery
          key={s.session?.user.id}
          onClose={() => {
            setOpen(false);
            go("account");
          }}
        />
      )}
    </Shell>
  );
}
