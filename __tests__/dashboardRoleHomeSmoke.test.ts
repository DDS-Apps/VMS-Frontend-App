import fs from "fs";
import path from "path";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { USER_ROLES, type UserRole } from "@/constants/roles";
import { getMenuGroups } from "@/components/Sidebar";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, `../${relativePath}`), "utf8");

const dashboardSource = readSource("navigation/DashboardContainer.tsx");

type RuntimeRole = UserRole | "admin" | "reception";

type RoleHome = {
  role: RuntimeRole;
  route: string;
  screen: string;
};

const roleHomes: RoleHome[] = [
  { role: "employee", route: "Dashboard", screen: "OverviewScreen" },
  { role: "manager", route: "Dashboard", screen: "OverviewScreen" },
  { role: "admin", route: "Dashboard", screen: "OverviewScreen" },
  { role: "reception", route: "Dashboard", screen: "OverviewScreen" },
  {
    role: "receptionist",
    route: "ReceptionistDashboard",
    screen: "ReceptionistDashboardScreen",
  },
  {
    role: "building_admin",
    route: "AllRequests",
    screen: "AllRequestsScreen",
  },
  {
    role: "buffet_admin",
    route: "BuffetAllRequests",
    screen: "BuffetAllRequestsScreen",
  },
  {
    role: "buffet_staff",
    route: "BuffetBoard",
    screen: "BuffetBoardScreen",
  },
  {
    role: "valet_admin",
    route: "ValetAllRequests",
    screen: "ValetAllRequestsScreen",
  },
  {
    role: "valet_driver",
    route: "DriverTasks",
    screen: "DriverTasksScreen",
  },
  { role: "security", route: "CheckIn", screen: "SecurityCheckInScreen" },
  // Authenticated visitors currently reach the generic overview. Keep this
  // fallback explicit until a product decision changes it.
  { role: "visitor", route: "Dashboard", screen: "OverviewScreen" },
];

const extractBracedBody = (source: string, marker: string): string => {
  const markerIndex = source.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const openingBrace = source.indexOf("{", markerIndex);
  expect(openingBrace).toBeGreaterThan(markerIndex);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }

  throw new Error(`Could not find closing brace after ${marker}`);
};

const routeResolverFrom = (
  functionBody: string,
  roleVariable: "role" | "userRole",
) => {
  const branches = new Map<string, string>();
  const branchPattern = new RegExp(
    `if\\s*\\(\\s*${roleVariable}\\s*===\\s*['"]([^'"]+)['"]\\s*\\)\\s*return\\s*['"]([^'"]+)['"]`,
    "g",
  );

  for (const match of functionBody.matchAll(branchPattern)) {
    branches.set(match[1], match[2]);
  }

  const returns = [...functionBody.matchAll(/return\s*['"]([^'"]+)['"]/g)];
  const fallback = returns.at(-1)?.[1];
  expect(fallback).toBeDefined();

  return (role: RuntimeRole) => branches.get(role) ?? fallback!;
};

const allMenuScreens = (role: RuntimeRole): string[] => {
  const menu = getMenuGroups(role as UserRole);
  return [
    ...menu.standalone.map((item) => item.screen),
    ...menu.groups.flatMap((group) => group.items.map((item) => item.screen)),
  ].filter((screen): screen is string => Boolean(screen));
};

describe("dashboard role home smoke coverage", () => {
  const initialRouteBody = extractBracedBody(
    dashboardSource,
    "const getInitialRouteName = () =>",
  );
  const sidebarHomeBody = extractBracedBody(
    dashboardSource,
    "const getHomeScreenForRole =",
  );
  const initialRouteFor = routeResolverFrom(initialRouteBody, "userRole");
  const sidebarHomeFor = routeResolverFrom(sidebarHomeBody, "role");

  it("keeps the canonical role set complete and treats legacy names as fallbacks", () => {
    expect(USER_ROLES).toEqual([
      "employee",
      "manager",
      "building_admin",
      "buffet_admin",
      "buffet_staff",
      "valet_admin",
      "valet_driver",
      "security",
      "visitor",
      "receptionist",
    ]);
    expect(USER_ROLES).not.toContain("admin");
    expect(USER_ROLES).not.toContain("reception");
  });

  it.each(roleHomes)(
    "$role starts on $route and the sidebar home returns there",
    ({ role, route }) => {
      expect(initialRouteFor(role)).toBe(route);
      expect(sidebarHomeFor(role)).toBe(route);
      expect(allMenuScreens(role)).toContain(route);
    },
  );

  it.each(roleHomes)(
    "$role home route $route renders $screen",
    ({ role, route, screen }) => {
      if (route === "Dashboard") {
        expect(dashboardSource).toMatch(
          /<Stack\.Screen\s+name=["']Dashboard["'][\s\S]*?<OverviewScreen\b/,
        );
        return;
      }

      const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedScreen = screen.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(dashboardSource).toMatch(
        new RegExp(
          `userRole\\s*===\\s*["']${escapedRole}["'][\\s\\S]*?<Stack\\.Screen\\s+name=["']${escapedRoute}["'][\\s\\S]*?<${escapedScreen}\\b`,
        ),
      );
    },
  );

  it("uses real AllRequests homes instead of misleading dashboard aliases", () => {
    expect(initialRouteFor("building_admin")).toBe("AllRequests");
    expect(sidebarHomeFor("building_admin")).toBe("AllRequests");
    expect(dashboardSource).toContain(
      '<Stack.Screen name="BuildingAdminDashboard">',
    );
    expect(initialRouteFor("building_admin")).not.toBe(
      "BuildingAdminDashboard",
    );

    expect(initialRouteFor("buffet_admin")).toBe("BuffetAllRequests");
    expect(sidebarHomeFor("buffet_admin")).toBe("BuffetAllRequests");
    expect(dashboardSource).toContain(
      '<Stack.Screen name="BuffetOverview">',
    );
    expect(initialRouteFor("buffet_admin")).not.toBe("BuffetAdminDashboard");

    expect(initialRouteFor("valet_admin")).toBe("ValetAllRequests");
    expect(sidebarHomeFor("valet_admin")).toBe("ValetAllRequests");
    expect(initialRouteFor("valet_admin")).not.toBe("ValetAdminDashboard");
  });

  it("keeps the source-supported manager-as path on manager navigation and home", () => {
    expect(dashboardSource).toContain(
      "const effectiveRole = asManager ? 'manager' : userRole;",
    );
    expect(dashboardSource).toContain(
      "const effectiveRoleForWrapper = asManager ? 'manager' : userRole;",
    );
    expect(dashboardSource).toContain(
      "(userRole === 'manager' || asManager) && (",
    );
    expect(dashboardSource).toContain(
      "(userRole === 'employee' && !asManager) && (",
    );

    const navigateHomeBody = extractBracedBody(
      dashboardSource,
      "const handleNavigateHome = () =>",
    );
    expect(navigateHomeBody).toMatch(
      /effectiveRole\s*=\s*asManager\s*\?\s*['"]manager['"]\s*:\s*userRole/,
    );
    expect(navigateHomeBody).toContain(
      "getHomeScreenForRole(effectiveRole)",
    );
    expect(sidebarHomeFor("manager")).toBe("Dashboard");
    expect(allMenuScreens("manager")).toContain("Dashboard");
  });
});