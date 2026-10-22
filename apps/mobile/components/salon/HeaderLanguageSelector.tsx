import React, { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import {
  clientNavigationCopy,
  supportedLanguages,
  type ClientLanguage,
} from "@/lib/salon/clientLanguage";
import { Txt, ButtonLabel, useColors } from "./ui";

export default function HeaderLanguageSelector({ compact }: { compact: boolean }) {
  const c = useColors();
  const { clientLanguage, setClientLanguage } = useSalon();
  const [query, setQuery] = useState("");
  const copy = clientNavigationCopy[clientLanguage];
  const selected = supportedLanguages.find((language) => language.code === clientLanguage)!;
  const options = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return supportedLanguages.filter(
      (language) =>
        !normalized ||
        language.name.toLocaleLowerCase().includes(normalized) ||
        language.nativeName.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);
  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger
        accessibilityLabel={`${copy.language}: ${selected.name}`}
        testID="header-language-selector"
        className="web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring"
        style={{
          minWidth: 44,
          minHeight: 48,
          paddingVertical: 12,
          paddingHorizontal: compact ? 0 : 10,
          flexShrink: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <ButtonLabel size={compact ? 13 : 18} color={c.headerInk}>
          {compact ? clientLanguage.toUpperCase() : selected.nativeName}
        </ButtonLabel>
        <Icon name="ChevronDown" size={12} color={c.headerInk} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} style={{ width: 290 }}>
        <View style={{ padding: 12, gap: 10 }}>
          <Txt size={12} color={c.mutedForeground}>
            {copy.languageScope}
          </Txt>
          <TextInput
            accessibilityLabel={copy.searchLanguages}
            placeholder={copy.searchLanguages}
            placeholderTextColor={c.mutedForeground}
            value={query}
            onChangeText={setQuery}
            style={{
              minHeight: 46,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              color: c.foreground,
              backgroundColor: c.background,
            }}
          />
        </View>
        <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
          <DropdownMenuRadioGroup
            value={clientLanguage}
            onValueChange={(value) =>
              supportedLanguages.some((language) => language.code === value) &&
              setClientLanguage(value as ClientLanguage)
            }
          >
            {options.map((language) => (
              <DropdownMenuRadioItem
                key={language.code}
                value={language.code}
                style={{ minHeight: 48 }}
              >
                <ButtonLabel style={{ paddingHorizontal: 18 }}>
                  {language.nativeName}
                  {language.nativeName === language.name ? "" : ` · ${language.name}`}
                </ButtonLabel>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </ScrollView>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
