import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useAudioPlayer,
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { readAsStringAsync, writeAsStringAsync, documentDirectory, EncodingType } from "expo-file-system/legacy";
import { NATIVE_LANGUAGES } from "./src/lib/languages";
import { t } from "./src/lib/strings";
import { Config } from "./src/config";
import { STORIES, QUESTION_AUDIO, Sentence, Story } from "./src/data/story";

type Phase = "idle" | "reading" | "asking" | "listening" | "recording" | "thinking" | "speaking";
type Screen = "reader" | "menu" | "settings";

const SUPPORT_URL = "https://freesurf.tools/support";
const PRIVACY_URL = "https://freesurf.tools/privacy";
const TERMS_URL = "https://freesurf.tools/terms";

export default function App() {
  const [lang, setLang] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("reader");
  const [storyId, setStoryId] = useState(STORIES[0].id);

  if (!lang) {
    return <LanguagePicker onPick={(code) => { setLang(code); setScreen("reader"); }} />;
  }

  const story = STORIES.find((s) => s.id === storyId) ?? STORIES[0];

  if (screen === "menu") {
    return (
      <MenuScreen
        lang={lang}
        currentStoryId={story.id}
        onPickStory={(id) => { setStoryId(id); setScreen("reader"); }}
        onChangeLang={() => setLang(null)}
        onSettings={() => setScreen("settings")}
        onBack={() => setScreen("reader")}
      />
    );
  }

  if (screen === "settings") {
    return <SettingsScreen lang={lang} onBack={() => setScreen("menu")} />;
  }

  return <Reader key={story.id} lang={lang} story={story} onMenu={() => setScreen("menu")} />;
}

function Reader({ lang, story, onMenu }: { lang: string; story: Story; onMenu: () => void }) {
  const [focused, setFocused] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeWord, setActiveWord] = useState(-1);
  const [speed, setSpeed] = useState(0.85);
  const [status, setStatus] = useState("");

  const player = useAudioPlayer(null, { updateInterval: 80 });
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sentence = story.sentences[focused];

  useEffect(() => {
    player.shouldCorrectPitch = true;
    player.setPlaybackRate(speed);
  }, [speed, player]);

  function playSentence(i: number) {
    setFocused(i);
    const s = story.sentences[i];
    player.replace(s.audio);
    player.play();
    setActiveWord(0);
    setStatus("");
    setPhase("reading");
  }

  function playQuestion() {
    player.replace(QUESTION_AUDIO);
    player.play();
    setStatus("");
    setPhase("asking");
  }

  async function startRecording() {
    setStatus("");
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setStatus("Please allow microphone access.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase("recording");
    } catch (e) {
      setStatus(msg(e));
      setPhase("listening");
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
      setStatus(msg(e));
      setPhase("listening");
    }
  }

  async function sendToTutor(audio_base64: string, audio_format: string) {
    const url = `${Config.workerUrl}/api/tutor`;
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
          speed,
          passage: sentence.text,
        }),
      });
    } catch (e) {
      setStatus("Could not reach the tutor server: " + msg(e));
      setPhase("listening");
      return;
    }

    const raw = await res.text();
    let data: any = null;
    if (raw.trim()) {
      try { data = JSON.parse(raw); } catch {}
    }
    if (!res.ok || !data || data.error) {
      setStatus(data?.error || `Tutor request failed (HTTP ${res.status})`);
      setPhase("listening");
      return;
    }

    if (data.audio_base64) {
      await playResponse(data.audio_base64 as string);
    } else {
      setStatus("");
      setPhase("listening");
    }
  }

  async function playResponse(b64: string) {
    try {
      const out = `${documentDirectory}tutor-${Date.now()}.wav`;
      await writeAsStringAsync(out, b64, { encoding: EncodingType.Base64 });
      player.replace(out);
      player.play();
      setStatus("");
      setPhase("speaking");
    } catch (e) {
      setStatus(msg(e));
      setPhase("listening");
    }
  }

  // Audio state machine: drive word highlight + phase transitions.
  useEffect(() => {
    if (phase === "reading") {
      const t = setInterval(() => {
        const ct = player.currentTime;
        const words = sentence.words;
        let idx = -1;
        for (let i = 0; i < words.length; i++) {
          if (ct >= words[i].start && ct < words[i].end) { idx = i; break; }
        }
        setActiveWord(idx);
        if (finished()) {
          clearInterval(t);
          playQuestion();
        }
      }, 50);
      return () => clearInterval(t);
    }

    if (phase === "asking" || phase === "speaking") {
      const t = setInterval(() => {
        if (finished()) {
          clearInterval(t);
          setPhase(phase === "asking" ? "listening" : "idle");
          setActiveWord(-1);
        }
      }, 50);
      return () => clearInterval(t);
    }
  }, [phase, focused, player]);

  function finished(): boolean {
    return player.duration > 0 && !player.playing && player.currentTime >= player.duration - 0.08;
  }

  function onOrbPress() {
    if (phase === "idle") playSentence(focused);
    else if (phase === "listening") startRecording();
    else if (phase === "recording") stopAndSend();
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onMenu} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{story.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        {story.sentences.map((s, i) => {
          const isFocused = i === focused;
          return (
            <Pressable key={i} onPress={() => playSentence(i)} style={styles.sentenceBlock}>
              <SentenceView
                sentence={s}
                focused={isFocused}
                activeWord={isFocused ? activeWord : -1}
                dimmed={!isFocused && phase !== "idle"}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.floatControls} pointerEvents="box-none">
        {status ? <Text style={styles.status}>{status}</Text> : null}
        <Pressable onPress={onOrbPress} style={[styles.orb, phase === "recording" && styles.orbRecording]}>
          {phase === "thinking" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orbIcon}>{orbIcon(phase)}</Text>
          )}
        </Pressable>
        <View style={styles.speedGroup}>
          {[0.5, 0.65, 0.85, 1.0, 1.25].map((s) => (
            <Pressable key={s} onPress={() => setSpeed(s)} style={[styles.speedBtn, speed === s && styles.speedBtnActive]}>
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>{s}×</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function SentenceView({ sentence, focused, activeWord, dimmed }: { sentence: Sentence; focused: boolean; activeWord: number; dimmed?: boolean }) {
  if (!focused) {
    return <Text style={[styles.sentenceText, dimmed && styles.dimmed]}>{sentence.text}</Text>;
  }
  return (
    <View style={styles.sentenceLine}>
      {sentence.words.map((w, i) => (
        <Text key={i} style={[styles.word, i === activeWord && styles.wordActive]}>{w.text}</Text>
      ))}
    </View>
  );
}

function MenuScreen({
  lang,
  currentStoryId,
  onPickStory,
  onChangeLang,
  onSettings,
  onBack,
}: {
  lang: string;
  currentStoryId: string;
  onPickStory: (id: string) => void;
  onChangeLang: () => void;
  onSettings: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Stories</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.menuInner}>
        <Text style={styles.sectionLabel}>STORIES</Text>
        {STORIES.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.storyRow, s.id === currentStoryId && styles.storyRowActive]}
            onPress={() => onPickStory(s.id)}
          >
            <Text style={styles.storyRowTitle}>{s.title}</Text>
            <Text style={styles.storyRowMeta}>{s.sentences.length} sentences</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <Pressable style={styles.menuRow} onPress={onChangeLang}>
          <Text style={styles.menuRowText}>{t(lang, "language")}: {NATIVE_LANGUAGES[lang] ?? lang}</Text>
        </Pressable>
        <Pressable style={styles.menuRow} onPress={onSettings}>
          <Text style={styles.menuRowText}>Settings</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SettingsScreen({ lang, onBack }: { lang: string; onBack: () => void }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.menuInner}>
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <Pressable style={styles.menuRow} onPress={() => PRIVACY_URL && Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.menuRowText}>Privacy Policy</Text>
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => TERMS_URL && Linking.openURL(TERMS_URL)}>
          <Text style={styles.menuRowText}>Terms of Service</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <Pressable style={styles.menuRow} onPress={() => Linking.openURL(SUPPORT_URL)}>
          <Text style={styles.menuRowText}>Support</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function LanguagePicker({ onPick }: { onPick: (code: string) => void }) {
  return (
    <View style={styles.root}>
      <View style={styles.pickerHeader}>
        <Text style={styles.brand}>FREESURF</Text>
        <Text style={styles.appTitle}>Slow English Tutor</Text>
        <Text style={styles.pickerQuestion}>What is your native language?</Text>
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

function orbIcon(phase: Phase): string {
  if (phase === "recording") return "■";
  if (phase === "listening") return "●";
  return "▶";
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const ACCENT = "#E56A4C";
const INK = "#211B14";
const SECONDARY = "#8A7C6C";
const SURFACE = "#FFFBF5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  chevron: { fontSize: 30, color: INK, fontWeight: "600", width: 28 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: INK },
  headerSpacer: { width: 28 },
  brand: { fontSize: 11, letterSpacing: 2, fontWeight: "700", color: ACCENT },

  body: { flex: 1 },
  bodyInner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 150 },
  sentenceBlock: { paddingVertical: 18 },
  sentenceText: { fontSize: 38, fontWeight: "700", color: INK, lineHeight: 58 },
  dimmed: { opacity: 0.18 },
  sentenceLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  word: { fontSize: 38, fontWeight: "700", color: INK, lineHeight: 58, paddingHorizontal: 3, marginVertical: 3 },
  wordActive: { color: "#FFFFFF", backgroundColor: ACCENT, borderRadius: 10, overflow: "hidden" },

  floatControls: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  status: {
    color: SECONDARY,
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  orbRecording: { backgroundColor: "#C8554A" },
  orbIcon: { color: "#fff", fontSize: 28 },
  speedGroup: { flexDirection: "row", gap: 8, marginTop: 12 },
  speedBtn: { borderWidth: 1, borderColor: ACCENT, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: SURFACE },
  speedBtnActive: { backgroundColor: ACCENT },
  speedText: { color: ACCENT, fontSize: 14, fontWeight: "600" },
  speedTextActive: { color: "#fff" },

  menuInner: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700", color: SECONDARY, marginTop: 20, marginBottom: 8 },
  storyRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EDE4D8" },
  storyRowActive: { backgroundColor: "#F3E4DA", borderRadius: 12, paddingHorizontal: 12, borderBottomWidth: 0 },
  storyRowTitle: { fontSize: 18, fontWeight: "700", color: INK },
  storyRowMeta: { fontSize: 13, color: SECONDARY, marginTop: 3 },
  menuRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#EDE4D8" },
  menuRowText: { fontSize: 16, fontWeight: "600", color: INK },
  menuRowSub: { fontSize: 13, color: SECONDARY, marginTop: 3 },

  pickerHeader: { paddingTop: 74, paddingHorizontal: 28, paddingBottom: 20 },
  appTitle: { fontSize: 28, fontWeight: "800", color: INK, marginTop: 14 },
  pickerQuestion: { fontSize: 20, fontWeight: "700", color: INK, marginTop: 18 },
  langList: { flex: 1 },
  langListInner: { paddingHorizontal: 28, paddingBottom: 40 },
  langBtn: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#EDE4D8" },
  langBtnText: { fontSize: 16, fontWeight: "500", color: INK },
});
