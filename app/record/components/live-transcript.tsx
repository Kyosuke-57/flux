import React, { useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ColorsLight } from "../../../src/theme";

type LiveTranscriptProps = {
  transcript: string;
  color: typeof ColorsLight;
};

export function LiveTranscript({ transcript, color }: LiveTranscriptProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (transcript.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <View
        style={{
          padding: 16,
          backgroundColor: color.surfaceSecondary,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: color.border,
          maxHeight: 350,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, color: color.textMuted, textAlign: "center" }}>
          文字起こしを開始しました...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: color.surfaceSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color.border,
        maxHeight: 350,
      }}
    >
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: 350 - 32 }}
        showsVerticalScrollIndicator={true}
      >
        <Text
          style={{
            fontSize: 15,
            lineHeight: 24,
            color: color.textPrimary,
            textAlign: "left",
          }}
        >
          {transcript}
        </Text>
      </ScrollView>
    </View>
  );
}
