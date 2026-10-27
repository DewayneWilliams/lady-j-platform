import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import type { Appointment } from "./types";

const storageKey = "lady-j-maria-demo-reminders-v1";
const channelId = "maria-demo-reminders";

export async function clearMariaDemoReminders() {
  const saved = await SecureStore.getItemAsync(storageKey);
  const ids = saved ? (JSON.parse(saved) as string[]) : [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await SecureStore.deleteItemAsync(storageKey);
}

export async function scheduleMariaDemoReminders(rows: Appointment[], minutes: number) {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was not granted.");
  await Notifications.setNotificationChannelAsync(channelId, {
    name: "Maria demo reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await clearMariaDemoReminders();
  const now = Date.now();
  const candidates = rows
    .filter((row) => row.kind === "appointment" && row.status !== "cancelled")
    .map((row) => ({ row, trigger: new Date(Date.parse(row.starts_at) - minutes * 60000) }))
    .filter(({ trigger }) => trigger.getTime() > now)
    .slice(0, 60);
  const ids = await Promise.all(
    candidates.map(({ row, trigger }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "DEMO · Maria appointment reminder",
          body: `${row.note?.replace(/^DEMO · /, "") || "Your client"} is scheduled in ${minutes} minutes.`,
          data: { mariaDemo: true, appointmentId: row.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
          channelId,
        },
      }),
    ),
  );
  await SecureStore.setItemAsync(storageKey, JSON.stringify(ids));
  return ids.length;
}
