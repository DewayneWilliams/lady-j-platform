import { formatDuration } from "@/lib/salon/duration";
import React, { useState } from "react";
import { View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { Service, money } from "@/lib/salon/types";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Card, Field, Check, Chip, ErrorBox } from "../ui";
import { OwnerButton, OwnerText, OwnerTitle } from "./OwnerUI";
import CatalogGallery from "../CatalogGallery";
import CatalogPhotoEditor from "./CatalogPhotoEditor";

type Form = {
  id?: string;
  name: string;
  description: string;
  price: string;
  selected: string[];
  photos: string[];
  featured: boolean;
  active: boolean;
};
export default function SpecialsPanel({
  services,
  demo,
  onDemoSave,
  onSaved,
}: {
  services: Service[];
  demo: boolean;
  onDemoSave: (service: Service) => void;
  onSaved: () => Promise<void>;
}) {
  const s = useSalon();
  const [form, setForm] = useState<Form | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choices = services.filter((v) => !v.is_special && v.active);
  function open(item?: Service) {
    setError("");
    setQuery("");
    setForm({
      id: item?.id,
      name: item?.name || "",
      description: item?.description || "",
      price: item ? String(item.price) : "",
      selected: item?.included_service_ids || [],
      photos: item?.photos || [],
      featured: item?.promote_on_home || false,
      active: item?.active ?? true,
    });
  }
  async function save() {
    if (!form || busy) return;
    const selected = choices.filter((v) => form.selected.includes(v.id));
    const price = Number(form.price);
    const duration = selected.reduce((sum, v) => sum + v.duration, 0);
    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      selected.length !== form.selected.length ||
      !selected.length ||
      duration > 480
    ) {
      setError(
        "Enter a name, description and price. Choose active services totaling up to eight hours.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (demo)
        onDemoSave({
          id: form.id || "demo-special-" + Date.now(),
          name: form.name.trim(),
          description: form.description.trim(),
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
        });
      else {
        check(
          await db().rpc("lj_save_special", {
            p_id: form.id || null,
            p_services: form.selected,
            p_name: form.name,
            p_description: form.description,
            p_price: price,
            p_featured: form.featured,
            p_photos: form.photos,
            p_active: form.active,
          }),
        );
        await onSaved();
        await s.refresh();
      }
      s.notify(
        demo
          ? "Demo special saved for this visit. It is not published to clients."
          : "Special saved. Clients can book it as one combined service.",
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
      <OwnerTitle
        title="Specials & packages"
        description="Combine your services into one thoughtful experience."
        action={
          !form ? (
            <OwnerButton label="Create special" icon="Plus" onPress={() => open()} />
          ) : undefined
        }
      />
      {demo && <OwnerText muted>Demo workspace · Specials stay in this visit only.</OwnerText>}
      {!!error && <ErrorBox message={error} />}
      {form ? (
        <Card style={{ gap: 20 }}>
          <Field
            label="Special name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
          <Field
            label="Combined description"
            multiline
            value={form.description}
            onChangeText={(description) => setForm({ ...form, description })}
          />
          <OwnerText bold>Included services</OwnerText>
          <Field label="Find a service" value={query} onChangeText={setQuery} />
          <View style={{ gap: 10 }}>
            {choices
              .filter((v) => v.name.toLowerCase().includes(query.toLowerCase()))
              .map((v) => (
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
          <OwnerText muted>
            {form.selected.length} services ·{" "}
            {formatDuration(
              choices
                .filter((v) => form.selected.includes(v.id))
                .reduce((sum, v) => sum + v.duration, 0),
            )}
          </OwnerText>
          <Field
            label="Combined package price (TTD)"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(price) => setForm({ ...form, price })}
          />
          <CatalogPhotoEditor
            value={form.photos}
            demo={demo}
            disabled={busy}
            onBusyChange={setBusy}
            onChange={(photos) => setForm((current) => (current ? { ...current, photos } : null))}
          />
          <Check
            label="Promote this special on the home page"
            checked={form.featured}
            onPress={() => setForm({ ...form, featured: !form.featured })}
          />
          <Check
            label="Available for booking"
            checked={form.active}
            onPress={() => setForm({ ...form, active: !form.active })}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <OwnerButton
              label={busy ? "Saving…" : "Save special"}
              disabled={busy}
              onPress={() => void save()}
            />
            <OwnerButton label="Cancel" secondary disabled={busy} onPress={() => setForm(null)} />
          </View>
        </Card>
      ) : (
        <>
          {!services.some((v) => v.is_special) && (
            <Card>
              <OwnerText muted>
                Create your first special by selecting existing services, then set its own name,
                description and price. Home-page promotion is optional.
              </OwnerText>
            </Card>
          )}
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
                <OwnerButton label="Edit special" secondary onPress={() => open(v)} />
              </Card>
            ))}
        </>
      )}
    </View>
  );
}
