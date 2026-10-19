// The direct Thomas line, from Wales to east Texas, as stops on the migration map
// (src/pages/migration.astro). Facts come from the posts on this site and from the outlines in
// the thomas-genealogy repo (familes/thomas/). Where the sources disagree, the stop says so.
//
// Coordinates are [longitude, latitude]. Most are approximate: a county seat or a creek stands in
// for land that was never mapped precisely, and `approximate` marks those.

export type Certainty = "documented" | "probable" | "disputed";

export interface Stop {
  id: string;
  /** Short name for the timeline and the map label. */
  label: string;
  place: string;
  /** Years the family was here, for the timeline. */
  from: number;
  to: number;
  /** How the dates read in the text, since many are ranges or guesses. */
  when: string;
  coords: [number, number];
  approximate?: boolean;
  people: string[];
  text: string[];
  /** How sure the move *into* this stop is. */
  certainty: Certainty;
  /** Points between the previous stop and this one, for the route line. */
  via?: [number, number][];
  /** Notes on the route into this stop. */
  route?: string;
  sources: string[];
  link?: { href: string; label: string };
  /** Camera for this chapter on the MapLibre map. */
  camera: { center: [number, number]; zoom: number; pitch: number; bearing: number };
}

export interface Aside {
  label: string;
  when: string;
  coords: [number, number];
  /** The stop this aside belongs to. */
  stop: string;
  text: string;
}

export const START_YEAR = 1585;
export const END_YEAR = 1960;

export const stops: Stop[] = [
  {
    id: "wales",
    label: "Wales",
    place: "Llangennech, Carmarthenshire",
    from: 1585,
    to: 1610,
    when: "b. 1585 or 1606",
    coords: [-4.078, 51.695],
    people: ["John Thomas, the immigrant"],
    certainty: "disputed",
    text: [
      "The family tradition starts in Carmarthenshire, with the Thomases in Lawrence Buckley Thomas's The Thomas Book, and a coat of arms the family brought to America.",
      "No document proves the link. The MyHeritage tree has a John David Thomas born at Llangennech in 1585; Robert E. Thomas has a John Thomas born in 1606, and doesn't say where.",
    ],
    sources: [
      "The Thomas Book, by Lawrence Buckley Thomas (photographed at the British Library)",
      "The Thomas and Bridges Story, 1540–1840, by Edison H. Thomas",
      "Robert E. Thomas, The Thomas Family in 300 Years of American History, Ch. I",
    ],
    camera: { center: [-30, 45], zoom: 2, pitch: 0, bearing: 0 },
  },
  {
    id: "virginia",
    label: "Virginia",
    place: "Nansemond and Isle of Wight Counties, Virginia",
    from: 1622,
    to: 1740,
    when: "1610 or 1622 to 1740",
    coords: [-76.6, 36.78],
    approximate: true,
    people: ["John Thomas (b. 1628)", "Richard Thomas (1648–1687)", "John Thomas (1668–c. 1706)"],
    certainty: "disputed",
    via: [
      [-20, 50],
      [-45, 44],
      [-65, 39],
    ],
    route:
      "The crossing is dashed because the sources disagree on when he came: about 1610, or 1622.",
    text: [
      "Three generations farmed tobacco land in Nansemond and Isle of Wight, on the south side of the James River. Most of what's known comes from land and will records Robert E. Thomas worked through, since the Nansemond courthouse records burned.",
      "The thread south runs through Mary Lawrence, the second wife of John Thomas (b. 1668). Her father's 1663 patent in North Carolina passed through her to her son.",
    ],
    sources: [
      "Robert E. Thomas, Ch. I",
      "The Thomas and Bridges Story",
      "Isle of Wight Will and Deed Book 2, p. 499 (Michael Rogers's will, 1710)",
    ],
    camera: { center: [-76.7, 37.0], zoom: 7.6, pitch: 50, bearing: -10 },
  },
  {
    id: "edgecombe",
    label: "North Carolina",
    place: "Edgecombe County, North Carolina",
    from: 1740,
    to: 1812,
    when: "1740 or 1741 to about 1812",
    coords: [-77.86, 35.8],
    approximate: true,
    people: [
      "Elder John Thomas (1705–1788) and Christenator Roberts",
      "Maj. Theophilus Thomas (1740–1803) and Mary Rogers",
      "Benjamin Thomas (b. 1778) and Polly Dickinson",
    ],
    certainty: "documented",
    via: [[-77.2, 36.3]],
    text: [
      "John Thomas moved to North Carolina in 1740 or 1741. Robert E. Thomas puts it down to the price of land in Virginia. He was a Baptist from 1748, and founded the Tosneot Baptist Church in 1756.",
      "His son Theophilus was a major in the Revolution and a judge of the county court at Tarboro from 1778 to 1800. In 1771 he married Mary Rogers, and his father gave him land on White Oak Swamp.",
      "Their son Benjamin was born here in 1778. By 1810 the old fields were wearing out, and the new cotton land was to the south and west.",
    ],
    sources: [
      "Dictionary of North Carolina Biography (John Thomas)",
      "DAR Magazine, April 1956, p. 378 (Theophilus Thomas)",
      "1790 and 1810 census, Edgecombe County",
      "Robert E. Thomas, Ch. II",
    ],
    link: { href: "/theophilus-thomas", label: "Major Theophilus Thomas" },
    camera: { center: [-77.7, 35.85], zoom: 8, pitch: 55, bearing: 15 },
  },
  {
    id: "alabama",
    label: "Alabama",
    place: "Madison and Lawrence Counties, Alabama",
    from: 1812,
    to: 1822,
    when: "about 1812 to 1822",
    coords: [-86.59, 34.73],
    approximate: true,
    people: ["Benjamin Thomas and Polly Dickinson, and their children"],
    certainty: "probable",
    via: [
      [-81.93, 33.79],
      [-81.97, 33.47],
      [-84.5, 34.2],
    ],
    route:
      "There's no record of the route. They probably went by Edgefield, South Carolina, and Augusta, Georgia, where there were Thomas relatives already.",
    text: [
      "Benjamin sold his Edgecombe land in 1811–12 and took the family to the new cotton country north of the Tennessee River. He's in the 1816 list of the inhabitants of Madison County, and that December he paid $1,590 for a tract with houses on it.",
      "By 1820 they'd moved twenty-five or thirty miles west, to Lawrence County. His brothers and a sister followed him to north Alabama.",
    ],
    sources: [
      "Inhabitants of Alabama in 1816 (Broken Arrow Chapter, DAR, 1955)",
      "1820 census, Lawrence County",
      "Robert E. Thomas, Ch. III",
    ],
    camera: { center: [-86.9, 34.6], zoom: 7.4, pitch: 50, bearing: -20 },
  },
  {
    id: "natchitoches",
    label: "Louisiana",
    place: "Natchitoches, Louisiana",
    from: 1822,
    to: 1822,
    when: "February to July 1822",
    coords: [-93.086, 31.761],
    people: ["Benjamin and Polly, their children and the people they enslaved: twenty or more"],
    certainty: "documented",
    via: [
      [-87.29, 34.48],
      [-88.7, 33.6],
      [-90.2, 32.4],
      [-91.403, 31.56],
      [-92.4, 31.5],
    ],
    route:
      "Down the Natchez Trace to Natchez, then west across Louisiana. The Trace was too narrow for wagons, so most of them must have walked.",
    text: [
      "Natchitoches, the old French and Spanish river town, was the jumping-off point for east Texas. They were there by the end of February 1822.",
      "On March 3, Benjamin and Polly sold 205 acres back in Edgecombe County to their son Shadrach before Judge John C. Carr. It was Polly's land, her share of the Dickinson estate.",
    ],
    sources: ["Robert E. Thomas, Ch. III", "The Thomas Cemetery marker (Texas Historical Commission, 2008)"],
    camera: { center: [-92.6, 31.6], zoom: 7.2, pitch: 45, bearing: 0 },
  },
  {
    id: "ayish",
    label: "Ayish Bayou",
    place: "The Ayish Bayou, near San Augustine, Texas",
    from: 1822,
    to: 1874,
    when: "1822 (or as late as 1827) to 1874",
    coords: [-94.23, 31.53],
    approximate: true,
    people: [
      "Benjamin Thomas (d. c. 1832–35) and Polly (d. c. 1840)",
      "Shadrach Dickinson Thomas (1799–1874)",
    ],
    certainty: "documented",
    via: [
      [-93.7, 31.45],
      [-93.95, 31.5],
    ],
    route: "Across the Sabine and along the Camino Real.",
    text: [
      "Benjamin settled a few miles west of San Augustine, on the road to Nacogdoches, near what is now the Thomas Cemetery. In 1834 a Methodist preacher preached \"at the house of Benjamin Thomas, seven miles west of town.\" He died there sometime between 1832 and 1835.",
      "The family stayed put while the country changed around them: Mexico until 1836, then the Republic of Texas, the United States in 1845, and the Confederacy.",
      "Shadrach was a justice of the peace from 1837 and sheriff of San Augustine County for most of 1847 to 1856, and was licensed as a Methodist preacher in 1843.",
    ],
    sources: [
      "The Thomas Cemetery marker",
      "1850 and 1860 census, San Augustine County",
      "Robert E. Thomas, Chs. III–IV",
      "Daughters of the Republic of Texas entry (Shadrach D. Thomas)",
    ],
    camera: { center: [-94.15, 31.5], zoom: 9, pitch: 60, bearing: 25 },
  },
  {
    id: "chireno",
    label: "Chireno",
    place: "Chireno, Nacogdoches County, Texas",
    from: 1871,
    to: 1960,
    when: "1871 to 1960",
    coords: [-94.346, 31.498],
    people: [
      "Capt. Samuel Brown Thomas (1831–1911) and Mary Elizabeth Garrett",
      "William Clayborn \"Bee\" Thomas (1879–1960) and Vera Lee Miller",
    ],
    certainty: "documented",
    text: [
      "Samuel Brown Thomas was born under the Mexican flag in 1831, near the old homestead. He served as a captain in the 13th Texas Cavalry, which fought at Jenkins' Ferry, Arkansas, in 1864. He married Mary Garrett in 1871 and raised his family around Chireno, just over the county line.",
      "Their son Bee was born in Chireno in 1879, married Vera Lee Miller of San Augustine in 1911, lived in Nacogdoches County, and died in Chireno in 1960, where he was born.",
    ],
    sources: [
      "Confederate Veteran, vol. 19 (1911), Samuel Brown Thomas's obituary",
      "His Confederate pension application",
      "1880 and 1900 census",
      "William Clayborn Thomas's death certificate",
    ],
    link: { href: "/samuel-brown-thomas", label: "Samuel Brown Thomas" },
    camera: { center: [-94.28, 31.52], zoom: 9.6, pitch: 62, bearing: -15 },
  },
];

export const asides: Aside[] = [
  {
    label: "Tarboro",
    when: "1778–1800",
    coords: [-77.536, 35.897],
    stop: "edgecombe",
    text: "Theophilus sat as a judge of the Edgecombe County court here.",
  },
  {
    label: "Natchez",
    when: "1822",
    coords: [-91.403, 31.56],
    stop: "natchitoches",
    text: "The end of the Natchez Trace.",
  },
];
