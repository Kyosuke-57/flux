import React, { useEffect, useRef } from "react";
import { Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

type Props = {
  color: string;
  isActive: boolean;
  volume?: number;
};

export function RippleEffect({ color, isActive, volume = 0 }: Props) {
  const ripples = useRef(
    Array.from({ length: 3 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    })),
  ).current;
  const progress = useRef([0, 0.33, 0.66]);
  const volumeRef = useRef(0);
  volumeRef.current = volume;

  useEffect(() => {
    if (!isActive) {
      ripples.forEach((r) => {
        r.scale.setValue(0);
        r.opacity.setValue(0);
      });
      progress.current = [0, 0.33, 0.66];
      return;
    }

    const timer = setInterval(() => {
      const vol = volumeRef.current;
      const speed = 0.012 + vol * 0.04;

      progress.current = progress.current.map((p, i) => {
        const next = p + speed * (1 + i * 0.15);
        return next > 1 ? next - 1 : next;
      });

      ripples.forEach((r, i) => {
        const p = progress.current[i];
        r.scale.setValue(p);
        r.opacity.setValue(
          p < 0.1 ? (p / 0.1) * 0.4 : ((1 - p) / 0.9) * 0.4 * vol,
        );
      });
    }, 30);

    return () => clearInterval(timer);
  }, [isActive, ripples]);

  const size = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.2;

  return (
    <>
      {ripples.map((r, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            opacity: r.opacity,
            transform: [{ scale: r.scale }],
          }}
          pointerEvents="none"
        />
      ))}
    </>
  );
}
