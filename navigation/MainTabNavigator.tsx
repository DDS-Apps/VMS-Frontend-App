import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { DDIcon } from "@/components/DDIcon";
import { Platform, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { UserRole } from "@/types/vms.types";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

import VisitorRequestsScreen from "@/screens/Employee/VisitorRequestsScreen";
import VisitorRequestFormScreen from "@/screens/Employee/VisitorRequestFormScreen";
import RequestDetailsScreen from "@/screens/Employee/RequestDetailsScreen";
import SecurityCheckInScreen from "@/screens/Security/SecurityCheckInScreen";
import ReceptionistDashboardScreen from "@/screens/Receptionist/ReceptionistDashboardScreen";
import VisitTypeSelectionScreen from "@/screens/Employee/VisitTypeSelectionScreen";
import AllVisitorsScreen from "@/screens/Receptionist/AllVisitorsScreen";
import WalkInVisitorsScreen from "@/screens/Receptionist/WalkInVisitorsScreen";
import UpcomingVisitorsListScreen from "@/screens/Receptionist/UpcomingVisitorsListScreen";
import AllVisitorsTodayScreen from "@/screens/Receptionist/AllVisitorsTodayScreen";
import CheckInOutConfirmationScreen from "@/screens/Receptionist/CheckInOutConfirmationScreen";
import VisitorDetailScreen from "@/screens/Receptionist/VisitorDetailScreen";
import AdminDashboardScreen from "@/screens/Admin/AdminDashboardScreen";
import NotificationsScreen from "@/screens/Common/NotificationsScreen";
import type {
  VisitorRequestsScreenProps,
  VisitorRequestFormScreenProps,
  RequestDetailsScreenProps,
  VisitTypeSelectionScreenProps,
} from "@/types/employeeNavigation.types";
import type { SecurityCheckInScreenProps } from "@/types/securityNavigation.types";
import type {
  ReceptionistDashboardScreenProps,
  AllVisitorsScreenProps,
  WalkInVisitorsScreenProps,
  AllVisitorsTodayScreenProps,
  VisitorDetailScreenProps,
  CheckInOutConfirmationScreenProps,
} from "@/types/receptionistNavigation.types";

export type MainTabParamList = {
  DashboardTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator();

function DashboardStack({ userRole }: { userRole: UserRole }) {
  const { theme, isDark } = useTheme();

  if (userRole === 'employee') {
    return (
      <Stack.Navigator
        screenOptions={{
          ...getCommonScreenOptions({ theme, isDark, transparent: false }),
        }}
      >
        <Stack.Screen
          name="EmployeeDashboard"
          options={{ headerTitle: "My Requests" }}
        >
          {(props) => <VisitorRequestsScreen {...(props as unknown as VisitorRequestsScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="VisitorRequestForm"
          options={{ headerTitle: "New Visitor Request" }}
        >
          {(props) => <VisitorRequestFormScreen {...(props as unknown as VisitorRequestFormScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="RequestDetails"
          options={{ headerTitle: "Request Details" }}
        >
          {(props) => <RequestDetailsScreen {...(props as unknown as RequestDetailsScreenProps)} userRole="employee" />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  } else if (userRole === 'security') {
    return (
      <Stack.Navigator
        screenOptions={{
          ...getCommonScreenOptions({ theme, isDark, transparent: false }),
        }}
      >
        <Stack.Screen
          name="SecurityCheckIn"
          options={{ headerTitle: "Check-In" }}
        >
          {(props) => <SecurityCheckInScreen {...(props as unknown as SecurityCheckInScreenProps)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  } else if (userRole === 'receptionist') {
    return (
      <Stack.Navigator
        screenOptions={{
          ...getCommonScreenOptions({ theme, isDark, transparent: false }),
        }}
      >
        <Stack.Screen
          name="ReceptionistDashboard"
          options={{ headerShown: false }}
        >
          {(props) => <ReceptionistDashboardScreen {...(props as unknown as ReceptionistDashboardScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="VisitTypeSelection"
          options={{ headerTitle: "Type of Visit" }}
        >
          {(props) => <VisitTypeSelectionScreen {...(props as unknown as VisitTypeSelectionScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="VisitorRequestForm"
          options={{ headerTitle: "Register Visitor" }}
        >
          {(props) => <VisitorRequestFormScreen asReceptionist={true} {...(props as unknown as VisitorRequestFormScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="WalkInRegistration"
          options={{ headerTitle: "Walk-In Registration" }}
        >
          {(props) => <VisitorRequestFormScreen asReceptionist={true} isWalkIn={true} {...(props as unknown as VisitorRequestFormScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="AllVisitors"
          options={{ headerTitle: "All Upcoming Visitors" }}
        >
          {(props) => <AllVisitorsScreen {...(props as unknown as AllVisitorsScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="WalkInVisitors"
          options={{ headerTitle: "Walk-In Visitors" }}
        >
          {(props) => <WalkInVisitorsScreen {...(props as unknown as WalkInVisitorsScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="UpcomingVisitorsList"
          options={{ headerTitle: "Upcoming Visitors" }}
        >
          {() => <UpcomingVisitorsListScreen />}
        </Stack.Screen>
        <Stack.Screen
          name="AllVisitorsToday"
          options={{ headerTitle: "All Visitors Today" }}
        >
          {(props) => <AllVisitorsTodayScreen {...(props as unknown as AllVisitorsTodayScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="VisitorDetail"
          options={{ headerTitle: "Visitor Details" }}
        >
          {(props) => <VisitorDetailScreen {...(props as unknown as VisitorDetailScreenProps)} />}
        </Stack.Screen>
        <Stack.Screen
          name="CheckInOutConfirmation"
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        >
          {(props) => <CheckInOutConfirmationScreen {...(props as unknown as CheckInOutConfirmationScreenProps)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  } else {
    return (
      <Stack.Navigator
        screenOptions={{
          ...getCommonScreenOptions({ theme, isDark, transparent: false }),
        }}
      >
        <Stack.Screen
          name="AdminDashboard"
          options={{ headerTitle: "Dashboard" }}
        >
          {() => <AdminDashboardScreen role={userRole} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }
}

function NotificationsStack() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark, transparent: false }),
      }}
    >
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

interface MainTabNavigatorProps {
  userRole: UserRole;
  onLogout: () => void;
}

export default function MainTabNavigator({ userRole, onLogout }: MainTabNavigatorProps) {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        options={{
          title: userRole === 'security' ? 'Check-In' : 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <DDIcon name={userRole === 'security' ? 'log-in' : 'home'} size={size} color={color} />
          ),
        }}
      >
        {() => <DashboardStack userRole={userRole} />}
      </Tab.Screen>
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <DDIcon name="bell" size={size} color={color} />
          ),
          tabBarBadge: 2,
        }}
      />
    </Tab.Navigator>
  );
}
