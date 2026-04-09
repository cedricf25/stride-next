// Mapping jour de la semaine français → numéro (lundi = 1, dimanche = 7)
const dayOfWeekMap: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

export function getSessionDate(
  planStartDate: Date,
  weekNumber: number,
  dayOfWeek: string
): Date {
  const dayNum = dayOfWeekMap[dayOfWeek.toLowerCase()] ?? 1;
  const date = new Date(planStartDate);
  // Semaine 1 commence à planStartDate, on ajuste au bon jour
  const startDayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // getDay: 0=dim, 1=lun...
  const daysToAdd = (weekNumber - 1) * 7 + (dayNum - startDayOfWeek);
  date.setDate(date.getDate() + daysToAdd);
  return date;
}
