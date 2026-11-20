"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { gsap, prefersReducedMotion, setupMotion } from "@/lib/motion";
import type { ProjectSummary } from "@/lib/types";
import { fragmentShader, vertexShader } from "./strip/shaders";
import { loadCover, type LoadedCover } from "./strip/textures";

/**
 * Set by the home scene while it reveals the strip: `released` once the
 * cards can be handled, `atRest` once the reveal has fully finished.
 */
export type StripGate = { released: boolean; atRest: boolean };

const OPEN: StripGate = { released: true, atRest: true };
const MAX_STEP = 0.2; // most a single wheel event can move, in cards
const MARBLE_PUSH = 0.35; // how far the marble drifts per card scrolled (screen heights)

function token(name: string, fallback: number) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

type Slot = {
  k: number; // position in the endless strip; project = projects[k mod n]
  project: ProjectSummary;
  li: HTMLLIElement;
  link: HTMLAnchorElement;
  mesh: THREE.Mesh | null;
  uniforms: Record<string, THREE.IUniform>;
  width: number;
  offset: number; // -1 left of the open card, 0 open, +1 right of it
  active: boolean;
  leftSide: boolean | null;
  activeP: number; // reveal 0 → 1
  outP: number; // dissolve 0 → 1
  hover: number;
  visible: number; // image loaded 0 → 1
  completed: boolean;
  cover?: LoadedCover;
  img?: HTMLImageElement; // no-WebGL fallback
};

/**
 * The home work strip, after cynx.io: one WebGL canvas draws every card.
 * Closed cards are narrow windows onto a single flowing marble; the card at
 * the centre opens wide and its image grows in through a noise-edged circle.
 * Wheel, drag, arrow keys or a click move the strip; it loops forever.
 */
export default function WorkStrip({ projects, gate }: { projects: ProjectSummary[]; gate?: RefObject<StripGate> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setupMotion();
    const stage = stageRef.current;
    if (!stage || projects.length === 0) return;
    const list = stage.querySelector("ul")!;
    const reduced = prefersReducedMotion();
    const open = () => gate?.current ?? OPEN;
    const dur = (name: string, fallback: number) => (reduced ? 0 : token(name, fallback));

    // ── WebGL (with a plain-image fallback) ──────────────────
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.className = "pointer-events-none absolute inset-0 h-full w-full";
      renderer.domElement.setAttribute("aria-hidden", "true");
      stage.prepend(renderer.domElement);
    } catch {
      renderer = null;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const blank = new THREE.DataTexture(new Uint8Array([3, 3, 3, 255]), 1, 1);
    blank.needsUpdate = true;
    const covers = new Map<string, Promise<LoadedCover>>();
    const coverFor = (p: ProjectSummary) => {
      const key = p.slug;
      if (!covers.has(key)) covers.set(key, loadCover(p.cover));
      return covers.get(key)!;
    };

    // ── sizes, from the column grid in tokens.css ───────────
    let vw = 0, vh = 0, colSize = 0, activeSize = 0, spacing = 0, height = 0, borderX = 1;
    const measure = () => {
      vw = stage.clientWidth;
      vh = stage.clientHeight;
      const cols = token("--strip-cols", 12);
      const margin = token("--strip-margin", 36);
      const gutter = token("--strip-gutter", 10);
      const col = (n: number) => ((vw - margin * 2 - gutter * (cols - 1)) / cols) * n + gutter * (n - 1);
      colSize = col(1);
      activeSize = col(token("--strip-active-cols", 6));
      spacing = token("--strip-spacing", 24);
      height = (vh * token("--strip-height", 55)) / 100;
      borderX = 1 + ((vw - activeSize) / 2 - spacing) / (colSize + spacing);
      renderer?.setSize(vw, vh, false);
      camera.right = vw;
      camera.bottom = -vh;
      camera.updateProjectionMatrix();
    };
    measure();

    // ── the endless list of slots ───────────────────────────
    const slots = new Map<number, Slot>();
    const pool: HTMLLIElement[] = [];
    const state = { listX: 0 };
    let target = 0;
    let lastListX = 0;
    let listXDelta = 0;
    let scrollAcc = 0;
    let firstPass = true;
    const xTo = gsap.quickTo(state, "listX", { duration: dur("--strip-glide", 1.05), ease: "expo.out" });
    const cursor = { x: -9999, y: -9999, vx: 0, vy: 0 };

    const makeLi = () => {
      const li = document.createElement("li");
      li.dataset.card = "";
      li.className = "absolute left-0 top-0 cursor-pointer select-none";
      const link = document.createElement("a");
      link.className = "block h-full w-full";
      link.draggable = false;
      li.appendChild(link);
      li.addEventListener("pointerenter", () => {
        const s = slots.get(Number(li.dataset.k));
        if (s) gsap.to(s, { hover: 1, duration: reduced ? 0 : 1.25, ease: "expo.out", overwrite: "auto" });
      });
      li.addEventListener("pointerleave", () => {
        const s = slots.get(Number(li.dataset.k));
        if (s) gsap.to(s, { hover: 0, duration: reduced ? 0 : 1.15, ease: "power4.out", overwrite: "auto" });
      });
      list.appendChild(li);
      return li;
    };

    const createSlot = (k: number): Slot => {
      const n = projects.length;
      const project = projects[((k % n) + n) % n];
      const li = pool.pop() ?? makeLi();
      li.dataset.k = String(k);
      li.style.visibility = "";
      const link = li.firstElementChild as HTMLAnchorElement;
      link.href = `/work/${project.slug}`;
      link.setAttribute("aria-label", `${project.title}${project.format ? `, ${project.format}` : ""}`);
      link.tabIndex = -1;
      const r = k + state.listX;
      const uniforms: Record<string, THREE.IUniform> = {
        uTex: { value: blank },
        uSize: { value: new THREE.Vector2(colSize, height) },
        uMaxSize: { value: new THREE.Vector2(activeSize, height) },
        uImage: { value: new THREE.Vector2(1, 1) },
        uRes: { value: new THREE.Vector2(vw, vh) },
        uOrigin: { value: new THREE.Vector2() },
        uClip: { value: new THREE.Vector4() },
        uActive: { value: 0 },
        uOut: { value: 0 },
        uHover: { value: 0 },
        uVisible: { value: 0 },
        uParallax: { value: 0 },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uCursor: { value: new THREE.Vector2() },
        uCursorVel: { value: new THREE.Vector2() },
      };
      let mesh: THREE.Mesh | null = null;
      if (renderer) {
        mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false }));
        scene.add(mesh);
      } else {
        li.style.background = "var(--color-ink)";
      }
      const s: Slot = {
        k, project, li, link, mesh, uniforms,
        width: colSize, offset: r < 0 ? -1 : 1, active: false, leftSide: r < 0,
        activeP: 0, outP: 0, hover: 0, visible: 0, completed: true,
      };
      slots.set(k, s);
      return s;
    };

    const destroySlot = (s: Slot) => {
      gsap.killTweensOf(s);
      s.cover?.video?.pause();
      if (s.mesh) {
        scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
      }
      s.img?.remove();
      s.li.style.visibility = "hidden";
      s.li.style.background = "";
      delete s.li.dataset.clip;
      pool.push(s.li);
      slots.delete(s.k);
    };

    const loadInto = (s: Slot) => {
      if (s.cover) return;
      if (!renderer) {
        // Fallback: a plain image on the open card.
        if (!s.img && s.project.cover?.imageUrl) {
          const img = document.createElement("img");
          img.src = s.project.cover.imageUrl;
          img.alt = "";
          img.className = "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700";
          s.li.appendChild(img);
          s.img = img;
        }
        return;
      }
      coverFor(s.project).then((cover) => {
        if (!slots.has(s.k)) return;
        s.cover = cover;
        s.uniforms.uTex.value = cover.texture;
        (s.uniforms.uImage.value as THREE.Vector2).set(cover.width, cover.height);
        if (s.active) cover.video?.play().catch(() => {});
        gsap.to(s, { visible: 1, duration: reduced ? 0 : 1.15, ease: "power4.out" });
      }, () => {});
    };

    // ── opening and closing ─────────────────────────────────
    const toActive = (s: Slot, instant: boolean) => {
      if (s.active) return;
      s.active = true;
      loadInto(s);
      s.cover?.video?.play().catch(() => {});
      gsap.killTweensOf(s, "width,offset,activeP,outP");
      if (instant) {
        Object.assign(s, { width: activeSize, offset: 0, activeP: 1, outP: 0, completed: false });
        return;
      }
      const openDur = dur("--strip-open", 1.25);
      gsap.to(s, { width: activeSize, offset: 0, duration: openDur, ease: "expo.out" });
      if (s.completed) Object.assign(s, { activeP: 0, outP: 0 });
      gsap.to(s, { activeP: 1, outP: 0, duration: dur("--strip-reveal", 1.45), ease: "power3.out", delay: dur("--strip-reveal-delay", 0.45) });
      s.completed = false;
    };

    const toInactive = (s: Slot) => {
      const leftSide = s.k + state.listX < 0;
      if (!s.active && s.leftSide === leftSide) return;
      const wasActive = s.active;
      s.active = false;
      s.leftSide = leftSide;
      gsap.killTweensOf(s, "width,offset,activeP,outP");
      const openDur = dur("--strip-open", 1.25);
      gsap.to(s, { width: colSize, offset: leftSide ? -1 : 1, duration: openDur, ease: "expo.out" });
      if (wasActive) {
        gsap.to(s, {
          activeP: s.activeP > 0.5 ? 1 : 0,
          outP: 1,
          duration: dur("--strip-dissolve", 1.05),
          ease: "none",
          onComplete: () => {
            s.completed = true;
            s.cover?.video?.pause();
          },
        });
      }
    };

    const setActive = (k: number, instant: boolean) => {
      for (const s of slots.values()) {
        if (s.k === k) toActive(s, instant);
        else toInactive(s);
      }
    };

    // ── every frame ─────────────────────────────────────────
    const tick = (time: number) => {
      const delta = lastListX - state.listX;
      listXDelta = Math.abs(delta);
      lastListX = state.listX;
      scrollAcc += delta * MARBLE_PUSH;

      // keep slots covering the screen, drop the ones far off it
      const from = Math.floor(-state.listX - borderX - 1);
      const to = Math.ceil(-state.listX + borderX + 1);
      for (let k = from; k <= to; k++) if (!slots.has(k)) createSlot(k);
      for (const s of slots.values()) if (s.k < from - 1 || s.k > to + 1) destroySlot(s);

      cursor.vx *= 0.9;
      cursor.vy *= 0.9;
      const step = colSize + spacing;
      const extra = (activeSize - colSize) / 2;

      for (const s of slots.values()) {
        const r = s.k + state.listX;
        // the card passing the centre opens, once the strip is moving slowly
        if (r > -0.5 && r <= 0.5 && !s.active && listXDelta < 0.25) setActive(s.k, firstPass);

        const x = vw / 2 + r * step + s.offset * extra - s.width / 2;
        const y = vh / 2 - height / 2;
        s.li.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        s.li.style.width = `${s.width.toFixed(2)}px`;
        s.li.style.height = `${height.toFixed(2)}px`;
        s.link.tabIndex = s.active ? 0 : -1;
        if (s.img) s.img.style.opacity = s.active ? "1" : "0";
        if (!s.mesh) continue;

        // the home scene's reveal passes its clip through data-clip
        const clip = s.li.dataset.clip;
        s.mesh.visible = clip !== "hidden";
        const c = s.uniforms.uClip.value as THREE.Vector4;
        if (clip && clip !== "hidden") {
          const [t, rt, b, l] = clip.split(" ").map(Number);
          c.set(t, rt, b, l);
        } else c.set(0, 0, 0, 0);

        s.mesh.position.set(x + s.width / 2, -(y + height / 2), 0);
        s.mesh.scale.set(s.width, height, 1);
        const u = s.uniforms;
        (u.uSize.value as THREE.Vector2).set(s.width, height);
        (u.uMaxSize.value as THREE.Vector2).set(activeSize, height);
        (u.uRes.value as THREE.Vector2).set(vw, vh);
        (u.uOrigin.value as THREE.Vector2).set(x, y);
        u.uActive.value = s.activeP;
        u.uOut.value = s.outP;
        u.uHover.value = s.hover;
        u.uVisible.value = s.visible;
        u.uParallax.value = (2 * (x + s.width / 2 - vw / 2)) / vw / borderX;
        u.uTime.value = reduced ? 0 : time;
        u.uScroll.value = scrollAcc;
        (u.uCursor.value as THREE.Vector2).set(cursor.x, cursor.y);
        (u.uCursorVel.value as THREE.Vector2).set(cursor.vx, cursor.vy);
      }
      firstPass = false;
      renderer?.render(scene, camera);
    };
    tick(0);
    gsap.ticker.add(tick);

    // ── input ───────────────────────────────────────────────
    const moveBy = (cards: number) => {
      target += cards;
      xTo(target);
    };
    const centre = (s: Slot) => {
      target = Math.round(target) - Math.round(s.k + state.listX);
      xTo(target);
    };

    // Horizontal wheel always moves the strip. Vertical wheel moves it only once
    // the page can't scroll further down; scrolling up is left to the page,
    // which plays the home reveal backwards.
    const onWheel = (e: WheelEvent) => {
      if (!open().released) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      if (!horizontal && (e.deltaY < 0 || !atBottom)) return;
      const amount = horizontal ? -e.deltaX : -e.deltaY;
      target += Math.max(-MAX_STEP, Math.min(MAX_STEP, amount / 200));
      if (listXDelta > 0.25) target = Math.round(target); // fast: land on a whole card
      xTo(target);
    };

    let drag: { x: number; moved: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (!open().released) return;
      drag = { x: e.clientX, moved: 0, id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      if (cursor.x > -9999) {
        cursor.vx += (e.clientX - cursor.x) * 0.25;
        cursor.vy += (e.clientY - cursor.y) * 0.25;
      }
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.moved += Math.abs(dx);
      if (drag.moved > 6 && !stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
      moveBy(dx / (vw < 1000 ? colSize + spacing : 100));
    };
    const onUp = () => {
      if (!drag) return;
      if (drag.moved > 6) target = Math.round(target);
      xTo(target);
      setTimeout(() => (drag = null), 0); // let the click handler see the drag first
    };

    // Clicks: the open card goes to its project; any other card slides to the centre.
    const onClick = (e: MouseEvent) => {
      const li = (e.target as HTMLElement).closest<HTMLLIElement>("[data-card]");
      if (!li || e.metaKey || e.ctrlKey || e.shiftKey) return; // new-tab clicks behave like normal links
      e.preventDefault();
      if ((drag && drag.moved > 6) || !open().released) return;
      const s = slots.get(Number(li.dataset.k));
      if (!s) return;
      if (s.active) router.push(`/work/${s.project.slug}`);
      else centre(s);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!open().released) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        target = Math.round(target) - 1;
        xTo(target);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        target = Math.round(target) + 1;
        xTo(target);
      }
    };

    const onResize = () => {
      measure();
      for (const s of slots.values()) {
        gsap.killTweensOf(s, "width");
        s.width = s.active ? activeSize : colSize;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("click", onClick);
    stage.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      gsap.ticker.remove(tick);
      gsap.killTweensOf(state);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      for (const s of [...slots.values()]) destroySlot(s);
      for (const li of pool) li.remove();
      covers.forEach((p) =>
        p.then((c) => {
          c.video?.pause();
          c.video?.removeAttribute("src");
          c.texture.dispose();
        }, () => {}),
      );
      geometry.dispose();
      blank.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [projects, gate, router]);

  return (
    <div
      ref={stageRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Selected work. Use left and right arrow keys to browse."
      tabIndex={0}
      className="absolute inset-0 touch-pan-y outline-none"
    >
      <ul />
    </div>
  );
}
