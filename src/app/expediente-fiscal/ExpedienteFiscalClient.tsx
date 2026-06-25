'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  FolderOpen,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  EXPEDIENTE_PERFILES,
  EXPEDIENTE_TIPOS_DOCUMENTO,
  expedientePerfilFromPath,
  expedienteTipoLabel,
  type ExpedienteTipoDocumento,
} from '@/lib/expediente-fiscal/catalogos';

type PerfilClave = (typeof EXPEDIENTE_PERFILES)[number]['clave'];

type ConfiguracionSatResumen = {
  rfc: string;
  nombre: string;
  fielCargada: boolean;
} | null;

type SesionSat = {
  activa: boolean;
  rfc: string;
  rfcNombre: string;
  configuracion?: ConfiguracionSatResumen;
  perfil?: { rfc?: string | null; rfcNombre?: string | null };
};

type SolicitudExpediente = {
  id: string;
  requestId: string;
  tipo: ExpedienteTipoDocumento;
  tipoLabel: string;
  fecha: string | null;
  estado: string;
  mensaje: string;
  archivoDisponible: boolean;
  createdAt: string;
};

type SatLoginModalProps = {
  open: boolean;
  loading: boolean;
  perfil: PerfilClave;
  configSat: ConfiguracionSatResumen;
  onClose: () => void;
  onSubmit: (payload: {
    rfc: string;
    rfcNombre: string;
    password: string;
    cerFile: File | null;
    keyFile: File | null;
    usarConfiguracion?: boolean;
  }) => Promise<void>;
};

const TIPOS_CON_FECHA = EXPEDIENTE_TIPOS_DOCUMENTO.filter((tipo) => tipo.clave !== 'CIF');

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtFecha(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function perfilEtiqueta(perfil: PerfilClave) {
  return EXPEDIENTE_PERFILES.find((item) => item.clave === perfil)?.etiqueta || 'RFC principal';
}

function estadoStyle(estado: string) {
  if (['DESCARGADO', 'COMPLETADA', 'COMPLETADO', 'POSITIVA', 'VIGENTE'].includes(estado)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (['PENDIENTE', 'EN_PROCESO'].includes(estado)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (estado === 'PENDIENTE_DESCARGA_SAT') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function SatLoginModal({ open, loading, perfil, configSat, onClose, onSubmit }: SatLoginModalProps) {
  const [rfc, setRfc] = useState('');
  const [rfcNombre, setRfcNombre] = useState('');
  const [password, setPassword] = useState('');
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const esPrincipal = perfil === 'principal';

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rfc || !rfcNombre || !password || !cerFile || !keyFile) {
      alert('Debes capturar RFC, nombre registrado, contraseña y seleccionar ambos archivos .cer y .key');
      return;
    }

    await onSubmit({ rfc, rfcNombre, password, cerFile, keyFile });
  };

  const usarConfiguracion = async () => {
    if (!configSat?.fielCargada) {
      alert('No hay e.firma FIEL configurada.');
      return;
    }

    await onSubmit({
      rfc: configSat.rfc,
      rfcNombre: configSat.nombre,
      password: '',
      cerFile: null,
      keyFile: null,
      usarConfiguracion: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
              <div>
                <h2 className="text-xl font-bold">Conectar con SAT</h2>
                <p className="text-sm text-slate-300">
                  {perfilEtiqueta(perfil)}: inicia sesión con e.firma para consultar el expediente fiscal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          {esPrincipal && configSat?.fielCargada && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-bold text-emerald-800">Usar e.firma configurada</div>
                  <div className="text-xs text-emerald-700">
                    SAT: {configSat.rfc} - {configSat.nombre || 'Nombre no capturado'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={usarConfiguracion}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Continuar
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">RFC</label>
              <input
                type="text"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder={configSat?.rfc || 'RFC registrado ante SAT'}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 font-mono uppercase text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Nombre de persona o empresa</label>
              <input
                type="text"
                value={rfcNombre}
                onChange={(e) => setRfcNombre(e.target.value)}
                placeholder="Nombre registrado ante SAT"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition-colors hover:border-blue-400">
              <UploadCloud className="mx-auto mb-2 h-7 w-7 text-slate-400" />
              <div className="text-sm font-bold text-slate-700">Subir archivo .CER</div>
              <div className="mt-1 text-xs text-slate-500">{cerFile ? cerFile.name : 'Selecciona tu certificado'}</div>
              <input type="file" accept=".cer" className="hidden" onChange={(e) => setCerFile(e.target.files?.[0] || null)} />
            </label>

            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition-colors hover:border-blue-400">
              <UploadCloud className="mx-auto mb-2 h-7 w-7 text-slate-400" />
              <div className="text-sm font-bold text-slate-700">Subir archivo .KEY</div>
              <div className="mt-1 text-xs text-slate-500">{keyFile ? keyFile.name : 'Selecciona tu llave privada'}</div>
              <input type="file" accept=".key" className="hidden" onChange={(e) => setKeyFile(e.target.files?.[0] || null)} />
            </label>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Contraseña de la e.firma</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 pl-10 font-medium text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Esta sesión SAT se usará para consultar documentos fiscales del RFC seleccionado.
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <Link
              href="/expediente-fiscal"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar al expediente
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              Conectar SAT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpedienteFiscalClient() {
  const pathname = usePathname();
  const perfilClave = expedientePerfilFromPath(pathname || '');
  const perfilActual = EXPEDIENTE_PERFILES.find((perfil) => perfil.clave === perfilClave) || EXPEDIENTE_PERFILES[0];

  const [solicitudes, setSolicitudes] = useState<SolicitudExpediente[]>([]);
  const [activeTab, setActiveTab] = useState<'cif' | 'documentos'>('cif');
  const [satSesionActiva, setSatSesionActiva] = useState(false);
  const [satRfc, setSatRfc] = useState('');
  const [satRfcNombre, setSatRfcNombre] = useState('');
  const [configSat, setConfigSat] = useState<ConfiguracionSatResumen>(null);
  const [mostrarLoginSat, setMostrarLoginSat] = useState(false);
  const [loginSatCargando, setLoginSatCargando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [message, setMessage] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<ExpedienteTipoDocumento>('DECLARACION_PRESENTADA');
  const [fechaConsulta, setFechaConsulta] = useState(hoyISO());

  const ultimoMovimiento = useMemo(() => solicitudes[0], [solicitudes]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [sesionRes, solicitudesRes] = await Promise.all([
        fetch(`/api/facturas-recibidas/sesion?perfil=${perfilClave}`, { cache: 'no-store' }),
        fetch(`/api/expediente-fiscal/descargas?perfil=${perfilClave}`, { cache: 'no-store' }),
      ]);

      const sesionData: SesionSat = await sesionRes.json();
      const solicitudesData = await solicitudesRes.json();

      setSatSesionActiva(Boolean(sesionData.activa));
      setSatRfc(sesionData.rfc || sesionData.perfil?.rfc || '');
      setSatRfcNombre(sesionData.rfcNombre || sesionData.perfil?.rfcNombre || '');
      setConfigSat(sesionData.configuracion || null);
      setSolicitudes(Array.isArray(solicitudesData.solicitudes) ? solicitudesData.solicitudes : []);
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, [perfilClave]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleLoginSat = async ({
    rfc,
    rfcNombre,
    password,
    cerFile,
    keyFile,
    usarConfiguracion,
  }: {
    rfc: string;
    rfcNombre: string;
    password: string;
    cerFile: File | null;
    keyFile: File | null;
    usarConfiguracion?: boolean;
  }) => {
    setLoginSatCargando(true);
    try {
      const formData = new FormData();
      formData.append('perfil', perfilClave);
      formData.append('rfc', rfc);
      formData.append('rfcNombre', rfcNombre);
      formData.append('password', password);
      if (usarConfiguracion) formData.append('usarConfiguracion', 'true');
      if (cerFile) formData.append('cer', cerFile);
      if (keyFile) formData.append('key', keyFile);

      const res = await fetch(`/api/facturas-recibidas/sesion?perfil=${perfilClave}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`Error SAT: ${data.error}`);
        return;
      }

      setSatSesionActiva(true);
      setSatRfc(data.rfc || rfc);
      setSatRfcNombre(data.rfcNombre || rfcNombre);
      setMostrarLoginSat(false);
      setMessage('Sesión SAT iniciada correctamente.');
      await cargar();
    } catch {
      alert('No fue posible iniciar sesión con SAT.');
    } finally {
      setLoginSatCargando(false);
    }
  };

  const handleCerrarSesionSat = async () => {
    try {
      const res = await fetch(`/api/facturas-recibidas/sesion?perfil=${perfilClave}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(`Error: ${data.error || 'No se pudo cerrar la sesión SAT.'}`);
        return;
      }

      setSatSesionActiva(false);
      setSatRfc('');
      setSatRfcNombre('');
      setMostrarLoginSat(true);
      setMessage('Sesión SAT cerrada.');
      await cargar();
    } catch {
      alert('No fue posible cerrar la sesión SAT.');
    }
  };

  const solicitarDescarga = async (tipo: ExpedienteTipoDocumento) => {
    if (!satSesionActiva) {
      setMostrarLoginSat(true);
      return;
    }

    setConsultaLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/expediente-fiscal/descargas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil: perfilClave,
          tipo,
          fecha: tipo === 'CIF' ? null : fechaConsulta,
        }),
      });
      const data = await res.json();

      if (data.solicitud) {
        setSolicitudes((prev) => [data.solicitud, ...prev.filter((item) => item.id !== data.solicitud.id)]);
      }

      setMessage(data.mensaje || data.error || 'Consulta procesada.');
      await cargar();

      if (tipo === 'CIF' && data.solicitud?.archivoDisponible) {
        const link = document.createElement('a');
        link.href = `/api/expediente-fiscal/descargas/${data.solicitud.id}/archivo`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch {
      setMessage('No fue posible enviar la consulta al SAT.');
    } finally {
      setConsultaLoading(false);
    }
  };

  const verificarSolicitudes = async () => {
    setVerificando(true);
    setMessage('');
    try {
      const res = await fetch(`/api/expediente-fiscal/verificar?perfil=${perfilClave}`, { cache: 'no-store' });
      const data = await res.json();
      setMessage(data.mensaje || data.error || 'Verificación terminada.');
      await cargar();
    } catch {
      setMessage('No fue posible verificar las solicitudes del expediente fiscal.');
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-bold text-slate-500 transition-colors hover:text-blue-600"
            >
              <ArrowLeft className="h-5 w-5" /> Panel
            </Link>
            <FolderOpen className="ml-2 h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">{perfilActual.titulo}</h1>
              <p className="text-sm font-medium text-slate-500">{perfilActual.etiqueta}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm ${
                satSesionActiva
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold">
                {satSesionActiva ? `SAT: ${satRfc}${satRfcNombre ? ` - ${satRfcNombre}` : ''}` : 'SAT no conectado'}
              </span>
            </div>

            <button
              onClick={() => setMostrarLoginSat(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-900"
            >
              <ShieldCheck className="h-4 w-4" />
              {satSesionActiva ? 'Cambiar e.firma' : 'Conectar SAT'}
            </button>

            {satSesionActiva && (
              <button
                onClick={handleCerrarSesionSat}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                Cerrar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXPEDIENTE_PERFILES.map((perfil) => (
            <Link
              key={perfil.clave}
              href={perfil.ruta}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                perfil.clave === perfilClave
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {perfil.etiqueta}
            </Link>
          ))}
        </div>

        {message && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: 'Conexión SAT', value: satSesionActiva ? 'Activa' : 'Pendiente', color: satSesionActiva ? 'text-emerald-600' : 'text-amber-600' },
            { label: 'RFC en revisión', value: satRfc || 'Sin RFC', color: 'text-slate-800' },
            { label: 'Consultas', value: String(solicitudes.length), color: 'text-blue-600' },
            { label: 'Último estatus', value: ultimoMovimiento?.estado?.replaceAll('_', ' ') || 'Sin consulta', color: 'text-slate-800' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400">{item.label}</div>
              <div className={`mt-2 truncate text-2xl font-black ${item.color}`}>{loading ? '...' : item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-xl bg-blue-50 p-2">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Consulta fiscal</h2>
                  <p className="text-xs text-slate-500">Descargas por RFC para revisar el estatus del cliente ante SAT.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="mb-2 flex items-center gap-2 font-bold text-slate-700">
                  {satSesionActiva ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <KeyRound className="h-4 w-4 text-amber-600" />}
                  {satSesionActiva ? 'Sesión SAT disponible' : 'Conecta la e.firma'}
                </div>
                <p>
                  El perfil principal usa la e.firma configurada. RFC-1, RFC-2 y RFC-3 usan su propio .cer y .key, igual que Facturas Recibidas.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertTriangle className="h-5 w-5" /> Sin captura manual
              </div>
              <p>
                Este módulo ya no sube ni captura documentos. Sólo prepara consultas de descarga SAT por tipo de documento y RFC.
              </p>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('cif')}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                    activeTab === 'cif'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Constancia / CIF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documentos')}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                    activeTab === 'documentos'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Documentos SAT
                </button>
              </div>

              {activeTab === 'cif' ? (
                <div className="p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Constancia de Situación Fiscal / CIF</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Este documento no requiere rango ni fecha. Sólo se solicita la descarga del RFC conectado.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={consultaLoading}
                      onClick={() => solicitarDescarga('CIF')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {consultaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Verificar SAT y descargar CIF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Tipo de documento</label>
                      <select
                        value={tipoDocumento}
                        onChange={(e) => setTipoDocumento(e.target.value as ExpedienteTipoDocumento)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold outline-none focus:border-blue-500"
                      >
                        {TIPOS_CON_FECHA.map((tipo) => (
                          <option key={tipo.clave} value={tipo.clave}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Fecha a consultar</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={fechaConsulta}
                          onChange={(e) => setFechaConsulta(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 pl-9 text-sm font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={consultaLoading || !fechaConsulta}
                      onClick={() => solicitarDescarga(tipoDocumento)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {consultaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Descargar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">Consultas del expediente</h2>
                  <p className="text-sm text-slate-500">{satRfc || 'RFC pendiente de conectar'}</p>
                </div>
                <button
                  type="button"
                  onClick={verificarSolicitudes}
                  disabled={verificando}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Verificar pendientes
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Documento</th>
                      <th className="px-5 py-4">Token</th>
                      <th className="px-5 py-4">Fecha</th>
                      <th className="px-5 py-4">Estatus</th>
                      <th className="px-5 py-4">Mensaje</th>
                      <th className="px-5 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </td>
                      </tr>
                    ) : solicitudes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-500">
                          Aún no hay consultas para este expediente.
                        </td>
                      </tr>
                    ) : (
                      solicitudes.map((solicitud) => (
                        <tr key={solicitud.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">{solicitud.tipoLabel || expedienteTipoLabel(solicitud.tipo)}</div>
                                <div className="text-xs text-slate-500">{new Date(solicitud.createdAt).toLocaleString('es-MX')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-bold text-slate-600">{solicitud.requestId}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{fmtFecha(solicitud.fecha)}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-lg border px-3 py-1 text-xs font-bold ${estadoStyle(solicitud.estado)}`}>
                              {solicitud.estado.replaceAll('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <div className="flex items-start gap-2">
                              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              <span>{solicitud.mensaje}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {solicitud.archivoDisponible ? (
                              <a
                                href={`/api/expediente-fiscal/descargas/${solicitud.id}/archivo`}
                                className="inline-flex items-center gap-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600"
                                title="Descargar recurso"
                              >
                                <Download className="h-5 w-5" />
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-slate-400">Sin archivo</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <SatLoginModal
          open={mostrarLoginSat}
          loading={loginSatCargando}
          perfil={perfilClave}
          configSat={configSat}
          onClose={() => setMostrarLoginSat(false)}
          onSubmit={handleLoginSat}
        />
      </div>
    </div>
  );
}
