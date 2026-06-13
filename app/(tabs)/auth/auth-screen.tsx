import React from "react";
import { FlatList, RefreshControl, TouchableOpacity, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useAuthData } from "./hooks/use-auth-data";
import { AuthCard } from "./components/auth-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { FormModal } from "./components/form-modal";

export default function AuthScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    items,
    loading,
    refreshing,
    formVisible,
    editingItem,
    formProvider,
    formLabel,
    formApiKey,
    formSaving,
    setFormProvider,
    setFormLabel,
    setFormApiKey,
    setFormVisible,
    openCreateForm,
    openEditForm,
    handleSave,
    handleDelete,
    handleToggleActive,
    onRefresh,
  } = useAuthData();

  // ── Loading ──
  if (loading) {
    return <LoadingSkeleton color={c} />;
  }

  // ── Not signed in ──
  if (!user) {
    return <UnauthenticatedView color={c} />;
  }

  // ── Main screen ──
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {/* 空状態 */}
      {items.length === 0 ? (
        <EmptyState onAdd={openCreateForm} color={c} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerRow}>
              {/* タイトルはScreen名としてタブに任せる */}
            </View>
          }
          renderItem={({ item }) => (
            <AuthCard
              item={item}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              color={c}
            />
          )}
        />
      )}

      {/* 追加FAB */}
      {items.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: c.primary }]}
            onPress={openCreateForm}
            activeOpacity={0.8}
          >
            <View style={styles.fabIcon}>
              <View style={styles.fabPlusH} />
              <View style={[styles.fabPlusV, { backgroundColor: "#fff" }]} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* フォームモーダル */}
      <FormModal
        visible={formVisible}
        editingItem={editingItem}
        provider={formProvider}
        label={formLabel}
        apiKey={formApiKey}
        saving={formSaving}
        onProviderChange={setFormProvider}
        onLabelChange={setFormLabel}
        onApiKeyChange={setFormApiKey}
        onSave={handleSave}
        onClose={() => setFormVisible(false)}
        color={c}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 80 },
  headerRow: {
    paddingTop: 16,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  fabPlusH: {
    position: "absolute",
    width: 20,
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  fabPlusV: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
});
