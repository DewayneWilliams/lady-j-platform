import { DateField } from "../DateFields";
import { validReportDate } from "@/lib/salon/revenueReport";
import { addCalendarDays } from "@/lib/salon/calendarActivity";
import { formatDuration } from "@/lib/salon/duration";
import React, { useState } from "react";
import { View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { Service, money } from "@/lib/salon/types";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Card, Field, Check, Chip, ErrorBox } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import CatalogGallery from "../CatalogGallery";

type Form = {
  id?: string;
  name: string;
  description: string;
  price: string;
  selected: string[];
  photos: string[];
  featured: boolean;
  active: boolean;
  expiry: string;
};
export default function SpecialsPanel({
  services,
  demo,
  onDemoSave,
  onSaved,
  onDemoDelete,
}: {
  services: Service[];
  demo: boolean;
  onDemoSave: (service: Service) => void;
  onSaved: () => Promise<void>;
  onDemoDelete: (id: string) => void;
}) {
  const s = useSalon();
  const [form, setForm] = useState<Form | null>(null);
  const [remove, setRemove] = useState<Service | null>(null);
  const [query, setQuery] = useState("");
  const [choicePage, setChoicePage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choices = services.filter((v) => !v.is_special && v.active);
  const filteredChoices = choices.filter((v) => v.name.toLowerCase().includes(query.toLowerCase()));
  const choicePages = Math.max(1, Math.ceil(filteredChoices.length / 12));
  const currentChoicePage = Math.min(choicePage, choicePages - 1);
  function open(item?: Service) {
    setError("");
    setQuery("");
    setChoicePage(0);
    setForm({
      id: item?.id,
      name: item?.name || "",
      description: item?.description || "",
      price: item ? String(item.price) : "",
      selected: item?.included_service_ids || [],
      photos: item?.photos || [],
      featured: item?.promote_on_home || false,
      active: item?.active ?? true,
      expiry: item?.homepage_expires_at
        ? new Date(Date.parse(item.homepage_expires_at) - 1).toLocaleDateString("en-CA", {
            timeZone: "America/Port_of_Spain",
          })
        : "",
    });
  }
  async function save() {
    if (!form || busy) return;
    const selected = choices.filter((v) => form.selected.includes(v.id));
    const price = Number(form.price);
    const duration = selected.reduce((sum, v) => sum + v.duration, 0);
    if (
      (form.expiry !== "" && !validReportDate(form.expiry)) ||
      !form.name.trim() ||
      !form.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      selected.length !== form.selected.length ||
      selected.length < 2 ||
      duration > 480
    ) {
      setError(
        "Enter a package name and price. Pick at least two active services, up to eight hours.",
      );
      return;
    }
    const expiresAt = form.expiry
      ? new Date(addCalendarDays(form.expiry, 1) + "T00:00:00-04:00").toISOString()
      : null;
    setBusy(true);
    setError("");
    try {
      if (demo)
        onDemoSave({
          id: form.id || "demo-special-" + Date.now(),
          name: form.name.trim(),
          description: form.description.trim() || selected.map((v) => v.name).join(" + "),
          price: Math.round(price * 100) / 100,
          duration,
          category: "Specials",
          image: form.photos[0] || selected[0]?.image || "salon",
          photos: form.photos,
          active: form.active,
          is_demo: true,
          is_special: true,
          included_service_ids: form.selected,
          promote_on_home: form.featured,
          homepage_expires_at: expiresAt,
        });
      else {
        check(
          await db().rpc("lj_save_special", {
            p_id: form.id || null,
            p_services: form.selected,
            p_name: form.name,
            p_description: form.description.trim() || selected.map((v) => v.name).join(" + "),
            p_price: price,
            p_featured: form.featured,
            p_photos: form.photos,
            p_active: form.active,
            p_homepage_expires_at: expiresAt,
          }),
        );
        await onSaved();
        await s.refresh();
      }
      s.notify(
        demo
          ? "Special saved."
          : form.featured
            ? "Special saved. Also shown on Home."
            : "Special saved in Services → Specials.",
      );
      setForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save this special.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 24 }}>
      {!form ? (
        <View style={{ alignItems: "center" }}>
          <View>
            <OwnerButton label="Create Special" icon="Plus" accent onPress={() => open()} />
          </View>
        </View>
      ) : (
        <OwnerText size={26} bold>
          Specials
        </OwnerText>
      )}
      {!!error && <ErrorBox message={error} />}
      {remove && (
        <Card style={{ gap: 18 }}>
          <OwnerText bold>Delete {remove.name}?</OwnerText>
          <OwnerText>Saved appointments keep their details.</OwnerText>
          <OwnerButton
            label={busy ? "Deleting" : "Confirm delete special"}
            destructive
            disabled={busy}
            onPress={() => {
              setBusy(true);
              setError("");
              void (async () => {
                if (demo) onDemoDelete(remove.id);
                else {
                  check(
                    await db().rpc("lj_delete_catalog_item", {
                      p_kind: "service",
                      p_id: remove.id,
                    }),
                  );
                  await onSaved();
                  await s.refresh();
                }
                setRemove(null);
                s.notify(demo ? "Special deleted." : "Special deleted.");
              })()
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Unable to delete special."),
                )
                .finally(() => setBusy(false));
            }}
          />
          <OwnerButton
            label="Keep special"
            secondary
            disabled={busy}
            onPress={() => setRemove(null)}
          />
        </Card>
      )}
      {form ? (
        <Card style={{ gap: 20 }}>
          <Field
            label="Package name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
          <OwnerText bold>Included Services</OwnerText>
          <Field
            label="Find a service"
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setChoicePage(0);
            }}
          />
          <View style={{ gap: 10 }}>
            {filteredChoices.slice(currentChoicePage * 12, currentChoicePage * 12 + 12).map((v) => (
              <Check
                key={v.id}
                label={v.name + " · " + formatDuration(v.duration)}
                checked={form.selected.includes(v.id)}
                onPress={() =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          selected: current.selected.includes(v.id)
                            ? current.selected.filter((id) => id !== v.id)
                            : [...current.selected, v.id],
                        }
                      : null,
                  )
                }
              />
            ))}
          </View>
          {filteredChoices.length === 0 && (
            <OwnerText muted>No matching services. Try another name.</OwnerText>
          )}
          {choicePages > 1 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <OwnerButton
                label="Previous"
                compact
                secondary
                disabled={currentChoicePage === 0}
                onPress={() => setChoicePage(currentChoicePage - 1)}
              />
              <OwnerText size={16}>
                {currentChoicePage + 1} / {choicePages}
              </OwnerText>
              <OwnerButton
                label="Next"
                compact
                secondary
                disabled={currentChoicePage === choicePages - 1}
                onPress={() => setChoicePage(currentChoicePage + 1)}
              />
            </View>
          )}
          <OwnerText muted>
            {form.selected.length} services ·{" "}
            {formatDuration(
              choices
                .filter((v) => form.selected.includes(v.id))
                .reduce((sum, v) => sum + v.duration, 0),
            )}
          </OwnerText>
          <Field
            label="Combined Package Price"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(price) => setForm({ ...form, price })}
          />
          <Check
            label="Promote on the homepage"
            checked={form.featured}
            onPress={() => {
              if (!busy) setForm({ ...form, featured: !form.featured });
            }}
          />
          <DateField
            calendar
            optional
            label="Homepage Promotion Ends"
            value={form.expiry}
            onChange={(expiry) => setForm({ ...form, expiry })}
          />
          <OwnerText size={16} muted>
            Always listed in Services → Specials.
          </OwnerText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <OwnerButton
              accent
              busy={busy}
              label={busy ? "Saving" : "Save special"}
              disabled={busy}
              onPress={() => void save()}
            />
            <OwnerButton label="Cancel" secondary disabled={busy} onPress={() => setForm(null)} />
          </View>
        </Card>
      ) : (
        <>
          {services
            .filter((v) => v.is_special)
            .map((v) => (
              <Card key={v.id} style={{ gap: 14 }}>
                <CatalogGallery photos={v.photos} cover={v.image} height={180} />
                <OwnerText size={26} bold>
                  {v.name}
                </OwnerText>
                <OwnerText muted>{v.description}</OwnerText>
                <OwnerText>
                  {money(v.price)} · {formatDuration(v.duration)} ·{" "}
                  {v.included_service_ids?.length || 0} services
                </OwnerText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Chip
                    label={v.promote_on_home ? "On home page" : "Catalog only"}
                    selected={!!v.promote_on_home}
                    onPress={() => open(v)}
                  />
                  <Chip
                    label={v.active ? "Available" : "Hidden"}
                    selected={v.active}
                    onPress={() => open(v)}
                  />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <OwnerButton label="Edit special" secondary onPress={() => open(v)} />
                  <OwnerButton label="Delete special" destructive onPress={() => setRemove(v)} />
                </View>
              </Card>
            ))}
        </>
      )}
    </View>
  );
}
