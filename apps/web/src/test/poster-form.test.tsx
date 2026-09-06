import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_FORM, PosterForm, validateForm } from "../components/PosterForm";

describe("validateForm", () => {
  it("reports all required fields for an empty form", () => {
    const errors = validateForm(EMPTY_FORM);
    expect(errors.brandName).toBe("Brand name is required.");
    expect(errors.productName).toBe("Product name is required.");
    expect(errors.description).toBe("Description is required.");
    expect(errors.price).toBe("Price must be greater than zero.");
  });

  it("returns no errors for a valid form", () => {
    const errors = validateForm({
      brandName: "Sunshield",
      productName: "Tropical Glow",
      description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
      price: "14.99",
    });
    expect(errors).toEqual({});
  });

  it("rejects a non-numeric price", () => {
    const errors = validateForm({
      ...EMPTY_FORM,
      brandName: "a",
      productName: "b",
      description: "c",
      price: "abc",
    });
    expect(errors.price).toBe("Price must be a number.");
  });
});

describe("PosterForm", () => {
  it("renders all fields and the submit button", () => {
    render(
      <PosterForm
        values={EMPTY_FORM}
        errors={{}}
        disabled={false}
        onSubmit={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Brand name")).toBeTruthy();
    expect(screen.getByLabelText("Product name")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(screen.getByLabelText("Price")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate poster" })).toBeTruthy();
  });

  it("shows validation messages passed through errors", () => {
    render(
      <PosterForm
        values={EMPTY_FORM}
        errors={validateForm(EMPTY_FORM)}
        disabled={false}
        onSubmit={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Brand name is required.")).toBeTruthy();
    expect(screen.getByText("Price must be greater than zero.")).toBeTruthy();
  });

  it("reports submitted values and calls onChange while typing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    render(
      <PosterForm
        values={EMPTY_FORM}
        errors={{}}
        disabled={false}
        onSubmit={onSubmit}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText("Brand name"), "Sunshield");
    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Generate poster" }));
    expect(onSubmit).toHaveBeenCalledWith(EMPTY_FORM);
  });
});
