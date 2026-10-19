// Runs the migration page: the globe intro, the handoff to the map, the chapters and the timeline.

import { stops, asides } from "../../data/journey";
import { Globe } from "./globe";
import { JourneyMap } from "./map";

const root = document.querySelector<HTMLElement>(".migration")!;
const css = getComputedStyle(root);
const v = (name: string) => css.getPropertyValue(name).trim();

const wales = stops[0];
const virginia = stops[1];
// Where the globe ends up before it hands off: low over the Virginia coast.
const handoffView = { lon: -72, lat: 37.5, dist: 1.42 };

function webglWorks() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

if (!webglWorks()) {
  root.classList.add("no-webgl");
} else {
  run();
}

function run() {
  const globeCanvas = document.querySelector<HTMLCanvasElement>("#globe")!;
  const globe = new Globe(globeCanvas, wales.coords, virginia.coords, handoffView, {
    ocean: v("--ocean"),
    land: v("--paper"),
    coast: v("--ink-soft"),
    graticule: v("--graticule"),
    route: v("--route"),
    glow: v("--glow"),
  });
  document.querySelectorAll<HTMLElement>(".globe-label").forEach((el) => {
    const [lon, lat] = el.dataset.coords!.split(",").map(Number);
    globe.addLabel(el, [lon, lat]);
  });
  globe.start();

  const journey = new JourneyMap(
    document.querySelector<HTMLElement>("#map")!,
    stops,
    asides,
    {
      paper: v("--paper"),
      ink: v("--ink"),
      water: v("--water"),
      river: v("--river"),
      border: v("--border"),
      route: v("--route"),
      halo: v("--paper"),
    },
    { center: [handoffView.lon, handoffView.lat], zoom: globe.matchingZoom() },
  );

  const sections = [...document.querySelectorAll<HTMLElement>("[data-step]")];
  const ticks = [...document.querySelectorAll<HTMLElement>(".timeline [data-goto]")];
  const yearEl = document.querySelector<HTMLElement>(".timeline .year")!;
  const marker = document.querySelector<HTMLElement>(".timeline .now")!;
  let current = -1;

  /** How far the reader is through a section: 0 when its top reaches the middle of the screen. */
  const through = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (innerHeight / 2 - r.top) / r.height));
  };

  function setChapter(i: number) {
    if (i === current) return;
    current = i;
    root.dataset.chapter = String(i);
    ticks.forEach((t) => t.classList.toggle("active", Number(t.dataset.goto) === i));
    if (i >= 1) journey.show(i);
  }

  function onScroll() {
    const intro = sections.find((s) => s.dataset.step === "intro")!;
    const step0 = sections.find((s) => s.dataset.step === "0")!;
    const step1 = sections.find((s) => s.dataset.step === "1")!;
    globe.intro = through(intro);
    globe.crossing = through(step0);
    // The handoff happens over the first half of the Virginia chapter's approach.
    const r1 = step1.getBoundingClientRect();
    const handoff = Math.min(1, Math.max(0, (innerHeight - r1.top) / (innerHeight * 0.7)));
    globe.handoff = handoff;
    root.style.setProperty("--handoff", String(handoff));
    if (handoff >= 1) globe.stop();
    else globe.start();

    // The active chapter is the last one whose top has passed the middle of the screen.
    let active = -1;
    for (const s of sections) {
      if (s.dataset.step === "intro" || s.dataset.step === "end") continue;
      // The map takes over at Virginia, so wait until the globe has finished handing off.
      if (s.dataset.step === "1" && handoff < 1) continue;
      if (s.getBoundingClientRect().top < innerHeight / 2) active = Number(s.dataset.step);
    }
    if (active >= 0) setChapter(active);
    else setChapter(-1);

    // The timeline's marker and year move smoothly within a chapter.
    const i = Math.max(0, active);
    const s = stops[i];
    const p = active < 0 ? 0 : through(sections.find((x) => x.dataset.step === String(i))!);
    const year = Math.round(s.from + (s.to - s.from) * p);
    yearEl.textContent = String(year);
    const tick = ticks[i];
    if (tick) {
      const left = tick.offsetLeft + tick.offsetWidth * (active < 0 ? 0 : p);
      marker.style.transform = `translateX(${left}px)`;
    }
  }

  addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  for (const t of ticks) {
    t.addEventListener("click", () => {
      const target = sections.find((s) => s.dataset.step === t.dataset.goto);
      if (target) {
        // Land with the section's top just past the middle, so it becomes the active chapter.
        const y = scrollY + target.getBoundingClientRect().top - innerHeight * 0.3;
        scrollTo({ top: y, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    });
  }

  const exploreBtn = document.querySelector<HTMLButtonElement>(".explore-toggle")!;
  exploreBtn.addEventListener("click", () => {
    const on = !root.classList.contains("exploring");
    root.classList.toggle("exploring", on);
    exploreBtn.setAttribute("aria-pressed", String(on));
    exploreBtn.textContent = on ? "Back to the story" : "Explore the map";
    journey.setExplore(on);
    if (on) {
      globe.stop();
      journey.map.fitBounds(
        [
          [-95.5, 30.5],
          [-75.5, 37.8],
        ],
        { padding: 60, pitch: 40, duration: 2000 },
      );
    } else {
      current = -1;
      onScroll();
    }
  });
}
