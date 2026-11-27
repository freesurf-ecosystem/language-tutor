import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { SceneView, SceneHandle, SceneWarmup } from "./src/illustrations/SceneView";
import { ILLUSTRATED_STORIES } from "./src/illustrations/sceneHtml";

type Phase = "idle" | "reading" | "asking" | "listening" | "recording" | "thinking" | "speaking";
type Screen = "reader" | "menu" | "settings";

const SUPPORT_URL = "https://freesurf.tools/support";
const PRIVACY_URL = "https://freesurf.tools/privacy";
const TERMS_URL = "https://freesurf.tools/terms";

// Reading preferences (Settings > Reading), saved to a small JSON file so they survive restarts.
type ReadingPrefs = { askQuestion: boolean; autoNext: boolean };
const DEFAULT_PREFS: ReadingPrefs = { askQuestion: true, autoNext: true };
const PREFS_FILE = `${documentDirectory}reading-prefs.json`;

export default function App() {
  const [lang, setLang] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("reader");
  const [storyId, setStoryId] = useState(STORIES[0].id);
  const [prefs, setPrefsState] = useState<ReadingPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    readAsStringAsync(PREFS_FILE)
      .then((raw) => setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(raw) }))
      .catch(() => {}); // first run: no file yet
  }, []);

  function setPrefs(next: ReadingPrefs) {
    setPrefsState(next);
    writeAsStringAsync(PREFS_FILE, JSON.stringify(next)).catch(() => {});
  }

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
    return <SettingsScreen lang={lang} prefs={prefs} onPrefs={setPrefs} onBack={() => setScreen("menu")} />;
  }

  return <Reader key={story.id} lang={lang} story={story} prefs={prefs} onMenu={() => setScreen("menu")} />;
}

function Reader({ lang, story, prefs, onMenu }: { lang: string; story: Story; prefs: ReadingPrefs; onMenu: () => void }) {
  const [focused, setFocused] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeWord, setActiveWord] = useState(-1);
  const [speed, setSpeed] = useState(0.85);
  const [status, setStatus] = useState("");

  const player = useAudioPlayer(null, { updateInterval: 80 });
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sentence = story.sentences[focused];

  // Illustration panel: opens under the sentence being read, and that sentence scrolls to the top.
  const illustrated = ILLUSTRATED_STORIES.includes(story.id);
  const [sceneFor, setSceneFor] = useState(-1);
  const sceneRef = useRef<SceneHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const blockY = useRef<number[]>([]);
  // pending "read the next sentence" when the question is turned off
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearNext = () => { if (nextTimer.current) { clearTimeout(nextTimer.current); nextTimer.current = null; } };
  useEffect(() => clearNext, []);
  // Panel height = visible scroll area minus the sentence above it and the floating controls below,
  // so the drawing fills the screen under the sentence once it has scrolled to the top.
  const [viewportH, setViewportH] = useState(0);
  const [textH, setTextH] = useState<number[]>([]);
  // Controls (play + speeds) can be tucked away with a chevron for clean "slow English" filming.
  // They come back on their own whenever the learner needs the mic (question flow).
  const [controlsHidden, setControlsHidden] = useState(false);
  const needsMic = phase === "listening" || phase === "recording" || phase === "thinking";
  const showControls = !controlsHidden || needsMic;
  const panelH = Math.max(240, viewportH - (textH[sceneFor] ?? 120) - SENTENCE_PAD * 2 - 6 - (showControls ? CONTROLS_H : CONTROLS_TUCKED_H));

  useEffect(() => {
    if (sceneFor < 0) return;
    // wait a frame so layout reflects the panel moving to this sentence
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, (blockY.current[sceneFor] ?? 0) - 4), animated: true });
    }, 60);
    return () => clearTimeout(id);
  }, [sceneFor]);

  useEffect(() => {
    player.shouldCorrectPitch = true;
    player.setPlaybackRate(speed);
  }, [speed, player]);

  function playSentence(i: number) {
    clearNext();
    setFocused(i);
    if (illustrated) {
      setSceneFor(i);
      sceneRef.current?.seek(0);
    }
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
      const startedAt = Date.now();
      const t = setInterval(() => {
        const ct = player.currentTime;
        // audio never started (e.g. asset failed to load): don't sit frozen on the first word.
        // Generous limit: a first load over the dev server can take a few seconds.
        if (ct === 0 && !player.playing && Date.now() - startedAt > 10000) {
          clearInterval(t);
          setActiveWord(-1);
          setStatus("Couldn't play the audio for this sentence. Tap to try again.");
          setPhase("idle");
          return;
        }
        sceneRef.current?.seek(ct);
        const words = sentence.words;
        let idx = -1;
        for (let i = 0; i < words.length; i++) {
          if (ct >= words[i].start && ct < words[i].end) { idx = i; break; }
        }
        setActiveWord(idx);
        if (finished()) {
          clearInterval(t);
          sceneRef.current?.finish();
          if (prefs.askQuestion) {
            playQuestion();
          } else {
            // story mode: no question; let the illustration land, then read on
            setActiveWord(-1);
            setPhase("idle");
            const next = focused + 1;
            if (prefs.autoNext && next < story.sentences.length) {
              nextTimer.current = setTimeout(() => playSentence(next), 1100);
            }
          }
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
    if (phase === "reading") {
      // pause: stop this sentence and any auto-continue
      clearNext();
      player.pause();
      setActiveWord(-1);
      setPhase("idle");
      return;
    }
    if (phase === "idle" && nextTimer.current) { clearNext(); return; } // tap during the gap = stop
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

      {illustrated ? <SceneWarmup /> : null}
      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyInner}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
      >
        {story.sentences.map((s, i) => {
          const isFocused = i === focused;
          return (
            <View key={i} onLayout={(e) => { blockY.current[i] = e.nativeEvent.layout.y; }} style={styles.sentenceBlock}>
              <Pressable
                onPress={() => playSentence(i)}
                onLayout={(e) => {
                  const h = Math.round(e.nativeEvent.layout.height);
                  setTextH((prev) => (prev[i] === h ? prev : Object.assign([...prev], { [i]: h })));
                }}
              >
                <SentenceView
                  sentence={s}
                  focused={isFocused}
                  activeWord={isFocused ? activeWord : -1}
                  dimmed={!isFocused && phase !== "idle"}
                />
              </Pressable>
              {illustrated && i === sceneFor ? (
                <SceneView ref={sceneRef} storyId={story.id} index={i} words={s.words} height={panelH} bleed={BODY_PAD_X} onPress={() => playSentence(i)} />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {showControls ? null : (
        <View style={styles.tuckedControls} pointerEvents="box-none">
          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable onPress={() => setControlsHidden(false)} hitSlop={16} style={styles.chevronBtn}>
            <Text style={[styles.chevronGlyph, styles.chevronUp]}>›</Text>
          </Pressable>
        </View>
      )}

      {!showControls ? null : (
      <View style={styles.floatControls} pointerEvents="box-none">
        {status ? <Text style={styles.status}>{status}</Text> : null}
        {needsMic ? null : (
          <Pressable onPress={() => setControlsHidden(true)} hitSlop={16} style={[styles.chevronBtn, styles.chevronHide]}>
            <Text style={[styles.chevronGlyph, styles.chevronDown]}>›</Text>
          </Pressable>
        )}
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
      )}
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

function SettingsScreen({ lang, prefs, onPrefs, onBack }: { lang: string; prefs: ReadingPrefs; onPrefs: (p: ReadingPrefs) => void; onBack: () => void }) {
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
        <Text style={styles.sectionLabel}>READING</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.menuRowText}>Ask “What do you think this means?”</Text>
            <Text style={styles.menuRowSub}>After each sentence the tutor asks, then listens for your answer.</Text>
          </View>
          <Switch
            value={prefs.askQuestion}
            onValueChange={(v) => onPrefs({ ...prefs, askQuestion: v })}
            trackColor={{ true: ACCENT, false: "#D9CFC3" }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.toggleRow, prefs.askQuestion && styles.toggleRowDisabled]}>
          <View style={styles.toggleText}>
            <Text style={styles.menuRowText}>Read straight through</Text>
            <Text style={styles.menuRowSub}>With the question off, go on to the next sentence by itself.</Text>
          </View>
          <Switch
            value={prefs.autoNext}
            disabled={prefs.askQuestion}
            onValueChange={(v) => onPrefs({ ...prefs, autoNext: v })}
            trackColor={{ true: ACCENT, false: "#D9CFC3" }}
            thumbColor="#FFFFFF"
          />
        </View>

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
  if (phase === "reading") return "❚❚";
  return "▶";
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const BODY_PAD_X = 24; // bodyInner horizontal padding (the illustration bleeds past it to full width)
const SENTENCE_PAD = 18; // sentenceBlock vertical padding
const CONTROLS_H = 150; // floating orb + speed buttons (chevron sits beside the orb), kept clear of the illustration
const CONTROLS_TUCKED_H = 56; // just the small chevron when the controls are tucked away

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
  // tall bottom padding so even the last sentence can scroll up to the top with its illustration
  bodyInner: { paddingHorizontal: BODY_PAD_X, paddingTop: 16, paddingBottom: 640 },
  sentenceBlock: { paddingVertical: SENTENCE_PAD },
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
  tuckedControls: { position: "absolute", bottom: 18, right: 20, alignItems: "flex-end" },
  chevronBtn: { width: 44, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(229,106,76,0.12)" },
  chevronHide: { position: "absolute", right: 20, bottom: 63 }, // right side, level with the orb
  chevronGlyph: { fontSize: 24, fontWeight: "700", color: ACCENT, lineHeight: 26 },
  chevronDown: { transform: [{ rotate: "90deg" }] },
  chevronUp: { transform: [{ rotate: "-90deg" }] },
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
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EDE4D8", gap: 12 },
  toggleRowDisabled: { opacity: 0.4 },
  toggleText: { flex: 1 },

  pickerHeader: { paddingTop: 74, paddingHorizontal: 28, paddingBottom: 20 },
  appTitle: { fontSize: 28, fontWeight: "800", color: INK, marginTop: 14 },
  pickerQuestion: { fontSize: 20, fontWeight: "700", color: INK, marginTop: 18 },
  langList: { flex: 1 },
  langListInner: { paddingHorizontal: 28, paddingBottom: 40 },
  langBtn: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#EDE4D8" },
  langBtnText: { fontSize: 16, fontWeight: "500", color: INK },
});
