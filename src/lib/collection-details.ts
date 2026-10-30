/** "Little Oaks · Ms. Rivera · Preschool · 2026–2027", skipping blanks. */
export function collectionDetails(c: { school: string | null; teacher: string | null; grade: string | null; schoolYear: string | null }): string {
  return [c.school, c.teacher, c.grade, c.schoolYear].filter(Boolean).join(" · ");
}
