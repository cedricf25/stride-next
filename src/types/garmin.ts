export interface GarminActivity {
  activityId: number;
  activityName: string;
  startTimeLocal: string;
  distance: number;
  duration: number;
  movingDuration: number;
  averageSpeed: number;
  averageHR: number;
  maxHR: number;
  calories: number;
  elevationGain: number;
  elevationLoss: number;
  averageRunningCadenceInStepsPerMinute: number;
  aerobicTrainingEffect: number;
  anaerobicTrainingEffect: number;
  vo2max: number;
  activityType: {
    typeKey: string;
  };
}

export interface FormattedActivity {
  id: number;
  name: string;
  date: string;
  distance: string;
  duration: string;
  pace: string;
  averageHR: number;
  maxHR: number;
  calories: number;
  elevationGain: number;
  cadence: number;
  aerobicTE?: number;
  anaerobicTE?: number;
  vo2max?: number;
  strideLength?: number;
}

export interface ActivitiesResponse {
  activities: FormattedActivity[];
  rawActivities: GarminActivity[];
  error?: string;
}

export interface AnalysisResponse {
  analysis: string;
  error?: string;
}
