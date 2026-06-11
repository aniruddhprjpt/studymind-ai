"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import "./MagicBento.css";

// ── Types ──────────────────────────────────────────────────────────────────────

export type StudyAction =
  | "notes"
  | "mindmap"
  | "formulas"
  | "flashcards"
  | "studyplan"
  | "dashboard";

interface CardItem {
  color: string;
  title: string;
  description: string;
  label: string;
  action: StudyAction;
}

interface MagicBentoProps {
  onSelect: (action: StudyAction) => void;
  activeTab?: string;
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

interface ParticleCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disableAnimations?: boolean;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  onClick?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_PARTICLE_COUNT = 8;
const DEFAULT_SPOTLIGHT_RADIUS = 220;
const DEFAULT_GLOW_COLOR = "196, 113, 237";
const MOBILE_BREAKPOINT = 768;

const CARD_DATA: CardItem[] = [
  { color: "#080810", title: "Smart Notes",  description: "AI summaries & explanations",  label: "📋 Notes",     action: "notes"      },
  { color: "#080810", title: "Mind Map",     description: "Visual concept mapping",        label: "🧠 Visual",    action: "mindmap"    },
  { color: "#080810", title: "Flashcards",   description: "Active recall practice",        label: "🃏 Learn",     action: "flashcards" },
  { color: "#080810", title: "Formulas",     description: "Extract & explain formulas",    label: "🔬 Science",   action: "formulas"   },
  { color: "#080810", title: "Study Plan",   description: "Personalized schedule",         label: "🗓️ Plan",    action: "studyplan"  },
  { color: "#080810", title: "Progress",     description: "Track your weak areas",         label: "📊 Analytics", action: "dashboard"  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function createParticle(x: number, y: number, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "smb-particle";
  el.style.cssText = `
    position:absolute;width:3px;height:3px;border-radius:50%;
    background:rgba(${color},1);box-shadow:0 0 5px rgba(${color},0.7);
    pointer-events:none;z-index:100;left:${x}px;top:${y}px;
  `;
  return el;
}

function spotlightValues(radius: number) {
  return { proximity: radius * 0.5, fadeDistance: radius * 0.75 };
}

function setCardGlow(
  card: HTMLElement,
  mx: number,
  my: number,
  intensity: number,
  radius: number,
) {
  const r = card.getBoundingClientRect();
  card.style.setProperty("--smb-glow-x", `${((mx - r.left) / r.width) * 100}%`);
  card.style.setProperty("--smb-glow-y", `${((my - r.top) / r.height) * 100}%`);
  card.style.setProperty("--smb-glow-i", intensity.toString());
  card.style.setProperty("--smb-glow-r", `${radius}px`);
}

// ── ParticleCard ───────────────────────────────────────────────────────────────

function ParticleCard({
  children,
  className = "",
  style,
  disableAnimations = false,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
  onClick,
}: ParticleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const particles = useRef<HTMLDivElement[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hovered = useRef(false);
  const memoParticles = useRef<HTMLDivElement[]>([]);
  const initialized = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const magnetAnim = useRef<any>(null);

  const init = useCallback(() => {
    if (initialized.current || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    memoParticles.current = Array.from({ length: particleCount }, () =>
      createParticle(Math.random() * width, Math.random() * height, glowColor),
    );
    initialized.current = true;
  }, [particleCount, glowColor]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    magnetAnim.current?.kill();
    particles.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => p.parentNode?.removeChild(p),
      });
    });
    particles.current = [];
  }, []);

  const spawn = useCallback(() => {
    if (!ref.current || !hovered.current) return;
    if (!initialized.current) init();
    memoParticles.current.forEach((p, i) => {
      const id = setTimeout(() => {
        if (!hovered.current || !ref.current) return;
        const clone = p.cloneNode(true) as HTMLDivElement;
        ref.current.appendChild(clone);
        particles.current.push(clone);
        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(clone, { x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 70, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: "none", repeat: -1, yoyo: true });
        gsap.to(clone, { opacity: 0.25, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
      }, i * 80);
      timers.current.push(id);
    });
  }, [init]);

  useEffect(() => {
    if (disableAnimations || !ref.current) return;
    const el = ref.current;

    const onEnter = () => {
      hovered.current = true;
      spawn();
      if (enableTilt)
        gsap.to(el, { rotateX: 4, rotateY: 4, duration: 0.3, ease: "power2.out", transformPerspective: 1000 });
    };

    const onLeave = () => {
      hovered.current = false;
      clear();
      if (enableTilt)
        gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.3, ease: "power2.out" });
      if (enableMagnetism)
        gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    };

    const onMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = r.width / 2;
      const cy = r.height / 2;
      if (enableTilt)
        gsap.to(el, { rotateX: ((y - cy) / cy) * -8, rotateY: ((x - cx) / cx) * 8, duration: 0.1, ease: "power2.out", transformPerspective: 1000 });
      if (enableMagnetism)
        magnetAnim.current = gsap.to(el, { x: (x - cx) * 0.04, y: (y - cy) * 0.04, duration: 0.3, ease: "power2.out" });
    };

    const onClickEl = (e: MouseEvent) => {
      if (!clickEffect) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const d = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - r.width, y),
        Math.hypot(x, y - r.height),
        Math.hypot(x - r.width, y - r.height),
      );
      const ripple = document.createElement("div");
      ripple.style.cssText = `position:absolute;width:${d * 2}px;height:${d * 2}px;border-radius:50%;background:radial-gradient(circle,rgba(${glowColor},0.35) 0%,rgba(${glowColor},0.15) 30%,transparent 70%);left:${x - d}px;top:${y - d}px;pointer-events:none;z-index:1000;`;
      el.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: () => ripple.remove() });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClickEl);
    return () => {
      hovered.current = false;
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("click", onClickEl);
      clear();
    };
  }, [spawn, clear, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={ref}
      className={`${className} smb-particle-container`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── GlobalSpotlight ────────────────────────────────────────────────────────────

interface SpotlightProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}

function GlobalSpotlight({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}: SpotlightProps) {
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const el = document.createElement("div");
    el.className = "smb-global-spotlight";
    el.style.cssText = `
      position:fixed;width:500px;height:500px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,rgba(${glowColor},0.12) 0%,rgba(${glowColor},0.06) 20%,rgba(${glowColor},0.02) 40%,transparent 70%);
      z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;
    `;
    document.body.appendChild(el);
    spotRef.current = el;

    const onMove = (e: MouseEvent) => {
      if (!spotRef.current || !gridRef.current) return;
      const section = gridRef.current.closest(".smb-section");
      const rect = section?.getBoundingClientRect();
      const inside =
        rect &&
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;

      const cards = gridRef.current.querySelectorAll<HTMLElement>(".smb-card");

      if (!inside) {
        gsap.to(spotRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
        cards.forEach((c) => c.style.setProperty("--smb-glow-i", "0"));
        return;
      }

      const { proximity, fadeDistance } = spotlightValues(spotlightRadius);
      let minDist = Infinity;

      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const dist = Math.max(
          0,
          Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) -
            Math.max(r.width, r.height) / 2,
        );
        minDist = Math.min(minDist, dist);
        const intensity =
          dist <= proximity ? 1 : dist <= fadeDistance ? (fadeDistance - dist) / (fadeDistance - proximity) : 0;
        setCardGlow(card, e.clientX, e.clientY, intensity, spotlightRadius);
      });

      gsap.to(spotRef.current, { left: e.clientX, top: e.clientY, duration: 0.1, ease: "power2.out" });
      const targetOpacity =
        minDist <= proximity ? 0.7 : minDist <= fadeDistance ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.7 : 0;
      gsap.to(spotRef.current, { opacity: targetOpacity, duration: targetOpacity > 0 ? 0.2 : 0.4, ease: "power2.out" });
    };

    const onLeave = () => {
      gridRef.current?.querySelectorAll<HTMLElement>(".smb-card").forEach((c) =>
        c.style.setProperty("--smb-glow-i", "0"),
      );
      if (spotRef.current) gsap.to(spotRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      spotRef.current?.parentNode?.removeChild(spotRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
}

// ── MagicBento (export) ────────────────────────────────────────────────────────

export default function MagicBento({
  onSelect,
  activeTab,
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const shouldDisable = disableAnimations || isMobile;

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisable}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <div className="smb-grid smb-section" ref={gridRef}>
        {CARD_DATA.map((card, i) => {
          const isActive = activeTab === card.action;
          const baseClass = [
            "smb-card",
            textAutoHide   ? "smb-card--autohide" : "",
            enableBorderGlow ? "smb-card--glow"   : "",
            isActive         ? "smb-card--active"  : "",
          ].join(" ");

          const cardStyle: React.CSSProperties = {
            backgroundColor: card.color,
            // @ts-expect-error CSS custom property
            "--smb-glow-color": glowColor,
          };

          const content = (
            <>
              <div className="smb-card__header">
                <span className="smb-card__label">{card.label}</span>
              </div>
              <div className="smb-card__content">
                <h3 className="smb-card__title">{card.title}</h3>
                <p className="smb-card__desc">{card.description}</p>
              </div>
            </>
          );

          return enableStars ? (
            <ParticleCard
              key={i}
              className={baseClass}
              style={cardStyle}
              disableAnimations={shouldDisable}
              particleCount={particleCount}
              glowColor={glowColor}
              enableTilt={enableTilt}
              clickEffect={clickEffect}
              enableMagnetism={enableMagnetism}
              onClick={() => onSelect(card.action)}
            >
              {content}
            </ParticleCard>
          ) : (
            <div key={i} className={baseClass} style={cardStyle} onClick={() => onSelect(card.action)}>
              {content}
            </div>
          );
        })}
      </div>
    </>
  );
}
