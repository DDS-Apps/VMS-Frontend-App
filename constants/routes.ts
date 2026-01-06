export const ROUTES = {
  DASHBOARD: 'Dashboard',
  NOTIFICATIONS: 'Notifications',
  SETTINGS: 'Settings',
  CHANGE_PASSWORD: 'ChangePassword',
  EDIT_PROFILE: 'EditProfile',

  EMPLOYEE_DASHBOARD: 'EmployeeDashboard',
  VISIT_TYPE_SELECTION: 'VisitTypeSelection',
  VISITOR_REQUEST_FORM: 'VisitorRequestForm',
  VISITOR_REQUESTS: 'VisitorRequests',
  REQUEST_DETAILS: 'RequestDetails',
  MY_VALET_REQUESTS: 'MyValetRequests',
  VALET_REQUEST_DETAILS: 'ValetRequestDetails',

  APPROVALS: 'Approvals',
  MANAGER_APPROVAL_DETAIL: 'ManagerApprovalDetail',
  PENDING_APPROVALS: 'PendingApprovals',

  CHECK_IN: 'CheckIn',
  SECURITY_CHECK_IN: 'SecurityCheckIn',
  SECURITY_VISITOR_DETAIL: 'SecurityVisitorDetail',
  GATE_EVENTS_LOG: 'GateEventsLog',

  RECEPTIONIST_DASHBOARD: 'ReceptionistDashboard',
  ALL_VISITORS: 'AllVisitors',
  WALK_IN_VISITORS: 'WalkInVisitors',
  ALL_VISITORS_TODAY: 'AllVisitorsToday',
  UPCOMING_VISITORS_LIST: 'UpcomingVisitorsList',
  VISITOR_DETAIL: 'VisitorDetail',
  WALK_IN_REGISTRATION: 'WalkInRegistration',
  CHECK_IN_OUT_CONFIRMATION: 'CheckInOutConfirmation',

  DRIVER_TASKS: 'DriverTasks',
  DRIVER_TASK_DETAIL: 'DriverTaskDetail',

  BUFFET_BOARD: 'BuffetBoard',
  BUFFET_ADMIN_DASHBOARD: 'BuffetAdminDashboard',
  BUFFET_STAFF: 'BuffetStaff',
  BUFFET_LOCATIONS: 'BuffetLocations',
  BUFFET_CREATE_LOCATION: 'BuffetCreateLocation',
  BUFFET_ALL_REQUESTS: 'BuffetAllRequests',
  BUFFET_REQUEST_DETAILS: 'BuffetRequestDetails',
  BUFFET_OVERVIEW: 'BuffetOverview',
  BUFFET: 'Buffet',
  BUFFET_OVERSIGHT: 'BuffetOversight',
  BUFFET_TASKS: 'BuffetTasks',
  BUFFET_ORDER_DETAILS: 'BuffetOrderDetails',

  VALET_ALL_REQUESTS: 'ValetAllRequests',
  VALET_ADMIN_DASHBOARD: 'ValetAdminDashboard',
  VALET: 'Valet',
  VALET_TASK_DETAIL: 'ValetTaskDetail',
  VALET_OVERSIGHT: 'ValetOversight',
  VALET_TASKS: 'ValetTasks',
  VALET_TASK_DETAILS: 'ValetTaskDetails',

  BUILDING_ADMIN_DASHBOARD: 'BuildingAdminDashboard',
  ALL_REQUESTS: 'AllRequests',
  USERS_ROLES: 'UsersRoles',
  USER_DETAIL: 'UserDetail',
  ALL_LOCATIONS: 'AllLocations',
  REPORTS: 'Reports',
  REMINDER_RULES: 'ReminderRules',

  PARKING: 'Parking',
  MEETING_ROOMS: 'MeetingRooms',
  ROOM_DETAILS: 'RoomDetails',

  ADMIN_DASHBOARD: 'AdminDashboard',

  VISITOR_INVITE: 'VisitorInvite',

  DASHBOARD_TAB: 'DashboardTab',
  NOTIFICATIONS_TAB: 'NotificationsTab',
  PROFILE_TAB: 'ProfileTab',

  SECURITY_DASHBOARD: 'SecurityDashboard',
  TODAYS_VISITORS: 'TodaysVisitors',
  VISIT_DETAILS: 'VisitDetails',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteName = (typeof ROUTES)[RouteKey];
