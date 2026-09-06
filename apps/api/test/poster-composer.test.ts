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
