import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import NominaWizard from './components/NominaWizard';

export default function NominaMasivaPage() {
    return (
        <div className="mx-auto max-w-7xl p-4 md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link href="/" className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar al Panel
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Nómina masiva (Wizard profesional)</h1>
                </div>
                <Link href="/empleados" className="inline-flex items-center justify-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
                    <Users size={18} />
                    Empleados
                </Link>
            </div>
            <NominaWizard />
        </div>
    );
}
