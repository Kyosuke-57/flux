import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../contexts/SettingsContext";
import { theme, Typography, Spacing, BorderRadius } from "../theme";

export interface ActionSheetOption {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  icon?: string;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onSelect?: (option: ActionSheetOption, index: number) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function ActionSheet({
  visible,
  title,
  options,
  onSelect,
  onCancel,
  onClose,
}: ActionSheetProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.isDarkMode;
  const c = theme(isDarkMode);
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleDismiss = () => {
    onClose?.();
    onCancel?.();
  };

  const handleSelect = (option: ActionSheetOption, index: number) => {
    onSelect?.(option, index);
    option.onPress?.();
    handleDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                backgroundColor: c.overlay,
                opacity: backdropOpacity,
              },
            ]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              transform: [{ translateY }],
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          {title && (
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.title,
                  { color: c.textMuted },
                ]}
              >
                {title}
              </Text>
            </View>
          )}

          <View style={[styles.optionsContainer, { backgroundColor: c.surfaceSecondary }]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  index < options.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: c.divider,
                  },
                ]}
                onPress={() => handleSelect(option, index)}
                activeOpacity={0.7}
              >
                {option.icon && (
                  <Ionicons
                    name={option.icon as ComponentProps<typeof Ionicons>["name"]}
                    size={20}
                    color={option.destructive ? c.error : c.primary}
                    style={styles.optionIcon}
                  />
                )}
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: option.destructive ? c.error : c.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: c.surfaceSecondary,
                marginTop: Spacing.md,
              },
            ]}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelLabel, { color: c.primary }]}>
              キャンセル
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.caption,
    fontSize: 13,
  },
  optionsContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  optionIcon: {
    marginRight: Spacing.md,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "400",
  },
  cancelButton: {
    borderRadius: BorderRadius.md,
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
