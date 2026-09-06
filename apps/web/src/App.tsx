import { useEffect, useState } from "react";
import type { CreateGenerationInput, Generation } from "@mc/shared";
import { api, pollUntilDone } from "./api/client";
import {
  EMPTY_FORM,
  PosterForm,
  validateForm,
  type FieldErrors,
  type FormValues,
} from "./components/PosterForm";
import { GenerationView } from "./components/GenerationView";
import { HistoryList } from "./components/HistoryList";

function pendingGeneration(id: string, input: CreateGenerationInput): Generation {
  return {
    id,
    brandName: input.brandName,
    productName: input.productName,
    description: input.description,
    price: input.price,
    status: "pending",
    posterUrl: null,
    error: null,
    createdAt: "",
    updatedAt: "",
  };
}

export function App(): React.JSX.Element {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<Generation[]>([]);

  async function refreshHistory(): Promise<void> {
    try {
      const response = await api.listGenerations();
      setHistory(response.generations);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  async function handleSubmit(submitted: FormValues): Promise<void> {
    const fieldErrors = validateForm(submitted);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setGeneration(null);

    const input: CreateGenerationInput = {
      brandName: submitted.brandName,
      productName: submitted.productName,
      description: submitted.description,
      price: Number(submitted.price),
    };

    try {
      const created = await api.createGeneration(input);
      setGeneration(pendingGeneration(created.id, input));
      const result = await pollUntilDone(created.id);
      setGeneration(result);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      void refreshHistory();
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Marketing Content Generator</h1>
        <p className="subtitle">Describe your product and get a ready-to-share poster.</p>
      </header>

      <main>
        <div className="grid">
          <section className="card" aria-label="Poster details">
            <PosterForm
              values={values}
              errors={errors}
              disabled={
                generation !== null &&
                generation.status !== "completed" &&
                generation.status !== "failed"
              }
              onSubmit={(submitted) => void handleSubmit(submitted)}
              onChange={(next) => {
                setValues(next);
                setErrors({});
              }}
            />
          </section>

          <section aria-label="Poster preview">
            <GenerationView generation={generation} submitError={submitError} />
          </section>
        </div>

        <section className="history" aria-label="Previous generations">
          <h2>Previous generations</h2>
          <HistoryList generations={history} />
        </section>
      </main>
    </div>
  );
}
