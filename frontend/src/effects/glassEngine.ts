/**
 * Apple Vision Pro — Liquid Glass Physics Engine
 * Spring-based 3D interaction system running at 60fps via rAF
 * No external dependencies, pure WebAPI
 */

// ── Spring Physics Config ──────────────────────────────────
const SPRING = {
    stiffness: 0.10,   // How fast it moves toward target (lower = lazier)
    damping: 0.72,     // How much velocity is preserved (lower = snappier)
    maxTilt: 6,        // Maximum tilt in degrees
    liftZ: 28,         // translateZ on hover (px)
    liftY: -5,         // translateY on hover (px)
};

// ── Per-element State ───────────────────────────────────────
interface SpringState {
    // Current values (what's rendered this frame)
    rotX: number; rotY: number; liftY: number; liftZ: number;
    // Velocity
    vRotX: number; vRotY: number; vLiftY: number; vLiftZ: number;
    // Targets
    targetRotX: number; targetRotY: number;
    // Light position
    lightX: number; lightY: number; // smoothed
    targetLightX: number; targetLightY: number;
    hovered: boolean;
}

const states = new WeakMap<HTMLElement, SpringState>();

function getState(el: HTMLElement): SpringState {
    if (!states.has(el)) {
        states.set(el, {
            rotX: 0, rotY: 0, liftY: 0, liftZ: 0,
            vRotX: 0, vRotY: 0, vLiftY: 0, vLiftZ: 0,
            targetRotX: 0, targetRotY: 0,
            lightX: 50, lightY: 50,
            targetLightX: 50, targetLightY: 50,
            hovered: false,
        });
    }
    return states.get(el)!;
}

// ── Tracked Elements ────────────────────────────────────────
const trackedEls = new Set<HTMLElement>();
const ENGINE_MARK = '__glassEngineInitialized';

function trackElement(el: HTMLElement) {
    if (!trackedEls.has(el)) {
        trackedEls.add(el);
        // Remove CSS transitions for transform — JS handles it now
        el.style.transition = 'box-shadow 0.8s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s, border-color 0.5s';
    }
}

// ── Animation Loop ───────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function springStep(state: SpringState) {
    const k = SPRING.stiffness;
    const d = SPRING.damping;

    // RotX spring
    const forceRotX = (state.targetRotX - state.rotX) * k;
    state.vRotX = state.vRotX * d + forceRotX;
    state.rotX += state.vRotX;

    // RotY spring
    const forceRotY = (state.targetRotY - state.rotY) * k;
    state.vRotY = state.vRotY * d + forceRotY;
    state.rotY += state.vRotY;

    // LiftY spring
    const targetLY = state.hovered ? SPRING.liftY : 0;
    const forceLY = (targetLY - state.liftY) * (k * 0.8);
    state.vLiftY = state.vLiftY * d + forceLY;
    state.liftY += state.vLiftY;

    // LiftZ spring
    const targetLZ = state.hovered ? SPRING.liftZ : 0;
    const forceLZ = (targetLZ - state.liftZ) * (k * 0.8);
    state.vLiftZ = state.vLiftZ * d + forceLZ;
    state.liftZ += state.vLiftZ;

    // Light position lerp (faster, more responsive)
    state.lightX = lerp(state.lightX, state.targetLightX, 0.18);
    state.lightY = lerp(state.lightY, state.targetLightY, 0.18);
}

function isAtRest(state: SpringState): boolean {
    const threshold = 0.001;
    return (
        Math.abs(state.vRotX) < threshold &&
        Math.abs(state.vRotY) < threshold &&
        Math.abs(state.vLiftY) < threshold &&
        Math.abs(state.vLiftZ) < threshold &&
        Math.abs(state.rotX) < threshold &&
        Math.abs(state.rotY) < threshold &&
        Math.abs(state.liftY) < threshold &&
        Math.abs(state.liftZ) < threshold
    );
}

let rafId: number | null = null;
let lastMouseX = -1;
let lastMouseY = -1;

function tick() {
    if (document.visibilityState !== 'visible') {
        rafId = null;
        return;
    }

    let allRest = true;

    for (const el of trackedEls) {
        if (!el.isConnected) {
            trackedEls.delete(el);
            continue;
        }

        const s = getState(el);
        springStep(s);

        const atRest = isAtRest(s) && !s.hovered;
        if (!atRest) allRest = false;

        // Apply transform
        el.style.transform =
            `perspective(1400px) rotateX(${s.rotX}deg) rotateY(${s.rotY}deg) translateY(${s.liftY}px) translateZ(${s.liftZ}px)`;

        // Apply cursor local light
        el.style.setProperty('--local-mouse-x', `${s.lightX}%`);
        el.style.setProperty('--local-mouse-y', `${s.lightY}%`);

        // Shadow/glow based on hover + depth
        if (s.hovered) {
            const glowIntensity = Math.min(s.liftZ / SPRING.liftZ, 1);
            el.style.boxShadow = `
        0 ${20 + s.liftZ}px ${50 + s.liftZ * 2}px rgba(0,0,0,${0.1 + glowIntensity * 0.06}),
        0 0 ${40 + glowIntensity * 30}px rgba(99, 102, 241, ${0.15 + glowIntensity * 0.12}),
        inset 0 0 0 1.5px rgba(255, 255, 255, ${0.3 + glowIntensity * 0.3})
      `;
        } else if (atRest) {
            el.style.boxShadow = '';
        }
    }

    if (!allRest) {
        rafId = requestAnimationFrame(tick);
    } else {
        rafId = null;
    }
}

function ensureRunning() {
    if (document.visibilityState !== 'visible') return;
    if (!rafId) {
        rafId = requestAnimationFrame(tick);
    }
}

// ── Event Handlers ───────────────────────────────────────────
let pendingMove: MouseEvent | null = null;
let moveRafId: number | null = null;

function processMouseMove(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('.glass-card') as HTMLElement | null;

    if (Math.abs(e.clientX - lastMouseX) > 1 || Math.abs(e.clientY - lastMouseY) > 1) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    }

    if (!el) {
        return;
    }

    trackElement(el);

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const normX = (x - cx) / cx; // -1 to 1
    const normY = (y - cy) / cy; // -1 to 1

    const s = getState(el);
    s.targetRotX = normY * -SPRING.maxTilt;
    s.targetRotY = normX * SPRING.maxTilt;
    s.hovered = true;

    // Light in %
    s.targetLightX = (x / rect.width) * 100;
    s.targetLightY = (y / rect.height) * 100;

    ensureRunning();
}

function handleMouseMove(e: MouseEvent) {
    if (document.visibilityState !== 'visible') return;

    pendingMove = e;
    if (moveRafId) return;

    moveRafId = requestAnimationFrame(() => {
        moveRafId = null;
        if (pendingMove) processMouseMove(pendingMove);
        pendingMove = null;
    });
}

function handleMouseLeave(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('.glass-card') as HTMLElement | null;
    if (!el) return;

    const s = getState(el);
    s.targetRotX = 0;
    s.targetRotY = 0;
    s.hovered = false;
    s.targetLightX = 50;
    s.targetLightY = 50;

    ensureRunning();
}

function handleMouseDown(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('.glass-card') as HTMLElement | null;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Temporary press — dampen the tilt & lift immediately
    const s = getState(el);
    s.vRotX *= 0.2;
    s.vRotY *= 0.2;
    s.vLiftZ *= 0.3;

    // Spawn ripple element
    const ripple = document.createElement('div');
    ripple.className = 'liquid-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // Override: ensure parent has position relative/overflow hidden
    const cur = el.style.overflow;
    el.style.overflow = 'hidden';
    el.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
        el.style.overflow = cur;
    }, 900);
}

function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (moveRafId) {
            cancelAnimationFrame(moveRafId);
            moveRafId = null;
        }
        pendingMove = null;
        return;
    }

    ensureRunning();
}

// ── Init ─────────────────────────────────────────────────────
export function initGlassEngine() {
    const w = window as unknown as Record<string, unknown>;
    if (w[ENGINE_MARK]) {
        return;
    }
    w[ENGINE_MARK] = true;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (reducedMotion || coarsePointer) {
        return;
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, true);
    document.addEventListener('mousedown', handleMouseDown, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
}
