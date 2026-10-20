import React from "react";
import { View } from "react-native";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { clientNavigationCopy } from "@/lib/salon/clientLanguage";
import { Txt, ButtonLabel, useColors } from "./ui";

export default function HeaderLanguageSelector({ compact }: { compact: boolean }) {
  const c = useColors();
  const { clientLanguage, setClientLanguage } = useSalon();
  const copy = clientNavigationCopy[clientLanguage];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        accessibilityLabel={
          copy.language + ": " + (clientLanguage === "en" ? "English" : "Español")
        }
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
          {compact ? clientLanguage.toUpperCase() : clientLanguage === "en" ? "English" : "Español"}
        </ButtonLabel>
        <Icon name="ChevronDown" size={12} color={c.headerInk} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} style={{ width: 248 }}>
        <View style={{ padding: 12 }}>
          <Txt size={12} color={c.mutedForeground}>
            {copy.languageScope}
          </Txt>
        </View>
        <DropdownMenuRadioGroup
          value={clientLanguage}
          onValueChange={(value) => {
            if (value === "en" || value === "es") setClientLanguage(value);
          }}
        >
          <DropdownMenuRadioItem value="en" style={{ minHeight: 48 }}>
            <ButtonLabel style={{ paddingHorizontal: 18 }}>English</ButtonLabel>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="es" style={{ minHeight: 48 }}>
            <ButtonLabel style={{ paddingHorizontal: 18 }}>Español</ButtonLabel>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
