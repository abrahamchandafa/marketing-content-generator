import type { ChangeEvent, FormEvent } from "react";
import { CreateGenerationInputSchema } from "@mc/shared";

export interface FormValues {
  brandName: string;
  productName: string;
  description: string;
  price: string;
}

export type FieldErrors = Partial<Record<keyof FormValues, string>>;

export const EMPTY_FORM: FormValues = {
  brandName: "",
  productName: "",
  description: "",
  price: "",
};

export function validateForm(values: FormValues): FieldErrors {
  const input = {
    brandName: values.brandName,
    productName: values.productName,
    description: values.description,
    price: Number(values.price),
  };
  const result = CreateGenerationInputSchema.safeParse(input);
  if (result.success) {
    return {};
  }
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormValues | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function PosterForm(props: {
  values: FormValues;
  errors: FieldErrors;
  disabled: boolean;
  onSubmit: (values: FormValues) => void;
  onChange: (values: FormValues) => void;
}): React.JSX.Element {
  const { values, errors, disabled, onSubmit, onChange } = props;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(values);
  }

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...values, [field]: event.target.value });
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="brandName">Brand name</label>
        <input
          id="brandName"
          name="brandName"
          value={values.brandName}
          onChange={handleChange("brandName")}
          disabled={disabled}
          placeholder="e.g. Sunshield"
          maxLength={60}
        />
        {errors.brandName ? <span className="error-text">{errors.brandName}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="productName">Product name</label>
        <input
          id="productName"
          name="productName"
          value={values.productName}
          onChange={handleChange("productName")}
          disabled={disabled}
          placeholder="e.g. Tropical Glow"
          maxLength={60}
        />
        {errors.productName ? <span className="error-text">{errors.productName}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange("description")}
          disabled={disabled}
          placeholder="e.g. SPF 50+ Broad Spectrum, Water Resistant, Lightweight."
          maxLength={220}
        />
        {errors.description ? <span className="error-text">{errors.description}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="price">Price</label>
        <input
          id="price"
          name="price"
          value={values.price}
          onChange={handleChange("price")}
          disabled={disabled}
          placeholder="e.g. 14.99"
          inputMode="decimal"
        />
        {errors.price ? <span className="error-text">{errors.price}</span> : null}
      </div>

      <button type="submit" disabled={disabled}>
        {disabled ? "Generating…" : "Generate poster"}
      </button>
    </form>
  );
}
