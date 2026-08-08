import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
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
  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDark ? darkTheme : lightTheme}>
        <AppNavigator isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}