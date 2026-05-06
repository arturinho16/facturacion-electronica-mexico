'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState({ nombreComercial: 'TuFisTi Autofacturador', logoUrl: '' });

  useEffect(() => {
    fetch('/api/public/branding', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setBranding({
          nombreComercial: data.nombreComercial || 'TuFisTi Autofacturador',
          logoUrl: data.logoUrl || '',
        });
      })
      .catch(() => undefined);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setError(data.error || 'No se pudo iniciar sesión.');
    router.replace(next);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <p className="mb-3 text-sm font-bold uppercase text-slate-500">{branding.nombreComercial}</p>
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo de la empresa" className="h-full w-full object-contain p-2" />
            ) : (
              <Building2 className="h-10 w-10 text-slate-300" />
            )}
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-800">Acceso al sistema</h1>
        <input className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500" placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500" placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Entrando...' : 'Iniciar sesión'}
        </button>
        <p className="text-center text-xs text-slate-500">Primer acceso: admin@tufisti.com / admin123</p>
      </form>
    </main>
  );
}
