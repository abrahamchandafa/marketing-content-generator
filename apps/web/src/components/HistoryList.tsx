import type { Generation } from "@mc/shared";
import { StatusBadge } from "./GenerationView";

export function HistoryList(props: { generations: Generation[] }): React.JSX.Element {
  const { generations } = props;

  if (generations.length === 0) {
    return <p className="empty">No previous generations yet.</p>;
  }

  return (
    <div className="history-grid">
      {generations.map((generation) => (
        <div className="history-item" key={generation.id}>
          {generation.posterUrl ? (
            <img src={generation.posterUrl} alt={`${generation.productName} poster`} />
          ) : (
            <div className="empty">No preview</div>
          )}
          <div className="meta">
            <div className="name">{generation.productName}</div>
            <StatusBadge status={generation.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
