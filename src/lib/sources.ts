// Shared helpers for the sources section (src/pages/sources/).
import { getCollection, type CollectionEntry } from "astro:content";

export const TYPE_LABELS: Record<CollectionEntry<"sources">["data"]["type"], string> = {
  census: "Census",
  land: "Land",
  military: "Military",
  obituary: "Obituary",
  vital: "Vital record",
  marker: "Historical marker",
  book: "Book",
};

export const KIND_LABELS: Record<CollectionEntry<"sources">["data"]["kind"], string> = {
  record: "Record",
  published: "Published account",
};

// The periods the index can be filtered by, oldest first.
export const PERIODS = [
  { id: "before-1800", label: "Before 1800", from: -Infinity, to: 1799 },
  { id: "1800-1849", label: "1800–1849", from: 1800, to: 1849 },
  { id: "1850-1899", label: "1850–1899", from: 1850, to: 1899 },
  { id: "1900-on", label: "1900 on", from: 1900, to: Infinity },
];

export function periodOf(year: number) {
  return PERIODS.find((p) => year >= p.from && year <= p.to)!;
}

/** Every source, oldest first. */
export async function getSources() {
  const sources = await getCollection("sources");
  return sources.sort(
    (a, b) => a.data.year - b.data.year || a.data.title.localeCompare(b.data.title)
  );
}

/** Every person, oldest first, as a map from id. */
export async function getPeople() {
  const people = (await getCollection("people")).sort((a, b) => a.data.born - b.data.born);
  return new Map(people.map((p) => [p.id, p]));
}
