import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { useSalon } from "@/lib/salon/SalonProvider";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { catalogIntakeEntries, type CatalogIntakeEntry } from "@/lib/salon/catalogIntake";
import ServiceCategories from "../ServiceCategories";
import { Search } from "../CatalogScreens";
import { Card, ErrorBox, Tag, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";

export default function ServiceCatalogIntake() {
  const salon = useSalon();
  const c = useColors();
  const [entries, setEntries] = useState<CatalogIntakeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const load = useCallback(async () => {
    if (!salon.owner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = check(
        await db()
          .from("lj_service_catalog_intake")
          .select("source_entry")
          .eq("catalog_key", "lady-j-salon-replacement")
          .range(0, 999),
      );
      setEntries(catalogIntakeEntries(rows ?? []));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load the replacement catalog.",
      );
    } finally {
      setLoading(false);
    }
  }, [salon.owner]);
  useEffect(() => {
    void load();
  }, [load]);
  useForegroundRefresh(load, salon.owner);
  if (!salon.owner) return null;
  const filtered = entries.filter(
    (entry) =>
      (category === "All" || entry.category === category) &&
      `${entry.name} ${entry.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages - 1);
  return (
    <Card style={{ gap: 18, marginBottom: 24 }}>
      <OwnerText size={24} bold>
        Replacement service catalog
      </OwnerText>
      {loading && (
        <ActivityIndicator color={c.brandAccent} accessibilityLabel="Loading service drafts" />
      )}
      {!!error && (
        <>
          <ErrorBox message={error} />
          <OwnerButton label="Retry catalog" secondary onPress={() => void load()} />
        </>
      )}
      {!loading && !error && (
        <>
          <OwnerText>
            {entries.length} service drafts, including{" "}
            {entries.filter((entry) => entry.is_add_on).length} add-ons.
          </OwnerText>
          <OwnerText muted>
            These drafts are private and cannot be booked. Photos and outstanding service details
            must be completed before publication. Your current menu remains available.
          </OwnerText>
          <OwnerButton
            label={expanded ? "Hide draft catalog" : "Review draft catalog"}
            secondary
            onPress={() => setExpanded((value) => !value)}
          />
          {expanded && (
            <View style={{ gap: 18 }}>
              <Search
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setPage(0);
                }}
                placeholder="Search service drafts"
              />
              <ServiceCategories
                value={category}
                onChange={(value) => {
                  setCategory(value);
                  setPage(0);
                }}
              />
              <OwnerText muted>{filtered.length} drafts found</OwnerText>
              {category === "Specials" && (
                <OwnerText muted>
                  No offers have been imported. Create your own packages in Specials.
                </OwnerText>
              )}
              {filtered.slice(currentPage * 12, currentPage * 12 + 12).map((entry) => (
                <View
                  key={entry.source_key}
                  style={{ gap: 10, paddingVertical: 18, borderTopWidth: 1, borderColor: c.border }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag>{entry.category}</Tag>
                    <Tag>{entry.is_add_on ? "Add-on draft" : "Draft"}</Tag>
                  </View>
                  <OwnerText size={23} bold>
                    {entry.name}
                  </OwnerText>
                  <OwnerText>{entry.description}</OwnerText>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <OwnerText muted>{entry.duration_label}</OwnerText>
                    <OwnerText bold>{entry.price_label}</OwnerText>
                  </View>
                  <OwnerText muted>
                    {entry.category === "Makeup"
                      ? "Remains unpublished. Duration and price need confirmation."
                      : entry.duration_minutes === null
                        ? "Duration needs confirmation before booking."
                        : "Licensed photo needed before publication."}
                  </OwnerText>
                  {entry.is_add_on && (
                    <OwnerText muted>
                      Compatible service selection is required before booking.
                    </OwnerText>
                  )}
                </View>
              ))}
              {!filtered.length && category !== "Specials" && (
                <OwnerText muted>
                  No drafts match. Clear the search or choose another category.
                </OwnerText>
              )}
              {pages > 1 && (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}
                >
                  <OwnerButton
                    label="Previous drafts"
                    secondary
                    disabled={currentPage === 0}
                    onPress={() => setPage(currentPage - 1)}
                  />
                  <OwnerText>
                    Page {currentPage + 1} of {pages}
                  </OwnerText>
                  <OwnerButton
                    label="Next drafts"
                    secondary
                    disabled={currentPage === pages - 1}
                    onPress={() => setPage(currentPage + 1)}
                  />
                </View>
              )}
            </View>
          )}
        </>
      )}
    </Card>
  );
}
