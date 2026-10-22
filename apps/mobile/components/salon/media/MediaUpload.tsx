import MediaSelect from "./MediaSelect";
import React, { useState, useRef, useEffect } from "react";
import { View, Platform, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { prepareMedia, releasePickedMedia } from "@/lib/salon/media/processing";
import { beginMedia, uploadMedia } from "@/lib/salon/media/api";
import type { PreparedMedia, MediaItem, MediaAlbum } from "@/lib/salon/media/types";
import type { Client, Appointment, Service } from "@/lib/salon/types";
import { mediaDate } from "@/lib/salon/media/types";
import { Txt, ErrorBox, Tag, useColors } from "../ui";
import { OwnerButton } from "../owner/OwnerUI";
import { MediaSheet, MediaField, ChoiceRow } from "./MediaPrimitives";
type Task = {
  uploadKey: string;
  asset: ImagePicker.ImagePickerAsset;
  prepared?: PreparedMedia;
  record?: MediaItem;
  done?: boolean;
  error?: string;
};
export default function MediaUpload({
  clients,
  clientId,
  appointmentId,
  albums,
  appointments,
  services,
  retry,
  minimal = false,
  demo = false,
  onClose,
  onDone,
}: {
  clients: Client[];
  clientId?: string;
  appointmentId?: string;
  albums: MediaAlbum[];
  appointments: Appointment[];
  services: Service[];
  retry?: MediaItem;
  minimal?: boolean;
  demo?: boolean;
  onClose: () => void;
  onDone: (complete: boolean) => void;
}) {
  const c = useColors();
  const [selectedClient, setSelectedClient] = useState(retry?.client_id || clientId || "");
  const [clientQuery, setClientQuery] = useState("");
  const [appointment, setAppointment] = useState(retry?.appointment_id || appointmentId || "");
  const [service, setService] = useState(retry?.service_id || "");
  const [album, setAlbum] = useState(retry?.album_id || "");
  const [source, setSource] = useState<"Upload" | "Photo" | "Video">("Upload");
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(
    () => () => {
      controller.current?.abort();
      tasksRef.current.forEach((t) => {
        t.prepared?.cleanup();
        releasePickedMedia(t.asset);
      });
    },
    [],
  );
  function update(next: Task[]) {
    tasksRef.current = next;
    setTasks([...next]);
  }
  async function run(queue: Task[]) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      for (let i = 0; i < queue.length; i++) {
        const task = queue[i];
        if (task.done) continue;
        if (controller.current.signal.aborted) break;
        task.error = undefined;
        try {
          setStage("Preparing " + (i + 1) + " of " + queue.length);
          setProgress(0);
          if (!task.prepared)
            task.prepared = await prepareMedia(task.asset, setProgress, controller.current.signal);
          if (task.prepared.warning) setWarning(task.prepared.warning);
          if (controller.current.signal.aborted) throw new Error("Upload cancelled.");
          if (!task.record)
            task.record =
              retry ||
              (await beginMedia(selectedClient, {
                upload_key: task.uploadKey,
                name: task.asset.fileName?.replace(/\.[^.]+$/, "") || "Salon visit",
                kind: task.asset.type === "video" ? "video" : "photo",
                mime_type: task.prepared.mime,
                appointment_id: appointment,
                service_id: service,
                album_id: album,
              }));
          if (task.record.mime_type !== task.prepared.mime)
            throw new Error(
              "Choose the same file type as the original upload, or delete this incomplete item and upload again.",
            );
          setStage("Uploading " + (i + 1) + " of " + queue.length);
          setProgress(0);
          await uploadMedia(task.record, task.prepared, setProgress, controller.current.signal);
          task.done = true;
          task.prepared.cleanup();
          task.prepared = undefined;
          releasePickedMedia(task.asset);
        } catch (e) {
          task.error = e instanceof Error ? e.message : "Upload failed. Please retry.";
        }
        update(queue);
        if (controller.current.signal.aborted) break;
      }
      if (queue.every((t) => t.done)) {
        setStage("All media saved privately");
        onDone(true);
      } else {
        setError("Some items were not saved. Retry to continue from where you left off.");
        onDone(false);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function choose() {
    if (lock.current || !selectedClient || demo) return;
    setError("");
    setWarning("");
    try {
      if (source !== "Upload" && Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error("Allow camera access in your device settings to capture media.");
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes:
          source === "Photo" ? ["images"] : source === "Video" ? ["videos"] : ["images", "videos"],
        quality: 0.9,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      };
      // Camera results stay in the app's temporary cache. No MediaLibrary writes are used.
      const result =
        source === "Upload"
          ? await ImagePicker.launchImageLibraryAsync({
              ...options,
              allowsMultipleSelection: !retry,
              selectionLimit: retry ? 1 : 10,
            })
          : await ImagePicker.launchCameraAsync(options);
      if (result.canceled) return;
      if (result.assets.length > 10) throw new Error("Choose up to 10 items at a time.");
      const queue = result.assets.map((asset) => ({
        asset,
        uploadKey:
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2) +
          "-" +
          Math.random().toString(36).slice(2),
      }));
      update(queue);
      await run(queue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open media.");
    }
  }
  const client = clients.find((v) => v.id === selectedClient);
  const choices = clients
    .filter((v) => v.full_name.toLowerCase().includes(clientQuery.toLowerCase()))
    .slice(0, 12);
  return (
    <MediaSheet
      title={minimal && client ? client.full_name : retry ? "Retry Upload" : "Add Photo or Video"}
      onClose={onClose}
      busy={busy}
    >
      {demo && <Tag>Sample data — sign in as the owner to upload</Tag>}
      {!minimal && (
        <Txt color={c.mutedForeground}>
          Saved privately. Client access stays off until you choose to share an item.
        </Txt>
      )}
      {!clientId && !retry && !minimal && (
        <>
          <MediaField label="Find Client" value={clientQuery} onChange={setClientQuery} />
          <View style={{ gap: 8 }}>
            {choices.map((v) => (
              <OwnerButton
                key={v.id}
                label={(v.id === selectedClient ? "✓ " : "") + v.full_name}
                secondary
                onPress={() => {
                  setSelectedClient(v.id);
                  setAppointment("");
                  setAlbum("");
                }}
                disabled={busy || tasks.length > 0}
              />
            ))}
          </View>
        </>
      )}
      {!minimal && client && (
        <Txt size={22} bold>
          {client.full_name}
        </Txt>
      )}
      {tasks.length === 0 && (
        <>
          {!retry && !minimal && (
            <>
              <MediaSelect
                label="Appointment (Optional)"
                disabled={busy}
                value={appointment}
                options={[
                  { id: "", name: "Standalone" },
                  ...appointments
                    .filter(
                      (v) =>
                        v.kind === "appointment" &&
                        (v.client_id === client?.id ||
                          (!!client?.customer_id && v.customer_id === client.customer_id)),
                    )
                    .map((v) => ({
                      id: v.id,
                      name:
                        mediaDate(v.starts_at.slice(0, 10)) +
                        " — " +
                        v.services.map((s) => s.name).join(", "),
                    })),
                ]}
                onChange={setAppointment}
              />
              <MediaSelect
                label="Service (Optional)"
                value={service}
                options={[
                  { id: "", name: "No service" },
                  ...services.map((v) => ({ id: v.id, name: v.name })),
                ]}
                onChange={setService}
              />
              <MediaSelect
                label="Album (Optional)"
                value={album}
                options={[
                  { id: "", name: "No album" },
                  ...albums
                    .filter((v) => v.client_id === selectedClient)
                    .map((v) => ({ id: v.id, name: v.name })),
                ]}
                onChange={setAlbum}
              />
            </>
          )}
          <ChoiceRow values={["Upload", "Photo", "Video"]} value={source} onChange={setSource} />
          {source !== "Upload" && Platform.OS === "web" && (
            <Txt size={16} color={c.mutedForeground}>
              Your browser may offer its camera or a file chooser. Native camera capture is
              available in a supported native build.
            </Txt>
          )}
          <OwnerButton
            label={
              source === "Upload"
                ? "Choose photos & videos"
                : source === "Photo"
                  ? "Take photo"
                  : "Record video"
            }
            icon={source === "Upload" ? "ImagePlus" : "Camera"}
            onPress={() => void choose()}
            disabled={!selectedClient || demo}
          />
        </>
      )}
      {busy && (
        <View style={{ gap: 12 }}>
          <ActivityIndicator color={c.brandAccent} />
          <Txt bold>
            {stage} · {Math.round(progress * 100)}%
          </Txt>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            style={{ height: 7, borderRadius: 9, backgroundColor: c.muted, overflow: "hidden" }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: c.brandAccentFill,
              }}
            />
          </View>
          <OwnerButton
            label="Cancel upload"
            secondary
            onPress={() => controller.current?.abort()}
          />
        </View>
      )}
      {tasks.map((t, i) => (
        <View key={i} style={{ gap: 5 }}>
          <Txt>
            {t.done ? "✓ " : ""}
            {t.asset.fileName || "Media " + (i + 1)}
            {t.done ? " — Saved privately" : ""}
          </Txt>
          {!!t.error && <ErrorBox message={t.error} />}
        </View>
      ))}
      {!!warning && <Txt size={16}>{warning}</Txt>}
      {!!error && <ErrorBox message={error} />}
      {!busy && tasks.some((t) => !t.done) && (
        <OwnerButton
          label="Retry failed uploads"
          icon="RefreshCw"
          onPress={() => void run(tasksRef.current)}
        />
      )}
      {!busy && tasks.length > 0 && tasks.every((t) => t.done) && (
        <OwnerButton label="Done" onPress={onClose} />
      )}
    </MediaSheet>
  );
}
