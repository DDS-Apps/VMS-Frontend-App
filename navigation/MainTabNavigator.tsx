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
import ParkMyCarScreen from "@/screens/Employee/ParkMyCarScreen";
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
import NotificationsScreen from "@/screens/NotificationsScreen";

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
          component={VisitorRequestsScreen}
          options={{ headerTitle: "My Requests" }}
        />
        <Stack.Screen
          name="VisitorRequestForm"
          component={VisitorRequestFormScreen}
          options={{ headerTitle: "New Visitor Request" }}
        />
        <Stack.Screen
          name="RequestDetails"
          component={RequestDetailsScreen}
          options={{ headerTitle: "Request Details" }}
        />
        <Stack.Screen
          name="ParkMyCar"
          component={ParkMyCarScreen}
          options={{ headerTitle: "Park My Car" }}
        />
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
          component={SecurityCheckInScreen}
          options={{ headerTitle: "Check-In" }}
        />
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
          component={ReceptionistDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VisitTypeSelection"
          component={VisitTypeSelectionScreen}
          options={{ headerTitle: "Type of Visit" }}
        />
        <Stack.Screen
          name="VisitorRequestForm"
          options={{ headerTitle: "Register Visitor" }}
        >
          {(props) => <VisitorRequestFormScreen asReceptionist={true} {...props} />}
        </Stack.Screen>
        <Stack.Screen
          name="WalkInRegistration"
          options={{ headerTitle: "Walk-In Registration" }}
        >
          {(props) => <VisitorRequestFormScreen asReceptionist={true} isWalkIn={true} {...props} />}
        </Stack.Screen>
        <Stack.Screen
          name="AllVisitors"
          component={AllVisitorsScreen}
          options={{ headerTitle: "All Upcoming Visitors" }}
        />
        <Stack.Screen
          name="WalkInVisitors"
          component={WalkInVisitorsScreen}
          options={{ headerTitle: "Walk-In Visitors" }}
        />
        <Stack.Screen
          name="UpcomingVisitorsList"
          component={UpcomingVisitorsListScreen}
          options={{ headerTitle: "Upcoming Visitors" }}
        />
        <Stack.Screen
          name="AllVisitorsToday"
          component={AllVisitorsTodayScreen}
          options={{ headerTitle: "All Visitors Today" }}
        />
        <Stack.Screen
          name="VisitorDetail"
          component={VisitorDetailScreen}
          options={{ headerTitle: "Visitor Details" }}
        />
        <Stack.Screen
          name="CheckInOutConfirmation"
          component={CheckInOutConfirmationScreen}
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
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
