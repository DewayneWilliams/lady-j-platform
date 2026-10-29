import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import Shell, { useNav } from "./Shell";
import { Action, Card, Txt, LinkText, useColors } from "./ui";
export function AccountTrust() {
  const c = useColors(),
    go = useNav();
  return (
    <View style={styles.trust}>
      <View style={styles.trustHeading}>
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
      <View style={styles.legalLinks}>
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
      <View style={styles.content}>
        <View
          style={[styles.lockIcon, { backgroundColor: c.goldSurface }]}
        >
          <Icon name="LockKeyhole" size={28} color={c.warning} />
        </View>
        <Txt serif size={38} style={styles.heading}>
          Your next moment starts here.
        </Txt>
        <Txt size={18} color={c.mutedForeground}>
          Create a free account to choose your time, book and manage your visits with Lady J.
        </Txt>
        <Card style={{ ...styles.actions, borderColor: c.goldBorder }}>
          <Action
            label="Create free account"
            gold
            prominent
            onPress={() => go("register", { next })}
            style={styles.action}
          />
          <Action
            label="I already have an account"
            secondary
            onPress={() => go("login", { next })}
            style={styles.action}
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

const styles = StyleSheet.create({
  trust: { gap: 12 },
  trustHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  legalLinks: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  content: {
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    paddingVertical: 24,
    gap: 24,
  },
  lockIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { lineHeight: 44 },
  actions: { gap: 16 },
  action: { alignSelf: "stretch" },
});
