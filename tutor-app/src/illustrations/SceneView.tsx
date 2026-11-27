import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { SCENE_HTML } from "./sceneHtml";
import type { Word } from "../data/story";

// Animated illustration of one sentence. It fills the space under the sentence being read
// (full width, same background as the page) so it reads as part of the page, not a card.
// The scene runs in a WebView (offline HTML from scripts/build-illustrations.mjs); the Reader
// drives it with seek(player.currentTime), so it stays in sync with the audio at any speed.

export type SceneHandle = { seek: (t: number) => void; finish: () => void };

// One stable source object: a new {html} object on every render could make the WebView reload.
const SOURCE = { html: SCENE_HTML };
const SURFACE = "#FFFBF5";

type Props = { storyId: string; index: number; words: Word[]; height: number; bleed?: number; onPress?: () => void };

export const SceneView = forwardRef<SceneHandle, Props>(function SceneView({ storyId, index, words, height, bleed = 0, onPress }, ref) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const lastT = useRef(0);

  const inject = (js: string) => web.current?.injectJavaScript(`${js};true;`);
  const load = () => {
    const end = words.length ? words[words.length - 1].end + 0.3 : 0;
    inject(`window.loadScene(${JSON.stringify(storyId)},${index},${JSON.stringify(words)},${end});window.seekScene(${lastT.current})`);
  };

  useImperativeHandle(ref, () => ({
    seek: (t: number) => {
      lastT.current = t;
      if (ready.current) inject(`window.seekScene(${t.toFixed(3)})`);
    },
    finish: () => {
      if (ready.current) inject(`window.finishScene()`);
    },
  }));

  useEffect(() => {
    lastT.current = 0;
    if (ready.current) load();
  }, [storyId, index]);

  return (
    <View style={[styles.panel, { height, marginHorizontal: -bleed }]}>
      <WebView
        ref={web}
        originWhitelist={["*"]}
        source={SOURCE}
        onLoadEnd={() => { ready.current = true; load(); }}
        scrollEnabled={false}
        style={styles.web}
      />
      {onPress ? <Pressable style={StyleSheet.absoluteFill} onPress={onPress} /> : null}
    </View>
  );
});

// Invisible 1x1 WebView mounted when an illustrated story opens. Android starts its WebView engine
// on the first WebView in the app (slow); doing it up front keeps the first sentence tap responsive.
export function SceneWarmup() {
  return (
    <View style={styles.warm} pointerEvents="none">
      <WebView originWhitelist={["*"]} source={SOURCE} style={styles.web} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 6, backgroundColor: SURFACE, overflow: "hidden" },
  web: { flex: 1, backgroundColor: SURFACE },
  warm: { position: "absolute", width: 1, height: 1, opacity: 0, left: -10, top: -10 },
});
