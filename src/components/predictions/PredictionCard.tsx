import type { RacePredictionData } from "@/actions/predictions";

const distanceIcons: Record<string, string> = {
  "5km": "5K",
  "10km": "10K",
  "semi-marathon": "21K",
  "marathon": "42K",
  "trail": "50K",
};

function confidenceColor(confidence: number) {
  if (confidence >= 70) return "text-green-700 bg-green-50 border-green-200";
  if (confidence >= 40) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
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
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceColor(prediction.confidence)}`}
          >
            {prediction.confidence}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
          <div
            className={`h-1.5 rounded-full transition-all ${confidenceBarColor(prediction.confidence)}`}
            style={{ width: `${prediction.confidence}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {prediction.comment}
      </p>
    </div>
  );
}
