/* In-app illustration panel host. Runs inside the tutor app's WebView (see tutor-app/src/illustrations).
 * The app calls:
 *   loadScene(storyId, sentenceIndex, words, end)  build that sentence's scene (t0 = 0)
 *   seekScene(seconds)                             show the frame for the current audio time
 * `words` is the sentence's aligned [{text, start, end}] from story.ts, so scenes and highlight share one clock.
 * The viewBox stretches to the panel's shape (ground pinned near the bottom, full width); extra height
 * becomes sky with faint clouds so a tall, immersive panel never looks empty. */
(function () {
  const svg = document.getElementById("stage");
  const layer = document.getElementById("layer");
  const sky = document.getElementById("sky");
  const turb = document.getElementById("turb");
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z']/g, "");
  const INK = "#211B14";
  let tl = null;

  const cloud = (x, y, s) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M-90 20 C -110 -10, -70 -40, -40 -26 C -30 -60, 30 -64, 44 -30 C 80 -44, 110 -10, 90 20 Z" style="fill:#FFFFFF;stroke:${INK};stroke-width:4;stroke-linejoin:round;opacity:0.35"/>`;

  function fit() {
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    const W = 1000, H = Math.max(600, (W * h) / w);
    const y0 = 1012 - H; // ground (y 960) sits ~52 units above the bottom edge
    svg.setAttribute("viewBox", `-20 ${y0.toFixed(1)} ${W} ${H.toFixed(1)}`);
    sky.innerHTML =
      `<path d="M-20 960 C 150 905, 300 905, 450 950 S 800 895, 980 945" style="fill:none;stroke:${INK};stroke-width:4;stroke-linecap:round;opacity:0.15"/>` +
      (H > 680 ? cloud(140, y0 + H * 0.16, 1) + cloud(560, y0 + H * 0.08, 0.75) : "") +
      (H > 820 ? cloud(880, y0 + H * 0.24, 0.65) : "");
  }
  window.addEventListener("resize", fit);
  fit();

  window.loadScene = function (storyId, index, words, end) {
    if (tl) tl.kill();
    tl = null;
    layer.innerHTML = "";
    gsap.set(sky, { x: 0 });
    const scenes = (window.SCENES || {})[storyId];
    if (!scenes || !scenes[index]) return;
    tl = gsap.timeline({ paused: true });
    const w = (word, nth = 1) => {
      let k = 0;
      for (const x of words) if (norm(x.text) === norm(word) && ++k === nth) return x.start;
      return 0; // unknown word: start of sentence rather than crash the panel
    };
    const L = window.Sketch.g(layer, {});
    scenes[index]({ tl, L, w, S: window.Sketch, end });
    tl.to(sky, { x: 40, duration: end + 2, ease: "none" }, 0);
    for (let i = 0; i * 0.125 < end + 2; i++) tl.set(turb, { attr: { seed: (i % 4) + 1 } }, i * 0.125);
    tl.seek(0);
  };

  window.seekScene = function (t) {
    if (tl) { tl.pause(); tl.seek(Math.max(0, t), false); }
  };

  // audio finished: let the scene play out its last beat (e.g. a falling apple) in real time
  window.finishScene = function () {
    if (tl) tl.play();
  };
})();
