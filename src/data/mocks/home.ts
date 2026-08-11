/**
 * Home page copy — placeholder content lifted from the Figma frame
 * "Concept 3" (1469:1302). Passed into the view via props; never imported by a
 * component directly (obsidian/frontend/component-conventions.md → Data rules).
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface HighlightItem {
  id: string;
  title: string;
  description: string;
  glyph: "circle" | "triangle";
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
}

export interface AudienceItem {
  id: string;
  index: string;
  title: string;
  description: string;
  /**
   * Zero-based cell in the 3 × 3 grid. The centre and the two counter-diagonal
   * cells carry no card — that gap is the layout.
   */
  cell: number;
}

export interface ContactField {
  name: string;
  label: string;
  type: "text" | "tel" | "email";
  autoComplete: string;
}

export const homeContent = {
  nav: {
    links: [
      { label: "The house", href: "#about" },
      { label: "Location", href: "#location" },
      { label: "Price", href: "#audience" },
      { label: "Reviews", href: "#contact" },
    ] satisfies NavLink[],
    cta: { label: "Contact", href: "#contact" },
  },

  hero: {
    headingLead: "Where the road ends ",
    headingRest: "and the quiet begins",
    subtitle:
      "A 240 m² house on a south-facing slope, 40 minutes from the city. One owner, one view, no neighbours in sight.",
    cta: { label: "Book a viewing", href: "#contact" },
    wordmark: "aerra",
    caption: ["Finished and ready to live in —", "heat, light and everything in between"],
    image: {
      src: "/assets/Hero/hero.png",
      alt: "The AERRA house in daylight — timber and stone volumes under low pitched roofs, raised on a dry-stone terrace above a rock garden.",
      width: 1999,
      height: 1417,
    },
  },

  about: {
    eyebrow: "About the house",
    body: "AERA is two floors of cedar and glass, set into the slope. Floor-to-ceiling windows open the living room to the valley, and the terrace runs into the treeline. Everything is done — down to the last socket.",
    cta: { label: "Book a viewing", href: "#contact" },
    highlights: [
      {
        id: "move-in-ready",
        title: "Move-in ready",
        description: "Full finish, built-in kitchen and appliances included in the price.",
        glyph: "circle",
      },
      {
        id: "freehold-land",
        title: "Freehold land",
        description: "0.45 acres, title clear, no charges or easements.",
        glyph: "triangle",
      },
    ] satisfies HighlightItem[],
    image: {
      src: "/assets/About/about.png",
      alt: "The house seen from the valley floor, its windows glowing against the dark treeline.",
      width: 842,
      height: 1025,
    },
    video: {
      src: "/assets/About/about-video.mp4",
      label: "The house in 360 degrees — drag to rotate it",
    },
    /**
     * Quote card laid over the photograph. Figma 1505:1816 supplies the layout
     * but still carries the old placeholder copy, so the words below are a
     * stand-in written to the right length — replace with the real quote.
     */
    quote: {
      // Figma's box allows one 20 px line plus a short attribution — keep the
      // quote to roughly this length or the card overflows.
      text: "We stayed until it got dark.",
      attribution: "The first family to view it, spring 2026",
    },
  },

  numbers: {
    eyebrow: "By the numbers",
    heading: "A light on the mountain, kept on just for you.",
    subtitle:
      "Forty minutes to the city centre, sealed road to the gate, nearest neighbour behind the hill",
    stats: [
      { id: "area", value: "240", label: "m² of living space" },
      { id: "ceilings", value: "3.2", label: "metre ceilings" },
      { id: "commute", value: "40", label: "minutes to the city" },
    ] satisfies StatItem[],
  },

  location: {
    eyebrow: "Location",
    body: "The house sits last in the line — beyond it, only forest and ridge. Mains water and power, fibre broadband, and a road that gets cleared all winter. Isolation without the trade-offs: schools, shops and the motorway are fifteen minutes out.",
    cta: { label: "See it on the map", href: "#contact" },
    image: {
      src: "/assets/Location/location.png",
      alt: "The house on its ridge at blue hour, the last building before open forest.",
      width: 2160,
      height: 1437,
    },
    reveal: {
      src: "/assets/Location/mask.png",
      label: "Move the cursor to uncover the site plan",
    },
  },

  audience: {
    eyebrow: "Who this is for",
    intro:
      "This house isn't for everyone, and that's the point. It's for people who've already worked out how they want to live — with a view instead of a fence, quiet instead of a shared courtyard.",
    items: [
      {
        id: "second-home",
        index: "01",
        title: "A second home",
        description: "You want somewhere you can reach in an hour, not somewhere you pack a week for.",
        cell: 0,
      },
      {
        id: "leaving-the-city",
        index: "02",
        title: "Leaving the city",
        description: "You're ready to live here full-time without giving up anything the flat gave you.",
        cell: 1,
      },
      {
        id: "working-from-home",
        index: "03",
        title: "Working from home",
        description: "You want a study facing the ridge, not a window facing the neighbour's wall.",
        cell: 3,
      },
      {
        id: "family",
        index: "04",
        title: "Family",
        description: "Four bedrooms, two baths and a plot with somewhere for the kids to run.",
        cell: 5,
      },
      {
        id: "an-investment",
        index: "05",
        title: "An investment",
        description: "A liquid asset in a closed location: land freehold, house complete, offers considered.",
        cell: 7,
      },
      {
        id: "short-term-letting",
        index: "06",
        title: "Short-term letting",
        description: "Ready to rent out tomorrow — furnished, equipped, and reachable year-round.",
        cell: 8,
      },
    ] satisfies AudienceItem[],
    /**
     * The 3D mark. Not a grid cell — its canvas spans the whole section behind
     * the card grid; see `views/home/audience-mark.tsx`.
     */
    mark: {
      // Folder name comes from the design hand-off; the space must stay encoded.
      src: "/assets/Who%20this%20is%20for/model.glb",
      label: "The AERRA mark, rendered in three dimensions and turning with the page",
    },
  },

  contact: {
    eyebrow: "Contact",
    headingLead: "Come and see it ",
    headingRest: "photographs undersell it",
    body: "Leave your details and we'll walk you through it in person, or arrange a live video tour whenever suits. We reply the same day.",
    fields: [
      { name: "name", label: "Name", type: "text", autoComplete: "name" },
      { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
      { name: "email", label: "Email", type: "email", autoComplete: "email" },
    ] satisfies ContactField[],
    submitLabel: "Book a viewing",
    image: {
      src: "/assets/Contact/contact.png",
      alt: "Close view of the cedar-clad facade and terrace at dusk.",
      width: 2160,
      height: 1689,
    },
  },
} as const;

export type HomeContent = typeof homeContent;
