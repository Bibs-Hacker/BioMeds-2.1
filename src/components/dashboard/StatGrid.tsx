export function StatGrid({
  stats,
}: {
  stats: Record<string, number | undefined>;
}) {
  return (
    <div className="stats-grid">
      {Object.entries(stats).map(([label, value]) => (
        <article className="panel stat" key={label}>
          <span>{label}</span>
          <b>{value ?? "—"}</b>
          <small>Current database selection</small>
        </article>
      ))}
    </div>
  );
}
