import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  message: string;
  type: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  onAutoHide?: () => void;
}

interface ToastContextType {
  showToast: (toast: ToastMessage) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

const TOAST_COLORS: Record<ToastType, string> = {
  success: "#22C55E",
  error: "#EF4444",
  info: "#3B82F6",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (t: ToastMessage) => {
      // 既存のタイマーをクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast(t);
      setVisible(true);

      // フェードイン
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const hideDuration = t.duration ?? 2000;

      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          setToast(null);
          t.onAutoHide?.();
        });
      }, hideDuration);
    },
    [opacity],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && toast && (
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: TOAST_COLORS[toast.type], opacity },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
