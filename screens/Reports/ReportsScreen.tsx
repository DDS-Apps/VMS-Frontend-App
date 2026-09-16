import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { DirectionalRow } from "@/components/DirectionalRow";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { applyOpacity } from "@/utils/statusStyles";
import { getAccessToken } from "@/api/httpClient";
import { apiConfig } from "@/api/config";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

function defaultEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function displayDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── types ────────────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "xlsx";
type DownloadStatus = "idle" | "success" | "error";

// ─── component ────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [showCalendar, setShowCalendar] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
  const [rowCount, setRowCount] = useState<number | null>(null);

  // ── download ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadStatus("idle");
    setRowCount(null);

    const start = toApiDate(startDate);
    const end = toApiDate(endDate);
    const filename = `visit-report-${start}_${end}.${format}`;

    try {
      const token = getAccessToken();
      const params = new URLSearchParams({ format, startDate: start, endDate: end });
      const fullUrl = `${apiConfig.baseUrl}${apiConfig.endpoints.admin.analytics.export}?${params}`;

      if (Platform.OS === "web") {
        // Use fetch directly — avoids axios interceptors that set Accept: application/json
        // which conflicts with binary file responses and causes blob error-body parse failures.
        const response = await fetch(fullUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "*/*",
          },
        });

        if (!response.ok) {
          console.error(`[Reports] Export failed: HTTP ${response.status}`);
          setDownloadStatus("error");
          return;
        }

        const countHeader = response.headers.get("x-row-count");
        if (countHeader) setRowCount(parseInt(countHeader, 10));

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        setDownloadStatus("success");
      } else {
        // Mobile — fetch directly instead of File.downloadFileAsync because
        // the latter can drop the Authorization header on an HTTP redirect.
        // Write the response bytes through Expo's current File API so the
        // report is never expanded into a large base64 string in Hermes.
        const response = await fetch(fullUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "*/*",
          },
        });

        if (!response.ok) {
          console.error(`[Reports] Export failed: HTTP ${response.status}`);
          setDownloadStatus("error");
          return;
        }

        const countHeader = response.headers.get("x-row-count");
        if (countHeader) setRowCount(parseInt(countHeader, 10));

        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength === 0) {
          throw new Error("[Reports] Export response was empty");
        }

        const exportFile = new File(Paths.cache, filename);
        exportFile.write(bytes);

        const savedFile = exportFile.info();
        if (!savedFile.exists || !savedFile.size) {
          throw new Error("[Reports] Export file could not be saved");
        }

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          throw new Error("[Reports] File sharing is unavailable on this device");
        }

        await Sharing.shareAsync(exportFile.uri, {
          mimeType:
            format === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "text/csv",
          UTI:
            format === "xlsx"
              ? "org.openxmlformats.spreadsheetml.sheet"
              : "public.comma-separated-values-text",
          dialogTitle: filename,
        });
        setDownloadStatus("success");
      }
    } catch (err: unknown) {
      console.error("[Reports] Download error:", err);
      setDownloadStatus("error");
    } finally {
      setIsDownloading(false);
    }
  }, [startDate, endDate, format]);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <ThemedView style={{ flex: 1 }}>
      <ScreenScrollView>
        <Spacer height={Spacing.lg} />

        {/* ── Export settings card ───────────────────────────────────── */}
        <View
          style={[
            styles.configCard,
            { backgroundColor: theme.surface, marginHorizontal: Spacing.lg },
          ]}
        >
          <ThemedText style={[Typography.bodyLarge, { fontWeight: "600", marginBottom: Spacing.md }]}>
            {t("reports.exportSettings")}
          </ThemedText>

          {/* Date range */}
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t("reports.dateRange")}
          </ThemedText>
          <Pressable
            style={[
              styles.dateButton,
              { borderColor: theme.border, backgroundColor: applyOpacity(theme.primary, "08") },
            ]}
            onPress={() => setShowCalendar(true)}
          >
            <DDIcon name="calendar" size={15} color={theme.primary} />
            <ThemedText style={[Typography.body, { color: theme.primary, flex: 1, marginHorizontal: Spacing.xs }]}>
              {displayDate(startDate)} → {displayDate(endDate)}
            </ThemedText>
            <DDIcon name="chevron-down" size={13} color={theme.primary} />
          </Pressable>

          <Spacer height={Spacing.md} />

          {/* Format */}
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
            {t("reports.format")}
          </ThemedText>
          <DirectionalRow style={{ gap: Spacing.sm }}>
            {(["csv", "xlsx"] as ExportFormat[]).map((f) => {
              const active = format === f;
              return (
                <Pressable
                  key={f}
                  style={[
                    styles.formatBtn,
                    {
                      backgroundColor: active ? theme.primary : applyOpacity(theme.primary, "08"),
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    setFormat(f);
                    setDownloadStatus("idle");
                  }}
                >
                  <DDIcon
                    name={f === "xlsx" ? "file-text" : "download"}
                    size={14}
                    color={active ? theme.buttonText : theme.primary}
                  />
                  <ThemedText
                    style={[
                      Typography.bodySmall,
                      {
                        color: active ? theme.buttonText : theme.primary,
                        fontWeight: "600",
                        marginStart: 5,
                      },
                    ]}
                  >
                    {f === "xlsx" ? "Excel (.xlsx)" : "CSV (.csv)"}
                  </ThemedText>
                </Pressable>
              );
            })}
          </DirectionalRow>

          <Spacer height={Spacing.md} />

          {/* Audit note — explains why export count differs from KPI cards */}
          <DirectionalRow
            style={{
              backgroundColor: applyOpacity(theme.primary, "08"),
              borderRadius: 8,
              padding: Spacing.sm,
              alignItems: "flex-start",
              gap: Spacing.xs,
            }}
          >
            <DDIcon name="info" size={13} color={theme.primary} />
            <ThemedText
              style={[Typography.caption, { color: theme.textSecondary, flex: 1, lineHeight: 18 }]}
            >
              {t("reports.exportAuditNote")}
            </ThemedText>
          </DirectionalRow>
        </View>

        <Spacer height={Spacing.lg} />

        {/* ── Download button ────────────────────────────────────────── */}
        <View style={{ marginHorizontal: Spacing.lg }}>
          <LoadingButton
            onPress={handleDownload}
            loading={isDownloading}
            loadingText={t("reports.preparing")}
            icon="download"
            fullWidth
          >
            {t("reports.downloadReport")}
          </LoadingButton>
        </View>

        {/* ── Status feedback ────────────────────────────────────────── */}
        {downloadStatus === "success" && (
          <>
            <Spacer height={Spacing.md} />
            <DirectionalRow
              style={[
                styles.statusBanner,
                {
                  backgroundColor: applyOpacity(theme.success, "12"),
                  marginHorizontal: Spacing.lg,
                },
              ]}
            >
              <DDIcon name="check" size={15} color={theme.success} />
              <ThemedText
                style={[Typography.bodySmall, { color: theme.success, marginStart: Spacing.xs, flex: 1 }]}
              >
                {rowCount != null
                  ? t("reports.successWithCount", { count: String(rowCount) })
                  : t("reports.success")}
              </ThemedText>
            </DirectionalRow>
          </>
        )}

        {downloadStatus === "error" && (
          <>
            <Spacer height={Spacing.md} />
            <DirectionalRow
              style={[
                styles.statusBanner,
                {
                  backgroundColor: applyOpacity(theme.error, "12"),
                  marginHorizontal: Spacing.lg,
                },
              ]}
            >
              <DDIcon name="alert-circle" size={15} color={theme.error} />
              <ThemedText
                style={[Typography.bodySmall, { color: theme.error, marginStart: Spacing.xs, flex: 1 }]}
              >
                {t("reports.error")}
              </ThemedText>
            </DirectionalRow>
          </>
        )}

        <Spacer height={Spacing.xl} />
      </ScreenScrollView>

      <CalendarDatePicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        mode="range"
        dateRange={{ startDate, endDate }}
        onRangeSelect={(range) => {
          if (range.startDate) {
            setStartDate(range.startDate);
            setDownloadStatus("idle");
          }
          if (range.endDate) {
            setEndDate(range.endDate);
          }
        }}
        allowPastDates
      />
    </ThemedView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  configCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  formatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  statusBanner: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
});
