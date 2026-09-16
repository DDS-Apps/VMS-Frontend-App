import {
  createNavigationContainerRef,
  StackActions,
  CommonActions,
  type ParamListBase,
} from '@react-navigation/native';

// Routes are addressed by name (see constants/routes) from deep-link and
// notification handlers, so the ref is typed against the open param list.
export const navigationRef = createNavigationContainerRef<ParamListBase>();

export function navigate(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({
      name,
      params,
    }));
  } else {
    console.warn('[Navigation] Navigation is not ready');
  }
}

export function push(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name, params));
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function isReady(): boolean {
  return navigationRef.isReady();
}
