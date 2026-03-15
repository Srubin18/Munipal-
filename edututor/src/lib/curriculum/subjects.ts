/**
 * South African curriculum subject definitions for CAPS and IEB.
 * Used to seed the database and populate subject selection UI.
 */

export interface SubjectDefinition {
  name: string
  grades: number[]
  curricula: ('CAPS' | 'IEB')[]
}

export const SA_SUBJECTS: SubjectDefinition[] = [
  // Core subjects (both curricula, all grades)
  { name: 'Mathematics', grades: [8, 9, 10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Mathematical Literacy', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'English Home Language', grades: [8, 9, 10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'English First Additional Language', grades: [8, 9, 10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Afrikaans Home Language', grades: [8, 9, 10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Afrikaans First Additional Language', grades: [8, 9, 10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Life Orientation', grades: [8, 9, 10, 11, 12], curricula: ['CAPS', 'IEB'] },

  // Sciences
  { name: 'Physical Sciences', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Life Sciences', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Natural Sciences', grades: [8, 9], curricula: ['CAPS', 'IEB'] },

  // Social Sciences
  { name: 'Geography', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'History', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Social Sciences', grades: [8, 9], curricula: ['CAPS', 'IEB'] },

  // Commerce
  { name: 'Accounting', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Business Studies', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Economics', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },

  // Technology
  { name: 'Information Technology', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Computer Applications Technology', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Technology', grades: [8, 9], curricula: ['CAPS', 'IEB'] },

  // Creative Arts
  { name: 'Visual Arts', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Dramatic Arts', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Music', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Creative Arts', grades: [8, 9], curricula: ['CAPS', 'IEB'] },

  // Additional IEB subjects
  { name: 'Advanced Programme Mathematics', grades: [10, 11, 12], curricula: ['IEB'] },
  { name: 'Advanced Programme English', grades: [10, 11, 12], curricula: ['IEB'] },

  // Other
  { name: 'Engineering Graphics and Design', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Consumer Studies', grades: [10, 11, 12], curricula: ['CAPS'] },
  { name: 'Tourism', grades: [10, 11, 12], curricula: ['CAPS', 'IEB'] },
  { name: 'Agricultural Sciences', grades: [10, 11, 12], curricula: ['CAPS'] },
]

/**
 * Get subjects available for a specific grade and curriculum.
 */
export function getSubjectsForGrade(
  grade: number,
  curriculum: 'CAPS' | 'IEB'
): SubjectDefinition[] {
  return SA_SUBJECTS.filter(
    (s) => s.grades.includes(grade) && s.curricula.includes(curriculum)
  )
}
