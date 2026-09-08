import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { readAsStringAsync, writeAsStringAsync, documentDirectory, EncodingType } from "expo-file-system/legacy";
import { NATIVE_LANGUAGES } from "./src/lib/languages";
import { Config } from "./src/config";

type Turn = { role: "user" | "tutor"; text: string; lang?: string };
type Phase = "idle" | "recording" | "thinking" | "speaking";

export default function App() {
  const [lang, setLang] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);

  // Auto-request mic permission when the app loads.
  useEffect(() => {
    requestRecordingPermissionsAsync().catch(() => {});
  }, []);

  async function startRecording() {
    setError("");
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError("Please allow microphone access to speak with your tutor.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase("recording");
      setStatus("Listening…");
    } catch (e) {
      setError(msg(e));
      setPhase("idle");
    }
  }

  async function stopAndSend() {
    if (!recorder.isRecording) return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording captured.");
      setPhase("thinking");
      setStatus("Thinking…");
      const audio_base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      await sendToTutor(audio_base64, "m4a");
    } catch (e) {
      setError(msg(e));
      setPhase("idle");
      setStatus("");
    }
  }

  async function sendToTutor(audio_base64: string, audio_format: string) {
    const url = `${Config.workerUrl}/api/tutor`;
    console.log("[tutor] POST", url, { mode: "voice", audio_format, native_language: lang });
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "voice",
          audio_base64,
          audio_format,
          native_language: lang,
          history: history.map((h) => ({ role: h.role, text: h.text })),
        }),
      });
    } catch (e) {
      console.error("[tutor] network error", e);
      setError("Could not reach the tutor server: " + msg(e));
      setPhase("idle");
      setStatus("");
      return;
    }

    // Read the raw body first so we can report the real error instead of "unexpected end of JSON".
    const raw = await res.text();
    console.log("[tutor] HTTP", res.status, "body(0..300):", raw.slice(0, 300));
    let data: any = null;
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch {
        console.error("[tutor] non-JSON body", res.status, raw.slice(0, 300));
      }
    }
    if (!res.ok || !data || data.error) {
      setError(data?.error || `Tutor request failed (HTTP ${res.status})${raw.trim() ? ` — ${raw.slice(0, 200)}` : ""}`);
      setPhase("idle");
      setStatus("");
      return;
    }

    // Keep a transcript of what was said / what the tutor replied.
    const next: Turn[] = [
      ...history,
      { role: "user", text: data.original || "" },
      ...((data.segments as { text: string; lang?: string }[]) || []).map((s) => ({
        role: "tutor" as const,
        text: s.text,
        lang: s.lang,
      })),
    ];
    setHistory(next);

    if (data.audio_base64) {
      await playAudio(data.audio_base64 as string);
    } else {
      setPhase("idle");
      setStatus("");
    }
  }

  async function playAudio(b64: string) {
    try {
      const out = `${documentDirectory}tutor-${Date.now()}.wav`;
      await writeAsStringAsync(out, b64, { encoding: EncodingType.Base64 });
      player.replace(out);
      setPhase("speaking");
      setStatus("");
      player.play();
    } catch (e) {
      setError(msg(e));
      setPhase("idle");
    }
  }

  // When the player finishes, return to idle.
  useEffect(() => {
    if (phase !== "speaking") return;
    const t = setInterval(() => {
      if (player.playing) {
        // still playing
      } else {
        clearInterval(t);
        setPhase("idle");
      }
    }, 300);
    return () => clearInterval(t);
  }, [phase, player]);

  function onOrbPress() {
    if (phase === "recording") void stopAndSend();
    else if (phase === "idle") void startRecording();
  }

  if (!lang) {
    return <LanguagePicker onPick={(code) => { setLang(code); setHistory([]); }} />;
  }

  const nativeName = NATIVE_LANGUAGES[lang] ?? lang;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>FREESURF</Text>
        <Text style={styles.title}>English Tutor</Text>
        <Text style={styles.sub}>Native language: {nativeName}</Text>
      </View>

      <ScrollView style={styles.history} contentContainerStyle={styles.historyInner}>
        {history.length === 0 && (
          <Text style={styles.hint}>
            Tap the orb and speak. Your English tutor will correct you and reply.
          </Text>
        )}
        {history.map((turn, i) => (
          <View key={i} style={turn.role === "user" ? styles.userBubble : styles.tutorBubble}>
            <Text style={styles.bubbleLabel}>{turn.role === "user" ? "You" : "Tutor"}</Text>
            <Text style={styles.bubbleText}>{turn.text}</Text>
          </View>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <View style={styles.orbArea}>
        <Pressable
          onPress={onOrbPress}
          style={[styles.orb, phase === "recording" && styles.orbRecording]}
        >
          {phase === "thinking" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orbIcon}>{phase === "recording" ? "■" : "●"}</Text>
          )}
        </Pressable>
        <Text style={styles.orbLabel}>
          {phase === "recording" ? "Tap to stop" : phase === "speaking" ? "Listening back" : "Tap to speak"}
        </Text>
      </View>
    </View>
  );
}

function LanguagePicker({ onPick }: { onPick: (code: string) => void }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>FREESURF</Text>
        <Text style={styles.title}>English Tutor</Text>
        <Text style={styles.sub}>What is your native language?</Text>
      </View>
      <ScrollView style={styles.langList} contentContainerStyle={styles.langListInner}>
        {Object.entries(NATIVE_LANGUAGES).map(([code, label]) => (
          <Pressable key={code} style={styles.langBtn} onPress={() => onPick(code)}>
            <Text style={styles.langBtnText}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---- Warm-minimal tokens (see docs/TUTOR_VISUAL_DESIGN.md) ----
const ACCENT = "#E56A4C";
const INK = "#211B14";
const SECONDARY = "#8A7C6C";
const SURFACE = "#FFFBF5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE },
  header: { paddingTop: 74, paddingHorizontal: 28, paddingBottom: 12 },
  brand: { fontSize: 11, letterSpacing: 2, fontWeight: "700", color: ACCENT },
  title: { fontSize: 30, fontWeight: "800", color: INK, marginTop: 2 },
  sub: { fontSize: 14, color: SECONDARY, marginTop: 6 },
  history: { flex: 1, paddingHorizontal: 20 },
  historyInner: { paddingVertical: 8 },
  hint: { fontSize: 15, color: SECONDARY, textAlign: "center", marginTop: 40, paddingHorizontal: 12 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#F3E4DA", borderRadius: 18, padding: 12, marginBottom: 10, maxWidth: "80%" },
  tutorBubble: { alignSelf: "flex-start", borderLeftColor: ACCENT, borderLeftWidth: 3, borderRadius: 12, padding: 12, marginBottom: 10, maxWidth: "85%" },
  bubbleLabel: { fontSize: 11, fontWeight: "700", color: SECONDARY, marginBottom: 2, textTransform: "uppercase" },
  bubbleText: { fontSize: 15, color: INK, lineHeight: 21 },
  error: { color: "#C8554A", textAlign: "center", marginHorizontal: 28, fontSize: 13 },
  status: { color: SECONDARY, textAlign: "center", marginHorizontal: 28, fontSize: 13 },
  orbArea: { alignItems: "center", paddingVertical: 28 },
  orb: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  orbRecording: { backgroundColor: "#C8554A" },
  orbIcon: { color: "#fff", fontSize: 34 },
  orbLabel: { marginTop: 12, fontSize: 13, color: SECONDARY },
  langList: { flex: 1 },
  langListInner: { paddingHorizontal: 28, paddingBottom: 40 },
  langBtn: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#EDE4D8" },
  langBtnText: { fontSize: 16, fontWeight: "500", color: INK },
});
