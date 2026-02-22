import { fetchSleepHistory } from "@/actions/health";
import BodyBatteryHistoryChart from "@/components/health/BodyBatteryHistoryChart";
import { PageContainer, BackLink, DataTable } from "@/components/shared";

export const dynamic = "force-dynamic";

export default async function BodyBatteryDetailPage() {
  const data = await fetchSleepHistory(90);

  const withBB = data.filter((d) => d.endBodyBattery != null);
  const endValues = withBB.map((d) => d.endBodyBattery!);
  const changes = withBB.map((d) => d.bodyBatteryChange).filter((c): c is number => c != null);

  const avgEnd = endValues.length > 0 ? Math.round(endValues.reduce((a, b) => a + b, 0) / endValues.length) : null;
  const minEnd = endValues.length > 0 ? Math.min(...endValues) : null;
  const maxEnd = endValues.length > 0 ? Math.max(...endValues) : null;
  const avgChange = changes.length > 0 ? Math.round(changes.reduce((a, b) => a + b, 0) / changes.length) : null;

  const stats = [
    { label: "Recharge moyenne", value: avgChange != null ? `+${avgChange}` : "—" },
    { label: "Niveau fin nuit", value: avgEnd != null ? `${avgEnd}/100` : "—" },
    { label: "Minimum", value: minEnd != null ? `${minEnd}` : "—" },
    { label: "Maximum", value: maxEnd != null ? `${maxEnd}` : "—" },
  ];

  type SleepRow = (typeof data)[number];

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "px-4 py-2 font-medium text-gray-900",
      render: (d: SleepRow) =>
        new Date(d.calendarDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    {
      key: "start",
      header: "Début nuit",
      render: (d: SleepRow) =>
        d.startBodyBattery != null ? d.startBodyBattery : "—",
    },
    {
      key: "end",
      header: "Fin nuit",
      render: (d: SleepRow) =>
        d.endBodyBattery != null ? (
          <span className={`font-medium ${
            d.endBodyBattery >= 75 ? "text-green-600" :
            d.endBodyBattery >= 50 ? "text-blue-600" :
            d.endBodyBattery >= 25 ? "text-orange-600" : "text-red-600"
          }`}>
            {d.endBodyBattery}
          </span>
        ) : "—",
    },
    {
      key: "change",
      header: "Variation",
      render: (d: SleepRow) => {
        const change = d.bodyBatteryChange;
        return change != null ? (
          <span className={`font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : ""}{change}
          </span>
        ) : "—";
      },
    },
  ];

  return (
    <PageContainer>
      <BackLink href="/health" label="Retour à la santé" />

      <h1 className="mb-1 text-2xl font-bold text-gray-900">Body Battery</h1>
      <p className="mb-6 text-sm text-gray-500">90 derniers jours — {withBB.length} nuits enregistrées</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <BodyBatteryHistoryChart data={data} />

      <DataTable
        columns={columns}
        data={[...data].reverse()}
        rowKey={(d) => d.calendarDate.toISOString()}
        className="mt-6"
      />
    </PageContainer>
  );
}
