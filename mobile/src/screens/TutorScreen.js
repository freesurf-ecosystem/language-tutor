import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Alert, Modal, Switch, Linking } from 'react-native';
import { Text, Button, Card, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import { Mic, Square, Volume2, EllipsisVertical } from 'lucide-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKER_URL = 'https://freesurf-language-tutor.freesurf.workers.dev';

const NATIVE_LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
];

export default function TutorScreen() {
  const theme = useTheme();
  const [nativeLang, setNativeLang] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const recordingRef = useRef(null);
  const soundRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('tutor-native-lang').then((saved) => {
      if (saved) { setNativeLang(saved); setShowSetup(false); }
    });
  }, []);

  function saveNativeLang(code) {
    setNativeLang(code);
    setShowSetup(false);
    AsyncStorage.setItem('tutor-native-lang', code);
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch { Alert.alert('Error', 'Could not start recording.'); }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri) await sendToTutor(uri);
    } catch { Alert.alert('Error', 'Could not stop recording.'); }
  }

  async function sendToTutor(uri) {
    setIsProcessing(true);
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      const res = await fetch(`${WORKER_URL}/api/tutor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_base64: base64, native_language: nativeLang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        id: Date.now(),
        original: data.original,
        correction: data.correction,
        response: data.response,
        audio: data.audio_base64,
      }]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Tutor request failed.');
    }
    setIsProcessing(false);
  }

  async function playAudio(b64) {
    if (isPlayingAudio) {
      await soundRef.current?.stopAsync();
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsPlayingAudio(false);
      return;
    }
    try {
      const { documentDirectory, writeAsStringAsync } = require('expo-file-system/legacy');
      const tempUri = documentDirectory + 'tutor-temp.wav';
      await writeAsStringAsync(tempUri, b64, { encoding: 'base64' });
      const { sound } = await Audio.Sound.createAsync({ uri: tempUri }, { shouldPlay: true }, (status) => {
        if (status.isLoaded && status.didJustFinish) setIsPlayingAudio(false);
      });
      soundRef.current = sound;
      setIsPlayingAudio(true);
    } catch { Alert.alert('Error', 'Could not play audio.'); }
  }

  const nativeName = NATIVE_LANGS.find(l => l.code === nativeLang)?.label || '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Setup modal */}
      <Modal visible={showSetup} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <Surface style={{ borderRadius: 16, padding: 24 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 20, textAlign: 'center' }}>
              Learn English with your AI tutor
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, textAlign: 'center' }}>
              What is your native language?
            </Text>
            {NATIVE_LANGS.map(lang => (
              <Button key={lang.code} mode="outlined" style={{ marginBottom: 8 }}
                onPress={() => saveNativeLang(lang.code)}>
                {lang.label}
              </Button>
            ))}
          </Surface>
        </View>
      </Modal>

      {/* Conversation */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {messages.length === 0 && !isProcessing ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Your tutor speaks English{nativeName ? ` · ${nativeName} for help` : ''}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
              Tap the mic and start speaking
            </Text>
          </View>
        ) : messages.map((msg) => (
          <View key={msg.id} style={{ marginBottom: 16 }}>
            <Card mode="contained" style={{ marginBottom: 8 }}>
              <Card.Content style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>You:</Text>
                  {msg.audio && (
                    <Button mode="text" compact icon={() => <Volume2 size={16} color={theme.colors.primary} />}
                      onPress={() => playAudio(msg.audio)}>Listen</Button>
                  )}
                </View>
                <Text variant="bodyMedium">{msg.original}</Text>
                {msg.correction && (
                  <Text variant="bodySmall" style={{ color: theme.colors.error }}>→ {msg.correction}</Text>
                )}
              </Card.Content>
            </Card>
            <Card mode="contained" style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.primary }}>
              <Card.Content>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Tutor:</Text>
                <Text variant="bodyMedium">{msg.response}</Text>
              </Card.Content>
            </Card>
          </View>
        ))}
        {isProcessing && (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Mic button */}
      <Surface style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 36, alignItems: 'center', elevation: 2 }}>
        <Button
          mode="contained"
          buttonColor={isRecording ? theme.colors.error : theme.colors.primary}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          icon={() => isRecording ? <Square size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
          contentStyle={{ paddingVertical: 8 }}
          style={{ width: 200, borderRadius: 30 }}
        >
          {isRecording ? 'Stop' : 'Speak'}
        </Button>
      </Surface>
    </View>
  );
}