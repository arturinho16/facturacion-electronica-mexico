'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Download,
  FileText,
  Loader2,
  Mail,
  Search,
  Stamp,
  Users,
} from 'lucide-react';

type TimbreUso = {
  id: string;
  uuid: string;
  tipoCfdi: string;
  emisorRfc: string;
  emisorNombre?: string | null;
  receptorRfc?: string | null;
  receptorNombre?: string | null;
  serie?: string | null;
  folio?: string | null;
  total?: string | number | null;
  pac: string;
  ambiente: string;
  fechaTimbrado: string;
};

type ReceptorSummary = {
  receptorRfc: string;
  receptorNombre: string;
  total: number;
};

type TimbresResponse = {
  summary: {
    total: number;
    facturas: number;
    nomina: number;
  };
  porReceptor: ReceptorSummary[];
  items: TimbreUso[];
  filtros: {
    desde: string | null;
    hasta: string | null;
  };
};

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDesde() {
  const date = new Date();
  date.setDate(1);
  return toInputDate(date);
}

function defaultHasta() {
  return toInputDate(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMoney(value: string | number | null | undefined) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(number);
}

function buildParams(params: Record<string, string>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search;
}

export default function ReporteTimbresPage() {
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);
  const [tipo, setTipo] = useState('TODOS');
  const [q, setQ] = useState('');
  const [data, setData] = useState<TimbresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const params = useMemo(() => buildParams({ desde, hasta, tipo, q }), [desde, hasta, tipo, q]);
  const query = params.toString();

  useEffect(() => {
    let active = true;
    fetch(`/api/reportes/timbres?${query}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, json };
      })
      .then(({ ok, json }) => {
        if (!active) return;
        if (!ok) {
          alert(json.error || 'No se pudo cargar el reporte de timbres.');
          return;
        }
        setData(json);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const setSemanaAnterior = async () => {
    setLoading(true);
    const res = await fetch('/api/reportes/timbres?preset=semana-anterior', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      alert(json.error || 'No se pudo cargar la semana anterior.');
      return;
    }
    setData(json);
    if (json.filtros?.desde) setDesde(json.filtros.desde.slice(0, 10));
    if (json.filtros?.hasta) setHasta(json.filtros.hasta.slice(0, 10));
  };

  const exportCsv = () => {
    window.location.href = `/api/reportes/timbres/export?${params.toString()}`;
  };

  const enviarSemanaAnterior = async () => {
    setSending(true);
    const res = await fetch('/api/reportes/timbres/enviar-semanal', { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      alert(json.error || 'No se pudo enviar el reporte.');
      return;
    }
    alert(`Reporte enviado. Timbres: ${json.total}`);
  };

  const items = data?.items || [];
  const summary = data?.summary || { total: 0, facturas: 0, nomina: 0 };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Reportes</p>
              <h1 className="text-2xl font-bold text-slate-900">Timbres usados</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={setSemanaAnterior} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
              <Calendar className="h-4 w-4" /> Semana anterior
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={enviarSemanaAnterior} disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Enviar semanal
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Total</span>
              <Stamp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Facturas</span>
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{summary.facturas}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Nomina</span>
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{summary.nomina}</div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Desde</span>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Hasta</span>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="TODOS">Todos</option>
                <option value="FACTURA">Factura</option>
                <option value="NOMINA">Nomina</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-500">Buscar</span>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="UUID, RFC, nombre, serie o folio" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
              </div>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-slate-900">Por receptor</h2>
            </div>
            <div className="space-y-3">
              {(data?.porReceptor || []).length === 0 && <p className="text-sm text-slate-500">Sin timbres en el periodo.</p>}
              {(data?.porReceptor || []).map((row) => (
                <div key={`${row.receptorRfc}-${row.receptorNombre}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{row.receptorNombre}</p>
                      <p className="text-xs font-semibold text-slate-500">{row.receptorRfc}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">{row.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">Detalle</h2>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">UUID</th>
                    <th className="px-4 py-3">Serie/Folio</th>
                    <th className="px-4 py-3">Receptor</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">PAC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.fechaTimbrado)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.tipoCfdi === 'FACTURA' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.tipoCfdi}</span>
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-slate-600" title={item.uuid}>{item.uuid}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{[item.serie, item.folio].filter(Boolean).join('-') || '-'}</td>
                      <td className="min-w-[220px] px-4 py-3">
                        <p className="font-semibold text-slate-800">{item.receptorNombre || '-'}</p>
                        <p className="text-xs text-slate-500">{item.receptorRfc || '-'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-800">{formatMoney(item.total)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.pac} / {item.ambiente}</td>
                    </tr>
                  ))}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Sin timbres para los filtros seleccionados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
