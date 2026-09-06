export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1350;

export interface PosterText {
  brandName: string;
  productName: string;
  description: string;
  price: string;
}

export type BackgroundSource = { kind: "fixed" } | { kind: "image"; dataUrl: string };

export interface Palette {
  skyTop: string;
  skyBottom: string;
  sun: string;
  sea: string;
  seaShallow: string;
  sand: string;
  palm: string;
  card: string;
  text: string;
  accent: string;
}

export const DEFAULT_PALETTE: Palette = {
  skyTop: "#7BD5F5",
  skyBottom: "#BFF0FF",
  sun: "#FFD166",
  sea: "#2FA6D8",
  seaShallow: "#7FD9E8",
  sand: "#F3E0B0",
  palm: "#2F6B3F",
  card: "#FFFFFF",
  text: "#20303C",
  accent: "#F4A62E",
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && current.length + 1 + word.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

const DESCRIPTION_X = 540;
const DESCRIPTION_START_Y = 940;
const DESCRIPTION_LINE_HEIGHT = 42;

function priceTag(price: string): string {
  const size = price.length <= 4 ? 120 : 96;
  return `<text x="540" y="1210" text-anchor="middle" font-family="'Outfit'" font-size="${size}" font-weight="800" fill="${escapeXml(DEFAULT_PALETTE.accent)}">${escapeXml(price)}</text>`;
}

function descriptionBlock(description: string): string {
  const lines = wrapText(description, 42);
  return lines
    .map(
      (line, index) =>
        `<text x="${DESCRIPTION_X}" y="${DESCRIPTION_START_Y + index * DESCRIPTION_LINE_HEIGHT}" text-anchor="middle" font-family="'Outfit'" font-size="34" fill="${escapeXml(DEFAULT_PALETTE.text)}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function beachScene(palette: Palette): string {
  return `
  <rect width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="url(#sky)" />
  <circle cx="820" cy="240" r="240" fill="url(#sunGlow)" />
  <circle cx="820" cy="240" r="95" fill="${palette.sun}" />

  <ellipse cx="210" cy="340" rx="150" ry="52" fill="${palette.skyBottom}" opacity="0.7" />
  <path d="M 80 380 q 90 -60 180 300 q 60 40 260 350 q -40 50 200 420 q 60 -30 320 400 q -50 40 260 450 q 80 -20 380 470 q -60 30 300 490 q 90 -30 440 520 q -70 40 340 540 q 100 -40 500 570" fill="none" stroke="${palette.skyBottom}" stroke-width="4" stroke-linecap="round" />

  <rect y="760" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT - 760}" fill="url(#sea)" />
  <path d="M 0 850 q 120 -30 240 830 q 150 40 420 870 q 130 -35 580 845 q 160 45 760 890 q 140 -40 920 860 q 160 50 1080 900" fill="none" stroke="${palette.seaShallow}" stroke-width="5" stroke-linecap="round" />
  <path d="M 0 950 q 160 -40 320 930 q 180 50 560 970 q 150 -45 740 940 q 190 55 960 985 q 120 -40 1080 960" fill="none" stroke="${palette.seaShallow}" stroke-width="5" stroke-linecap="round" />

  <rect y="1020" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT - 1020}" fill="${palette.sand}" />
  <path d="M 0 1020 q 140 30 280 1045 q 120 -25 420 1025 q 160 35 600 1055 q 130 -30 760 1030 q 170 40 940 1060 q 140 -35 1080 1035" fill="none" stroke="${palette.sand}" stroke-width="6" stroke-linecap="round" opacity="0.8" />

  <g transform="translate(120 300)">
    <path d="M 0 0 L -14 70 q -30 10 -60 40 L -40 -20 q -30 -20 -80 -80" fill="none" stroke="${palette.palm}" stroke-width="16" stroke-linecap="round" />
    <path d="M 0 0 L 16 60 q 24 8 50 30" fill="none" stroke="${palette.palm}" stroke-width="16" stroke-linecap="round" />
    <path d="M -70 -120 Q 0 -160 90 -90 Q 0 -150 -110 -100 Q 0 -130 120 -110" fill="none" stroke="${palette.palm}" stroke-width="10" stroke-linecap="round" />
    <ellipse cx="10" cy="-130" rx="120" ry="34" fill="${palette.palm}" opacity="0.35" />
  </g>`;
}

function imageScene(dataUrl: string): string {
  return `<image href="${dataUrl}" x="0" y="0" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" preserveAspectRatio="xMidYMid slice" />`;
}

function backgroundScene(background: BackgroundSource, palette: Palette): string {
  return background.kind === "fixed" ? beachScene(palette) : imageScene(background.dataUrl);
}

function cardLayer(palette: Palette, body: string): string {
  return `
  <rect x="252" y="572" width="576" height="696" rx="36" fill="#0A1F2E" opacity="0.18" />
  <rect x="240" y="560" width="600" height="720" rx="36" fill="${palette.card}" />
  <rect x="240" y="560" width="600" height="720" rx="36" fill="none" stroke="${palette.accent}" stroke-width="3" />
  ${body}`;
}

export function buildPosterSvg(
  text: PosterText,
  palette: Palette = DEFAULT_PALETTE,
  background: BackgroundSource = { kind: "fixed" },
): string {
  const { brandName, productName, description, price } = text;
  const brandY = 660;
  const productY = 820;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.skyTop}" />
      <stop offset="100%" stop-color="${palette.skyBottom}" />
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.sea}" />
      <stop offset="100%" stop-color="${palette.seaShallow}" />
    </linearGradient>
    <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${palette.sun}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${palette.sun}" stop-opacity="0" />
    </radialGradient>
  </defs>

  ${backgroundScene(background, palette)}

  ${cardLayer(
    palette,
    `
  <text x="540" y="${brandY}" text-anchor="middle" font-family="'Outfit'" font-size="40" font-weight="600" letter-spacing="2" fill="${escapeXml(palette.text)}">${escapeXml(brandName.toUpperCase())}</text>
  <text x="540" y="${productY}" text-anchor="middle" font-family="'Outfit'" font-size="72" font-weight="800" fill="${escapeXml(palette.text)}">${escapeXml(productName)}</text>
  <line x1="340" y1="880" x2="740" y2="880" stroke="${palette.accent}" stroke-width="4" />
  ${descriptionBlock(description)}
  ${priceTag(price)}`,
  )}
</svg>`;
}
