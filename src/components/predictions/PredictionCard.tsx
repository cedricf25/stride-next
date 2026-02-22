import type { RacePredictionData } from "@/actions/predictions";
import { Card, ProgressBar, Badge } from "@/components/shared";

const distanceIcons: Record<string, string> = {
  "5km": "5K",
  "10km": "10K",
  "semi-marathon": "21K",
  "marathon": "42K",
  "trail": "50K",
};

function confidenceBadgeColor(confidence: number): "green" | "orange" | "red" {
  if (confidence >= 70) return "green";
  if (confidence >= 40) return "orange";
  return "red";
}

function confidenceBarColor(confidence: number) {
  if (confidence >= 70) return "bg-green-500";
  if (confidence >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function PredictionCard({
  prediction,
}: {
  prediction: RacePredictionData;
}) {
  const badge = distanceIcons[prediction.distance] ?? prediction.distance;

  return (
    <Card padding="md" hover>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            {badge}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">{prediction.label}</h3>
            <p className="text-xs text-gray-500">{prediction.predictedPace}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">
            {prediction.predictedTime}
          </p>
        </div>
      </div>

      {/* Confidence */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Fiabilité</span>
          <Badge color={confidenceBadgeColor(prediction.confidence)} variant="outline">
            {prediction.confidence}%
          </Badge>
        </div>
        <ProgressBar
          value={prediction.confidence}
          color={confidenceBarColor(prediction.confidence)}
          className="mt-1"
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {prediction.comment}
      </p>
    </Card>
  );
}
