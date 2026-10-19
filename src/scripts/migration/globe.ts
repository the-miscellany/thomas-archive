// The three.js intro: a globe drawn like an old atlas, which turns to Wales and draws the crossing
// to Virginia as the reader scrolls, then zooms in and hands off to the MapLibre map.

import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import land50 from "world-atlas/land-50m.json";

export interface GlobeColors {
  ocean: string;
  land: string;
  coast: string;
  graticule: string;
  route: string;
  glow: string;
}

const RADIUS = 1;
const FOV = 35;

/** A point on the globe, matching the UV layout of THREE.SphereGeometry and an equirectangular texture. */
export function latLonToVec3(lat: number, lon: number, r = RADIUS): THREE.Vector3 {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(
    -r * Math.cos(phi) * Math.sin(theta),
    r * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function drawTexture(colors: GlobeColors): HTMLCanvasElement {
  const W = 4096;
  const H = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const x = (lon: number) => ((lon + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;

  ctx.fillStyle = colors.ocean;
  ctx.fillRect(0, 0, W, H);

  // Graticule, every 15 degrees.
  ctx.strokeStyle = colors.graticule;
  ctx.lineWidth = 1.5;
  for (let lon = -180; lon <= 180; lon += 15) {
    ctx.beginPath();
    ctx.moveTo(x(lon), 0);
    ctx.lineTo(x(lon), H);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath();
    ctx.moveTo(0, y(lat));
    ctx.lineTo(W, y(lat));
    ctx.stroke();
  }

  const topo = land50 as unknown as Topology<{ land: GeometryCollection }>;
  const geo = feature(topo, topo.objects.land) as GeoJSON.FeatureCollection;
  ctx.beginPath();
  for (const f of geo.features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of polys) {
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(x(lon), y(lat)) : ctx.moveTo(x(lon), y(lat))));
        ctx.closePath();
      }
    }
  }
  ctx.fillStyle = colors.land;
  ctx.fill("evenodd");
  ctx.strokeStyle = colors.coast;
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas;
}

/** Points along the great circle from a to b, lifted off the surface in the middle. */
function arcPoints(a: [number, number], b: [number, number], lift: number, n = 128): THREE.Vector3[] {
  const va = latLonToVec3(a[1], a[0]).normalize();
  const vb = latLonToVec3(b[1], b[0]).normalize();
  const angle = va.angleTo(vb);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = new THREE.Vector3()
      .addScaledVector(va, Math.sin((1 - t) * angle) / Math.sin(angle))
      .addScaledVector(vb, Math.sin(t * angle) / Math.sin(angle));
    pts.push(v.multiplyScalar(RADIUS + lift * Math.sin(Math.PI * t)));
  }
  return pts;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface GlobeLabel {
  el: HTMLElement;
  coords: [number, number];
}

export class Globe {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private arcMaterial: THREE.ShaderMaterial;
  private labels: GlobeLabel[] = [];
  private running = false;
  private spin = 0;
  private reducedMotion: boolean;

  /** Where the camera looks (lon, lat) and how far away it is, in globe radii from the centre. */
  private view = { lon: -40, lat: 28, dist: 3.6 };
  /** Scroll-driven state, set from outside. */
  intro = 0; // 0..1 through the title section
  crossing = 0; // 0..1 through the Wales chapter
  handoff = 0; // 0..1 into the Virginia chapter

  constructor(
    private canvas: HTMLCanvasElement,
    private from: [number, number],
    private to: [number, number],
    private handoffView: { lon: number; lat: number; dist: number },
    colors: GlobeColors,
  ) {
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);

    const texture = new THREE.CanvasTexture(drawTexture(colors));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 128, 96),
      new THREE.MeshLambertMaterial({ map: texture }),
    );
    this.scene.add(globe);

    // A soft halo, like the edge of a printed globe catching the light.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.05, 64, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: { color: { value: new THREE.Color(colors.glow) } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(clamp(1.0 + dot(vN, vV), 0.0, 1.0), 3.0);
          gl_FragColor = vec4(color, f * 0.35); }`,
      }),
    );
    this.scene.add(halo);

    this.scene.add(new THREE.AmbientLight(0xffffff, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(-3, 2, 4);
    this.camera.add(sun);
    this.scene.add(this.camera);

    // The crossing: a dashed tube, drawn up to `progress` (dashed because its date is disputed).
    const curve = new THREE.CatmullRomCurve3(arcPoints(from, to, 0.22));
    this.arcMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { progress: { value: 0 }, color: { value: new THREE.Color(colors.route) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float progress; uniform vec3 color; varying vec2 vUv;
        void main(){ if (vUv.x > progress) discard; if (fract(vUv.x * 28.0) > 0.62) discard;
        gl_FragColor = vec4(color, 1.0); }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 256, 0.006, 8, false), this.arcMaterial));

    for (const c of [from, to]) {
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.014, 24),
        new THREE.MeshBasicMaterial({ color: colors.route }),
      );
      const p = latLonToVec3(c[1], c[0], RADIUS * 1.001);
      dot.position.copy(p);
      dot.lookAt(p.clone().multiplyScalar(2));
      this.scene.add(dot);
    }

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  addLabel(el: HTMLElement, coords: [number, number]) {
    this.labels.push({ el, coords });
  }

  /** The MapLibre zoom that shows the ground at the same scale as the globe's handoff view. */
  matchingZoom(): number {
    const h = this.canvas.clientHeight || innerHeight;
    const pxPerRadian = h / (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * (this.handoffView.dist - RADIUS));
    const pxPerDegree = (pxPerRadian * Math.PI) / 180;
    const lat = (this.handoffView.lat * Math.PI) / 180;
    return Math.log2((pxPerDegree * 360 * Math.cos(lat)) / 512);
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!this.reducedMotion) this.spin += dt * 4 * (1 - clamp01(this.crossing * 3));
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
  }

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private render() {
    // Three poses: idling over the Atlantic, looking at Wales, and following the crossing west.
    const idle = { lon: -40 + this.spin, lat: 28, dist: 3.6 };
    const wales = { lon: this.from[0] - 18, lat: this.from[1] - 8, dist: 2.7 };
    const mid = { lon: (this.from[0] + this.to[0]) / 2, lat: 42, dist: 2.9 };
    const a = ease(clamp01(this.crossing / 0.35));
    const b = ease(clamp01((this.crossing - 0.35) / 0.65));
    const c = ease(clamp01(this.handoff));
    let v = {
      lon: lerp(idle.lon, wales.lon, a),
      lat: lerp(idle.lat, wales.lat, a),
      dist: lerp(idle.dist, wales.dist, a),
    };
    v = { lon: lerp(v.lon, mid.lon, b), lat: lerp(v.lat, mid.lat, b), dist: lerp(v.dist, mid.dist, b) };
    v = {
      lon: lerp(v.lon, this.handoffView.lon, c),
      lat: lerp(v.lat, this.handoffView.lat, c),
      dist: lerp(v.dist, this.handoffView.dist, c),
    };
    this.view = v;
    this.camera.position.copy(latLonToVec3(v.lat, v.lon, v.dist));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.arcMaterial.uniforms.progress.value = clamp01((this.crossing - 0.3) / 0.6) + c;
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  }

  private placeLabels() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const camDir = this.camera.position.clone().normalize();
    for (const { el, coords } of this.labels) {
      const p = latLonToVec3(coords[1], coords[0]);
      const facing = p.clone().normalize().dot(camDir);
      const s = p.project(this.camera);
      const visible = facing > 0.15 && this.crossing > 0.2;
      el.style.opacity = visible ? "1" : "0";
      el.style.transform = `translate(${((s.x + 1) / 2) * w}px, ${((1 - s.y) / 2) * h}px)`;
    }
  }
}
