import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Platform, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { Txt } from "./ui";
import SubtleShimmer from "./SubtleShimmer";

const SIZE = 60;
const EDGE_GAP = 12;

export default function FloatingBag() {
  const s = useSalon();
  const router = useRouter();
  const reducedMotion = useReducedMotionPreference();
  const { width, height } = useWindowDimensions();
  const [bounds, setBounds] = useState({ width, height });
  const count =
    Object.values(s.cart).reduce((sum, quantity) => sum + quantity, 0) +
    s.selected.length +
    s.workshopCart.length;
  const [position, setPosition] = useState(() => ({
    x: Math.max(12, width - SIZE - 14),
    y: 180,
  }));
  const drag = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const addTurn = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const origin = useRef(position);
  const moved = useRef(false);
  const previousCount = useRef(count);

  useEffect(() => {
    setPosition((current) => ({
      x:
        current.x < bounds.width / 2
          ? EDGE_GAP
          : Math.max(EDGE_GAP, bounds.width - SIZE - EDGE_GAP),
      y: Math.min(Math.max(72, current.y), Math.max(72, bounds.height - SIZE - 96)),
    }));
  }, [bounds.height, bounds.width]);

  useEffect(() => {
    if (count > previousCount.current && reducedMotion === false) {
      addTurn.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1.12,
            speed: 24,
            bounciness: 8,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.spring(scale, {
            toValue: 1,
            speed: 20,
            bounciness: 5,
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
        Animated.timing(addTurn, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    }
    previousCount.current = count;
  }, [addTurn, count, reducedMotion, scale]);

  const settleTilt = () => {
    Animated.parallel([
      Animated.spring(tiltX, {
        toValue: 0,
        speed: 22,
        bounciness: 6,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(tiltY, {
        toValue: 0,
        speed: 22,
        bounciness: 6,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const openBag = () => {
    if (reducedMotion !== false) {
      router.push({ pathname: "/[page]", params: { page: "bag" } });
      return;
    }
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 90,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(scale, {
        toValue: 1.08,
        speed: 28,
        bounciness: 5,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => {
      scale.setValue(1);
      router.push({ pathname: "/[page]", params: { page: "bag" } });
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
        onPanResponderGrant: () => {
          origin.current = position;
          moved.current = false;
          drag.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_event, gesture) => {
          moved.current = moved.current || Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
          drag.setValue({ x: gesture.dx, y: gesture.dy });
          if (reducedMotion === false) {
            tiltX.setValue(Math.max(-1, Math.min(1, gesture.dy / 70)));
            tiltY.setValue(Math.max(-1, Math.min(1, gesture.dx / 70)));
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          const rawX = Math.min(
            Math.max(EDGE_GAP, origin.current.x + gesture.dx),
            Math.max(EDGE_GAP, bounds.width - SIZE - EDGE_GAP),
          );
          const next = {
            x:
              rawX + SIZE / 2 < bounds.width / 2
                ? EDGE_GAP
                : Math.max(EDGE_GAP, bounds.width - SIZE - EDGE_GAP),
            y: Math.min(
              Math.max(72, origin.current.y + gesture.dy),
              Math.max(72, bounds.height - SIZE - 96),
            ),
          };
          drag.setValue({ x: 0, y: 0 });
          setPosition(next);
          settleTilt();
          if (!moved.current) openBag();
        },
        onPanResponderTerminate: () => {
          drag.setValue({ x: 0, y: 0 });
          settleTilt();
        },
      }),
    [bounds.height, bounds.width, drag, position, reducedMotion, router, scale, tiltX, tiltY],
  );

  return (
    <View
      pointerEvents="box-none"
      onLayout={({ nativeEvent }) => {
        const next = nativeEvent.layout;
        if (next.width > 0 && next.height > 0) {
          setBounds((current) =>
            current.width === next.width && current.height === next.height
              ? current
              : { width: next.width, height: next.height },
          );
        }
      }}
      style={{ position: "absolute", inset: 0, zIndex: 50 }}
    >
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={`Shopping bag with ${count} ${count === 1 ? "item" : "items"}. Drag to move or tap to open.`}
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          width: SIZE,
          height: SIZE,
          transform: [
            { perspective: 600 },
            { translateX: drag.x },
            { translateY: drag.y },
            {
              rotateX: tiltX.interpolate({
                inputRange: [-1, 1],
                outputRange: ["-7deg", "7deg"],
              }),
            },
            {
              rotateY: tiltY.interpolate({
                inputRange: [-1, 1],
                outputRange: ["7deg", "-7deg"],
              }),
            },
            {
              rotate: addTurn.interpolate({
                inputRange: [0, 0.35, 0.7, 1],
                outputRange: ["0deg", "-5deg", "4deg", "0deg"],
              }),
            },
            { scale },
          ],
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            backgroundColor: "#171717",
            borderWidth: 1,
            borderColor: "#F3D9A4",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            ...(Platform.OS === "web"
              ? { boxShadow: "0 5px 14px rgba(0,0,0,0.24)" }
              : {
                  shadowColor: "#000000",
                  shadowOpacity: 0.24,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                }),
            elevation: 8,
          }}
        >
          <SubtleShimmer color="rgba(243,217,164,0.72)" interval={16000} borderRadius={18} />
          <Icon name="ShoppingBag" size={28} color="#F3D9A4" strokeWidth={2.2} />
        </View>
        {count > 0 && (
          <View
            style={{
              position: "absolute",
              right: -3,
              top: -4,
              minWidth: 24,
              height: 24,
              borderRadius: 12,
              paddingHorizontal: 5,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#2563EB",
              borderWidth: 2,
              borderColor: "#171717",
            }}
          >
            <Txt size={11} bold color="#FFFFFF">
              {count > 99 ? "99+" : count}
            </Txt>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
