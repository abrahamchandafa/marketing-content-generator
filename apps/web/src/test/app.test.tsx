import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../App";

vi.mock("../api/client", () => ({
  api: {
    createGeneration: vi.fn(async () => ({ id: "g1", status: "pending" })),
    getGeneration: vi.fn(async () => ({
      id: "g1",
      brandName: "Sunshield",
      productName: "Tropical Glow",
      description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
      price: 14.99,
      status: "completed",
      posterUrl: "/api/generations/g1/poster",
      error: null,
      createdAt: "2026-09-06T00:00:00Z",
      updatedAt: "2026-09-06T00:00:00Z",
    })),
    listGenerations: vi.fn(async () => ({ generations: [] })),
  },
  pollUntilDone: vi.fn(async (id: string) => ({
    id,
    brandName: "Sunshield",
    productName: "Tropical Glow",
    description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
    price: 14.99,
    status: "completed",
    posterUrl: "/api/generations/g1/poster",
    error: null,
    createdAt: "2026-09-06T00:00:00Z",
    updatedAt: "2026-09-06T00:00:00Z",
  })),
}));

describe("App", () => {
  it("submits a valid form and shows the generated poster", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Brand name"), "Sunshield");
    await user.type(screen.getByLabelText("Product name"), "Tropical Glow");
    await user.type(
      screen.getByLabelText("Description"),
      "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
    );
    await user.type(screen.getByLabelText("Price"), "14.99");
    await user.click(screen.getByRole("button", { name: "Generate poster" }));

    const poster = await screen.findByRole("img", { name: "Tropical Glow poster" });
    expect(poster).toBeTruthy();
    expect(poster.getAttribute("src")).toBe("/api/generations/g1/poster");
  });

  it("keeps the form enabled with a failed generation and shows the error", async () => {
    const { pollUntilDone } = await import("../api/client");
    vi.mocked(pollUntilDone).mockResolvedValueOnce({
      id: "g1",
      brandName: "Sunshield",
      productName: "Tropical Glow",
      description: "SPF 50+ Broad Spectrum.",
      price: 14.99,
      status: "failed",
      posterUrl: null,
      error: "The model was unavailable.",
      createdAt: "2026-09-06T00:00:00Z",
      updatedAt: "2026-09-06T00:00:00Z",
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Brand name"), "Sunshield");
    await user.type(screen.getByLabelText("Product name"), "Tropical Glow");
    await user.type(screen.getByLabelText("Description"), "SPF 50+ Broad Spectrum.");
    await user.type(screen.getByLabelText("Price"), "14.99");
    await user.click(screen.getByRole("button", { name: "Generate poster" }));

    const error = await screen.findByText("The model was unavailable.");
    expect(error).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate poster" })).toBeTruthy();
  });
});
