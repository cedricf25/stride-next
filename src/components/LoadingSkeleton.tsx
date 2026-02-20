export default function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Activity cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-6"
          >
            <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mb-4 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI Analysis skeleton */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-40 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
