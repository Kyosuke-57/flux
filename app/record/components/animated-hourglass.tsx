import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  color: string;
  isDeterminate: boolean;
};

export function AnimatedHourglass({ color, isDeterminate }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const rotate = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-8deg", "8deg", "-8deg"],
  });

  const opacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ rotate }] }}>
      <Ionicons
        name={isDeterminate ? "document-text-outline" : "hourglass-outline"}
        size={36}
        color={color}
      />
    </Animated.View>
  );
}
