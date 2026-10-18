import * as SelectPrimitive from "@rn-primitives/select";
import * as React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import LucideIcon from "@/lib/icons/LucideIcon";
import { cn } from "@/lib/utils";
import { useWebPortal } from "../WebPortalContext";

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  ref,
  className,
  children,
  ...props
}: SelectPrimitive.TriggerProps & {
  ref?: React.RefObject<SelectPrimitive.TriggerRef>;
  children?: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "native:h-12 flex h-10 flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground web:ring-offset-background web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2 [&>span]:line-clamp-1",
        props.disabled && "opacity-50 web:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {children}
      <LucideIcon
        name="ChevronDown"
        size={16}
        aria-hidden={true}
        className="text-foreground opacity-50"
      />
    </SelectPrimitive.Trigger>
  );
}

/**
 * Platform: WEB ONLY
 */
function SelectScrollUpButton({
  className,
  testID: _testID,
  ...props
}: SelectPrimitive.ScrollUpButtonProps & { testID?: string }) {
  if (Platform.OS !== "web") return null;
  return React.createElement(
    SelectPrimitive.ScrollUpButton,
    {
      ...props,
      className: cn("flex items-center justify-center py-1 web:cursor-default", className),
    },
    <LucideIcon name="ChevronUp" size={14} className="text-foreground" />,
  );
}

/**
 * Platform: WEB ONLY
 */
function SelectScrollDownButton({
  className,
  testID: _testID,
  ...props
}: SelectPrimitive.ScrollDownButtonProps & { testID?: string }) {
  if (Platform.OS !== "web") return null;
  return React.createElement(
    SelectPrimitive.ScrollDownButton,
    {
      ...props,
      className: cn("flex items-center justify-center py-1 web:cursor-default", className),
    },
    <LucideIcon name="ChevronDown" size={14} className="text-foreground" />,
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  portalHost,
  ...props
}: SelectPrimitive.ContentProps & {
  ref?: React.RefObject<SelectPrimitive.ContentRef>;
  className?: string;
  portalHost?: string;
}) {
  const { open } = SelectPrimitive.useRootContext();
  const { container } = useWebPortal();

  return (
    <SelectPrimitive.Portal container={container} hostName={portalHost}>
      <SelectPrimitive.Overlay style={Platform.OS !== "web" ? StyleSheet.absoluteFill : undefined}>
        <Animated.View className="z-50" entering={FadeIn} exiting={FadeOut}>
          <SelectPrimitive.Content
            className={cn(
              "relative z-50 max-h-96 min-w-[8rem] rounded-md border border-border bg-popover px-1 py-2 shadow-md shadow-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              position === "popper" &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
              open
                ? "web:animate-in web:fade-in-0 web:zoom-in-95"
                : "web:animate-out web:fade-out-0 web:zoom-out-95",
              className,
            )}
            position={position}
            {...props}
          >
            <SelectScrollUpButton />
            {React.createElement(
              SelectPrimitive.Viewport,
              {
                className: cn(
                  "p-1",
                  position === "popper" &&
                    "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
                ),
              },
              children,
            )}
            <SelectScrollDownButton />
          </SelectPrimitive.Content>
        </Animated.View>
      </SelectPrimitive.Overlay>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.LabelProps & {
  ref?: React.RefObject<SelectPrimitive.LabelRef>;
}) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "native:pb-2 native:pl-10 text-caption py-1.5 pl-8 pr-2 text-popover-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  textClassName,
  testID,
  ...props
}: SelectPrimitive.ItemProps & {
  ref?: React.RefObject<SelectPrimitive.ItemRef>;
  textClassName?: string;
}) {
  // Web Item uses a DOM slot; native-only testID must not reach that element.
  return React.createElement(
    SelectPrimitive.Item,
    {
      ...props,
      ...(Platform.OS === "web" ? {} : { testID }),
      className: cn(
        "web:group native:py-2 native:pl-10 relative flex w-full flex-row items-center rounded-sm py-1.5 pl-8 pr-2 active:bg-accent web:cursor-default web:select-none web:outline-none web:hover:bg-accent/50 web:focus:bg-accent",
        props.disabled && "opacity-50 web:pointer-events-none",
        className,
      ),
    },
    <>
      <View className="native:left-3.5 native:pt-px absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <LucideIcon name="Check" size={16} strokeWidth={3} className="text-popover-foreground" />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText
        className={cn(
          "native:text-lg text-caption text-sm text-popover-foreground web:group-focus:text-accent-foreground",
          textClassName,
        )}
      />
    </>,
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.SeparatorProps & {
  ref?: React.RefObject<SelectPrimitive.SeparatorRef>;
}) {
  return (
    <SelectPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type Option,
};
