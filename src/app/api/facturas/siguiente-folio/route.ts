import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextFolioFromRecords } from '@/lib/folios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serie = searchParams.get('serie')?.trim() || 'FAC';

  const facturas = await prisma.factura.findMany({
    where: { serie },
    select: { folio: true },
  });

  return NextResponse.json({ serie, folio: getNextFolioFromRecords(facturas) });
}
