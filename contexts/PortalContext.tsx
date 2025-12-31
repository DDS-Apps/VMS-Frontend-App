import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
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

  return (
    <PortalContext.Provider value={{ mount, unmount }}>
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

  if (!keyRef.current) {
    keyRef.current = `portal-${Date.now()}-${Math.random()}`;
  }

  useEffect(() => {
    const key = keyRef.current!;
    context?.mount(key, children);
    return () => {
      context?.unmount(key);
    };
  }, [children, context]);

  return null;
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
}
