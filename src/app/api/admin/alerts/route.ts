/**
 * Admin API: Missing Tariff Alerts
 *
 * GET /api/admin/alerts - List all alerts
 * PUT /api/admin/alerts - Update alert status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function isAdminRequest(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV === 'development';
}

/**
 * GET: List missing tariff alerts
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;

    const alerts = await prisma.missingTariffAlert.findMany({
      where: {
        ...(status && { status }),
        ...(priority && { priority }),
      },
      orderBy: [
        { priority: 'asc' }, // critical first
        { affectedAnalysisCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Get summary stats
    const stats = await prisma.missingTariffAlert.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts = stats.reduce((acc, s) => {
      acc[s.status] = s._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      alerts,
      stats: {
        total: alerts.length,
        ...statusCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update alert status
 */
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { alertId, status, resolvedBy, priority } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'alertId required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = resolvedBy;
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    await prisma.missingTariffAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
