import { prisma } from '@/lib/db/prisma'

export const BUNDLES = {
  '1hr': { hours: 1, priceRands: 100, label: '1 Hour' },
  '5hr': { hours: 5, priceRands: 450, label: '5 Hours' },
  '10hr': { hours: 10, priceRands: 800, label: '10 Hours' },
} as const

export type BundleType = keyof typeof BUNDLES

/**
 * Get the remaining balance (in minutes) for a parent's students.
 */
export async function getRemainingMinutes(parentId: string): Promise<number> {
  const bundles = await prisma.hourBundle.findMany({
    where: {
      parentId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })

  const totalMinutes = bundles.reduce((sum, b) => {
    const remaining = (b.hoursTotal - b.hoursUsed) * 60
    return sum + Math.max(0, remaining)
  }, 0)

  return Math.round(totalMinutes)
}

/**
 * Deduct session time from the parent's oldest active bundle.
 */
export async function deductSessionTime(
  parentId: string,
  minutes: number
): Promise<{ success: boolean; remainingMinutes: number }> {
  const bundles = await prisma.hourBundle.findMany({
    where: {
      parentId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { purchasedAt: 'asc' },
  })

  let minutesToDeduct = minutes

  for (const bundle of bundles) {
    const remainingHours = bundle.hoursTotal - bundle.hoursUsed
    const remainingMinutesInBundle = remainingHours * 60

    if (remainingMinutesInBundle <= 0) continue

    const deduction = Math.min(minutesToDeduct, remainingMinutesInBundle)
    await prisma.hourBundle.update({
      where: { id: bundle.id },
      data: { hoursUsed: bundle.hoursUsed + deduction / 60 },
    })

    minutesToDeduct -= deduction
    if (minutesToDeduct <= 0) break
  }

  const newRemaining = await getRemainingMinutes(parentId)

  return {
    success: minutesToDeduct <= 0,
    remainingMinutes: newRemaining,
  }
}

/**
 * Create a new hour bundle after successful payment.
 */
export async function createBundle(
  parentId: string,
  bundleType: BundleType,
  paystackRef: string
): Promise<string> {
  const bundle = BUNDLES[bundleType]

  const result = await prisma.$transaction(async (tx) => {
    const hourBundle = await tx.hourBundle.create({
      data: {
        parentId,
        hoursTotal: bundle.hours,
        hoursUsed: 0,
      },
    })

    await tx.payment.create({
      data: {
        parentId,
        bundleId: hourBundle.id,
        amountCents: bundle.priceRands * 100,
        paystackRef,
        status: 'SUCCESS',
      },
    })

    return hourBundle.id
  })

  return result
}
