import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import { buildPosterSvg } from "../src/services/poster-composer";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("ResvgPosterRenderer smoke tests", () => {
  it("rasterizes an SVG embedding a data-URL background", () => {
    const svg = buildPosterSvg(
      {
        brandName: "Sunshield",
        productName: "Tropical Glow",
        description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
        price: "$14.99",
      },
      undefined,
      { kind: "image", dataUrl: PNG_1X1 },
    );
    const png = new Resvg(svg, {
      font: {
        fontFiles: [path.join(__dirname, "..", "src", "assets", "outfit-600.ttf")],
        defaultFontFamily: "Outfit",
      },
    })
      .render()
      .asPng();
    expect(png.length).toBeGreaterThan(1000);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  });

  it("rasterizes the default fixed scene", () => {
    const svg = buildPosterSvg({
      brandName: "Sunshield",
      productName: "Tropical Glow",
      description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
      price: "$14.99",
    });
    const png = new Resvg(svg).render().asPng();
    expect(png.length).toBeGreaterThan(1000);
  });

  it("writes the rendered poster to a path via the storage service", async () => {
    const { ResvgPosterRenderer } = await import("../src/services/poster-service");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-render-"));
    const renderer = new ResvgPosterRenderer(tmpDir);
    const output = await renderer.render(
      {
        brandName: "Sunshield",
        productName: "Tropical Glow",
        description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
        price: 14.99,
      },
      {
        palette: {
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
        },
        background: { kind: "fixed" },
      },
    );
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.statSync(output).size).toBeGreaterThan(1000);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
