import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  color: string;
};

export function UploadingIcon({ color }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const arrowOpacity = floatAnim.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [1, 0.3, 0.3, 1],
  });

  return (
    <View style={{ width: 48, height: 48, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Ionicons name="cloud-outline" size={36} color={color} />
      </Animated.View>
      <Animated.View
        style={{ position: "absolute", opacity: arrowOpacity, transform: [{ translateY }] }}
      >
        <Ionicons name="arrow-up" size={18} color={color} />
      </Animated.View>
    </View>
  );
}
