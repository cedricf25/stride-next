export interface TrainingPlanFormState {
  raceType: string;
  raceDate: string;
  startDate: string;
  targetDistance: string;
  targetElevation: string;
  targetTime: string;
  daysPerWeek: number;
  longRunDay: string;
  loading: boolean;
  error: string;
}

export const initialState: TrainingPlanFormState = {
  raceType: "semi-marathon",
  raceDate: "",
  startDate: "",
  targetDistance: "",
  targetElevation: "",
  targetTime: "",
  daysPerWeek: 4,
  longRunDay: "dimanche",
  loading: false,
  error: "",
};

export type TrainingPlanFormAction =
  | { type: "SET_FIELD"; field: keyof TrainingPlanFormState; value: string | number }
  | { type: "SET_RACE_TYPE"; value: string }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "SET_ERROR"; value: string }
  | { type: "RESET" };

export function trainingPlanFormReducer(
  state: TrainingPlanFormState,
  action: TrainingPlanFormAction,
): TrainingPlanFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_RACE_TYPE":
      return {
        ...state,
        raceType: action.value,
        ...(action.value !== "trail" ? { targetDistance: "", targetElevation: "" } : {}),
      };
    case "SET_LOADING":
      return { ...state, loading: action.value };
    case "SET_ERROR":
      return { ...state, error: action.value, loading: false };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}
