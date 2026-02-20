import TrainingPlanForm from "@/components/training/TrainingPlanForm";

export default function NewTrainingPlanPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Nouveau plan d&apos;entraînement
      </h1>
      <TrainingPlanForm />
    </div>
  );
}
