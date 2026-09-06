import type { Generation } from "@mc/shared";

const STATUS_LABELS: Record<Generation["status"], string> = {
  pending: "Queued…",
  generating: "Generating artwork…",
  composing: "Composing poster…",
  completed: "Completed",
  failed: "Failed",
};

export function StatusBadge(props: { status: Generation["status"] }): React.JSX.Element {
  const { status } = props;
  return (
    <span
      className={
        status === "failed"
          ? "status-failed"
          : status === "completed"
            ? "status-completed"
            : "status"
      }
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function GenerationView(props: {
  generation: Generation | null;
  submitError: string | null;
}): React.JSX.Element {
  const { generation, submitError } = props;

  if (submitError) {
    return (
      <div className="card">
        <p className="banner-error">{submitError}</p>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="card">
        <p className="empty">Fill in the details and generate your poster. It will appear here.</p>
      </div>
    );
  }

  if (generation.status === "completed" && generation.posterUrl) {
    return (
      <div className="card poster">
        <img src={generation.posterUrl} alt={`${generation.productName} poster`} />
      </div>
    );
  }

  if (generation.status === "failed") {
    return (
      <div className="card">
        <p className="banner-error">
          {generation.error ?? "We couldn't generate your poster. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="status">
        <span className="spinner" aria-hidden="true" />
        <span role="status">{STATUS_LABELS[generation.status]}</span>
      </div>
    </div>
  );
}
