import TrainingPlanForm from "@/components/training/TrainingPlanForm";
import { PageContainer } from "@/components/shared";

export default function NewTrainingPlanPage() {
  return (
    <PageContainer maxWidth="2xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Nouveau plan d&apos;entraînement
      </h1>
      <TrainingPlanForm />
    </PageContainer>
  );
}
