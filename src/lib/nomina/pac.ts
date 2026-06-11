import { timbrarNominaFinkok } from "@/lib/sat/timbrarNominaFinkok";

export async function enviarAPAC(xmlFirmado: string) {
  const result = await timbrarNominaFinkok(xmlFirmado);
  return result.xmlTimbrado;
}
