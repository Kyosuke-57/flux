import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { getAllMinutes } from "../../../../src/services/minutes";
import type { Minute } from "../../../../src/types";

// ─── 型定義 ────────────────────────────────────────────────

export type CalendarDay = {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  minutes: Minute[];
};

export type CalendarWeek = CalendarDay[];

// ─── ユーティリティ ─────────────────────────────────────────

/** 日付文字列 (created_at) を "YYYY-MM-DD" に変換 */
export function toDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" を日本語日付表記に */
export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

/** Minute の created_at から日本語短縮表記 */
export function formatMinuteTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── カスタムフック ─────────────────────────────────────────

export function useCalendar() {
  const { user } = useAuth();

  // ── カレンダー状態 ──
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    () => toDateKey(today.toISOString()),
  );

  // ── データ状態 ──
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── minutes を日付キーでグループ化 ──
  const minutesByDate = useMemo(() => {
    const map = new Map<string, Minute[]>();
    for (const m of minutes) {
      const key = toDateKey(m.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [minutes]);

  // ── データ取得 ──
  const fetchMinutes = useCallback(async () => {
    if (!user) {
      setMinutes([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data, error } = await getAllMinutes();
      if (data) setMinutes(data);
    } catch {
      // エラーは無視（表示だけの問題）
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMinutes();
  }, [fetchMinutes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMinutes();
  }, [fetchMinutes]);

  // ── 月移動 ──
  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDateKey(toDateKey(today.toISOString()));
  }, [today]);

  // ── カレンダーグリッド構築 ──
  const weeks = useMemo((): CalendarWeek[] => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const todayDateKey = toDateKey(today.toISOString());

    const days: CalendarDay[] = [];

    // 前月の埋め草
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      const key = toDateKey(date.toISOString());
      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth: false,
        isToday: key === todayDateKey,
        minutes: minutesByDate.get(key) ?? [],
      });
    }

    // 当月
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const key = toDateKey(date.toISOString());
      days.push({
        date,
        day: d,
        isCurrentMonth: true,
        isToday: key === todayDateKey,
        minutes: minutesByDate.get(key) ?? [],
      });
    }

    // 翌月の埋め草 (6週分 = 42セル)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      const key = toDateKey(date.toISOString());
      days.push({
        date,
        day: i,
        isCurrentMonth: false,
        isToday: key === todayDateKey,
        minutes: minutesByDate.get(key) ?? [],
      });
    }

    // 週ごとに分割
    const weeks: CalendarWeek[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentYear, currentMonth, minutesByDate, today]);

  // ── 選択日のminutes ──
  const selectedMinutes = useMemo((): Minute[] => {
    if (!selectedDateKey) return [];
    return minutesByDate.get(selectedDateKey) ?? [];
  }, [selectedDateKey, minutesByDate]);

  const handleSelectDate = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
  }, []);

  // ── 月ラベル ──
  const monthLabel = useMemo(() => {
    return `${currentYear}年${currentMonth + 1}月`;
  }, [currentYear, currentMonth]);

  return {
    // 状態
    currentYear,
    currentMonth,
    selectedDateKey,
    loading,
    refreshing,
    minutes,

    // 導出
    weeks,
    selectedMinutes,
    monthLabel,
    today,

    // アクション
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    handleSelectDate,
    onRefresh,
  };
}
