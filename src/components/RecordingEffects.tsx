import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, useWindowDimensions } from "react-native";

interface WaveformEffectProps {
  color: string;
  isActive: boolean;
  volume?: number; // 0-1 の音量レベル
}

export function WaveformEffect({ color, isActive, volume = 0 }: WaveformEffectProps) {
  const bars = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.15))
  ).current;
  const smoothValues = useRef(bars.map(() => 0.15));
  const volumeRef = useRef(0);
  volumeRef.current = volume;

  useEffect(() => {
    if (!isActive) {
      bars.forEach((bar) => bar.setValue(0.15));
      smoothValues.current = bars.map(() => 0.15);
      return;
    }

    const timer = setInterval(() => {
      const vol = volumeRef.current;
      bars.forEach((bar, i) => {
        const offset = 0.5 + 0.5 * (i / (bars.length - 1));
        const target = 0.15 + vol * 0.85 * offset;
        const current = smoothValues.current[i];
        const smoothed = current + (target - current) * 0.3;
        smoothValues.current[i] = smoothed;
        bar.setValue(smoothed);
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isActive, bars]);

  return (
    <View style={styles.fullscreenContainer} pointerEvents="none">
      <View style={styles.waveformRow}>
        {bars.map((bar, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveformBar,
              {
                backgroundColor: color,
                transform: [{ scaleY: bar }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

interface PulseEffectProps {
  color: string;
  isActive: boolean;
  volume?: number; // 0-1 の音量レベル
}

export function PulseEffect({ color, isActive, volume = 0 }: PulseEffectProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const SCREEN_MAX = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const smoothScale = useRef(1);
  const smoothOpacity = useRef(0);
  const volumeRef = useRef(0);
  volumeRef.current = volume;

  useEffect(() => {
    if (!isActive) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(0);
      smoothScale.current = 1;
      smoothOpacity.current = 0;
      return;
    }

    const timer = setInterval(() => {
      const vol = volumeRef.current;
      const targetScale = 1 + vol * 0.8;
      const targetOpacity = vol * 0.5;

      smoothScale.current += (targetScale - smoothScale.current) * 0.25;
      smoothOpacity.current += (targetOpacity - smoothOpacity.current) * 0.25;

      scaleAnim.setValue(smoothScale.current);
      opacityAnim.setValue(smoothOpacity.current);
    }, 50);

    return () => clearInterval(timer);
  }, [isActive, scaleAnim, opacityAnim]);

  const pulseSize = SCREEN_MAX * 1.2;

  return (
    <View style={styles.fullscreenContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.pulseRingFull,
          {
            width: pulseSize,
            height: pulseSize,
            borderRadius: pulseSize / 2,
            borderColor: color,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  waveformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 120,
  },
  waveformBar: {
    width: 6,
    height: 120,
    borderRadius: 3,
  },
  pulseRingFull: {
    position: "absolute",
    borderWidth: 3,
  },
});
