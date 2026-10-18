import { useBottomNavigationSpacing } from "../BottomNavigation";
import React, { useState } from "react";
import { FlatList, Linking, Pressable, View, useWindowDimensions } from "react-native";
import { Appointment, dateLabel } from "@/lib/salon/types";
import { dailyBibleVerse } from "@/lib/salon/ownerToday";
import { useSalon } from "@/lib/salon/SalonProvider";
import { AppointmentLegend } from "./AppointmentCard";
import { Txt, useColors } from "../ui";
import { OwnerButton, OwnerEmpty, OwnerText } from "./OwnerUI";
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
          <OwnerText size={28} bold>
            {dateLabel(day + "T12:00:00-04:00", { weekday: "long" })}
          </OwnerText>
          <View
            accessibilityLabel="Daily Bible verse"
            style={{
              maxWidth: 740,
              borderLeftWidth: 3,
              borderColor: c.goldBorder,
              paddingLeft: 16,
              gap: 8,
            }}
          >
            <OwnerText>“{verse.text}”</OwnerText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={"Read " + verse.reference + " in the New World Translation"}
              onPress={() => {
                void Linking.openURL(verse.url).catch(() =>
                  s.notify("Unable to open the Bible reference. Please try again."),
                );
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <OwnerText size={16} muted>
                {verse.reference} · New World Translation
              </OwnerText>
            </Pressable>
          </View>
          <View style={{ gap: 18 }}>
            <Txt size={24} bold lines={1} style={{ textAlign: "center", width: "100%" }}>
              Today’s appointments
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
      ListFooterComponent={
        <View style={{ gap: 28, paddingTop: 24 }}>
          <View style={{ alignItems: "center" }}>
            <OwnerButton label="Add appointment" icon="Plus" onPress={onAdd} />
          </View>
          {briefing}
        </View>
      }
    />
  );
}
