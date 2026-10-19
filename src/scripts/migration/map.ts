// The MapLibre half of the migration map: a 3D terrain map styled like an old atlas, with the
// family's route drawn stop by stop.

import { Map as MapLibreMap, Marker, getVersion, setWorkerUrl } from "maplibre-gl";
import type { StyleSpecification, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Aside, Certainty, Stop } from "../../data/journey";

// Served by the maplibre-worker integration in astro.config.mjs. The version busts the cache on upgrades.
setWorkerUrl(`/maplibre-gl-worker.js?v=${getVersion()}`);

export interface MapColors {
  paper: string;
  ink: string;
  water: string;
  river: string;
  border: string;
  route: string;
  halo: string;
}

const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain Tiles</a>';

function style(c: MapColors): StyleSpecification {
  const dem = {
    type: "raster-dem" as const,
    tiles: [TERRARIUM],
    encoding: "terrarium" as const,
    tileSize: 256,
    maxzoom: 14,
    attribution: TERRAIN_ATTRIBUTION,
  };
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      hillshade: dem,
      terrain: dem,
    },
    sky: {
      "sky-color": c.paper,
      "horizon-color": c.paper,
      "fog-color": c.paper,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.8,
      "fog-ground-blend": 0.4,
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": c.paper } },
      {
        id: "hillshade",
        type: "hillshade",
        source: "hillshade",
        paint: {
          "hillshade-shadow-color": c.ink,
          "hillshade-highlight-color": "#fffaf0",
          "hillshade-accent-color": c.ink,
          "hillshade-exaggeration": 0.35,
        },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        // Lakes only at small scales: most of the big lakes in east Texas and the South are
        // reservoirs from after 1960, like Toledo Bend and Sam Rayburn.
        filter: ["any", ["!=", ["get", "class"], "lake"], ["<", ["zoom"], 6]],
        paint: { "fill-color": c.water },
      },
      {
        id: "rivers",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        filter: ["==", ["get", "class"], "river"],
        paint: {
          "line-color": c.river,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 10, 1.8],
        },
      },
      {
        id: "states",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        filter: ["all", ["<=", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
        paint: {
          "line-color": c.border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 9, 1.2],
          "line-dasharray": [4, 3],
        },
      },
      {
        id: "river-names",
        type: "symbol",
        source: "omt",
        "source-layer": "waterway",
        minzoom: 7,
        filter: ["==", ["get", "class"], "river"],
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Italic"],
          "text-size": 12,
          "text-letter-spacing": 0.05,
        },
        paint: { "text-color": c.river, "text-halo-color": c.paper, "text-halo-width": 1.2 },
      },
      {
        id: "state-names",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: ["==", ["get", "class"], "state"],
        maxzoom: 7.5,
        layout: {
          "text-field": ["upcase", ["coalesce", ["get", "name:en"], ["get", "name"]]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-letter-spacing": 0.25,
        },
        paint: { "text-color": c.border, "text-halo-color": c.paper, "text-halo-width": 1 },
      },
    ],
  };
}

type Pt = [number, number];

/** A Catmull-Rom curve through the points, so the route reads as a journey, not a polyline. */
function smooth(points: Pt[], steps = 24): Pt[] {
  if (points.length < 3) {
    const [a, b] = points;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    });
  }
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

interface Leg {
  points: Pt[];
  /** Cumulative length at each point, so a leg can be drawn part-way. */
  lengths: number[];
  certainty: Certainty;
}

function makeLeg(points: Pt[], certainty: Certainty): Leg {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(x1 - x0, (y1 - y0) / Math.cos((y0 * Math.PI) / 180)));
  }
  return { points, lengths, certainty };
}

function partial(leg: Leg, t: number): Pt[] {
  if (t >= 1) return leg.points;
  const target = leg.lengths[leg.lengths.length - 1] * t;
  const out: Pt[] = [leg.points[0]];
  for (let i = 1; i < leg.points.length; i++) {
    if (leg.lengths[i] <= target) {
      out.push(leg.points[i]);
      continue;
    }
    const seg = leg.lengths[i] - leg.lengths[i - 1];
    const k = seg ? (target - leg.lengths[i - 1]) / seg : 0;
    const [x0, y0] = leg.points[i - 1];
    const [x1, y1] = leg.points[i];
    out.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
    break;
  }
  return out;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class JourneyMap {
  readonly map: MapLibreMap;
  private legs: Leg[];
  private progress = 0;
  private target = 0;
  private anim = 0;
  private stopMarkers: HTMLElement[] = [];
  private asideMarkers: { el: HTMLElement; aside: Aside }[] = [];
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  ready: Promise<void>;

  constructor(
    container: HTMLElement,
    private stops: Stop[],
    asides: Aside[],
    colors: MapColors,
    start: { center: Pt; zoom: number },
  ) {
    this.map = new MapLibreMap({
      container,
      style: style(colors),
      center: start.center,
      zoom: start.zoom,
      attributionControl: { compact: true },
      maxPitch: 75,
    });

    this.setExplore(false);

    // Leg i runs into stop i. The first stop has no leg.
    this.legs = stops.map((s, i) =>
      i === 0 ? makeLeg([s.coords, s.coords], s.certainty) : makeLeg(smooth([stops[i - 1].coords, ...(s.via ?? []), s.coords]), s.certainty),
    );

    stops.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "stop-marker";
      el.innerHTML = `<span class="dot"></span><span class="name"></span>`;
      el.querySelector(".name")!.textContent = s.label;
      el.dataset.index = String(i);
      new Marker({ element: el, anchor: "left", offset: [-6, 0] }).setLngLat(s.coords).addTo(this.map);
      this.stopMarkers.push(el);
    });
    for (const aside of asides) {
      const el = document.createElement("div");
      el.className = "aside-marker";
      el.innerHTML = `<span class="dot"></span><span class="name"></span>`;
      el.querySelector(".name")!.textContent = `${aside.label}, ${aside.when}`;
      new Marker({ element: el, anchor: "left", offset: [-4, 0] }).setLngLat(aside.coords).addTo(this.map);
      this.asideMarkers.push({ el, aside });
    }

    this.ready = new Promise((resolve) => {
      this.map.on("load", () => {
        this.map.addSource("route", { type: "geojson", data: this.routeData() });
        const line = {
          type: "line" as const,
          source: "route",
          layout: { "line-cap": "round" as const, "line-join": "round" as const },
        };
        this.map.addLayer({
          ...line,
          id: "route-halo",
          paint: { "line-color": colors.halo, "line-width": 6, "line-opacity": 0.8 },
        });
        this.map.addLayer({
          ...line,
          id: "route-documented",
          filter: ["==", ["get", "certainty"], "documented"],
          paint: { "line-color": colors.route, "line-width": 3 },
        });
        this.map.addLayer({
          ...line,
          id: "route-probable",
          filter: ["==", ["get", "certainty"], "probable"],
          layout: { "line-join": "round" },
          paint: { "line-color": colors.route, "line-width": 3, "line-dasharray": [2, 1.5] },
        });
        this.map.addLayer({
          ...line,
          id: "route-disputed",
          filter: ["==", ["get", "certainty"], "disputed"],
          layout: { "line-join": "round" },
          paint: { "line-color": colors.route, "line-width": 3, "line-dasharray": [0.8, 2] },
        });
        this.map.setTerrain({ source: "terrain", exaggeration: 2 });
        resolve();
      });
    });
  }

  private routeData(): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];
    this.legs.forEach((leg, i) => {
      if (i === 0) return;
      const t = this.progress - (i - 1);
      if (t <= 0) return;
      const coords = partial(leg, Math.min(1, t));
      if (coords.length < 2) return;
      features.push({
        type: "Feature",
        properties: { certainty: leg.certainty },
        geometry: { type: "LineString", coordinates: coords },
      });
    });
    return { type: "FeatureCollection", features };
  }

  private update() {
    (this.map.getSource("route") as GeoJSONSource | undefined)?.setData(this.routeData());
    const reached = Math.floor(this.progress + 1e-6);
    this.stopMarkers.forEach((el, i) => {
      el.classList.toggle("reached", i <= reached);
    });
  }

  /** Go to chapter i: fly the camera there and draw the route up to that stop. */
  show(i: number) {
    const stop = this.stops[i];
    this.stopMarkers.forEach((el, k) => el.classList.toggle("active", k === i));
    this.asideMarkers.forEach(({ el, aside }) => el.classList.toggle("visible", aside.stop === stop.id));

    const duration = this.reducedMotion ? 0 : 3200;
    if (duration) {
      this.map.flyTo({ ...stop.camera, duration, essential: true, curve: 1.3 });
    } else {
      this.map.jumpTo(stop.camera);
    }

    this.target = i;
    const from = this.progress;
    const startTime = performance.now();
    const id = ++this.anim;
    const span = duration * 0.85;
    const step = (now: number) => {
      if (id !== this.anim) return;
      const t = span ? Math.min(1, (now - startTime) / span) : 1;
      this.progress = from + (this.target - from) * ease(t);
      this.update();
      if (t < 1) requestAnimationFrame(step);
    };
    this.ready.then(() => requestAnimationFrame(step));
  }

  /** Let the reader pan and zoom the map freely, or hand control back to the story. */
  setExplore(on: boolean) {
    const handlers = [
      this.map.dragPan,
      this.map.scrollZoom,
      this.map.boxZoom,
      this.map.dragRotate,
      this.map.keyboard,
      this.map.doubleClickZoom,
      this.map.touchZoomRotate,
      this.map.touchPitch,
    ];
    for (const h of handlers) (on ? h.enable() : h.disable());
    if (on) {
      this.progress = this.stops.length - 1;
      this.update();
      this.stopMarkers.forEach((el) => el.classList.remove("active"));
    }
  }
}
