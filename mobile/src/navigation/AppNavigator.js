import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Switch, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme, IconButton } from 'react-native-paper';
import { EllipsisVertical } from 'lucide-react-native';
import TutorScreen from '../screens/TutorScreen';
import NotesScreen from '../screens/NotesScreen';

const Stack = createStackNavigator();

const TABS = [
  { key: 'tutor', label: 'Tutor' },
  { key: 'notes', label: 'Notes' },
];

const HAMBURGER_ITEMS = [
  { label: 'Support', href: 'https://freesurf.tools/support' },
  { label: 'Privacy', href: 'https://freesurf.tools/privacy' },
  { label: 'Terms', href: 'https://freesurf.tools/terms' },
];

const AppHome = ({ isDark, onToggleTheme }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('tutor');
  const [menuOpen, setMenuOpen] = useState(false);

  const hbColors = {
    text: theme.colors.onSurface,
    dim: theme.colors.onSurfaceVariant,
    card: theme.colors.surface,
    border: theme.colors.outline,
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <View style={[s.topBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.outline }]}>
        <Text style={[s.topTitle, { color: theme.colors.onSurface }]}>FreeSurf Tutor</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton
            icon={() => <EllipsisVertical size={18} color={theme.colors.onSurface} />}
            size={20}
            onPress={() => setMenuOpen(!menuOpen)}
          />
        </View>
      </View>

      {menuOpen && (
        <View style={s.menuOverlay}>
          <TouchableOpacity style={s.menuBackdrop} onPress={() => setMenuOpen(false)} activeOpacity={1} />
          <View style={[s.menuPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {HAMBURGER_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={s.menuItem} onPress={() => { setMenuOpen(false); Linking.openURL(item.href); }}>
                <Text style={[s.menuText, { color: theme.colors.onSurface }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={[s.menuDivider, { borderTopColor: theme.colors.outline }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
              <Switch value={!isDark} onValueChange={onToggleTheme} trackColor={{ true: isDark ? '#ffffff' : '#111827', false: '#555' }} />
            </View>
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {activeTab === 'tutor' ? <TutorScreen isDark={isDark} onToggleTheme={onToggleTheme} /> : <NotesScreen />}
      </View>

      <View style={[s.tabBar, { borderTopColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[s.tabText, { color: activeTab === tab.key ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const AppNavigator = ({ isDark, onToggleTheme }) => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {() => <AppHome isDark={isDark} onToggleTheme={onToggleTheme} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 6, borderBottomWidth: 1 },
  topTitle: { fontSize: 16, fontWeight: '700' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  menuPanel: { position: 'absolute', top: 56, right: 16, borderRadius: 14, borderWidth: 1, minWidth: 210, paddingVertical: 6 },
  menuItem: { paddingHorizontal: 20, paddingVertical: 13 },
  menuText: { fontSize: 15 },
  menuDivider: { borderTopWidth: 1, marginTop: 4 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 28 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabActive: {},
});