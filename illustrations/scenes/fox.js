/* The Fox and the Grapes: one illustration per sentence.
 * Each scene is fn(ctx), ctx = { tl, L, w, S, end }:
 *   tl  GSAP timeline (shared)        L   <g> layer to draw into (scene-local)
 *   w(word, nth=1)  absolute time the word starts (sentence start + aligned word time)
 *   end  absolute time the sentence audio ends;  S  window.Sketch
 * Scenes are self-contained so the app can play any one sentence on its own (t0 = 0). */
window.SCENES = window.SCENES || {};
window.SCENES.fox = [
  // 1 — "One hot summer day, a hungry fox was strolling through an orchard."
  ({ tl, L, w, S, end }) => {
    // set: grass, a rising sun, heat shimmer, an orchard that grows in as the fox strolls through
    S.tufts(L, [40, 250, 420, 690, 900]);
    const sun = S.sun(L, 760, 500);
    const heat = S.heat(L, 640, 905);
    const trees = [S.tree(L, 150, 0.95, true, 1), S.tree(L, 500, 1.15, true, 2), S.tree(L, 850, 0.9, true, 0)];
    const apples = trees.flatMap((t) => t.apples);
    const drop = trees[1].apples[2]; // the one that falls at the end
    const fly = S.butterfly(L);
    const F = S.fox(L, "f1", -230);
    S.hide([sun.el, heat, fly.el, ...apples]);
    trees.forEach((t) => { gsap.set(t.trunk, { scaleY: 0, transformOrigin: "50% 100%" }); gsap.set(t.canopy, { opacity: 0 }); });

    // "hot" — the sun rises and glows; "summer" — heat shimmer + a butterfly
    tl.fromTo(sun.el, { opacity: 0, y: 200 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", immediateRender: false }, w("hot") - 0.3);
    tl.to(sun.rays, { rotation: 40, transformOrigin: "50% 50%", duration: end - w("hot") + 0.5, ease: "none" }, w("hot"));
    tl.to(sun.glow, { scale: 1.15, transformOrigin: "50% 50%", duration: 0.6, yoyo: true, repeat: 7, ease: "sine.inOut" }, w("hot") + 0.4);
    S.fadeIn(tl, heat, w("summer"));
    tl.to(heat, { y: -12, duration: 0.5, yoyo: true, repeat: 7, ease: "sine.inOut" }, w("summer"));
    gsap.set(fly.el, { x: 20, y: 700 });
    S.fadeIn(tl, fly.el, w("summer"), 0.2);
    tl.to(fly.wings, { scaleX: 0.25, transformOrigin: "50% 50%", duration: 0.09, yoyo: true, repeat: 49, ease: "sine.inOut" }, w("summer"));
    tl.to(fly.el, { keyframes: [{ x: 230, y: 600 }, { x: 380, y: 680 }, { x: 560, y: 590 }, { x: 700, y: 650 }, { x: 960, y: 560 }], duration: end - w("summer") + 0.2, ease: "none" }, w("summer"));

    // "hungry fox" — he trots in, tummy rumbling
    S.walk(tl, F, w("hungry") - 0.6, w("orchard") - w("hungry") + 0.6, 330, 0.24);
    S.fadeIn(tl, F.rumble, w("hungry") + 0.15, 0.2);
    tl.to(F.rumble, { x: 3, duration: 0.07, yoyo: true, repeat: 9 }, w("hungry") + 0.25);
    S.fadeOut(tl, F.rumble, w("strolling"));
    S.fadeOut(tl, heat, w("strolling"), 0.5);

    // "strolling through an orchard" — trees sprout behind him, then the apples pop on
    trees.forEach((t, i) => {
      const t0 = w("strolling") + i * 0.28;
      tl.to(t.trunk, { scaleY: 1, transformOrigin: "50% 100%", duration: 0.45, ease: "back.out(1.4)" }, t0);
      tl.fromTo(t.canopy, { opacity: 0, scale: 0.2, transformOrigin: "50% 90%" }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)", immediateRender: false }, t0 + 0.3);
    });
    apples.forEach((a, i) => tl.fromTo(a, { opacity: 0, scale: 0.1, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.6)", immediateRender: false }, w("orchard") - 0.1 + i * 0.035));
    S.look(tl, F, w("orchard") + 0.05, -28, 0.4);
    S.fadeIn(tl, F.tongue, w("orchard") + 0.35, 0.15);
    S.wag(tl, F, w("orchard") + 0.2, 2);

    // and one ripe apple drops
    tl.to(drop, { y: 245, rotation: 160, transformOrigin: "50% 50%", duration: 0.45, ease: "power2.in" }, end - 0.25); // tree-local units (tree scale 1.15)
    tl.to(drop, { y: 228, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" }, end + 0.2);
    S.look(tl, F, end + 0.1, -6, 0.3);
  },

  // 2 — "He came to a bunch of ripe grapes hanging high on a vine."
  ({ tl, L, w, S }) => {
    [S.tree(L, 200, 0.8, false), S.tree(L, 460, 0.7, false)].forEach((t) => gsap.set(t, { opacity: 0.25 }));
    S.trellis(L);
    const leaves = S.vineLeaves(L);
    const G = S.grapes(L, 690, 548, 1.2, false);
    const F = S.fox(L, "f2", 120);
    const arrow = S.lines(L, "M640 760 L 660 690 M650 712 L 660 690 L 672 712", 5);
    S.hide([...leaves, G.el, arrow]);
    S.walk(tl, F, w("came") - 0.2, w("grapes") - w("came") + 0.3, 400, 0.22);
    S.pop(tl, G.el, w("bunch"), 0.45);
    tl.to(G.berries, { fill: S.C.grape, duration: 0.5, stagger: 0.04 }, w("ripe"));
    tl.to(G.el, { rotation: 7, transformOrigin: "50% 0%", duration: 0.45, yoyo: true, repeat: 3, ease: "sine.inOut" }, w("hanging"));
    S.look(tl, F, w("high") - 0.1, -32, 0.4);
    S.fadeIn(tl, arrow, w("high") + 0.1);
    leaves.forEach((lf, i) => S.pop(tl, lf, w("vine") - 0.1 + i * 0.1, 0.35));
  },

  // 3 — "Those grapes are just what I need, he said to himself."
  ({ tl, L, w, S }) => {
    S.trellis(L); S.vineLeaves(L);
    const G = S.grapes(L, 690, 548, 1.2);
    const F = S.fox(L, "f3", 400);
    tl.set(F.head, { rotation: -32, transformOrigin: "20% 90%" }, w("Those") - 1.2);
    const dots = S.dots(L, [[520, 730, 9], [490, 690, 13], [450, 645, 18]]);
    const cloud = S.thought(L, 320, 590, 300, 190);
    const mini = S.grapes(L, 320, 528, 0.7);
    S.hide([...dots, cloud, mini.el]);
    dots.forEach((d, i) => S.pop(tl, d, w("Those") + i * 0.18, 0.3));
    S.pop(tl, cloud, w("grapes") - 0.1, 0.45);
    S.pop(tl, mini.el, w("grapes") + 0.1, 0.45);
    tl.to(mini.el, { scale: 1.12, transformOrigin: "50% 50%", duration: 0.3, yoyo: true, repeat: 3 }, w("need"));
    S.wag(tl, F, w("need") - 0.2, 4);
    S.fadeIn(tl, F.tongue, w("need"), 0.15);
    S.fadeOut(tl, F.tongue, w("he"), 0.2);
    S.look(tl, F, w("said"), -18, 0.4);
  },

  // 4 — "He ran and jumped again and again, but each time he missed the branch."
  ({ tl, L, w, S }) => {
    S.trellis(L); S.vineLeaves(L);
    const G = S.grapes(L, 690, 548, 1.2);
    const F = S.fox(L, "f4", 160);
    const miss = S.puff(L, 300, 640, "miss!", S.C.accent);
    const dust = S.dust(L, 390, 950);
    S.hide([miss, dust]);
    S.walk(tl, F, w("ran") - 0.1, 0.9, 390, 0.11);
    S.look(tl, F, w("jumped") - 0.3, -28, 0.25);
    [w("jumped") + 0.05, w("again") + 0.25, w("again", 2) + 0.1].forEach((t) => S.jump(tl, F, t, 95));
    S.wag(tl, F, w("each"), 2);
    S.jump(tl, F, w("missed") - 0.35, 115, 0.38, 0.34);
    tl.to(G.el, { rotation: -16, transformOrigin: "50% 0%", duration: 0.25, ease: "power2.out" }, w("missed") - 0.1);
    tl.to(G.el, { rotation: 0, transformOrigin: "50% 0%", duration: 0.9, ease: "elastic.out(1, 0.35)" }, w("missed") + 0.2);
    S.pop(tl, miss, w("missed") - 0.05, 0.35);
    S.fadeIn(tl, dust, w("missed") + 0.35, 0.1);
    S.fadeOut(tl, dust, w("missed") + 0.8);
  },

  // 5 — "At last he gave up and walked away with his nose in the air."
  ({ tl, L, w, S }) => {
    S.trellis(L); S.vineLeaves(L);
    S.grapes(L, 690, 548, 1.2);
    const F = S.fox(L, "f5", 470);
    const sigh = S.lines(L, "M640 820 q 30 -10 50 6 M650 846 q 30 -10 50 6", 5);
    const hmph = S.lines(L, "M70 690 l -26 -14 M 80 668 l -20 -24 M 104 660 l -4 -28", 5);
    S.hide([sigh, hmph]);
    tl.set(F.head, { rotation: -20, transformOrigin: "20% 90%" }, w("At") - 0.01);
    S.look(tl, F, w("gave") - 0.1, 22, 0.5);
    S.tailTo(tl, F, w("gave"), -25, 0.5);
    S.fadeIn(tl, sigh, w("up"));
    tl.to(sigh, { x: 20, opacity: 0, duration: 1.0 }, w("up") + 0.4);
    tl.to(F.flip, { scaleX: -1, transformOrigin: "50% 50%", duration: 0.25 }, w("walked") - 0.35);
    S.look(tl, F, w("walked") - 0.3, 0, 0.3);
    S.tailTo(tl, F, w("walked"), 0, 0.3);
    S.walk(tl, F, w("walked"), w("nose") - w("walked") - 0.2, 170, 0.26);
    S.look(tl, F, w("nose") - 0.1, -38, 0.5);
    S.fadeIn(tl, hmph, w("air") - 0.3);
  },

  // 6 — "I am sure those grapes are sour anyway, he said."
  ({ tl, L, w, S }) => {
    S.trellis(L); S.vineLeaves(L);
    S.grapes(L, 690, 548, 1.2);
    const F = S.fox(L, "f6", 560, undefined, 1.5, true);
    tl.set(F.head, { rotation: -34, transformOrigin: "20% 90%" }, w("I") - 0.01);
    const bub = S.speech(L, 290, 600, 320, 220, 390, 760);
    const mini = S.grapes(L, 290, 520, 0.75);
    const sour = S.lines(L, "M170 540 q -20 10 -10 30 M410 540 q 20 10 10 30 M180 640 q -24 0 -28 20 M400 640 q 24 0 28 20", 4);
    S.hide([bub, mini.el, sour]);
    S.pop(tl, bub, w("I") + 0.05, 0.4);
    S.pop(tl, mini.el, w("grapes") - 0.05, 0.4);
    S.fadeIn(tl, mini.face, w("sour") - 0.05, 0.2);
    tl.to(mini.berries, { fill: "#8E9A55", duration: 0.4 }, w("sour"));
    tl.to(mini.el, { scaleX: 0.88, transformOrigin: "50% 50%", duration: 0.12, yoyo: true, repeat: 3 }, w("sour"));
    S.fadeIn(tl, sour, w("sour") + 0.1);
    S.wag(tl, F, w("anyway"), 2);
    S.look(tl, F, w("he") - 0.1, -20, 0.25);
    S.look(tl, F, w("said") + 0.25, -36, 0.3);
  },
];
