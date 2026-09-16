import fs from "fs";
import path from "path";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, `../${relativePath}`), "utf8");

const preferencesSource = readSource(
  "screens/Common/NotificationPreferencesScreen.tsx",
);
const settingsSource = readSource("screens/Common/SettingsScreen.tsx");
const queriesSource = readSource(
  "hooks/queries/useNotificationQueries.ts",
);
const serviceSource = readSource(
  "services/api/notificationApiService.ts",
);
const dashboardSource = readSource("navigation/DashboardContainer.tsx");
const sidebarSource = readSource("components/Sidebar.tsx");

describe("notification preference loading states", () => {
  it("uses full-screen loading and error states only before preferences mount", () => {
    expect(preferencesSource).toContain(
      "if ((isLoading || isFetching) && !localPrefs)",
    );
    expect(preferencesSource).toContain("if (error && !localPrefs)");
    expect(preferencesSource).toContain("onPress={handleRetry}");
    expect(preferencesSource.indexOf(
      "if ((isLoading || isFetching) && !localPrefs)",
    )).toBeLessThan(preferencesSource.indexOf("if (error && !localPrefs)"));
    expect(preferencesSource).not.toContain("if (isLoading || isFetching)");
    expect(preferencesSource).not.toContain("if (error || !localPrefs)");
  });

  it("keeps the mounted form visible during warm refreshes and failures", () => {
    expect(preferencesSource).toContain(
      "() => preferences ?? null",
    );
    expect(preferencesSource).toContain(
      "localPrefs && (isFetching || error)",
    );
    expect(preferencesSource).toContain(
      "{isFetching ? t('common.loading') : t('common.loadError')}",
    );
    expect(preferencesSource).toContain("error && !isFetching ?");
    expect(preferencesSource).toContain("styles.inlineFeedback");

    const feedbackStart = preferencesSource.indexOf(
      "localPrefs && (isFetching || error)",
    );
    const fetchingBranch = preferencesSource.indexOf(
      "{isFetching ? (",
      feedbackStart,
    );
    const errorRetry = preferencesSource.indexOf(
      "{error && !isFetching ? (",
      feedbackStart,
    );
    expect(fetchingBranch).toBeGreaterThan(feedbackStart);
    expect(errorRetry).toBeGreaterThan(fetchingBranch);
  });

  it("does not hydrate over dirty edits or edits made during a pending save", () => {
    expect(preferencesSource).toContain(
      "preferences && !hasChanges && !updateMutation.isPending",
    );
    expect(preferencesSource).toContain(
      "[preferences, hasChanges, updateMutation.isPending]",
    );
    expect(preferencesSource).toContain(
      "const localPrefsRef = useRef<NotificationPreferences | null>(preferences ?? null);",
    );
    expect(preferencesSource).toContain("localPrefsRef.current = nextPrefs;");
    expect(preferencesSource).toContain("const editRevisionRef = useRef(0);");
    expect(preferencesSource).toContain("editRevisionRef.current += 1;");
    expect(preferencesSource).toContain(
      "const submittedRevision = editRevisionRef.current;",
    );
    expect(preferencesSource).toContain(
      "if (editRevisionRef.current === submittedRevision)",
    );
    expect(preferencesSource).not.toMatch(
      /catch \(err\) \{[\s\S]{0,120}setHasChanges\(false\)/,
    );
  });

  it("preserves the complete eight-field save payload", () => {
    const payloadMatch = preferencesSource.match(
      /const updateDto: UpdateNotificationPreferencesDto = \{([\s\S]*?)\n    \};/,
    );
    expect(payloadMatch).not.toBeNull();
    const payload = payloadMatch?.[1] ?? "";
    const fields = [
      "emailEnabled",
      "smsEnabled",
      "whatsappEnabled",
      "pushEnabled",
      "visitReminders",
      "approvalRequests",
      "checkInOut",
      "dailyAgenda",
    ];
    fields.forEach((field) => {
      expect(payload).toContain(`${field}: submittedPrefs.${field}`);
    });
    expect(
      payload.match(/^\s+\w+Enabled:|^\s+(?:visitReminders|approvalRequests|checkInOut|dailyAgenda):/gm),
    ).toHaveLength(8);
  });

  it("preserves permission handling, switch values, and RTL wrappers", () => {
    expect(preferencesSource).toContain(
      "const granted = await requestPermission();",
    );
    expect(preferencesSource).toContain(
      "permissionStatus !== \"granted\"",
    );
    expect(preferencesSource).toContain(
      "onPress={handleRequestPushPermission}",
    );
    expect(preferencesSource).toContain(
      "value={localPrefs[setting.field]}",
    );
    expect(preferencesSource).toContain(
      "onValueChange={(value) => handleToggle(setting.field, value)}",
    );
    expect(
      preferencesSource.match(/<View style=\{\{ direction: 'ltr' \} as any\}>/g),
    ).toHaveLength(2);
    expect(preferencesSource).toContain("<DirectionalRow style={styles.row}>");
  });

  it("keeps unrelated Settings content mounted while only push loads", () => {
    expect(settingsSource).toContain(
      "data: preferences, isLoading: isLoadingPrefs",
    );
    expect(settingsSource).toContain("{isLoadingPrefs ? (");
    expect(settingsSource).toContain("<ActivityIndicator");
    expect(settingsSource).toContain("value={pushEnabled}");
    expect(settingsSource).not.toContain("isFetching: isLoadingPrefs");
    expect(settingsSource.indexOf("t('settings.profile')")).toBeLessThan(
      settingsSource.indexOf("{isLoadingPrefs ? ("),
    );
    expect(settingsSource.indexOf("t('settings.appearance')")).toBeLessThan(
      settingsSource.indexOf("{isLoadingPrefs ? ("),
    );
  });

  it("preserves the Settings partial mutation and error toast", () => {
    expect(settingsSource).toContain("{ pushEnabled: enabled }");
    expect(settingsSource).toMatch(
      /onError: \(\) => \{[\s\S]*?body: t\('settings\.preferencesError'\),[\s\S]*?setShowInAppToast\(true\);/,
    );
  });

  it("does not alter preference query, mutation, service, or navigation availability", () => {
    expect(queriesSource).toContain(
      "queryKey: notificationKeys.preferences()",
    );
    expect(queriesSource).toContain(
      "queryFn: () => notificationApiService.getPreferences()",
    );
    expect(queriesSource).toContain(
      "mutationFn: (preferences) => notificationApiService.updatePreferences(preferences)",
    );
    expect(serviceSource).toContain("getPreferences");
    expect(serviceSource).toContain("updatePreferences");
    expect(dashboardSource).toContain('<Stack.Screen name="Notifications">');
    expect(dashboardSource).toContain('<Stack.Screen name="Settings">');
    expect(sidebarSource).toContain("screen: 'Notifications'");
    expect(sidebarSource).toContain("screen: 'Settings'");
    expect(sidebarSource).toContain("{renderStandaloneItem(notificationsItem)}");
    expect(sidebarSource).toContain("{renderStandaloneItem(settingsItem)}");
  });

  it("does not add preference requests", () => {
    expect(preferencesSource).toContain(
      "refetch({ cancelRefetch: false });",
    );
    expect(
      preferencesSource.match(/useNotificationPreferencesQuery\(\)/g),
    ).toHaveLength(1);
    expect(
      preferencesSource.match(
        /useUpdateNotificationPreferencesMutation\(\)/g,
      ),
    ).toHaveLength(1);
    expect(preferencesSource).not.toContain("RefreshControl");
    expect(preferencesSource).not.toContain("onRefresh=");
  });
});