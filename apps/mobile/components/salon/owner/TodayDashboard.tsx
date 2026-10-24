import { useBottomNavigationSpacing } from "../BottomNavigation";
import React, { useState } from "react";
import { FlatList, Linking, Pressable, View, useWindowDimensions } from "react-native";
import { Appointment } from "@/lib/salon/types";
import { headerDate, dailyBibleVerse } from "@/lib/salon/ownerToday";
import { useSalon } from "@/lib/salon/SalonProvider";
import { AppointmentLegend } from "./AppointmentCard";
import { Txt, ButtonLabel, useColors } from "../ui";
import { OwnerEmpty } from "./OwnerUI";
export type OwnerAction =
  | "appointment"
  | "block"
  | "client"
  | "workshop"
  | "product"
  | "payments"
  | "revenue"
  | "maria";
export default function TodayDashboard({
  activities,
  day,
  onAdd,
  notice,
  briefing,
  onRefresh,
  renderAppointment,
}: {
  activities: Appointment[];
  day: string;
  onAdd: () => void;
  notice?: React.ReactNode;
  briefing?: React.ReactNode;
  onRefresh: () => Promise<void>;
  renderAppointment: (appointment: Appointment) => React.ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const c = useColors();
  const navigationSpacing = useBottomNavigationSpacing(true);
  const s = useSalon();
  const verse = dailyBibleVerse(day);
  return (
    <FlatList
      data={activities}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void onRefresh().finally(() => setRefreshing(false));
      }}
      keyExtractor={(appointment) => appointment.id}
      renderItem={({ item }) => <>{renderAppointment(item)}</>}
      extraData={renderAppointment}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: width >= 1100 ? 32 : 20,
        paddingBottom: Math.max(50, navigationSpacing + 20),
        maxWidth: 1200,
        width: "100%",
        alignSelf: "center",
      }}
      ListHeaderComponent={
        <View style={{ gap: 24 }}>
          {notice}
          <View style={{
            alignItems: "center",
            gap: width < 390 ? 4 : 7,
            width: "100%",
            flexDirection: "column"
          }}>
            <Txt
              size={width < 390 ? 36 : 46}
              bold
              style={{
                width: "100%",
                textAlign: "center",
                letterSpacing: -1.2,
                fontSize: 48
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {new Date(day + "T12:00:00-04:00")
                .toLocaleDateString("en-TT", {
                  weekday: "long",
                  timeZone: "America/Port_of_Spain",
                })
                .toUpperCase()}
            </Txt>
            <Txt
              size={width < 390 ? 23 : 28}
              serif
              style={{ width: "100%", textAlign: "center" }}
            >
              {headerDate(day + "T12:00:00-04:00")}
            </Txt>
          </View>
          <View
            accessibilityLabel="Daily Bible verse"
            style={{
              maxWidth: 740,
              alignSelf: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={"Read " + verse.reference + ": " + verse.text}
              onPress={() => {
                void Linking.openURL(verse.url).catch(() =>
                  s.notify("Unable to open the Bible reference. Please try again."),
                );
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Txt size={18} style={{ textAlign: "center" }}>
                “{verse.text}”{" "}
                <Txt size={16} color={c.mutedForeground}>
                  {verse.reference}
                </Txt>
              </Txt>
            </Pressable>
          </View>
          <View style={{ alignItems: "center" }}>
            <Pressable
              accessibilityRole="button"
              onPress={onAdd}
              style={{
                borderRadius: 999,
                backgroundColor: c.brandAccentFill,
                paddingHorizontal: 12,
                maxWidth: "100%",
                minWidth: 0,
                alignItems: "center",
                paddingVertical: 14,
                minHeight: 58,
                justifyContent: "center",
              }}
            >
              <ButtonLabel size={22} color={c.tertiaryForeground}>
                Add Appointment
              </ButtonLabel>
            </Pressable>
          </View>
          <View style={{ gap: 18 }}>
            <Txt size={24} bold style={{ textAlign: "center", width: "100%" }}>
              Today’s Appointments
            </Txt>
            <AppointmentLegend />
          </View>
        </View>
      }
      ListEmptyComponent={
        <OwnerEmpty
          title="No appointments or activity today"
          body="Appointments and blocked time for today will appear here in time order."
        />
      }
      ListFooterComponent={<View style={{ gap: 28, paddingTop: 24 }}>{briefing}</View>}
    />
  );
}
