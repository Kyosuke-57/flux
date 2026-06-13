import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import type { ColorsLight } from "../../../../src/theme";
import type { CalendarWeek, CalendarDay } from "../hooks/use-calendar";

type Props = {
  weeks: CalendarWeek[];
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
  color: typeof ColorsLight;
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48 - 12) / 7); // 左右padding 24*2 + gap

function toDateKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CalendarCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  hasMinutes,
  onPress,
  color,
}: {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasMinutes: boolean;
  onPress: () => void;
  color: typeof ColorsLight;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.cell,
        isSelected && {
          backgroundColor: color.primary,
        },
        isToday && !isSelected && {
          borderColor: color.primary,
          borderWidth: 1.5,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text
        style={[
          styles.cellText,
          {
            color: isCurrentMonth
              ? isSelected
                ? color.textInverse
                : color.textPrimary
              : isSelected
                ? color.textInverse
                : color.textMuted,
            fontWeight: isToday ? "700" : "500",
          },
        ]}
      >
        {day}
      </Text>
      {hasMinutes && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isSelected ? color.textInverse : color.primary,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

export function CalendarGrid({
  weeks,
  selectedDateKey,
  onSelectDate,
  color,
}: Props) {
  return (
    <View style={styles.container}>
      {/* 曜日ヘッダー */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((label, i) => (
          <View key={label} style={styles.cell}>
            <Text
              style={[
                styles.weekLabel,
                {
                  color:
                    i === 0
                      ? color.error
                      : i === 6
                        ? color.info
                        : color.textMuted,
                },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 週ごとの行 */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day: CalendarDay) => {
            const key = toDateKeyFromDate(day.date);
            return (
              <CalendarCell
                key={key}
                day={day.day}
                isCurrentMonth={day.isCurrentMonth}
                isToday={day.isToday}
                isSelected={selectedDateKey === key}
                hasMinutes={day.minutes.length > 0}
                onPress={() => onSelectDate(key)}
                color={color}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    gap: 2,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  cellText: {
    fontSize: 15,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
