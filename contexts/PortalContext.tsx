import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

interface PortalContextType {
  mount: (key: string, element: React.ReactNode) => void;
  unmount: (key: string) => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [portals, setPortals] = useState<Map<string, React.ReactNode>>(new Map());
  const keyRef = useRef(0);

  const mount = useCallback((key: string, element: React.ReactNode) => {
    setPortals((prev) => {
      const next = new Map(prev);
      next.set(key, element);
      return next;
    });
  }, []);

  const unmount = useCallback((key: string) => {
    setPortals((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const contextValue = useMemo(() => ({ mount, unmount }), [mount, unmount]);

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {Array.from(portals.entries()).map(([key, element]) => (
          <View key={key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {element}
          </View>
        ))}
      </View>
    </PortalContext.Provider>
  );
}

export function Portal({ children }: { children: React.ReactNode }) {
  const context = useContext(PortalContext);
  const keyRef = useRef<string | null>(null);
  const mount = context?.mount;
  const unmount = context?.unmount;

  if (!keyRef.current) {
    keyRef.current = `portal-${Date.now()}-${Math.random()}`;
  }

  useEffect(() => {
    mount?.(keyRef.current!, children);
  }, [children, mount]);

  // Updates must replace portal content in place, not dismiss/remount native
  // modals. Only unregister when the owner leaves the tree (or host changes).
  useEffect(() => {
    const key = keyRef.current!;
    return () => unmount?.(key);
  }, [unmount]);

  return context ? null : <>{children}</>;
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
}
