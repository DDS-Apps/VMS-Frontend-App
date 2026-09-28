import React from "react";
import { act, create } from "react-test-renderer";
import fs from "fs";
import path from "path";

jest.mock("react-native", () => ({
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock("@/constants/theme", () => ({
  BorderRadius: { sm: 6 },
  BrandColors: { brandOrange: "#FF8800", brandGreen: "#008844" },
  StatusColors: { warning: "#AA6600", success: "#008844", error: "#AA0000", info: "#0055AA" },
}));
jest.mock("@/components/ThemedText", () => ({
  ThemedText: ({ children, ...props }: any) => require("react").createElement("ThemedText", props, children),
}));
jest.mock("@/components/DirectionalRow", () => ({
  DirectionalRow: ({ children, ...props }: any) => require("react").createElement("DirectionalRow", props, children),
}));
jest.mock("@/components/DDIcon", () => ({
  DDIcon: (props: any) => require("react").createElement("DDIcon", props),
}));
jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: { textSecondary: "#555555", border: "#CCCCCC", surfaceSecondary: "#EEEEEE", error: "#AA0000" } }),
}));
jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => `translated:${key}` }),
}));

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { ExpiredVisitBadge } from "@/components/shared/ExpiredVisitBadge";
import { StatusLabelBadge, STATUS_BADGE_CONTAINER, STATUS_BADGE_TEXT } from "@/components/shared/StatusLabelBadge";

describe("shared status label styling", () => {
  it("uses one readable text and badge geometry for every status domain", () => {
    expect(STATUS_BADGE_TEXT).toMatchObject({ fontSize: 9, fontWeight: "600" });
    expect(STATUS_BADGE_CONTAINER).toMatchObject({
      minHeight: 18,
      paddingHorizontal: 7,
      paddingVertical: 2,
      maxWidth: "100%",
      flexShrink: 1,
    });
  });

  it("keeps long Arabic labels intact and allows the badge to shrink rather than clip", () => {
    const label = "بانتظار موافقة المضيف على الزيارة";
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<StatusLabelBadge label={label} color="#0055AA" />); });
    const row = renderer!.root.findByType("DirectionalRow");
    const text = renderer!.root.findByType("ThemedText");
    expect(row.props.style[0].maxWidth).toBe("100%");
    expect(text.props.style[0]).toMatchObject({ fontSize: 9, flexShrink: 1 });
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.children).toBe(label);
    act(() => renderer!.unmount());
  });

  it("resolves the same raw visit status through the shared label mapping", () => {
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<RequestStatusBadge status="pending_host_approval" />); });
    const text = renderer!.root.findByType("ThemedText");
    expect(text.props.children).toBe("translated:status.pendingHostApproval");
    expect(text.props.style[0].fontSize).toBe(STATUS_BADGE_TEXT.fontSize);
    act(() => renderer!.unmount());
  });

  it("lets detail screens center a badge without changing its shared dimensions", () => {
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<RequestStatusBadge status="assigned" alignSelf="center" />); });
    const row = renderer!.root.findByType("DirectionalRow");
    const text = renderer!.root.findByType("ThemedText");
    expect(row.props.style[0]).toBe(STATUS_BADGE_CONTAINER);
    expect(row.props.style[1]).toEqual({ alignSelf: "center" });
    expect(text.props.children).toBe("translated:status.assigned");
    act(() => renderer!.unmount());
  });

  it("gives Visit Expired the shared badge shape and one translated red status label", () => {
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<ExpiredVisitBadge />); });
    const row = renderer!.root.findByType("DirectionalRow");
    const text = renderer!.root.findByType("ThemedText");
    expect(row.props.style[0]).toBe(STATUS_BADGE_CONTAINER);
    expect(row.props.style[2].borderColor).toBe("#AA000030");
    expect(text.props.children).toBe("translated:status.visitExpired");
    expect(text.props.style[0].fontSize).toBe(STATUS_BADGE_TEXT.fontSize);
    expect(text.props.style[1].color).toBe("#AA0000");
    act(() => renderer!.unmount());
  });

  it("uses that shared component on representative request, task, and admin screens", () => {
    for (const screen of [
      "components/shared/VisitorRequestCard.tsx",
      "components/shared/VisitorMatrixTable.tsx",
      "screens/Buffet/BuffetBoardScreen.tsx",
      "screens/Driver/DriverTaskDetailScreen.tsx",
      "screens/BuffetAdmin/BuffetAdminDashboardScreen.tsx",
      "screens/Admin/UserDetailScreen.tsx",
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, "..", screen), "utf8");
      expect(source).toMatch(/<(?:RequestStatusBadge|StatusLabelBadge)\b/);
    }
  });

  it("shows the same expiration badge on cards, tables, and receptionist lists", () => {
    for (const file of [
      "components/shared/VisitorRequestCard.tsx",
      "components/shared/VisitorMatrixTable.tsx",
      "screens/Receptionist/WalkInVisitorsScreen.tsx",
      "screens/Receptionist/ReceptionistDashboardScreen.tsx",
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
      expect(source).toContain("<ExpiredVisitBadge");
    }
  });

  it("aligns expired-visit detail notice typography without changing the underlying status badge", () => {
    for (const file of [
      "components/shared/ExpiredVisitFooter.tsx",
      "screens/Employee/RequestDetailsScreen.tsx",
      "screens/Manager/ManagerApprovalDetailScreen.tsx",
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
      expect(source).toContain("STATUS_BADGE_TEXT");
    }
  });

  it("uses the same Assigned wording in the valet detail badge and status selector", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../screens/Admin/ValetTaskDetailScreen.tsx"),
      "utf8",
    );
    expect(source).toContain("{ value: 'assigned', label: t('status.assigned')");
    expect(source).toContain('<RequestStatusBadge status={task.valet.status} alignSelf="center" />');
  });
});