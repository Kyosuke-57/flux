import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

interface HighlightedTextProps {
  text: string;
  highlight: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Renders text with matching substrings highlighted in yellow.
 * Case-insensitive matching. If no highlight string is provided,
 * renders the text as-is.
 */
export function HighlightedText({
  text,
  highlight,
  style,
  numberOfLines,
}: HighlightedTextProps) {
  if (!highlight.trim()) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => {
        regex.lastIndex = 0;
        return regex.test(part) ? (
          <Text key={i} style={{ backgroundColor: "#FDE047", color: "#1E293B" }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        );
      })}
    </Text>
  );
}
