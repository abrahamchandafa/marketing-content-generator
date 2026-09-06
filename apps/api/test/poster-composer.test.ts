import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  buildPosterSvg,
  escapeXml,
  wrapText,
} from "../src/services/poster-composer";

describe("wrapText", () => {
  it("wraps text at the character limit", () => {
    const lines = wrapText("one two three four five", 10);
    expect(lines).toEqual(["one two", "three four", "five"]);
  });

  it("keeps short text on a single line", () => {
    expect(wrapText("hello world", 40)).toEqual(["hello world"]);
  });

  it("handles empty text", () => {
    expect(wrapText("", 40)).toEqual([]);
  });

  it("keeps a single word longer than the limit intact", () => {
    expect(wrapText("supercalifragilisticexpialidocious", 10)).toEqual([
      "supercalifragilisticexpialidocious",
    ]);
  });
});

describe("escapeXml", () => {
  it("escapes special characters", () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;",
    );
  });
});

function textElements(svg: string) {
  return [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((match) => {
    const attrs = match[1];
    return {
      content: match[2],
      fontSize: Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0),
      y: Number(/y="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0),
      brand: /letter-spacing="2"/.test(attrs),
    };
  });
}

describe("buildPosterSvg", () => {
  const input = {
    brandName: "Sunshield",
    productName: "Tropical Glow",
    description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
    price: "$14.99",
  };

  it("produces a valid SVG document at poster dimensions", () => {
    const svg = buildPosterSvg(input);
    expect(svg).toContain(`width="${POSTER_WIDTH}"`);
    expect(svg).toContain(`height="${POSTER_HEIGHT}"`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("renders the user text", () => {
    const svg = buildPosterSvg(input);
    expect(svg).toContain("SUNSHIELD");
    expect(svg).toContain("Tropical Glow");
    expect(svg).toContain("$14.99");
  });

  it("escapes user text in the SVG", () => {
    const svg = buildPosterSvg({ ...input, brandName: `<script>&"` });
    expect(svg).not.toContain("<script>");
  });

  it("uses the provided palette", () => {
    const palette = { ...DEFAULT_PALETTE, accent: "#123456" };
    const svg = buildPosterSvg(input, palette);
    expect(svg).toContain("#123456");
  });

  it("wraps a long brand name onto multiple lines", () => {
    const svg = buildPosterSvg({ ...input, brandName: "Sunshield Premium Outdoor Company" });
    const brandLines = textElements(svg).filter((el) => el.brand);
    expect(brandLines.map((el) => el.content)).toEqual(["SUNSHIELD PREMIUM", "OUTDOOR COMPANY"]);
    expect(brandLines.every((el) => el.fontSize === 40)).toBe(true);
  });

  it("wraps a long product name onto multiple lines and reduces font size", () => {
    const svg = buildPosterSvg({
      ...input,
      productName: "Advanced Vitamin C Brightening Serum",
    });
    const productLines = textElements(svg).filter(
      (el) => el.content === "Advanced Vitamin C" || el.content === "Brightening Serum",
    );
    expect(productLines.map((el) => el.content)).toEqual([
      "Advanced Vitamin C",
      "Brightening Serum",
    ]);
    expect(productLines.length).toBe(2);
    expect(productLines.every((el) => el.fontSize < 72)).toBe(true);
  });

  it("emits one brand text per wrapped line with distinct baselines", () => {
    const svg = buildPosterSvg({
      ...input,
      brandName: "International Swiss Chocolate",
    });
    const brandLines = textElements(svg).filter((el) => el.brand);
    expect(brandLines.length).toBe(2);
    expect(brandLines[0].y).not.toBe(brandLines[1].y);
  });

  it("builds the fixed beach scene by default", () => {
    const svg = buildPosterSvg(input);
    expect(svg).toContain("M 0 0 L -14 70");
  });

  it("embeds an image background as a sliced data URL when requested", () => {
    const svg = buildPosterSvg(input, DEFAULT_PALETTE, {
      kind: "image",
      dataUrl: "data:image/png;base64,aGVsbG8=",
    });
    expect(svg).toContain('<image href="data:image/png;base64,aGVsbG8="');
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(svg).not.toContain("M 0 0 L -14 70");
  });
});
