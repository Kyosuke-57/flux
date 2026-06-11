import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signIn, signUp, signInWithGoogle } from "../../src/services/auth";
import { useAuth } from "../../src/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows, theme } from "../../src/theme";
import { useHaptics, useBounce, FadeInView } from "../../src/animations";
import { useSettings } from "../../src/contexts/SettingsContext";

export default function LoginScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();
  const submitBtn = useBounce({ scaleIn: 0.95 });
  const googleBtn = useBounce({ scaleIn: 0.95 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("すべての項目を入力してください");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: authError } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);
      if (authError) {
        setError(authError.message);
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setError(err?.message || "予期しないエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) {
        setError(authError.message);
      }
    } catch (err: any) {
      setError(err?.message || "予期しないエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <FadeInView delay={0} style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: c.primaryBg }]}>
            <Ionicons name="mic" size={28} color={c.primary} />
          </View>
          <Text style={[styles.title, { color: c.textPrimary }]}>OTOROKU</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {isLogin
              ? "おかえりなさい！アカウントにサインイン"
              : "アカウントを作成して始めましょう"}
          </Text>
        </FadeInView>

        <FadeInView delay={150} style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: c.errorBg, borderColor: c.error }]}>
              <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.textPrimary }]}
            placeholder="メールアドレス"
            placeholderTextColor={c.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.textPrimary }]}
            placeholder="パスワード"
            placeholderTextColor={c.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isLogin ? "current-password" : "new-password"}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: c.primary }, loading && styles.buttonDisabled]}
            onPress={() => { haptics.mediumTap(); handleSubmit(); }}
            onPressIn={submitBtn.onPressIn}
            onPressOut={submitBtn.onPressOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: c.textInverse }]}>
                {isLogin ? "サインイン" : "新規登録"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.textMuted }]}>または</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: c.surface, borderColor: c.border }, loading && styles.buttonDisabled]}
            onPress={() => { haptics.mediumTap(); handleGoogleSignIn(); }}
            onPressIn={googleBtn.onPressIn}
            onPressOut={googleBtn.onPressOut}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={18} color={c.textSecondary} />
            <Text style={[styles.googleText, { color: c.textPrimary }]}>Googleで続ける</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setError("");
              setIsLogin(!isLogin);
            }}
            disabled={loading}
          >
            <Text style={[styles.switchText, { color: c.primary }]}>
              {isLogin
                ? "アカウントをお持ちでない方は新規登録"
                : "すでにアカウントをお持ちの方はサインイン"}
            </Text>
          </TouchableOpacity>
        </FadeInView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    ...Shadows.md,
  },
  errorContainer: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  googleButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "500",
  },
  switchText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
  },
});
