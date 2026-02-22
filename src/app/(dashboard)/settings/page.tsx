import { Palette } from "lucide-react";
import { PageContainer, Card, SectionHeader } from "@/components/shared";
import ThemeToggle from "@/components/settings/ThemeToggle";

export default function SettingsPage() {
  return (
    <PageContainer maxWidth="2xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Paramètres
      </h1>

      <div className="space-y-6">
        <Card>
          <SectionHeader
            icon={<Palette className="h-5 w-5 text-blue-600" />}
            title="Apparence"
            className="mb-4"
          />
          <ThemeToggle />
        </Card>
      </div>
    </PageContainer>
  );
}
