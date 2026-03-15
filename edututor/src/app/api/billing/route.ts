import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BUNDLES, type BundleType, createBundle, getRemainingMinutes } from '@/lib/billing/billing-service'

const purchaseSchema = z.object({
  parentId: z.string(),
  bundleType: z.enum(['1hr', '5hr', '10hr']),
  paystackRef: z.string(),
})

/**
 * GET /api/billing?parentId=xxx - Get remaining balance
 */
export async function GET(request: NextRequest) {
  const parentId = request.nextUrl.searchParams.get('parentId')
  if (!parentId) {
    return NextResponse.json({ error: 'parentId required' }, { status: 400 })
  }

  const remainingMinutes = await getRemainingMinutes(parentId)

  return NextResponse.json({
    remainingMinutes,
    remainingHours: Math.round((remainingMinutes / 60) * 10) / 10,
    bundles: BUNDLES,
  })
}

/**
 * POST /api/billing - Record a successful purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = purchaseSchema.parse(body)

    const bundleId = await createBundle(
      data.parentId,
      data.bundleType as BundleType,
      data.paystackRef
    )

    const remainingMinutes = await getRemainingMinutes(data.parentId)

    return NextResponse.json({
      success: true,
      bundleId,
      remainingMinutes,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('Billing error:', err)
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
  }
}
