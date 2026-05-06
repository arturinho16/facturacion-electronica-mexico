'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { formatMoneyMX } from '@/lib/formatos';
import { SAT_NOMINA_CATALOGOS } from '@/lib/nomina/catalogos';

type Row = {
    id: string;
    empleadoId?: string;
    empleadoNombre: string;
    empleadoRfc: string;
    fechaPago: string;
    diasPagados?: number;
    totalPercepciones: number;
    totalDeducciones: number;
    totalNeto: number;
    estado: string;
    calculo?: {
        sueldoDiario: number;
        isrCausado: number;
        subsidioAplicado: number;
        isrRetenido: number;
        reglaIsr: string;
        observaciones: string[];
    };
};

type ValidationDetail = {
    id: string;
    empleadoNombre: string;
    codigo: string;
    mensaje: string;
};

type HistoryItem = {
    clave: string;
    fechaInicial: string;
    fechaFinal: string;
    fechaPago: string;
    estado: string;
    total: number;
    timbrados: number;
    borradores: number;
    enProceso: number;
    errores: number;
    totalPercepciones: number;
    totalDeducciones: number;
    totalNeto: number;
};

type PeriodoState = {
    tipoNomina: string;
    fechaPago: string;
    fechaInicial: string;
    fechaFinal: string;
    numDiasPagados: number;
    estado: string;
    totalEmpleados: number;
    conRecibo: number;
};

type DeduccionExtra = {
    tipoDeduccion: string;
    clave: string;
    concepto: string;
    importe: number;
};

const steps = [
    '1. Período',
    '2. Empleados',
    '3. Validación',
    '4. Timbrado',
    '5. Finalización',
];

export default function NominaWizard() {
    const fmt = formatMoneyMX;
    const [step, setStep] = useState(0);
    const [inicio, setInicio] = useState('');
    const [fin, setFin] = useState('');
    const [rows, setRows] = useState<Row[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [validation, setValidation] = useState<{ ok: number; fail: number; details: ValidationDetail[] }>({ ok: 0, fail: 0, details: [] });
    const [processing, setProcessing] = useState(false);
    const [processed, setProcessed] = useState(0);
    const [failed, setFailed] = useState(0);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [periodo, setPeriodo] = useState<PeriodoState | null>(null);
    const [deduccionesExtra, setDeduccionesExtra] = useState<DeduccionExtra[]>([]);
    const [deduccionForm, setDeduccionForm] = useState<DeduccionExtra>({
        tipoDeduccion: '',
        clave: '',
        concepto: '',
        importe: 0,
    });
    const [timbradoErrors, setTimbradoErrors] = useState<Array<{ reciboId: string; error: string }>>([]);

    const selectedRows = useMemo(() => rows.filter((r) => selected.includes(r.id)), [rows, selected]);

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch('/api/nomina/wizard/historial');
            const data = await res.json();
            if (res.ok) setHistory(data.items || []);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const loadPeriodo = async () => {
        if (!inicio || !fin) return alert('Selecciona fechas');
        const res = await fetch(`/api/nomina/wizard/periodo?inicio=${inicio}&fin=${fin}`);
        const data = await res.json();
        if (!res.ok) return alert(data.error || 'Error cargando empleados');
        setRows(data.items || []);
        setPeriodo(data.periodo || null);
        setSelected((data.items || []).map((x: Row) => x.id));
        setStep(1);
    };

    const loadPreview = async () => {
        const res = await fetch('/api/nomina/wizard/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reciboIds: selected, inicio, fin, deduccionesExtra }),
        });
        const data = await res.json();
        if (!res.ok) return alert(data.error || 'Error en preview');

        setRows(data.items || []);
        setPeriodo(data.periodo ? { ...data.periodo, estado: 'BORRADOR', totalEmpleados: data.items?.length || 0, conRecibo: data.items?.length || 0 } : periodo);
        setSelected((data.items || []).map((x: Row) => x.id));
        if (data.rechazados?.length) {
            alert(`Se omitieron ${data.rechazados.length} empleados con datos incompletos.`);
        }
        await loadHistory();
        setStep(2);
    };

    const runValidation = async () => {
        const res = await fetch('/api/nomina/wizard/validar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reciboIds: selected }),
        });
        const data = await res.json();
        if (!res.ok) return alert(data.error || 'Error al validar');
        setValidation({
            ok: data.ok || 0,
            fail: data.fail || 0,
            details: data.details || [],
        });
        setStep(3);
    };

    const runTimbrado = async () => {
        if (validation.fail > 0) return alert('Corrige las validaciones SAT antes de timbrar.');
        setProcessing(true);
        setProcessed(0);
        setFailed(0);
        setTimbradoErrors([]);

        for (const reciboId of selected) {
            const res = await fetch('/api/nomina/wizard/timbrar-masivo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reciboId }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const details = Array.isArray(data.errores)
                    ? data.errores.map((error: { codigo?: string; mensaje?: string }) => `${error.codigo || 'ERROR'}: ${error.mensaje || ''}`).join(' ')
                    : '';
                setFailed((x) => x + 1);
                setTimbradoErrors((prev) => [...prev, { reciboId, error: `${data.error || 'Error al timbrar.'}${details ? ` ${details}` : ''}` }]);
            }
            setProcessed((x) => x + 1);
        }

        setProcessing(false);
        await loadHistory();
        setStep(4);
    };

    const addDeduccion = () => {
        if (!deduccionForm.tipoDeduccion || !deduccionForm.concepto || Number(deduccionForm.importe) <= 0) {
            alert('Selecciona tipo, concepto e importe de la deducción.');
            return;
        }

        setDeduccionesExtra((prev) => [
            ...prev,
            {
                tipoDeduccion: deduccionForm.tipoDeduccion,
                clave: deduccionForm.clave || `D${String(prev.length + 10).padStart(3, '0')}`,
                concepto: deduccionForm.concepto,
                importe: Number(deduccionForm.importe),
            },
        ]);
        setDeduccionForm({ tipoDeduccion: '', clave: '', concepto: '', importe: 0 });
    };

    const finalizar = async () => {
        const res = await fetch('/api/nomina/wizard/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reciboIds: selected }),
        });
        if (!res.ok) return alert((await res.json()).error || 'Error al finalizar');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nomina-${inicio}-${fin}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setStep(5);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <ol className="grid gap-2 text-sm md:grid-cols-5">
                    {steps.map((s, i) => (
                        <li key={s} className={`rounded-lg border px-3 py-2 ${i <= step ? 'border-indigo-300 bg-indigo-50 font-semibold text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>
                            {s}
                        </li>
                    ))}
                </ol>

                {step === 0 && (
                    <div className="grid gap-3 md:grid-cols-3 items-end">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha inicial</label>
                            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha final</label>
                            <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                        </div>
                        <button onClick={loadPeriodo} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                            Cargar empleados del período
                        </button>
                    </div>
                )}

                {step >= 1 && (
                    <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Deducciones adicionales</p>
                                <p className="text-xs text-slate-500">Se aplican a los empleados seleccionados al generar preview. El ISR se calcula automáticamente.</p>
                            </div>
                            <span className="text-xs font-semibold text-slate-500">{deduccionesExtra.length} agregadas</span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-5">
                            <select
                                value={deduccionForm.tipoDeduccion}
                                onChange={(e) => {
                                    const option = SAT_NOMINA_CATALOGOS.TIPOS_DEDUCCION.find((item) => item.clave === e.target.value);
                                    setDeduccionForm((prev) => ({
                                        ...prev,
                                        tipoDeduccion: e.target.value,
                                        concepto: option?.descripcion.replace(/^\d+\s-\s/, '') || prev.concepto,
                                    }));
                                }}
                                className="rounded-xl border border-slate-300 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            >
                                <option value="">Tipo SAT</option>
                                {SAT_NOMINA_CATALOGOS.TIPOS_DEDUCCION.map((item) => (
                                    <option key={item.clave} value={item.clave}>{item.descripcion}</option>
                                ))}
                            </select>
                            <input
                                value={deduccionForm.clave}
                                onChange={(e) => setDeduccionForm((prev) => ({ ...prev, clave: e.target.value.toUpperCase() }))}
                                placeholder="Clave interna"
                                className="rounded-xl border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <input
                                value={deduccionForm.concepto}
                                onChange={(e) => setDeduccionForm((prev) => ({ ...prev, concepto: e.target.value }))}
                                placeholder="Concepto"
                                className="md:col-span-2 rounded-xl border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex gap-2">
                                <input
                                    value={deduccionForm.importe || ''}
                                    onChange={(e) => setDeduccionForm((prev) => ({ ...prev, importe: Number(e.target.value || 0) }))}
                                    placeholder="Importe"
                                    type="number"
                                    step="0.01"
                                    className="min-w-0 flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                                <button type="button" onClick={addDeduccion} className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 text-white hover:bg-indigo-700">
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        {!!deduccionesExtra.length && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                {deduccionesExtra.map((deduccion, index) => (
                                    <div key={`${deduccion.tipoDeduccion}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0">
                                        <span className="font-medium text-slate-800">{deduccion.tipoDeduccion} · {deduccion.concepto}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-900">{fmt(deduccion.importe)}</span>
                                            <button type="button" onClick={() => setDeduccionesExtra((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Empleados del período</p>
                                <p className="text-xs text-slate-500">
                                    {periodo ? `${periodo.fechaInicial} a ${periodo.fechaFinal} · ${periodo.numDiasPagados} días · ${periodo.estado}` : 'Selecciona los recibos que se van a procesar.'}
                                </p>
                            </div>
                            <button onClick={loadPreview} className="rounded-xl border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                                Generar preview
                            </button>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="p-3" />
                                        <th className="p-3">Empleado</th>
                                        <th className="p-3">RFC</th>
                                        <th className="p-3">Días</th>
                                        <th className="p-3">Percepciones</th>
                                        <th className="p-3">ISR</th>
                                        <th className="p-3">Deducciones</th>
                                        <th className="p-3">Neto</th>
                                        <th className="p-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.includes(r.id)}
                                                    onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id))}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-slate-900">{r.empleadoNombre}</td>
                                            <td className="p-3 font-mono text-xs text-slate-600">{r.empleadoRfc}</td>
                                            <td className="p-3">{r.diasPagados || '-'}</td>
                                            <td className="p-3">{fmt(r.totalPercepciones)}</td>
                                            <td className="p-3">{fmt(r.calculo?.isrRetenido || 0)}</td>
                                            <td className="p-3">{fmt(r.totalDeducciones)}</td>
                                            <td className="p-3 font-semibold text-slate-900">{fmt(r.totalNeto)}</td>
                                            <td className="p-3">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.estado === 'TIMBRADO' ? 'bg-emerald-50 text-emerald-700' : r.estado === 'ERROR' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {r.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {!rows.length && (
                                        <tr>
                                            <td colSpan={9} className="p-6 text-center text-slate-500">
                                                No hay empleados activos para calcular en este periodo.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    </div>
                )}

                {step === 2 && (
                    <button onClick={runValidation} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                        Validar XML SAT
                    </button>
                )}

                {step >= 3 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <p>
                                Validaciones OK: <b>{validation.ok}</b> | Con error: <b>{validation.fail}</b>
                            </p>
                            {step === 3 && (
                                <button onClick={runTimbrado} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                                    Timbrar masivo
                                </button>
                            )}
                        </div>
                        {!!validation.details.length && (
                            <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs">
                                {validation.details.slice(0, 10).map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="border-b border-slate-100 py-2 last:border-0">
                                        <p className="font-semibold text-slate-800">{item.empleadoNombre}</p>
                                        <p className="text-rose-700">{item.codigo}: {item.mensaje}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!!timbradoErrors.length && (
                            <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-rose-200 bg-white p-3 text-xs">
                                {timbradoErrors.map((item) => (
                                    <div key={item.reciboId} className="border-b border-rose-100 py-2 last:border-0">
                                        <p className="font-semibold text-slate-800">{item.reciboId}</p>
                                        <p className="text-rose-700">{item.error}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {step >= 4 && (
                    <div className="space-y-3">
                        <ProgressBar total={selected.length} processed={processed} failed={failed} />
                        {!processing && (
                            <button onClick={finalizar} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                                Finalizar, enviar correo y descargar ZIP
                            </button>
                        )}
                    </div>
                )}

                {step === 5 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                        Proceso completo
                    </div>
                )}

                <p className="text-xs text-slate-500">Seleccionados: {selectedRows.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Historial reciente</h2>
                        <p className="text-sm text-slate-500">Periodos timbrados, parciales y con error.</p>
                    </div>
                    <button onClick={loadHistory} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        {historyLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="p-3">Periodo</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Pago</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Timbrados</th>
                                <th className="p-3">Errores</th>
                                <th className="p-3">Deducciones</th>
                                <th className="p-3">Neto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item) => (
                                <tr key={item.clave} className="border-b border-slate-100">
                                    <td className="p-3">
                                        <div className="font-medium text-slate-900">{item.fechaInicial} a {item.fechaFinal}</div>
                                        <div className="text-xs text-slate-500">Clave: {item.clave}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.estado === 'TIMBRADO' ? 'bg-emerald-50 text-emerald-700' : item.estado === 'CON_ERRORES' ? 'bg-rose-50 text-rose-700' : item.estado === 'PARCIAL' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {item.estado}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">{item.fechaPago}</td>
                                    <td className="p-3">{item.total}</td>
                                    <td className="p-3 text-emerald-700">{item.timbrados}</td>
                                    <td className="p-3 text-rose-700">{item.errores}</td>
                                    <td className="p-3">{fmt(item.totalDeducciones || 0)}</td>
                                    <td className="p-3 font-semibold text-slate-900">{fmt(item.totalNeto)}</td>
                                </tr>
                            ))}
                            {!history.length && (
                                <tr>
                                    <td colSpan={8} className="p-6 text-center text-slate-500">
                                        Aún no hay historial de periodos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
