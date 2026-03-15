/**
 * Seed script: Populates the database with SA curriculum subjects.
 * Run with: npx tsx scripts/seed-subjects.ts
 */
import { PrismaClient, Curriculum } from '@prisma/client'
import { SA_SUBJECTS } from '../src/lib/curriculum/subjects'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding subjects...')

  let created = 0
  for (const subject of SA_SUBJECTS) {
    for (const grade of subject.grades) {
      for (const curriculum of subject.curricula) {
        await prisma.subject.upsert({
          where: {
            name_grade_curriculum: {
              name: subject.name,
              grade,
              curriculum: curriculum as Curriculum,
            },
          },
          update: {},
          create: {
            name: subject.name,
            grade,
            curriculum: curriculum as Curriculum,
          },
        })
        created++
      }
    }
  }

  console.log(`Seeded ${created} subject entries`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
