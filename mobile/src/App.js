import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { Platform, AppState } from 'react-native';
import AppNavigator from './navigation/AppNavigator';

const darkTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, primary: '#5b8cff', background: '#000000', surface: '#0d0d0d', surfaceVariant: '#141414', outline: '#1a1a1a', error: '#f87171', onPrimary: '#ffffff', onBackground: '#e8ecff', onSurface: '#e8ecff', onSurfaceVariant: '#8899bb' },
};

const lightTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: '#3b6cff', background: '#fafafa', surface: '#ffffff', surfaceVariant: '#f0f0f5', outline: '#d0d0dd', error: '#dc2626', onPrimary: '#ffffff', onBackground: '#111827', onSurface: '#111827', onSurfaceVariant: '#6b7280' },
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let requested = false;
    const requestATT = async () => {
      if (requested) return;
      requested = true;
      try {
        // Deferred require: the native module may not be linked in the
        // current dev client binary, so load it lazily and catch failures.
        const m = require('expo-tracking-transparency');
        const { status } = await m.getTrackingPermissionsAsync();
        console.log('[ATT] initial status:', status);
        if (status === 'undetermined') {
          const req = await m.requestTrackingPermissionsAsync();
          console.log('[ATT] requested, new status:', req.status);
        }
      } catch (e) {
        console.log('[ATT] skipped:', e?.message || e);
      }
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') requestATT();
    });
    if (AppState.currentState === 'active') requestATT();

    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDark ? darkTheme : lightTheme}>
        <AppNavigator isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}