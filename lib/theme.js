// lib/theme.js
// Design tokens for the khadi-paper visual identity.
// Palette: warm handmade-paper background, ledger-navy ink, marigold/saffron accent,
// bottle-green secondary. Display type: Yatra One. Body type: Hind.

export const colors = {
  khadiPaper: "#F4EDDD",
  khadiPaperDark: "#E9DFC7",
  ledgerNavy: "#1F2A3C",
  saffron: "#E38B29",
  saffronDark: "#C46F14",
  bottleGreen: "#1F4B3F",
  bottleGreenLight: "#2E6B58",
  ink: "#2A2118",
  muted: "#7A6F5D",
  border: "#D8CBA8",
};

export const fonts = {
  display: "'Yatra One', cursive",
  body: "'Hind', sans-serif",
};

// A repeating jali-lattice pattern (diamond trellis) as an SVG data URI, used as a
// section-divider background. Kept as inline SVG so there's no extra image asset.
export const jaliLatticeDataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 0 40 20'%3E%3Cpath d='M0 10 L10 0 L20 10 L10 20 Z M20 10 L30 0 L40 10 L30 20 Z' fill='none' stroke='%23C46F14' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E`;
