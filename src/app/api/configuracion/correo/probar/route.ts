import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { getActiveConfig, getMailTransport } from '@/lib/configuracion';

export async function POST() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const config = await getActiveConfig();
  const destino = config?.correoRemitenteEmail || config?.email || config?.correoUsuario;
  if (!destino) return NextResponse.json({ error: 'Agrega un correo de prueba en el perfil o en correo saliente.' }, { status: 400 });

  const { transporter, from } = await getMailTransport();
  await transporter.sendMail({
    from,
    to: destino,
    subject: 'Prueba de correo - TuFisTi',
    text: 'Tu correo saliente quedó conectado correctamente.',
    html: '<p>Tu correo saliente quedó conectado correctamente.</p>',
  });

  return NextResponse.json({ ok: true, message: `Correo de prueba enviado a ${destino}` });
}
