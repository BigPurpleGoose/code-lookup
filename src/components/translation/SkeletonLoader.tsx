export default function SkeletonLoader() {
  return (
    <div
      className="animate-fade-in p-4 space-y-3"
      aria-label="Loading translation…"
      role="status"
    >
      {[100, 85, 92, 78, 95].map((width, i) => (
        <div key={i} className="flex gap-3 items-start">
          {/* Semantic role */}
          <div
            className="animate-skeleton-pulse h-5 rounded"
            style={{
              width: "18%",
              backgroundColor: "var(--color-surface-raised)",
            }}
          />
          {/* Token badge */}
          <div
            className="animate-skeleton-pulse h-5 rounded-full"
            style={{
              width: "12%",
              backgroundColor: "var(--color-surface-raised)",
            }}
          />
          {/* Code element */}
          <div
            className="animate-skeleton-pulse h-5 rounded font-mono"
            style={{
              width: "20%",
              backgroundColor: "var(--color-surface-raised)",
            }}
          />
          {/* Plain English */}
          <div className="flex-1 space-y-1.5">
            <div
              className="animate-skeleton-pulse h-4 rounded"
              style={{
                width: `${width}%`,
                backgroundColor: "var(--color-surface-raised)",
              }}
            />
            {i % 2 === 0 && (
              <div
                className="animate-skeleton-pulse h-4 rounded"
                style={{
                  width: `${width - 20}%`,
                  backgroundColor: "var(--color-surface-raised)",
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
