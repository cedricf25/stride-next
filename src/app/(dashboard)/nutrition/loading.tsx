import { PageContainer, Card } from "@/components/shared";

export default function NutritionLoading() {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-7 w-32 bg-[var(--bg-muted)] rounded animate-pulse" />
          <div className="h-4 w-48 bg-[var(--bg-muted)] rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Navigation skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="h-9 w-24 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
        <div className="h-9 w-28 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card padding="md" className="lg:col-span-2">
          <div className="h-32 bg-[var(--bg-muted)] rounded animate-pulse" />
        </Card>
        <Card padding="md">
          <div className="h-32 bg-[var(--bg-muted)] rounded animate-pulse" />
        </Card>
      </div>

      {/* Section header skeleton */}
      <div className="h-6 w-40 bg-[var(--bg-muted)] rounded animate-pulse mb-4" />

      {/* Meal cards skeleton */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} padding="none">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-[var(--bg-muted)] rounded animate-pulse" />
                  <div>
                    <div className="h-5 w-24 bg-[var(--bg-muted)] rounded animate-pulse" />
                    <div className="h-4 w-16 bg-[var(--bg-muted)] rounded animate-pulse mt-1" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-6 w-20 bg-[var(--bg-muted)] rounded animate-pulse" />
                  <div className="h-3 w-32 bg-[var(--bg-muted)] rounded animate-pulse mt-1" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
