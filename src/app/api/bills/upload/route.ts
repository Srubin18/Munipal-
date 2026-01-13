import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { parseCojBill } from '@/lib/parsers/coj-bill';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const propertyId = formData.get('propertyId') as string;

    if (!file || !propertyId) {
      return NextResponse.json(
        { error: 'File and propertyId are required' },
        { status: 400 }
      );
    }

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId: user.id,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Upload file to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { path: filePath, url: fileUrl } = await uploadFile(
      buffer,
      file.name,
      `bills/${user.id}`
    );

    // Parse the bill
    let parsedData = null;
    let parseError = null;

    try {
      parsedData = await parseCojBill(buffer);
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Failed to parse bill';
    }

    // Create bill record
    const bill = await prisma.bill.create({
      data: {
        propertyId,
        fileName: file.name,
        fileUrl,
        billDate: parsedData?.billDate || null,
        dueDate: parsedData?.dueDate || null,
        periodStart: parsedData?.periodStart || null,
        periodEnd: parsedData?.periodEnd || null,
        totalDue: parsedData?.totalDue || null,
        previousBalance: parsedData?.previousBalance || null,
        currentCharges: parsedData?.currentCharges || null,
        vatAmount: parsedData?.vatAmount || null,
        parsedData: parsedData ? JSON.parse(JSON.stringify(parsedData)) : undefined,
        parseError,
        lineItems: parsedData?.lineItems
          ? {
              create: parsedData.lineItems.map((item: any) => ({
                serviceType: item.serviceType,
                description: item.description,
                quantity: item.quantity || null,
                unitPrice: item.unitPrice || null,
                amount: item.amount,
                tariffCode: item.tariffCode || null,
                isEstimated: item.isEstimated || false,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json({ success: true, billId: bill.id });
  } catch (error) {
    console.error('Bill upload error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
