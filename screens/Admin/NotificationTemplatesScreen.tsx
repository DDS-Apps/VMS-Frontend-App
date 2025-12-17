import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { NotificationTemplate, NotificationEventType, NotificationChannelConfig } from "@/types/vms.types";
import {
  getNotificationTemplates,
  updateNotificationTemplate,
  NOTIFICATION_EVENT_TYPES,
} from "@/services/mock/systemAdminState";

const HORIZONTAL_PADDING = Spacing.md;

const CHANNEL_CONFIG: { id: keyof NotificationChannelConfig; icon: string; label: string }[] = [
  { id: "qr", icon: "smartphone", label: "QR Code" },
  { id: "whatsapp", icon: "message-circle", label: "WhatsApp" },
  { id: "sms", icon: "message-square", label: "SMS" },
  { id: "email", icon: "mail", label: "Email" },
];

export default function NotificationTemplatesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [editChannels, setEditChannels] = useState<NotificationChannelConfig>({
    qr: false,
    whatsapp: false,
    sms: false,
    email: false,
  });
  const [editEmailSubject, setEditEmailSubject] = useState("");
  const [editEmailBody, setEditEmailBody] = useState("");
  const [editSmsTemplate, setEditSmsTemplate] = useState("");
  const [editWhatsappTemplate, setEditWhatsappTemplate] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = () => {
    setTemplates(getNotificationTemplates());
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setEditChannels({ ...template.channels });
    setEditEmailSubject(template.emailSubject || "");
    setEditEmailBody(template.emailBody || "");
    setEditSmsTemplate(template.smsTemplate || "");
    setEditWhatsappTemplate(template.whatsappTemplate || "");
    setShowModal(true);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    updateNotificationTemplate(selectedTemplate.id, {
      channels: editChannels,
      emailSubject: editEmailSubject,
      emailBody: editEmailBody,
      smsTemplate: editSmsTemplate,
      whatsappTemplate: editWhatsappTemplate,
    });

    loadTemplates();
    setShowModal(false);
  };

  const handleToggleChannel = (channel: keyof NotificationChannelConfig) => {
    setEditChannels((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const handleToggleActive = (template: NotificationTemplate) => {
    updateNotificationTemplate(template.id, {
      isActive: !template.isActive,
    });
    loadTemplates();
  };

  const getEventTypeName = (eventType: NotificationEventType) => {
    const found = NOTIFICATION_EVENT_TYPES.find((e) => e.id === eventType);
    return found?.name || eventType;
  };

  const getActiveChannelsCount = (channels: NotificationChannelConfig) => {
    return Object.values(channels).filter(Boolean).length;
  };

  const renderTemplateCard = ({ item: template }: { item: NotificationTemplate }) => (
    <Pressable
      style={[styles.templateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => handleEditTemplate(template)}
    >
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>{template.name}</ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
            {getEventTypeName(template.eventType)}
          </ThemedText>
        </View>
        <Switch
          value={template.isActive}
          onValueChange={() => handleToggleActive(template)}
          trackColor={{ false: theme.border, true: theme.primary + "80" }}
          thumbColor={template.isActive ? theme.primary : theme.textSecondary}
        />
      </View>

      <View style={styles.channelsContainer}>
        {CHANNEL_CONFIG.map((channel) => (
          <View
            key={channel.id}
            style={[
              styles.channelBadge,
              {
                backgroundColor: template.channels[channel.id] ? theme.primary + "15" : theme.surface,
                borderColor: template.channels[channel.id] ? theme.primary : theme.border,
              },
            ]}
          >
            <DDIcon
              name={channel.icon as any}
              size={14}
              color={template.channels[channel.id] ? theme.primary : theme.textSecondary}
            />
            <ThemedText
              style={[
                Typography.caption,
                {
                  color: template.channels[channel.id] ? theme.primary : theme.textSecondary,
                  marginStart: 4,
                },
              ]}
            >
              {channel.label}
            </ThemedText>
          </View>
        ))}
      </View>

      {template.placeholders.length > 0 ? (
        <View style={styles.placeholdersContainer}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
            {t("admin.placeholders")}:
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.placeholdersList}>
            {template.placeholders.map((placeholder) => (
              <View key={placeholder} style={[styles.placeholderChip, { backgroundColor: theme.info + "15" }]}>
                <ThemedText style={[Typography.caption, { color: theme.info }]}>
                  {`{{${placeholder}}}`}
                </ThemedText>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.templateFooter}>
        <Pressable
          style={[styles.editButton, { backgroundColor: theme.primary + "15" }]}
          onPress={() => handleEditTemplate(template)}
        >
          <DDIcon name="edit-2" size={16} color={theme.primary} />
          <ThemedText style={[Typography.caption, { color: theme.primary, marginStart: 6 }]}>
            {t("admin.templateEditor")}
          </ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={[Typography.h2, { fontWeight: "700" }]}>
          {t("admin.notificationTemplates")}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
          {t("admin.communicationSettings")}
        </ThemedText>
      </View>

      <FlatList
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[Typography.subtitle, { fontWeight: "600" }]}>
                {selectedTemplate?.name}
              </ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <DDIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                {t("admin.channels")}
              </ThemedText>
              <View style={styles.channelToggles}>
                {CHANNEL_CONFIG.map((channel) => (
                  <View
                    key={channel.id}
                    style={[styles.channelToggle, { borderColor: theme.border }]}
                  >
                    <View style={styles.channelToggleInfo}>
                      <DDIcon name={channel.icon as any} size={20} color={theme.text} />
                      <ThemedText style={[Typography.body, { marginStart: Spacing.sm }]}>
                        {channel.label}
                      </ThemedText>
                    </View>
                    <Switch
                      value={editChannels[channel.id]}
                      onValueChange={() => handleToggleChannel(channel.id)}
                      trackColor={{ false: theme.border, true: theme.primary + "80" }}
                      thumbColor={editChannels[channel.id] ? theme.primary : theme.textSecondary}
                    />
                  </View>
                ))}
              </View>
              <View style={{ height: Spacing.lg }} />

              {editChannels.email ? (
                <>
                  <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                    {t("admin.emailSubject")}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={editEmailSubject}
                    onChangeText={setEditEmailSubject}
                    placeholder={t("admin.emailSubject")}
                    placeholderTextColor={theme.textSecondary}
                  />
                  <View style={{ height: Spacing.md }} />

                  <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                    {t("admin.emailBody")}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={editEmailBody}
                    onChangeText={setEditEmailBody}
                    placeholder={t("admin.emailBody")}
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={{ height: Spacing.lg }} />
                </>
              ) : null}

              {editChannels.sms ? (
                <>
                  <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                    {t("admin.smsTemplate")}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                        height: 80,
                      },
                    ]}
                    value={editSmsTemplate}
                    onChangeText={setEditSmsTemplate}
                    placeholder={t("admin.smsTemplate")}
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={{ height: Spacing.lg }} />
                </>
              ) : null}

              {editChannels.whatsapp ? (
                <>
                  <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                    {t("admin.whatsappTemplate")}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={editWhatsappTemplate}
                    onChangeText={setEditWhatsappTemplate}
                    placeholder={t("admin.whatsappTemplate")}
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={{ height: Spacing.lg }} />
                </>
              ) : null}

              {selectedTemplate?.placeholders && selectedTemplate.placeholders.length > 0 ? (
                <>
                  <ThemedText style={[Typography.label, { marginBottom: Spacing.sm }]}>
                    {t("admin.placeholders")}
                  </ThemedText>
                  <View style={styles.placeholdersGrid}>
                    {selectedTemplate.placeholders.map((placeholder) => (
                      <View key={placeholder} style={[styles.placeholderChip, { backgroundColor: theme.info + "15" }]}>
                        <ThemedText style={[Typography.caption, { color: theme.info }]}>
                          {`{{${placeholder}}}`}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
              <View style={{ height: Spacing.xl }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <LoadingButton
                onPress={() => setShowModal(false)}
                variant="secondary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </LoadingButton>
              <View style={{ width: Spacing.md }} />
              <LoadingButton
                onPress={handleSave}
                variant="primary"
                size="medium"
                fullWidth={false}
                style={{ flex: 1 }}
              >
                {t("common.save")}
              </LoadingButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  templateCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  templateInfo: {
    flex: 1,
  },
  channelsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  channelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  placeholdersContainer: {
    marginTop: Spacing.md,
  },
  placeholdersList: {
    marginTop: Spacing.xs,
  },
  placeholdersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  placeholderChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginEnd: Spacing.xs,
  },
  templateFooter: {
    marginTop: Spacing.md,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopStartRadius: BorderRadius.xl,
    borderTopEndRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: HORIZONTAL_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalBody: {
    padding: HORIZONTAL_PADDING,
  },
  channelToggles: {
    gap: Spacing.sm,
  },
  channelToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  channelToggleInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: "row",
    padding: HORIZONTAL_PADDING,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
