import React from "react";
import { View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import Shell, { useNav } from "./Shell";
import { Action, Card, Txt, LinkText, useColors } from "./ui";
export function AccountTrust() {
  const c = useColors(),
    go = useNav();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name="ShieldCheck" size={23} color={c.warning} />
        <Txt bold size={17}>
          Your care. Your privacy.
        </Txt>
      </View>
      <Txt size={15} color={c.mutedForeground}>
        Your account is free. Your bookings and personal details are visible only to you and the
        authorized salon owner. Other clients cannot see your account.
      </Txt>
      <Txt size={15} color={c.mutedForeground}>
        We use your details to manage your appointments, purchases and account. Marketing is
        optional, off by default, and can be changed in My Profile.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
        <LinkText onPress={() => go("privacy")}>Privacy notice</LinkText>
        <LinkText onPress={() => go("terms")}>Terms</LinkText>
      </View>
    </View>
  );
}
export default function AccountGate({ next = "booking" }: { next?: string }) {
  const go = useNav(),
    c = useColors();
  return (
    <Shell>
      <View
        style={{ maxWidth: 560, width: "100%", alignSelf: "center", paddingVertical: 24, gap: 24 }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            backgroundColor: c.goldSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="LockKeyhole" size={28} color={c.warning} />
        </View>
        <Txt serif size={38} style={{ lineHeight: 44 }}>
          Your next moment starts here.
        </Txt>
        <Txt size={18} color={c.mutedForeground}>
          Create a free account to see prices, choose your time and book with Lady J.
        </Txt>
        <Card style={{ gap: 16, borderColor: c.goldBorder }}>
          <Action
            label="Create free account"
            gold
            prominent
            onPress={() => go("register", { next })}
            style={{ alignSelf: "stretch" }}
          />
          <Action
            label="I already have an account"
            secondary
            onPress={() => go("login", { next })}
            style={{ alignSelf: "stretch" }}
          />
          <Txt size={15} color={c.mutedForeground}>
            Email is available now. Google, Facebook and Apple appear on the sign-in screen with
            their setup status.
          </Txt>
        </Card>
        <AccountTrust />
      </View>
    </Shell>
  );
}
