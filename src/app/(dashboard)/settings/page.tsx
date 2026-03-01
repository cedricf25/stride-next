import { Palette, Watch, RefreshCw } from "lucide-react";
import { PageContainer, Card, SectionHeader } from "@/components/shared";
import ThemeToggle from "@/components/settings/ThemeToggle";
import GarminSettings from "@/components/settings/GarminSettings";
import ResyncSplitsButton from "@/components/settings/ResyncSplitsButton";
import { getGarminConnectionStatus } from "@/actions/settings";

export default async function SettingsPage() {
  const garminStatus = await getGarminConnectionStatus();

  return (
    <PageContainer maxWidth="2xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Paramètres
      </h1>

      <div className="space-y-6">
        <Card>
          <SectionHeader
            icon={<Watch className="h-5 w-5 text-orange-500" />}
            title="Garmin Connect"
            className="mb-4"
          />
          <GarminSettings
            initialUsername={garminStatus.username}
            isConfigured={garminStatus.isConfigured}
          />
        </Card>

        <Card>
          <SectionHeader
            icon={<RefreshCw className="h-5 w-5 text-green-600" />}
            title="Données d'activités"
            className="mb-4"
          />
          <ResyncSplitsButton />
        </Card>

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
