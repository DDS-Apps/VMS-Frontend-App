import React from "react";
import { NavigationContainer, useNavigation, useNavigationState, CommonActions } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { createNativeStackNavigator, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import OverviewScreen from "@/screens/Dashboard/OverviewScreen";
import NotificationsScreen from "@/screens/Common/NotificationsScreen";
import SettingsScreen from "@/screens/Common/SettingsScreen";
import VisitorRequestsScreen from "@/screens/Employee/VisitorRequestsScreen";
import VisitTypeSelectionScreen from "@/screens/Employee/VisitTypeSelectionScreen";
import VisitorRequestFormScreen from "@/screens/Employee/VisitorRequestFormScreen";
import RequestDetailsScreen from "@/screens/Employee/RequestDetailsScreen";
import MyValetRequestsScreen from "@/screens/Employee/MyValetRequestsScreen";
import EmployeeValetRequestDetailsScreen from "@/screens/Employee/ValetRequestDetailsScreen";
import ManagerDashboardScreen from "@/screens/Manager/ManagerDashboardScreen";
import ManagerApprovalDetailScreen from "@/screens/Manager/ManagerApprovalDetailScreen";
import ManagerAllRequestsScreen from "@/screens/Manager/ManagerAllRequestsScreen";
import SecurityCheckInScreen from "@/screens/Security/SecurityCheckInScreen";
import SecurityVisitorDetailScreen from "@/screens/Security/SecurityVisitorDetailScreen";
import GateEventsLogScreen from "@/screens/Security/GateEventsLogScreen";
import VisitorInviteScreen from "@/screens/Visitor/VisitorInviteScreen";
import ReceptionistDashboardScreen from "@/screens/Receptionist/ReceptionistDashboardScreen";
import UpcomingVisitorsListScreen from "@/screens/Receptionist/UpcomingVisitorsListScreen";
import AllVisitorsScreen from "@/screens/Receptionist/AllVisitorsScreen";
import WalkInVisitorsScreen from "@/screens/Receptionist/WalkInVisitorsScreen";
import AllVisitorsTodayScreen from "@/screens/Receptionist/AllVisitorsTodayScreen";
import VisitorDetailScreen from "@/screens/Receptionist/VisitorDetailScreen";
import CheckInOutConfirmationScreen from "@/screens/Receptionist/CheckInOutConfirmationScreen";
import AdminDashboardScreen from "@/screens/Admin/AdminDashboardScreen";
import BuffetAdministrationScreen from "@/screens/Admin/BuffetAdministrationScreen";
import ValetTasksScreen from "@/screens/Admin/ValetTasksScreen";
import ValetTaskDetailScreen from "@/screens/Admin/ValetTaskDetailScreen";
import UsersRolesScreen from "@/screens/Admin/UsersRolesScreen";
import UserDetailScreen from "@/screens/Admin/UserDetailScreen";
import ParkingValetSettingsScreen from "@/screens/Admin/ParkingValetSettingsScreen";
import BuffetSettingsScreen from "@/screens/Admin/BuffetSettingsScreen";
import ReminderRulesScreen from "@/screens/Admin/ReminderRulesScreen";
import DriverTasksScreen from "@/screens/Driver/DriverTasksScreen";
import DriverTaskDetailScreen from "@/screens/Driver/DriverTaskDetailScreen";
import BuffetBoardScreen from "@/screens/Buffet/BuffetBoardScreen";
import BuffetAdminDashboardScreen from "@/screens/BuffetAdmin/BuffetAdminDashboardScreen";
import BuffetAdminStaffScreen from "@/screens/BuffetAdmin/BuffetAdminStaffScreen";
import BuffetAdminLocationsScreen from "@/screens/BuffetAdmin/BuffetAdminLocationsScreen";
import BuffetAdminCreateLocationScreen from "@/screens/BuffetAdmin/BuffetAdminCreateLocationScreen";
import BuffetRequestDetailsScreen from "@/screens/BuffetAdmin/BuffetRequestDetailsScreen";
import BuffetAllRequestsScreen from "@/screens/BuffetAdmin/BuffetAllRequestsScreen";
import BuffetOverviewScreen from "@/screens/BuffetAdmin/BuffetOverviewScreen";
import ValetAllRequestsScreen from "@/screens/ValetAdmin/ValetAllRequestsScreen";
import ValetRequestDetailsScreen from "@/screens/ValetAdmin/ValetRequestDetailsScreen";
import BuildingAdminDashboardScreen from "@/screens/BuildingAdmin/BuildingAdminDashboardScreen";
import AllRequestsScreen from "@/screens/BuildingAdmin/AllRequestsScreen";
import ChangePasswordScreen from "@/screens/Profile/ChangePasswordScreen";
import EditProfileScreen from "@/screens/Profile/EditProfileScreen";
import { UserRole } from "@/types/vms.types";
import { useUnreadNotificationCountQuery } from "@/hooks/queries/useNotificationQueries";
import type { NativeStackScreenProps, NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { ParamListBase, RouteProp } from "@react-navigation/native";

const Stack = createNativeStackNavigator();

interface DashboardContainerProps {
  userRole: UserRole;
  userName: string;
  userEmail?: string;
  userPhotoUrl?: string | null;
  asManager?: boolean;
  onLogout: () => void;
  isSSOUser?: boolean;
}

interface ScreenWrapperProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName: string;
  userPhotoUrl?: string | null;
  onLogout: () => void;
  asManager?: boolean;
  isSSOUser?: boolean;
}

type DriverTasksRenderProps = NativeStackScreenProps<{
  DriverTasks: undefined;
  DriverTaskDetail: { taskId: string };
}, 'DriverTasks'>;

type DriverTaskDetailRenderProps = NativeStackScreenProps<{
  DriverTasks: undefined;
  DriverTaskDetail: { taskId: string };
}, 'DriverTaskDetail'>;

type ValetRenderProps = NativeStackScreenProps<{
  Valet: undefined;
  ValetTaskDetail: { taskId: string };
}, 'Valet'>;

type ValetTaskDetailRenderProps = NativeStackScreenProps<{
  Valet: undefined;
  ValetTaskDetail: { taskId: string };
}, 'ValetTaskDetail'>;

function ScreenWrapperInner({ children, userRole, userName, userPhotoUrl, onLogout, asManager, isSSOUser }: ScreenWrapperProps) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const navigationState = useNavigationState((state) => state);
  
  const currentRoute = navigationState && navigationState.routes && navigationState.routes.length > 0
    ? navigationState.routes[navigationState.index].name
    : 'Dashboard';

  const canGoBack = navigationState && navigationState.routes
    ? navigationState.index > 0
    : false;

  const handleNavigate = (screen: string, params?: Record<string, unknown>) => {
    navigation.navigate(screen as never, params as never);
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const getHomeScreenForRole = (role: UserRole): string => {
    if (role === 'receptionist') return 'ReceptionistDashboard';
    if (role === 'valet_driver') return 'DriverTasks';
    if (role === 'buffet_staff') return 'BuffetBoard';
    if (role === 'buffet_admin') return 'BuffetAdminDashboard';
    if (role === 'valet_admin') return 'ValetAllRequests';
    if (role === 'building_admin') return 'BuildingAdminDashboard';
    if (role === 'security') return 'CheckIn';
    return 'Dashboard';
  };

  const handleNavigateHome = () => {
    const effectiveRole = asManager ? 'manager' : userRole;
    const homeScreen = getHomeScreenForRole(effectiveRole);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: homeScreen }],
      })
    );
  };

  const effectiveRoleForWrapper = asManager ? 'manager' : userRole;
  const { data: unreadCountData } = useUnreadNotificationCountQuery();
  const unreadCount = unreadCountData?.count ?? 0;

  return (
    <DashboardLayout
      userRole={effectiveRoleForWrapper}
      userName={userName}
      userPhotoUrl={userPhotoUrl}
      currentScreen={currentRoute}
      onNavigate={handleNavigate}
      onNavigateHome={handleNavigateHome}
      onLogout={onLogout}
      canGoBack={canGoBack}
      onGoBack={handleGoBack}
      unreadNotificationCount={unreadCount}
      isSSOUser={isSSOUser}
    >
      {children}
    </DashboardLayout>
  );
}

const ScreenWrapper = React.memo(ScreenWrapperInner);

export default function DashboardContainer({ userRole, userName, userEmail, userPhotoUrl, asManager, onLogout, isSSOUser }: DashboardContainerProps) {
  const effectiveRole = asManager ? 'manager' : userRole;
  const { isRTL, locale } = useLanguage();
  
  const getInitialRouteName = () => {
    if (userRole === 'receptionist') return 'ReceptionistDashboard';
    if (userRole === 'valet_driver') return 'DriverTasks';
    if (userRole === 'buffet_staff') return 'BuffetBoard';
    if (userRole === 'buffet_admin') return 'BuffetAdminDashboard';
    if (userRole === 'valet_admin') return 'ValetAllRequests';
    if (userRole === 'building_admin') return 'AllRequests';
    if (userRole === 'security') return 'CheckIn';
    return 'Dashboard';
  };
  
  return (
    <NavigationContainer ref={navigationRef} key={`nav-${locale}-${isRTL ? 'rtl' : 'ltr'}`}>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Dashboard">
          {(props) => (
            <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
              <OverviewScreen userRole={effectiveRole} userName={userName} {...props} />
            </ScreenWrapper>
          )}
        </Stack.Screen>
        <Stack.Screen name="Notifications">
          {() => (
            <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
              <NotificationsScreen userRole={effectiveRole} />
            </ScreenWrapper>
          )}
        </Stack.Screen>
        <Stack.Screen name="RequestDetails">
          {(props) => (
            <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
              <RequestDetailsScreen {...props} userRole={effectiveRole} />
            </ScreenWrapper>
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {() => (
            <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
              <SettingsScreen userRole={effectiveRole} userName={userName} userEmail={userEmail} userPhotoUrl={userPhotoUrl} onLogout={onLogout} />
            </ScreenWrapper>
          )}
        </Stack.Screen>
        {!isSSOUser ? (
          <Stack.Screen name="ChangePassword">
            {({ navigation }) => (
              <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                <ChangePasswordScreen 
                  onSuccess={() => navigation.goBack()} 
                  onCancel={() => navigation.goBack()} 
                />
              </ScreenWrapper>
            )}
          </Stack.Screen>
        ) : null}
        <Stack.Screen name="EditProfile">
          {({ navigation }) => (
            <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
              <EditProfileScreen 
                userRole={effectiveRole}
                userName={userName}
                userId={`user_${userRole}`}
                onSave={() => navigation.goBack()} 
                onCancel={() => navigation.goBack()} 
              />
            </ScreenWrapper>
          )}
        </Stack.Screen>
        {(userRole === 'employee' && !asManager) && (
          <>
            <Stack.Screen name="VisitTypeSelection">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <VisitTypeSelectionScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitorRequestForm">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <VisitorRequestFormScreen asManager={false} {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitorRequests">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <VisitorRequestsScreen userRole="employee" {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="MyValetRequests">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <MyValetRequestsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ValetRequestDetails">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <EmployeeValetRequestDetailsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {(userRole === 'manager' || asManager) && (
          <>
            <Stack.Screen name="Approvals">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <ManagerDashboardScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ManagerApprovalDetail">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <ManagerApprovalDetailScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitTypeSelection">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <VisitTypeSelectionScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitorRequestForm">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <VisitorRequestFormScreen asManager={true} {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitorRequests">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <VisitorRequestsScreen userRole="manager" {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="AllRequests">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <ManagerAllRequestsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="PendingApprovals">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <ManagerDashboardScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="MyValetRequests">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <MyValetRequestsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ValetRequestDetails">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout} asManager={asManager} isSSOUser={isSSOUser}>
                  <EmployeeValetRequestDetailsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {userRole === 'security' && (
          <>
            <Stack.Screen name="CheckIn">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <SecurityCheckInScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="SecurityVisitorDetail">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <SecurityVisitorDetailScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="GateEventsLog">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <GateEventsLogScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {userRole === 'receptionist' && (
          <>
            <Stack.Screen name="ReceptionistDashboard">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ReceptionistDashboardScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitTypeSelection">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <VisitTypeSelectionScreen 
                    {...props} 
                    onTypeSelect={(visitType) => props.navigation.navigate('VisitorRequestForm', { visitType })}
                  />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitorRequestForm">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <VisitorRequestFormScreen asReceptionist={true} {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="WalkInRegistration">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <VisitorRequestFormScreen asReceptionist={true} isWalkIn={true} {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="AllVisitors">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AllVisitorsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="WalkInVisitors">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <WalkInVisitorsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="AllVisitorsToday">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AllVisitorsTodayScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="VisitorDetail">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <VisitorDetailScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="CheckInOutConfirmation">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <CheckInOutConfirmationScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="UpcomingVisitorsList">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <UpcomingVisitorsListScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {userRole === 'buffet_staff' && (
          <Stack.Screen name="BuffetBoard">
            {() => (
              <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                <BuffetBoardScreen />
              </ScreenWrapper>
            )}
          </Stack.Screen>
        )}
        {userRole === 'buffet_admin' && (
          <>
            <Stack.Screen name="BuffetAdminDashboard">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAdminDashboardScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetStaff">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAdminStaffScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetLocations">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAdminLocationsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetCreateLocation">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAdminCreateLocationScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetAllRequests">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAllRequestsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetRequestDetails">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetRequestDetailsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetOverview">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetOverviewScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {userRole === 'valet_admin' && (
          <>
            <Stack.Screen name="ValetAllRequests">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ValetAllRequestsScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ValetRequestDetails">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ValetRequestDetailsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {userRole === 'building_admin' && (
          <>
            <Stack.Screen name="BuildingAdminDashboard">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuildingAdminDashboardScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="AllRequests">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AllRequestsScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="UsersRoles">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <UsersRolesScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="UserDetail">
              {(props: any) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <UserDetailScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetOversight">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAdminDashboardScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ValetOversight">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ValetAllRequestsScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="AllLocations">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetAdminLocationsScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="Reports">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AdminDashboardScreen role={userRole} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ReminderRules">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ReminderRulesScreen />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ManagerApprovalDetail">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ManagerApprovalDetailScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="BuffetRequestDetails">
              {(props) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <BuffetRequestDetailsScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {userRole === 'valet_driver' && (
          <>
            <Stack.Screen name="DriverTasks">
              {(props: DriverTasksRenderProps) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <DriverTasksScreen 
                    {...props}
                    onNavigateToDetail={(taskId: string) => props.navigation.navigate('DriverTaskDetail', { taskId })}
                  />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="DriverTaskDetail">
              {(props: DriverTaskDetailRenderProps) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <DriverTaskDetailScreen 
                    taskId={props.route?.params?.taskId || ''}
                    onNavigateBack={() => props.navigation.goBack()}
                  />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {(userRole === 'building_admin' || userRole === 'valet_admin') && (
          <>
            <Stack.Screen name="Parking">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AdminDashboardScreen role={userRole} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="Valet">
              {(props: ValetRenderProps) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ValetTasksScreen 
                    {...props}
                    onNavigateToDetail={(taskId: string) => props.navigation.navigate('ValetTaskDetail', { taskId })}
                  />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="ValetTaskDetail">
              {(props: ValetTaskDetailRenderProps) => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <ValetTaskDetailScreen 
                    taskId={props.route?.params?.taskId || ''}
                  />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="MeetingRooms">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AdminDashboardScreen role={userRole} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="Buffet">
              {() => (
                <ScreenWrapper userRole={userRole} userName={userName} userPhotoUrl={userPhotoUrl} onLogout={onLogout}>
                  <AdminDashboardScreen role={userRole} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
        {/* Public Visitor Invite Screen - accessible for testing with token param */}
        <Stack.Screen 
          name="VisitorInvite" 
          component={VisitorInviteScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
