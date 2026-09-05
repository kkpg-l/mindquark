import { useEffect, useRef, useState } from 'react'
import { BotEngine, type BotFrame, type Look } from '@/bot/engine'
import { NOTIF_BLUE, type DotRender, type ArcRender } from '@/bot/decor'
import { EXPRESSION_BY_ID, DEFAULT_EXPRESSION } from '@/bot/expressions'
import { COLOR_BY_ID, DEFAULT_COLOR, DEFAULT_SHAPE, SHAPE_BY_ID, mixHex } from '@/bot/skins'
import { STATE_BY_ID, type StateId } from '@/bot/states'
import { clamp, easings } from '@/bot/math'
import { DEMI_VIEWBOX, RAYON } from '@/bot/repere'

/* ─── Gaze constants (ported from gaze.ts) ─────────────────────────── */

const YAW_MAX = 16
const PITCH_MAX = 13
const PITCH = 10
const TURN = 26
const SPIN = 360
const TURN_TIME = 1.1

interface Aim {
  nx: number
  ny: number
  tour: number
  pointer: boolean
}

function lookTarget({ nx, ny, tour, pointer }: Aim): Look {
  return {
    yaw: -TURN + nx * YAW_MAX,
    pitch: PITCH - ny * PITCH_MAX,
    mix: tour,
    spin: SPIN * (1 - tour),
    wander: pointer ? 0 : 1,
  }
}

/* ─── Props ────────────────────────────────────────────────────────── */

export interface BloubBotProps {
  /** SVG size in pixels (square) */
  size?: number
  /** Shape ID: cercle, galet, squircle, capsule, triangle, hexagone, nuage, goutte */
  shape?: string
  /** Color ID: encre, creme, brun, rouge, orange, ambre, vert, turquoise, bleu, violet, rose, gris */
  color?: string
  /** Expression ID: neutre, attentif, surpris, excite, heureux, hilare, colere, triste, effraye, mefiant, confus, curieux, fier, timide, blase, somnolent */
  expression?: string
  /** Colour for eye holes and particle depth fog */
  paper?: string
  /** Animation state: idle, thinking, wink, wide, alert, notify, exclaim, sleep, egg, hexagon, play, orbit, burst, comet, swirl */
  state?: StateId
  /** Whether eyes follow the mouse cursor */
  follow?: boolean
  /** Extra CSS class on the <svg> */
  className?: string
}

/* ─── Component ────────────────────────────────────────────────────── */

export function BloubBot({
  size = 320,
  shape,
  color,
  expression,
  paper = '#f5f5f5',
  state: stateProp = 'idle',
  follow = false,
  className,
}: BloubBotProps) {
  const R = RAYON
  const VB = DEMI_VIEWBOX

  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current
  const maskId = `bot-mask-${uid}`

  /* ── Engine (created once, mutated in place) ──────────────────── */

  const engineRef = useRef<BotEngine | null>(null)
  if (!engineRef.current) {
    const radii = SHAPE_BY_ID.get(shape ?? DEFAULT_SHAPE)?.radii ?? null
    const expr = EXPRESSION_BY_ID.get(expression ?? DEFAULT_EXPRESSION) ?? null
    engineRef.current = new BotEngine(R, stateProp, radii, expr)
  }
  const engine = engineRef.current

  /* ── Computed ink colour ──────────────────────────────────────── */

  const ink = COLOR_BY_ID.get(color ?? DEFAULT_COLOR)?.hex ?? '#0a0a0c'

  /* ── Frame + tick state ──────────────────────────────────────── */

  const frameRef = useRef<BotFrame>(engine.sample(0))
  const [, setTick] = useState(0)

  /* ── Clock / pointer refs ─────────────────────────────────────── */

  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const clockRef = useRef(0)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const aimingRef = useRef(false)
  const turnSinceRef = useRef(0)

  /* ── Sync prop → engine: state ────────────────────────────────── */

  useEffect(() => {
    engine.setState(stateProp, clockRef.current)
  }, [engine, stateProp])

  /* ── Sync prop → engine: shape ────────────────────────────────── */

  useEffect(() => {
    const radii = SHAPE_BY_ID.get(shape ?? DEFAULT_SHAPE)?.radii ?? null
    engine.setShape(radii, clockRef.current)
  }, [engine, shape])

  /* ── Sync prop → engine: expression ───────────────────────────── */

  useEffect(() => {
    const expr = EXPRESSION_BY_ID.get(expression ?? DEFAULT_EXPRESSION) ?? null
    engine.setExpression(expr, clockRef.current)
  }, [engine, expression])

  /* ── Pointer tracking listeners ───────────────────────────────── */

  useEffect(() => {
    if (!follow) {
      pointerRef.current = null
      return
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    const onLeave = () => {
      pointerRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [follow])

  /* ── Animation loop ───────────────────────────────────────────── */

  useEffect(() => {
    function tick(ms: number) {
      rafRef.current = requestAnimationFrame(tick)

      // Bounded delta: a backgrounded tab resumes without jumping forward
      const dt = lastRef.current ? Math.min((ms - lastRef.current) / 1000, 0.064) : 0
      lastRef.current = ms
      clockRef.current += dt
      const clock = clockRef.current

      // ── Mouse-follow aiming ──────────────────────────────────
      if (follow) {
        const def = STATE_BY_ID.get(engine.state)
        if (!def?.baseFace) {
          if (aimingRef.current) {
            engine.setLook(null, clock, TURN_TIME)
            aimingRef.current = false
          }
        } else {
          const box = svgRef.current?.getBoundingClientRect()
          if (box && box.width > 0 && box.height > 0) {
            if (!aimingRef.current) turnSinceRef.current = clock
            const demiLargeur = Math.max(1, window.innerWidth / 2)
            const demiHauteur = Math.max(1, window.innerHeight / 2)
            const p = pointerRef.current
            engine.setLook(
              lookTarget({
                nx: p ? clamp((p.x - (box.left + box.width / 2)) / demiLargeur, -1, 1) : 0,
                ny: p ? clamp((p.y - (box.top + box.height / 2)) / demiHauteur, -1, 1) : 0,
                tour: easings.easeOutQuint(clamp((clock - turnSinceRef.current) / TURN_TIME)),
                pointer: p !== null,
              }),
              clock,
            )
            aimingRef.current = true
          }
        }
      }

      // ── Sample + force render ────────────────────────────────
      frameRef.current = engine.sample(clock)
      setTick((t) => (t + 1) & 0x7fffffff)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [engine, follow])

  /* ── Render helpers ───────────────────────────────────────────── */

  const frame = frameRef.current

  function dotFill(dot: DotRender): string {
    return dot.color ?? (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth))
  }

  const dotsBehind = frame.dotsBehind ? (
    <g>
      {frame.dots.map((dot, i) =>
        dot.d ? (
          <path
            key={`pb${i}`}
            d={dot.d}
            fill={dotFill(dot)}
            opacity={dot.opacity}
            transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
          />
        ) : (
          <circle key={`pb${i}`} cx={dot.x} cy={dot.y} r={dot.r} fill={dotFill(dot)} opacity={dot.opacity} />
        ),
      )}
    </g>
  ) : null

  const dotsFront = !frame.dotsBehind ? (
    <g>
      {frame.dots.map((dot, i) =>
        dot.d ? (
          <path
            key={`pf${i}`}
            d={dot.d}
            fill={dotFill(dot)}
            opacity={dot.opacity}
            transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
          />
        ) : (
          <circle key={`pf${i}`} cx={dot.x} cy={dot.y} r={dot.r} fill={dotFill(dot)} opacity={dot.opacity} />
        ),
      )}
    </g>
  ) : null

  const arcGradient = (arc: ArcRender) => (
    <linearGradient
      key={arc.id}
      id={`${uid}-${arc.id}`}
      gradientUnits="userSpaceOnUse"
      x1={arc.grad.x1}
      y1={arc.grad.y1}
      x2={arc.grad.x2}
      y2={arc.grad.y2}
    >
      {arc.grad.stops.map((c, i) => (
        <stop key={i} offset={arc.grad.stops.length > 1 ? i / (arc.grad.stops.length - 1) : 0} stopColor={c} />
      ))}
    </linearGradient>
  )

  /* ── SVG ──────────────────────────────────────────────────────── */

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      role="img"
      aria-label="MindQuark companion bot"
      className={className}
    >
      <defs>
        {/* Mask: eyes are holes punched in the body (not white shapes on top) */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-VB} y={-VB} width={VB * 2} height={VB * 2}>
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, i) => (
            <path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="#000" />
          ))}
          {frame.notch && (
            <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />
          )}
        </mask>

        {/* Arc colour gradients */}
        {frame.arcs.map(arcGradient)}
      </defs>

      {/* Back half of orbits — drawn before body so they're occluded */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`b${arc.id}`}
            d={arc.back}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {/* Burst particles passing behind the core */}
      {dotsBehind}

      {/* Body: paper-filled shape under masked ink rect = eyes show paper */}
      <g opacity={frame.bodyAlpha}>
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={ink} />
        </g>
      </g>

      {/* Front particles */}
      {dotsFront}

      {/* Notification badge */}
      {frame.notif && (
        <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />
      )}

      {/* Front half of orbits */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`f${arc.id}`}
            d={arc.front}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  )
}

export default BloubBot
