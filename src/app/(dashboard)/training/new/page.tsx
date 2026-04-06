import TrainingPlanForm from "@/components/training/TrainingPlanForm";
import { PageContainer, BackLink } from "@/components/shared";

export default function NewTrainingPlanPage() {
  return (
    <PageContainer maxWidth="2xl">
      <BackLink href="/training" label="Entraînement" />
      <h1 className="mt-4 mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Crée ton plan d&apos;entraînement
      </h1>
      <TrainingPlanForm />
    </PageContainer>
  );
}
