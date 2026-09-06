import type {
  CreateGenerationInput,
  CreateGenerationResponse,
  Generation,
  ListGenerationsResponse,
} from "@mc/shared";

export const API_BASE = "/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      message = "Something went wrong. Please try again.";
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResponse> {
    return fetch(`${API_BASE}/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<CreateGenerationResponse>(res));
  },

  getGeneration(id: string): Promise<Generation> {
    return fetch(`${API_BASE}/generations/${id}`).then((res) => parseJson<Generation>(res));
  },

  listGenerations(): Promise<ListGenerationsResponse> {
    return fetch(`${API_BASE}/generations`).then((res) => parseJson<ListGenerationsResponse>(res));
  },
};

export async function pollUntilDone(
  id: string,
  getGeneration: (id: string) => Promise<Generation> = api.getGeneration,
  intervalMs = 1000,
  timeoutMs = 180_000,
): Promise<Generation> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const generation = await getGeneration(id);
    if (generation.status === "completed" || generation.status === "failed") {
      return generation;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out while waiting for your poster. Please try again.");
}
