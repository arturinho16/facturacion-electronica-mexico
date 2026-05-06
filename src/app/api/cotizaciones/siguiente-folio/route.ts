import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextFolioFromRecords } from '@/lib/folios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serie = searchParams.get('serie')?.trim() || 'COT';

  const cotizaciones = await prisma.cotizacion.findMany({
    where: { serie },
    select: { folio: true },
  });

  return NextResponse.json({ serie, folio: getNextFolioFromRecords(cotizaciones) });
}
