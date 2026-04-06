export interface TrainingPlanFormState {
  raceType: string;
  raceDate: string;
  startDate: string;
  targetDistance: string;
  targetElevation: string;
  targetTime: string;
  trainingDays: string[];
  longRunDay: string;
  planningMode: "time" | "distance";
  includeStrength: boolean;
  strengthFrequency: number;
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
  trainingDays: ["mardi", "jeudi", "samedi", "dimanche"],
  longRunDay: "dimanche",
  planningMode: "time",
  includeStrength: false,
  strengthFrequency: 2,
  loading: false,
  error: "",
};

export type TrainingPlanFormAction =
  | { type: "SET_FIELD"; field: keyof TrainingPlanFormState; value: string | number | boolean | string[] }
  | { type: "SET_RACE_TYPE"; value: string }
  | { type: "TOGGLE_TRAINING_DAY"; day: string }
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
    case "TOGGLE_TRAINING_DAY": {
      const day = action.day;
      // Ne pas désélectionner le jour de sortie longue
      if (day === state.longRunDay && state.trainingDays.includes(day)) {
        return state;
      }
      const days = state.trainingDays.includes(day)
        ? state.trainingDays.filter((d) => d !== day)
        : [...state.trainingDays, day];
      const maxStrength = 7 - days.length;
      return {
        ...state,
        trainingDays: days,
        strengthFrequency: Math.min(state.strengthFrequency, maxStrength),
      };
    }
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
