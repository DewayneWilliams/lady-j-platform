import React, { useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { Appointment } from "@/lib/salon/types";
import { headerDate } from "@/lib/salon/ownerToday";
import { addCalendarDays } from "@/lib/salon/calendarActivity";
import { useBottomNavigationSpacing } from "../BottomNavigation";
import { Card, ErrorBox } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import CalendarTools from "./CalendarTools";
import BlockActivityCard from "./BlockActivityCard";
export default function CalendarDashboard({
  date,
  selected,
  view,
  onDate,
  onClear,
  onView,
  onAdd,
  onBlock,
  onEditBlock,
  appointments,
  live,
  status,
  error,
  onRefresh,
  renderAppointment,
  demo = false,
  onClearDemo,
}: {
  date: string;
  selected: boolean;
  view: string;
  onDate: (date: string) => void;
  onClear: () => void;
  onView: (view: string) => void;
  onAdd: () => void;
  onBlock: (reason: string) => void;
  onEditBlock: (block: Appointment) => void;
  appointments: Appointment[];
  live: boolean;
  status: string;
  error: string;
  onRefresh: () => Promise<void>;
  renderAppointment: (a: Appointment) => React.ReactNode;
  demo?: boolean;
  onClearDemo?: () => void;
}) {
  const { width } = useWindowDimensions(),
    spacing = useBottomNavigationSpacing(true);
  const [refreshing, setRefreshing] = useState(false);
  let from = date,
    until = addCalendarDays(date, view === "Week" ? 7 : 1);
  if (view === "Month") {
    from = date.slice(0, 8) + "01";
    const month = new Date(from + "T12:00Z");
    month.setUTCMonth(month.getUTCMonth() + 1);
    until = month.toISOString().slice(0, 10);
  }
  const rows = selected
    ? appointments
        .filter(
          (a) =>
            a.status !== "cancelled" &&
            Date.parse(a.starts_at) < Date.parse(until + "T00:00:00-04:00") &&
            Date.parse(a.ends_at) > Date.parse(from + "T00:00:00-04:00"),
        )
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id))
    : [];
  return (
    <FlatList
      data={rows}
      keyExtractor={(a) => a.id}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void onRefresh().finally(() => setRefreshing(false));
      }}
      contentContainerStyle={{
        padding: width >= 1100 ? 32 : 20,
        paddingBottom: selected ? Math.max(32, spacing) : 16,
        maxWidth: 1200,
        width: "100%",
        alignSelf: "center",
      }}
      ListHeaderComponent={
        <>
          <>{!!error && <ErrorBox message={error} retry={() => void onRefresh()} />}</>
          <CalendarTools
            date={date}
            selected={selected}
            view={view}
            onDate={onDate}
            onMonthChange={onClear}
            onView={onView}
            onAdd={onAdd}
            onBlock={onBlock}
            appointments={appointments}
            live={live}
            status={status}
          />
          {demo && appointments.some((item) => item.id.startsWith("demo-")) && (
            <View style={{ marginBottom: 14, alignItems: "flex-end" }}>
              <OwnerButton label="Clear Demo Data" secondary destructive onPress={onClearDemo} />
            </View>
          )}
          {selected && (
            <View style={{ marginBottom: 20 }}>
              <OwnerText muted>
                {headerDate(from + "T12:00:00-04:00")}
                {view !== "Day" ? " and following activity" : ""}
              </OwnerText>
            </View>
          )}
        </>
      }
      ListEmptyComponent={
        selected ? (
          <Card>
            <OwnerText>
              {live
                ? "No appointments or blocked periods for this selection."
                : "No activity for this selection."}
            </OwnerText>
          </Card>
        ) : null
      }
      renderItem={({ item }) =>
        item.kind === "block" ? (
          <BlockActivityCard block={item} onEdit={() => onEditBlock(item)} />
        ) : (
          <View>
            <OwnerText size={16} muted>
              {headerDate(item.starts_at)}
            </OwnerText>
            <View style={{ height: 10 }} />
            {renderAppointment(item)}
          </View>
        )
      }
    />
  );
}
