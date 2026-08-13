import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, Alert, Animated, Easing, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { ChevronDown, X, Volume2, Phone, Mic, MicOff } from 'lucide-react-native';

const WORKER_URL = 'https://freesurf-language-tutor.freesurf.workers.dev';
const LANG_KEY = 'tutor-native-lang';

const NATIVE_LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
];

interface TranscriptLine { role: 'user' | 'tutor'; text: string; }

export default function VoiceOrb({ isDark }) {
  const [nativeLang, setNativeLang] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [state, setState] = useState('idle');
  const [expanded, setExpanded] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [audioRoute, setAudioRoute] = useState('speaker');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const recordingRef = useRef(null);
  const recordingStartRef = useRef(0);
  const soundRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then((saved) => {
      if (saved) setNativeLang(saved);
      else setShowSetup(true);
    });
    SecureStore.getItemAsync('freesurf-onboarding-seen').then((seen) => {
      if (!seen) setTimeout(() => setShowOnboarding(true), 1500);
    });
  }, []);

  function saveLang(code) {
    setNativeLang(code);
    setShowSetup(false);
    SecureStore.setItemAsync(LANG_KEY, code);
  }

  useEffect(() => {
    if (state === 'recording') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else if (state === 'thinking') {
      Animated.timing(ring1, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(ring2, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.loop(Animated.timing(rotateAnim, {
        toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true,
      })).start();
    } else if (state === 'speaking') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.97, duration: 250, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
      ring1.setValue(0);
      ring2.setValue(0);
    }
  }, [state]);

  function cancelCall() {
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setState('idle');
    setExpanded(false);
    setStatusText('');
    setTranscript([]);
  }

  async function startRecording() {
    const lang = await SecureStore.getItemAsync(LANG_KEY);
    if (!lang) {
      Alert.alert('Language needed', 'Select your native language in the menu.');
      return;
    }
    setNativeLang(lang);
    try {
      await Audio.requestPermissionsAsync();
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      setState('recording');
      setExpanded(true);
      setStatusText('Listening...');
    } catch (e) {
      console.warn('[VoiceOrb] Recording start failed:', e?.message || e);
      Alert.alert('Error', 'Could not start recording.');
      setState('idle');
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    const duration = (Date.now() - recordingStartRef.current) / 1000;
    if (duration < 0.8) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      Alert.alert('Too short', 'Hold the button and speak for at least 1 second.');
      setState('idle');
      setExpanded(false);
      setStatusText('');
      return;
    }
    setStatusText('Processing...');
    setState('thinking');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri) await sendToTutor(uri);
    } catch (e) {
      console.warn('[VoiceOrb] Recording stop failed:', e?.message || e);
      Alert.alert('Error', 'Could not stop recording.');
      setState('idle');
    }
  }

  async function sendToTutor(uri) {
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      const res = await fetch(`${WORKER_URL}/api/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_base64: base64, native_language: nativeLang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTranscript(prev => [
        ...prev,
        { role: 'user', text: data.original || data.correction || '' },
        { role: 'tutor', text: data.response || '' },
      ]);

      if (data.audio_base64) {
        setState('speaking');
        setStatusText('Speaking...');
        await playResponse(data.audio_base64);
      }
      setStatusText('');
      setState('idle');
    } catch (e) {
      console.warn('[VoiceOrb] Tutor request failed:', e?.message || e);
      Alert.alert('Error', e.message || 'Tutor request failed.');
      setState('idle');
      setStatusText('');
    }
  }

  async function playResponse(b64) {
    try {
      const { documentDirectory, writeAsStringAsync } = require('expo-file-system/legacy');
      const tempUri = documentDirectory + 'tutor-resp.wav';
      await writeAsStringAsync(tempUri, b64, { encoding: 'base64' });
      const { sound } = await Audio.Sound.createAsync({ uri: tempUri }, { shouldPlay: true }, (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setStatusText('');
          setState('idle');
          setTimeout(() => startRecording(), 400);
        }
      });
      soundRef.current = sound;
    } catch (e) {
      console.warn('[VoiceOrb] Audio play failed:', e?.message || e);
      setState('idle');
      setStatusText('');
    }
  }

  function handleFabPress() {
    if (state !== 'idle') return;
    startRecording();
  }

  function handleOrbPress() {
    if (state === 'recording') stopRecording();
    else if (state === 'idle') startRecording();
  }

  const bg = isDark ? { bg: '#0d0d0d', text: '#e8ecff', accent: '#5b8cff' } : { bg: '#ffffff', text: '#111827', accent: '#3b6cff' };
  const lastLines = transcript.slice(-6);

  return (
    <>
      <Modal visible={showSetup} transparent animationType="fade">
        <View style={sty.setupOverlay}>
          <View style={[sty.setupCard, { backgroundColor: isDark ? '#141414' : '#fff' }]}>
            <Text style={[sty.setupTitle, { color: isDark ? '#e8ecff' : '#111827' }]}>
              Learn English with your AI tutor
            </Text>
            <Text style={[sty.setupSub, { color: isDark ? '#8899bb' : '#6c757d' }]}>
              What is your native language?
            </Text>
            {NATIVE_LANGS.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[sty.langBtn, { borderColor: isDark ? '#1a1a1a' : '#dee2e6' }]}
                onPress={() => saveLang(lang.code)}
              >
                <Text style={[sty.langText, { color: isDark ? '#e8ecff' : '#111827' }]}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {state !== 'idle' && !expanded ? (
        <TouchableOpacity style={[sty.miniChip, { backgroundColor: bg.accent }]} onPress={() => setExpanded(true)}>
          <Mic size={14} color="#fff" />
          <Text style={sty.miniText}>{statusText || 'Voice'}</Text>
        </TouchableOpacity>
      ) : (state !== 'idle' || transcript.length > 0) && expanded ? (
        <View style={sty.expandedOverlay}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 60, paddingBottom: 20 }}>
            {lastLines.map((line, i) => (
              <View key={i} style={[sty.transcriptLine, { backgroundColor: line.role === 'user' ? (isDark ? 'rgba(91,140,255,0.12)' : 'rgba(59,108,255,0.08)') : 'transparent' }]}>
                <Text style={[sty.transcriptRole, { color: bg.accent }]}>{line.role === 'user' ? 'You' : 'Tutor'}</Text>
                <Text style={[sty.transcriptText, { color: bg.text }]}>{line.text}</Text>
              </View>
            ))}
            {transcript.length === 0 && <View style={{ height: 100 }} />}
          </ScrollView>

          <View style={{ alignItems: 'center', paddingBottom: 8 }}>
            <Text style={[sty.statusLabel, { color: bg.text }]}>{statusText || (state === 'idle' && expanded ? '' : '')}</Text>
            {state === 'recording' && (
              <Text style={[sty.recordingHint, { color: isDark ? '#8899bb' : '#6c757d' }]}>Tap orb when finished</Text>
            )}
            <View style={sty.orbContainer}>
              <Animated.View style={[sty.ring, { opacity: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }), transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }], borderColor: bg.accent }]} />
              <Animated.View style={[sty.ring, { opacity: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }), transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] }) }], borderColor: bg.accent }]} />
              <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.8}>
                <Animated.View style={[sty.orb, { backgroundColor: state === 'thinking' ? '#555' : bg.accent, transform: [{ scale: pulseAnim }, { rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                  {state === 'recording' ? <Mic size={32} color="#fff" /> :
                   state === 'thinking' ? <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#fff', borderTopColor: 'transparent' }} /> :
                   state === 'speaking' ? <MicOff size={28} color="#fff" /> : <Mic size={32} color="#fff" />}
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={sty.controls}>
            <TouchableOpacity style={[sty.ctrlBtn, { backgroundColor: audioRoute === 'speaker' ? bg.accent : 'rgba(255,255,255,0.1)' }]} onPress={() => setAudioRoute(audioRoute === 'speaker' ? 'phone' : 'speaker')}>
              {audioRoute === 'speaker' ? <Volume2 size={16} color="#fff" /> : <Phone size={16} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={[sty.ctrlBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setExpanded(false)}>
              <ChevronDown size={18} color={bg.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[sty.ctrlBtn, { backgroundColor: 'rgba(255,80,80,0.3)' }]} onPress={cancelCall}>
              <X size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[sty.fab, { backgroundColor: bg.accent }]} onPress={handleFabPress}>
          <Mic size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={showOnboarding} transparent animationType="fade">
        <TouchableOpacity style={sty.onboardingOverlay} activeOpacity={1} onPress={() => { setShowOnboarding(false); SecureStore.setItemAsync('freesurf-onboarding-seen', '1'); }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 120, paddingRight: 20, alignItems: 'flex-end' }}>
            <View style={[sty.onboardingBubble, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: bg.accent }]}>
              <Text style={[sty.onboardingText, { color: bg.text }]}>Tap the mic to talk{'\n'}to your English tutor</Text>
              <View style={[sty.onboardingArrow, { borderTopColor: bg.accent }]} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const sty = StyleSheet.create({
  fab: { position: 'absolute', bottom: 40, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', zIndex: 100, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  miniChip: { position: 'absolute', bottom: 40, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, zIndex: 100, elevation: 8 },
  miniText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  expandedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 150 },
  orbContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  orb: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#5b8cff' },
  statusLabel: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  recordingHint: { marginTop: 6, fontSize: 13, textAlign: 'center' },
  transcriptArea: { marginTop: 20, maxHeight: 200, width: '85%' },
  transcriptLine: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 4 },
  transcriptRole: { fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  transcriptText: { fontSize: 14, lineHeight: 20 },
  controls: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingBottom: 40 },
  ctrlBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  setupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  setupCard: { borderRadius: 16, padding: 24 },
  setupTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  setupSub: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  langBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 8, alignItems: 'center' },
  langText: { fontSize: 16, fontWeight: '500' },
  onboardingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  onboardingBubble: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginRight: 4, position: 'relative' },
  onboardingText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  onboardingArrow: { position: 'absolute', bottom: -8, right: 20, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
});
