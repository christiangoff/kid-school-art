/** "4 years old", or "18 months old" for little ones. */
export function ageLabel(birthdate: string, today = new Date()): string {
  const born = new Date(`${birthdate}T00:00:00`);
  let months = (today.getFullYear() - born.getFullYear()) * 12 + today.getMonth() - born.getMonth();
  if (today.getDate() < born.getDate()) months--;
  if (months < 0) return "";
  if (months < 24) return `${months} ${months === 1 ? "month" : "months"} old`;
  const years = Math.floor(months / 12);
  return `${years} years old`;
}
