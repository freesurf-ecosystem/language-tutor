/* Sketch: hand-drawn illustration helpers for Slow English read-along scenes.
 * Self-contained (inline styles, no CSS needed) so the same scene code runs in a HyperFrames
 * composition (social videos) and, later, in the app's WebView (one sentence at a time).
 * Requires GSAP. Exposes window.Sketch. All drawings are SVG; ground line is y = GROUND. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const C = {
    ink: "#211B14", paper: "#FFFBF5", accent: "#E56A4C",
    fox: "#EC8B5E", cream: "#FFF3E2", earIn: "#8A4A32", paw: "#3B2E24",
    grape: "#7A4E8C", grapeUnripe: "#BFA9C9",
    leaf: "#CFE3AE", leafDark: "#A8C97F", trunk: "#B98A5E", apple: "#D8473C",
    sun: "#F7B24A", glow: "#FFE6BC", butter: "#F4C15D",
  };
  const GROUND = 960;
  const st = (fill = "none", w = 6) => `fill:${fill};stroke:${C.ink};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round`;

  function g(parent, attrs = {}, html = "") {
    const e = document.createElementNS(NS, "g");
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  const hide = (els) => gsap.set(els, { opacity: 0 });
  const pop = (tl, el, t, d = 0.4) => tl.fromTo(el, { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: d, ease: "back.out(1.8)", immediateRender: false }, t);
  const fadeIn = (tl, el, t, d = 0.35) => tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, immediateRender: false }, t);
  const fadeOut = (tl, el, t, d = 0.3) => tl.to(el, { opacity: 0, duration: d }, t);
  const drawOn = (tl, path, t, d = 0.6, len = 1500) => { gsap.set(path, { strokeDasharray: len, strokeDashoffset: len }); return tl.to(path, { strokeDashoffset: 0, duration: d, ease: "power1.inOut" }, t); };

  /* ---------- the fox (feet at 0,0, facing right) ---------- */
  function fox(parent, id, x, y = GROUND, s = 1.5, faceLeft = false) {
    const el = g(parent, { id });
    const sc = g(el, { transform: `scale(${s})` });
    const flip = g(sc);
    const bob = g(flip); // walking bounce
    // legs: hip -> ground, dark paw; far legs a shade lighter so the body reads in depth
    const leg = (hx, hy, far) => g(bob, {}, `<path d="M${hx} ${hy} L ${hx} -3" style="${st("none", far ? 6 : 7)};stroke:${far ? "#5A4A3C" : C.ink}"/><ellipse cx="${hx + 5}" cy="-3" rx="9" ry="5" style="fill:${far ? "#5A4A3C" : C.paw}"/>`);
    const l1 = leg(-24, -50, true), l3 = leg(30, -52, true);
    const tail = g(bob, {},
      `<path d="M-52 -72 C -92 -66, -132 -94, -124 -146 C -112 -128, -98 -118, -82 -114 C -100 -104, -80 -90, -50 -88 Z" style="${st(C.fox)}"/>` +
      `<path d="M-124 -146 C -129 -130, -122 -118, -107 -114 C -112 -126, -116 -137, -124 -146 Z" style="${st(C.cream, 4)}"/>` +
      `<path d="M-70 -86 q -10 -2 -16 -8 M-88 -96 q -8 -4 -12 -10" style="${st("none", 3)};opacity:0.5"/>`);
    g(bob, {},
      `<path d="M-60 -66 C -64 -98, -20 -110, 30 -102 C 60 -98, 72 -78, 64 -60 C 56 -46, 20 -45, -14 -47 C -44 -47, -58 -52, -60 -66 Z" style="${st(C.fox)}"/>` +
      `<path d="M-42 -52 C -10 -44, 30 -46, 58 -56 C 52 -49, 24 -45, -10 -46 C -26 -46, -36 -48, -42 -52 Z" style="fill:${C.cream}"/>` +
      `<path d="M42 -76 C 54 -64, 60 -54, 52 -48 C 40 -52, 34 -64, 42 -76 Z" style="fill:${C.cream}"/>` +
      `<path d="M-34 -100 l 7 -7 M -14 -104 l 7 -7 M 6 -104 l 7 -7" style="${st("none", 3)};opacity:0.45"/>`);
    const l0 = leg(-40, -54, false), l2 = leg(46, -56, false);
    const head = g(bob, {},
      `<path d="M56 -110 L 58 -147 L 79 -116 Z" style="${st(C.fox, 5)}"/><path d="M61 -116 L 62 -136 L 72 -119 Z" style="fill:${C.earIn}"/>` +
      `<path d="M72 -114 L 87 -149 L 95 -110 Z" style="${st(C.fox, 5)}"/><path d="M78 -117 L 86 -138 L 90 -115 Z" style="fill:${C.earIn}"/>` +
      `<path d="M36 -72 C 30 -104, 58 -124, 84 -114 C 96 -110, 108 -102, 124 -96 C 116 -82, 92 -72, 70 -70 C 56 -68, 44 -68, 36 -72 Z" style="${st(C.fox)}"/>` +
      `<path d="M72 -87 C 86 -91, 104 -94, 121 -95 C 113 -82, 92 -75, 72 -77 C 66 -79, 66 -85, 72 -87 Z" style="fill:${C.cream}"/>` +
      `<ellipse cx="84" cy="-100" rx="5" ry="6.5" style="fill:${C.ink}"/><circle cx="86" cy="-103" r="2" style="fill:#FFFFFF"/>` +
      `<path d="M76 -111 Q 84 -115, 92 -112" style="${st("none", 3)}"/>` +
      `<circle cx="123" cy="-96" r="6.5" style="fill:${C.ink}"/><path d="M104 -84 C 108 -81, 113 -82, 117 -86" style="${st("none", 3.5)}"/>`);
    const tongue = g(head, {}, `<path d="M106 -82 C 110 -72, 120 -72, 119 -84" style="${st(C.accent, 4)}"/>`);
    const rumble = g(bob, {}, `<path d="M-14 -30 q 6 7 12 0 M 4 -22 q 6 7 12 0 M -30 -20 q 6 7 12 0" style="${st("none", 4)}"/>`);
    hide([tongue, rumble]);
    gsap.set(el, { x, y });
    if (faceLeft) gsap.set(flip, { scaleX: -1, transformOrigin: "50% 50%" });
    return { el, flip, bob, head, tail, tongue, rumble, legsA: [l0, l2], legsB: [l1, l3], legs: [l0, l1, l2, l3], x, y };
  }
  /* leg swing for `dur` seconds (always ends with legs straight) */
  function legCycle(tl, F, t, dur, step = 0.2, amp = 24) {
    const n = Math.max(1, Math.round(dur / step)); const rep = n % 2 ? n : n + 1;
    tl.to(F.legsA, { rotation: amp, transformOrigin: "50% 0%", duration: step, yoyo: true, repeat: rep, ease: "sine.inOut" }, t);
    tl.to(F.legsB, { rotation: -amp, transformOrigin: "50% 0%", duration: step, yoyo: true, repeat: rep, ease: "sine.inOut" }, t);
  }
  function walk(tl, F, t, dur, toX, step = 0.2) {
    tl.to(F.el, { x: toX, duration: dur, ease: "none" }, t);
    legCycle(tl, F, t, dur, step);
    const n = Math.max(1, Math.round(dur / step)); const rep = n % 2 ? n : n + 1;
    tl.to(F.bob, { y: -5, duration: step, yoyo: true, repeat: rep, ease: "sine.inOut" }, t); // bounce, ends level
    tl.to(F.tail, { rotation: 7, transformOrigin: "100% 100%", duration: step * 2, yoyo: true, repeat: Math.max(1, Math.floor(rep / 2) | 1), ease: "sine.inOut" }, t);
  }
  function jump(tl, F, t, h = 130, up = 0.32, down = 0.3) {
    tl.to(F.el, { y: F.y - h, duration: up, ease: "power2.out" }, t);
    tl.to(F.legsA, { rotation: -35, transformOrigin: "50% 0%", duration: up * 0.6 }, t);
    tl.to(F.legsB, { rotation: 35, transformOrigin: "50% 0%", duration: up * 0.6 }, t);
    tl.to(F.el, { y: F.y, duration: down, ease: "power2.in" }, t + up);
    tl.to(F.legs, { rotation: 0, transformOrigin: "50% 0%", duration: down * 0.6 }, t + up + down * 0.4);
  }
  /* head tilt: negative = nose up (works when flipped too) */
  const look = (tl, F, t, deg, d = 0.35) => tl.to(F.head, { rotation: deg, transformOrigin: "20% 90%", duration: d, ease: "power2.inOut" }, t);
  const tailTo = (tl, F, t, deg, d = 0.35) => tl.to(F.tail, { rotation: deg, transformOrigin: "100% 100%", duration: d, ease: "power2.inOut" }, t);
  const wag = (tl, F, t, n = 3) => tl.to(F.tail, { rotation: 14, transformOrigin: "100% 100%", duration: 0.16, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, t);

  /* ---------- props ---------- */
  function sun(parent, x, y) {
    let rays = "";
    for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5; rays += `M${(64 * Math.cos(a)).toFixed(1)} ${(64 * Math.sin(a)).toFixed(1)} L ${(88 * Math.cos(a)).toFixed(1)} ${(88 * Math.sin(a)).toFixed(1)} `; }
    const el = g(parent, { transform: `translate(${x} ${y})` });
    const inner = g(el);
    const glow = g(inner, {}, `<circle r="78" style="fill:${C.glow};opacity:0.7"/>`);
    const r = g(inner, {}, `<path d="${rays}" style="${st("none", 6)}"/>`);
    g(inner, {}, `<circle r="48" style="${st(C.sun)}"/>`);
    return { el: inner, rays: r, glow };
  }
  function heat(parent, x, y) {
    return g(parent, {}, [0, 1, 2].map((i) => `<path d="M${x + i * 46} ${y} c -12 -16, 12 -28, 0 -44 s 12 -28, 0 -44" style="${st("none", 4)};opacity:0.6"/>`).join(""));
  }
  /* bumpy, leafy outline around (cx,cy) */
  const bumps = (cx, cy, r, n = 9, sq = 0.8, bulge = 1.3) => {
    let d = "";
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * 2 * Math.PI, x = cx + r * Math.cos(a), y = cy + r * sq * Math.sin(a);
      if (k === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
      else { const m = ((k - 0.5) / n) * 2 * Math.PI; d += ` Q ${(cx + r * bulge * Math.cos(m)).toFixed(1)} ${(cy + r * sq * bulge * Math.sin(m)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`; }
    }
    return d + " Z";
  };
  /* an apple: rounded heart-ish body, shine, stem and leaf. Returned wrapped so GSAP can scale it freely. */
  const apple = (x, y, s = 1, cls = "apple") =>
    `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${s})">` +
    `<path d="M0 -8 C -10 -18, -26 -11, -23 6 C -20 21, -8 25, 0 19 C 8 25, 20 21, 23 6 C 26 -11, 10 -18, 0 -8 Z" style="${st(C.apple, 4)}"/>` +
    `<path d="M-13 -2 C -15 4, -13 10, -9 13" style="fill:none;stroke:#FFFFFF;stroke-width:4;stroke-linecap:round;opacity:0.85"/>` +
    `<path d="M0 -8 C 0 -14, 2 -18, 5 -22" style="${st("none", 4)}"/><path d="M4 -17 C 10 -26, 21 -24, 22 -18 C 14 -13, 8 -13, 4 -17 Z" style="${st(C.leafDark, 3)}"/>` +
    `</g></g>`;
  /* orchard tree: tapered trunk + branches, layered leafy canopy, apples (inner.apples) */
  function tree(parent, x, s = 1, fruit = true, seed = 0) {
    const el = g(parent, { transform: `translate(${x} ${GROUND}) scale(${s})` });
    const inner = g(el);
    inner.trunk = g(inner, {},
      `<path d="M-18 0 C -10 -50, -14 -110, -7 -160 L 7 -160 C 13 -110, 10 -50, 20 0 Z" style="${st(C.trunk, 5)}"/>` +
      `<path d="M-4 -128 C -28 -146, -44 -160, -58 -188 M6 -118 C 30 -136, 46 -152, 58 -180" style="${st("none", 7)}"/>` +
      `<path d="M-6 -40 q 6 -10 2 -22 M8 -80 q -6 -10 -2 -20" style="${st("none", 3)};opacity:0.5"/>`);
    const r = 128 + (seed % 3) * 8;
    inner.canopy = g(inner, {},
      `<path d="${bumps(0, -262, r, 9 + (seed % 2), 0.78)}" style="${st(C.leaf)}"/>` +
      `<path d="${bumps(-34, -232, r * 0.5, 7, 0.75, 1.25)}" style="fill:${C.leafDark};opacity:0.55"/>` +
      `<path d="${bumps(48, -300, r * 0.34, 6, 0.8, 1.25)}" style="fill:${C.leafDark};opacity:0.4"/>` +
      `<path d="M-60 -300 q 8 -8 16 0 M30 -230 q 8 -8 16 0 M-20 -190 q 8 -8 16 0 M70 -260 q 8 -8 16 0" style="${st("none", 3)};opacity:0.45"/>`);
    const spots = [[-62, -258], [-14, -322], [46, -270], [0, -214], [-70, -206], [78, -222], [28, -330]];
    inner.apples = fruit ? spots.slice(0, 5 + (seed % 3)).map(([a, b], i) => g(inner, {}, apple(a, b, 0.95 + ((i + seed) % 3) * 0.08))) : [];
    return inner;
  }
  function tufts(parent, xs) {
    return g(parent, {}, xs.map((x) => `<path d="M${x} ${GROUND} l -9 -18 M${x + 6} ${GROUND} l 1 -24 M${x + 12} ${GROUND} l 10 -16" style="${st("none", 4)}"/>`).join(""));
  }
  function butterfly(parent, s = 2) {
    const el = g(parent);
    const sc = g(el, { transform: `scale(${s})` });
    const wings = g(sc, {},
      `<path d="M0 0 C -20 -26, -34 -8, -16 4 C -28 14, -12 24, 0 6 Z" style="${st(C.butter, 3)}"/>` +
      `<path d="M0 0 C 20 -26, 34 -8, 16 4 C 28 14, 12 24, 0 6 Z" style="${st(C.butter, 3)}"/>`);
    g(sc, {}, `<path d="M0 -8 L 0 12 M0 -8 l -7 -9 M0 -8 l 7 -9" style="${st("none", 3)}"/>`);
    return { el, wings };
  }
  function trellis(parent) {
    return g(parent, {}, `<path d="M800 ${GROUND} L 800 520 M 812 ${GROUND} L 812 520" style="${st("none", 6)}"/><path d="M560 520 L 840 520" style="${st("none", 9)}"/>` +
      `<path id="vineLine" d="M840 512 C 780 470, 740 540, 690 505 S 610 470, 565 515" style="${st("none", 5)}"/>`);
  }
  function vineLeaves(parent) {
    return [[770, 492], [705, 500], [630, 486], [585, 506]].map(([x, y], i) =>
      g(parent, { transform: `translate(${x} ${y}) rotate(${i % 2 ? 30 : -30})` }, `<path d="M0 0 C -26 -10, -26 -36, 0 -40 C 26 -36, 26 -10, 0 0 Z M0 -4 L 0 -32" style="${st(C.leaf, 4)}"/>`));
  }
  /* grapes hanging from (x,y) top */
  function grapes(parent, x, y, s = 1, ripe = true) {
    const el = g(parent, { transform: `translate(${x} ${y}) scale(${s})` });
    const inner = g(el);
    let c = `<path d="M0 -24 V 10" style="${st("none", 6)}"/><path d="M0 -6 C 20 -26, 46 -18, 50 -2 C 30 6, 14 2, 0 -6 Z" style="${st(C.leaf, 4)}"/>`;
    [[4, 24], [3, 52], [2, 80], [1, 106]].forEach(([n, yy]) => { for (let i = 0; i < n; i++) c += `<circle class="berry" cx="${(i - (n - 1) / 2) * 30}" cy="${yy}" r="17" style="${st(ripe ? C.grape : C.grapeUnripe, 4)}"/>`; });
    g(inner, {}, c);
    const face = g(inner, {}, `<path d="M-22 48 L -10 55 L -22 62 M22 48 L 10 55 L 22 62" style="${st("none", 4)};stroke:${C.paper}"/><path d="M-16 82 q 5 -7 10 0 t 10 0 t 10 0" style="${st("none", 4)};stroke:${C.paper}"/>`);
    gsap.set(face, { opacity: 0 });
    return { el: inner, face, berries: inner.querySelectorAll(".berry") };
  }
  function thought(parent, x, y, w = 260, h = 170) {
    return g(parent, {}, `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" style="${st(C.paper, 5)}"/>`);
  }
  function dots(parent, pts) { return pts.map(([x, y, r]) => g(parent, {}, `<circle cx="${x}" cy="${y}" r="${r}" style="${st(C.paper, 4)}"/>`)); }
  function speech(parent, x, y, w, h, tx, ty) {
    return g(parent, {}, `<path d="M${x - w / 2} ${y - h / 2} H ${x + w / 2} V ${y + h / 2} H ${x + 30} L ${tx} ${ty} L ${x - 10} ${y + h / 2} H ${x - w / 2} Z" style="${st(C.paper, 5)}"/>`);
  }
  function puff(parent, x, y, text = "", color = C.ink) {
    return g(parent, {}, `<path d="M${x - 70} ${y} C ${x - 80} ${y - 40}, ${x - 30} ${y - 60}, ${x - 10} ${y - 40} C ${x + 10} ${y - 70}, ${x + 70} ${y - 50}, ${x + 60} ${y - 10} C ${x + 90} ${y + 10}, ${x + 50} ${y + 50}, ${x + 20} ${y + 30} C ${x} ${y + 55}, ${x - 60} ${y + 45}, ${x - 70} ${y} Z" style="${st(C.paper, 5)}"/>` +
      (text ? `<text x="${x}" y="${y + 12}" style="font-family:'Patrick Hand',cursive;font-size:40px;text-anchor:middle;fill:${color}">${text}</text>` : ""));
  }
  function dust(parent, x, y) {
    return g(parent, {}, `<path d="M${x - 60} ${y} q -20 -20 -40 -10 M${x + 60} ${y} q 20 -20 40 -10 M${x - 30} ${y - 6} q -10 -24 -26 -26 M${x + 30} ${y - 6} q 10 -24 26 -26" style="${st("none", 4)}"/>`);
  }
  function lines(parent, d, w = 4) { return g(parent, {}, `<path d="${d}" style="${st("none", w)}"/>`); }

  window.Sketch = { C, GROUND, g, st, hide, pop, fadeIn, fadeOut, drawOn, fox, legCycle, walk, jump, look, tailTo, wag, sun, heat, tree, tufts, butterfly, trellis, vineLeaves, grapes, thought, dots, speech, puff, dust, lines };
})();
