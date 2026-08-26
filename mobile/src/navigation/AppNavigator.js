import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Switch, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Menu } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import NotesScreen from '../screens/NotesScreen';
import AboutScreen from '../screens/AboutScreen';
import VoiceOrb from '../components/VoiceOrb';

const LANG_KEY = 'tutor-native-lang';

const NATIVE_LANGS = [
  { code: 'ar', label: 'العربية' },
  { code: 'da', label: 'Dansk' },
  { code: 'de', label: 'Deutsch' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'es', label: 'Español' },
  { code: 'fi', label: 'Suomi' },
  { code: 'fr', label: 'Français' },
  { code: 'he', label: 'עברית' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'no', label: 'Norsk' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'sv', label: 'Svenska' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'zh', label: '中文' },
];

const MENU_ITEMS = [
  { label: 'Support', href: 'https://freesurf.tools/support' },
  { label: 'Privacy', href: 'https://freesurf.tools/privacy' },
  { label: 'Terms', href: 'https://freesurf.tools/terms' },
];

const AppHome = ({ isDark, onToggleTheme }) => {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [nativeLang, setNativeLang] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(280)).current;

  useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then(v => setNativeLang(v));
  }, []);

  const saveLang = async (code) => {
    setNativeLang(code);
    await SecureStore.setItemAsync(LANG_KEY, code);
    setShowLangPicker(false);
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: 280, duration: 180, useNativeDriver: true }).start(() => setMenuOpen(false));
  };

  if (showAbout) {
    return <AboutScreen onBack={() => setShowAbout(false)} />;
  }

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <NotesScreen />

      <TouchableOpacity style={s.hamburger} onPress={openMenu}>
        <Menu size={20} color={theme.colors.onSurface} />
      </TouchableOpacity>

      <VoiceOrb isDark={isDark} />

      {menuOpen && (
        <View style={s.menuOverlay}>
          <TouchableOpacity style={s.menuBackdrop} onPress={closeMenu} activeOpacity={1} />
          <Animated.View style={[s.menuPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, transform: [{ translateX: slideAnim }] }]}>
            <TouchableOpacity style={s.menuItem} onPress={() => { closeMenu(); setShowAbout(true); }}>
              <Text style={[s.menuText, { color: theme.colors.onSurface }]}>About Us</Text>
            </TouchableOpacity>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={s.menuItem} onPress={() => { closeMenu(); Linking.openURL(item.href); }}>
                <Text style={[s.menuText, { color: theme.colors.onSurface }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={[s.menuDivider, { borderTopColor: theme.colors.outline }]} />
            <TouchableOpacity style={s.menuItem} onPress={() => setShowLangPicker(!showLangPicker)}>
              <Text style={[s.menuText, { color: theme.colors.onSurface }]}>Native Language: {NATIVE_LANGS.find(l => l.code === nativeLang)?.label || 'Select'}</Text>
            </TouchableOpacity>
            {showLangPicker && (
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {NATIVE_LANGS.map(l => (
                  <TouchableOpacity key={l.code} style={s.langOption} onPress={() => saveLang(l.code)}>
                    <Text style={[s.langText, { color: l.code === nativeLang ? theme.colors.primary : theme.colors.onSurface }]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={[s.menuDivider, { borderTopColor: theme.colors.outline }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
              <Switch value={!isDark} onValueChange={onToggleTheme} trackColor={{ true: isDark ? '#ffffff' : '#111827', false: '#555' }} />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const AppNavigator = ({ isDark, onToggleTheme }) => {
  return <AppHome isDark={isDark} onToggleTheme={onToggleTheme} />;
};

export default AppNavigator;

const s = StyleSheet.create({
  root: { flex: 1 },
  hamburger: { position: 'absolute', top: 52, right: 16, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, flexDirection: 'row' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  menuPanel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 260, borderLeftWidth: 1, paddingTop: 60, paddingHorizontal: 16 },
  menuItem: { paddingVertical: 14 },
  menuText: { fontSize: 16, fontWeight: '500' },
  menuDivider: { borderTopWidth: 1, marginTop: 8, marginBottom: 8 },
  langOption: { paddingVertical: 10, paddingLeft: 16 },
  langText: { fontSize: 14 },
});
