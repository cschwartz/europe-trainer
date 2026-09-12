/**
 * The interactive map of Europe.
 *
 * - one SVG <path> per country, drawn with the shared d3 projection
 * - pinch / wheel / drag to zoom and pan (d3-zoom), plus a reset control
 * - taps are distinguished from pans by movement threshold, so selecting a
 *   country works reliably on a touch screen
 * - tiny countries get a constant-size circular tap target in a non-scaling
 *   overlay, so even Monaco or Liechtenstein can be hit at any zoom
 *
 * The component is presentational: the parent owns "what is selected" and
 * "what is revealed" and passes them in.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import 'd3-transition'; // adds selection.prototype.transition, used by zoom animations
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { BY_ID, MICROSTATES } from '../data/countries.js';
import { COUNTRY_FEATURES, MARKER_IDS, makeProjection } from './geo';

export type MapMode = 'select' | 'prompt' | 'explore';

export interface MapViewProps {
  mode: MapMode;
  /** Country to spotlight: the question in 'prompt' mode. */
  spotlightId?: string | null;
  /** The learner's current pick in 'select' mode. */
  selectedId?: string | null;
  /** Correct answer to flash green after answering. */
  revealId?: string | null;
  /** Wrong pick to flash red after answering. */
  wrongId?: string | null;
  /** Ignore taps (after the question is answered). */
  locked?: boolean;
  showLabels?: boolean;
  onPick?: (countryId: string) => void;
  /**
   * Changing this snaps the view back to the full map (then re-frames on the
   * focus country if there is one). Pass the question index so every new
   * question starts clean and leftover zoom can't reveal the answer.
   */
  viewKey?: string | number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 16;
const TAP_MOVE_PX = 10;

// Remembered across remounts so a fresh MapView (keyed per question) can paint
// at the right size on its first frame.
let lastSize = { w: 0, h: 0 };

export function MapView(props: MapViewProps) {
  const { mode, spotlightId, selectedId, revealId, wrongId, locked, showLabels, onPick, viewKey } =
    props;
  const clipId = `mapclip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Seed from the last measured size so a remount (new question) paints the map
  // immediately instead of flashing an empty frame before ResizeObserver fires.
  const [size, setSize] = useState(lastSize);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const down = useRef<{ x: number; y: number; id: string | null } | null>(null);

  // Track the container size; rebuild the projection when it changes.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      lastSize = { w: Math.round(width), h: Math.round(height) };
      setSize(lastSize);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { paths, projection, boundsOf } = useMemo(() => {
    if (!size.w || !size.h)
      return { paths: [] as { id: string; d: string }[], projection: null, boundsOf: null };
    const proj = makeProjection(size.w, size.h);
    const path = geoPath(proj);
    const ps = COUNTRY_FEATURES.filter((f) => f.geometry && f.geometry.type !== 'Point').map((f) => ({
      id: f.id,
      d: path(f) ?? '',
    }));
    const boundsOf = (id: string) => {
      const f = COUNTRY_FEATURES.find((x) => x.id === id);
      return f && f.geometry ? path.bounds(f) : null;
    };
    return { paths: ps, projection: proj, boundsOf };
  }, [size.w, size.h]);

  // Wire up d3-zoom once the svg exists.
  useEffect(() => {
    if (!svgRef.current) return;
    const sel = select(svgRef.current);
    const zoom = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .on('zoom', (e) => setT(e.transform));
    zoomRef.current = zoom;
    sel.call(zoom);
    sel.on('dblclick.zoom', null); // double-tap-zoom fights tap selection on tablets
    return () => {
      sel.on('.zoom', null);
    };
  }, []);

  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, zoomIdentity);
  };
  const nudgeZoom = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, factor);
  };

  // One place owns the programmatic view: on a new question (or the answer
  // reveal) snap to the full map, then — only in a "name this" prompt — animate
  // in to frame the country so even a micro-state is clearly visible. Doing
  // reset and re-frame together means leftover zoom from the previous question
  // can never linger and hint at the answer.
  const focusId = mode === 'prompt' ? (spotlightId ?? revealId ?? null) : null;
  useEffect(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || !size.w) return;
    const sel = select(svg);
    sel.interrupt();
    zoom.transform(sel, zoomIdentity);

    const b = focusId && boundsOf ? boundsOf(focusId) : null;
    if (!b) return;
    const [[x0, y0], [x1, y1]] = b;
    const bw = Math.max(x1 - x0, 1);
    const bh = Math.max(y1 - y0, 1);
    const k = Math.min(7, Math.max(1, (0.38 * Math.min(size.w, size.h)) / Math.max(bw, bh)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const target = zoomIdentity.translate(size.w / 2 - k * cx, size.h / 2 - k * cy).scale(k);
    const id = requestAnimationFrame(() =>
      sel.transition().duration(450).call(zoom.transform, target)
    );
    return () => {
      cancelAnimationFrame(id);
      sel.interrupt();
    };
  }, [viewKey, focusId, boundsOf, size.w, size.h]);

  // Tap vs pan: remember where the pointer went down and on which country.
  const onPointerDown = (e: PointerEvent) => {
    const id = countryIdFromEvent(e);
    down.current = { x: e.clientX, y: e.clientY, id };
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || locked || mode === 'prompt') return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved > TAP_MOVE_PX) return;
    const id = countryIdFromEvent(e) ?? d.id;
    if (id) onPick?.(id);
  };

  const overlay = useMemo(() => {
    if (!projection) return [];
    return COUNTRY_FEATURES.map((f) => {
      const p = projection(f.properties.centroid);
      return p ? { id: f.id, x: p[0], y: p[1], marker: MARKER_IDS.has(f.id) } : null;
    }).filter((x): x is { id: string; x: number; y: number; marker: boolean } => !!x);
  }, [projection]);

  const classFor = (id: string): string => {
    const c = ['country'];
    if (id === spotlightId) c.push('is-spotlight');
    if (id === selectedId) c.push('is-selected');
    if (id === revealId) c.push('is-correct');
    if (id === wrongId) c.push('is-wrong');
    return c.join(' ');
  };

  return (
    <div class="map" ref={wrapRef}>
      <svg
        ref={svgRef}
        class="map-svg"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="group"
        aria-label="Karte von Europa"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={size.w} height={size.h} />
          </clipPath>
        </defs>
        <g clip-path={`url(#${clipId})`}>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          <g class="countries">
            {paths.map((p) => (
              <path key={p.id} d={p.d} class={classFor(p.id)} data-country={p.id} />
            ))}
          </g>
          {showLabels && projection && (
            <g class="labels" aria-hidden="true">
              {overlay
                .filter((o) => !o.marker)
                .map((o) => (
                  <text key={o.id} x={o.x} y={o.y} style={{ fontSize: `${11 / t.k}px` }}>
                    {BY_ID[o.id].name}
                  </text>
                ))}
            </g>
          )}
        </g>
        </g>

        {/* Non-scaling overlay: constant-size tap targets + markers for micro-states */}
        <g class="overlay">
          {overlay.map((o) => {
            const sx = o.x * t.k + t.x;
            const sy = o.y * t.k + t.y;
            const isMicro = o.marker || MARKER_IDS.has(o.id) || MICROSTATES.has(o.id);
            if (!isMicro && !(o.id === spotlightId || o.id === revealId)) return null;
            return (
              <g key={o.id} transform={`translate(${sx},${sy})`}>
                {isMicro && (
                  <>
                    <circle r={18} class="micro-hit" data-country={o.id} opacity={0} />
                    <circle
                      r={o.id === spotlightId || o.id === selectedId || o.id === revealId ? 7 : 5}
                      class={`micro-dot ${classFor(o.id)}`}
                    />
                  </>
                )}
                {/* A pulsing ring only for tiny countries — big ones read fine from the fill alone. */}
                {isMicro && (o.id === spotlightId || o.id === revealId) && (
                  <circle r={20} class={o.id === revealId ? 'ping ping-correct' : 'ping'} />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div class="map-controls">
        <button type="button" aria-label="Hineinzoomen" onClick={() => nudgeZoom(1.6)}>
          ＋
        </button>
        <button type="button" aria-label="Herauszoomen" onClick={() => nudgeZoom(1 / 1.6)}>
          －
        </button>
        <button type="button" aria-label="Ansicht zurücksetzen" onClick={reset}>
          ⟲
        </button>
      </div>
    </div>
  );
}

function countryIdFromEvent(e: Event): string | null {
  const el = (e.target as Element | null)?.closest?.('[data-country]');
  return el?.getAttribute('data-country') ?? null;
}
