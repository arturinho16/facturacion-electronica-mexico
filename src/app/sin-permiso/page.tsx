export default function SinPermisoPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white border rounded-2xl p-6 text-center">
                <h1 className="text-2xl font-bold text-red-600">Sin permiso</h1>
                <p className="mt-2 text-slate-600">Tu usuario no tiene acceso a este módulo. Solicita al administrador que habilite el permiso en Configuración &gt; Usuarios.</p>
            </div>
        </main>
    );
}
