'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Image as ImageIcon,
  FileArchive,
  FolderDown,
  HardDrive,
  KeyRound,
  Loader2,
  Mail,
  PlusCircle,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
} from 'lucide-react';

type Tab = 'perfil' | 'usuarios' | 'certificados' | 'correo' | 'sistema' | 'respaldo';
type Rol = 'SUPERADMIN' | 'ADMIN' | 'OPERATIVO';

type ConfigFiscal = {
  rfc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  regimenFiscal?: string;
  codigoPostal?: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  representanteLegal?: string;
  registroPatronal?: string;
  logoUrl?: string;
  logoMimeType?: string;
  pacProveedor?: string;
  pacUsuario?: string;
  pacAmbiente?: string;
  pacPassword?: string;
  pacPasswordConfigurado?: boolean;
  folioNominaSerie?: string;
  csdEstatus?: string;
  csdMensaje?: string;
  csdNoCertificado?: string;
  csdVigenteHasta?: string;
  csdCargado?: boolean;
  fielEstatus?: string;
  fielMensaje?: string;
  fielNoCertificado?: string;
  fielVigenteHasta?: string;
  fielCargado?: boolean;
  correoRemitenteNombre?: string;
  correoRemitenteEmail?: string;
  correoHost?: string;
  correoPuerto?: number;
  correoSeguro?: boolean;
  correoUsuario?: string;
  correoPassword?: string;
  correoPasswordConfigurado?: boolean;
  correoEstatus?: string;
  correoOrigen?: 'BD' | 'ENV';
};

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  modulos: string[];
};

type BackupDestino = 'local' | 'onedrive' | 'drive' | 'sftp';
type BackupView = 'crear' | 'restaurar' | 'programar' | 'historial';
type BackupSchedule = {
  activo: boolean;
  frecuencia: 'diario' | 'semanal' | 'mensual';
  hora: string;
  destino: BackupDestino;
  retencion: number;
};

type BackupSftpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
};

type BackupHistoryEntry = {
  id: string;
  ok: boolean;
  destino: BackupDestino;
  filename?: string;
  source: 'manual' | 'scheduled';
  finishedAt: string;
  message: string;
};

const defaultBackupSchedule: BackupSchedule = {
  activo: false,
  frecuencia: 'diario',
  hora: '23:00',
  destino: 'local',
  retencion: 15,
};

const defaultSftpConfig: BackupSftpConfig = {
  host: '',
  port: 22,
  username: '',
  password: '',
  remotePath: '/',
};

const BACKUP_DESTINOS = [
  { id: 'local', label: 'Local', Icon: HardDrive, status: 'activo' },
  { id: 'onedrive', label: 'OneDrive', Icon: Cloud, status: 'preparado' },
  { id: 'drive', label: 'Google Drive', Icon: Cloud, status: 'preparado' },
  { id: 'sftp', label: 'SFTP', Icon: FolderDown, status: 'configurable' },
] as const;

const MODULOS = [
  { id: 'dashboard', label: 'Panel' },
  { id: 'facturacion', label: 'Facturas' },
  { id: 'factura_global', label: 'Factura global' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'productos', label: 'Productos' },
  { id: 'nomina', label: 'Nómina' },
  { id: 'descargas_sat', label: 'Facturas recibidas' },
  { id: 'configuracion', label: 'Configuración' },
];

const REGIMENES = [
  ['601', 'General de Ley Personas Morales'],
  ['603', 'Personas Morales con Fines no Lucrativos'],
  ['605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios'],
  ['606', 'Arrendamiento'],
  ['612', 'Personas Físicas con Actividades Empresariales'],
  ['621', 'Incorporación Fiscal'],
  ['626', 'Régimen Simplificado de Confianza'],
];

const emptyConfig: ConfigFiscal = {
  rfc: '',
  razonSocial: '',
  nombreComercial: '',
  regimenFiscal: '',
  codigoPostal: '',
  calle: '',
  numeroExterior: '',
  numeroInterior: '',
  colonia: '',
  municipio: '',
  estado: '',
  telefono: '',
  email: '',
  sitioWeb: '',
  representanteLegal: '',
  registroPatronal: '',
  logoUrl: '',
  logoMimeType: '',
  pacProveedor: 'FINKOK',
  pacUsuario: '',
  pacAmbiente: 'demo',
  pacPassword: '',
  pacPasswordConfigurado: false,
  folioNominaSerie: 'NOM',
  correoRemitenteNombre: '',
  correoRemitenteEmail: '',
  correoHost: '',
  correoPuerto: 587,
  correoSeguro: false,
  correoUsuario: '',
  correoPassword: '',
  correoPasswordConfigurado: false,
};

const stringConfigKeys: Array<keyof ConfigFiscal> = [
  'rfc',
  'razonSocial',
  'nombreComercial',
  'regimenFiscal',
  'codigoPostal',
  'calle',
  'numeroExterior',
  'numeroInterior',
  'colonia',
  'municipio',
  'estado',
  'telefono',
  'email',
  'sitioWeb',
  'representanteLegal',
  'registroPatronal',
  'logoUrl',
  'logoMimeType',
  'pacProveedor',
  'pacUsuario',
  'pacAmbiente',
  'pacPassword',
  'folioNominaSerie',
  'csdEstatus',
  'csdMensaje',
  'csdNoCertificado',
  'csdVigenteHasta',
  'fielEstatus',
  'fielMensaje',
  'fielNoCertificado',
  'fielVigenteHasta',
  'correoRemitenteNombre',
  'correoRemitenteEmail',
  'correoHost',
  'correoUsuario',
  'correoPassword',
  'correoEstatus',
];

function normalizeConfig(data: Partial<ConfigFiscal> = {}): ConfigFiscal {
  const normalized: ConfigFiscal = { ...emptyConfig, ...data };
  for (const key of stringConfigKeys) {
    const value = normalized[key];
    if (value == null) {
      (normalized as Record<string, unknown>)[key] = '';
    }
  }
  normalized.correoPuerto = Number(normalized.correoPuerto || emptyConfig.correoPuerto);
  normalized.correoSeguro = Boolean(normalized.correoSeguro);
  normalized.pacPasswordConfigurado = Boolean(normalized.pacPasswordConfigurado);
  normalized.correoPasswordConfigurado = Boolean(normalized.correoPasswordConfigurado);
  return normalized;
}

function StatusPill({ status }: { status?: string }) {
  const ok = status === 'ACTIVO' || status === 'CONFIGURADO';
  const warn = status === 'SIN_CARGAR' || status === 'SIN_CONFIGURAR';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : warn ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {status || 'SIN CONFIGURAR'}
    </span>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase text-slate-500">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [config, setConfig] = useState<ConfigFiscal>(() => normalizeConfig());
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', rol: 'OPERATIVO' as Rol, modulos: ['dashboard', 'facturacion'] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resettingDb, setResettingDb] = useState(false);
  const [resetConfirmacion, setResetConfirmacion] = useState('');
  const [resetDbPassword, setResetDbPassword] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreConfirmacion, setRestoreConfirmacion] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreDbBusy, setRestoreDbBusy] = useState(false);
  const [restoreDbConfirmacion, setRestoreDbConfirmacion] = useState('');
  const [restoreDbFile, setRestoreDbFile] = useState<File | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupView, setBackupView] = useState<BackupView>('crear');
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule>(defaultBackupSchedule);
  const [selectedBackupDestino, setSelectedBackupDestino] = useState<BackupDestino>('local');
  const [sftpConfig, setSftpConfig] = useState<BackupSftpConfig>(defaultSftpConfig);
  const [sftpTesting, setSftpTesting] = useState(false);
  const [sftpMessage, setSftpMessage] = useState('');
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);

  const completion = useMemo(() => {
    const fiscal = Boolean(config.rfc && config.razonSocial && config.regimenFiscal && config.codigoPostal);
    const csd = config.csdEstatus === 'ACTIVO' && config.csdCargado;
    const fiel = config.fielEstatus === 'ACTIVO' && config.fielCargado;
    const correo = config.correoEstatus === 'CONFIGURADO' || Boolean(config.correoHost && config.correoUsuario && config.correoPasswordConfigurado);
    return { fiscal, csd, fiel, correo };
  }, [config]);

  const loadConfig = async () => {
    const res = await fetch('/api/configuracion', { cache: 'no-store' });
    if (res.ok) setConfig(normalizeConfig(await res.json()));
  };

  const loadUsers = async () => {
    const res = await fetch('/api/usuarios', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setUsuarios(data.usuarios || []);
    }
  };

  const loadBackupHistory = async () => {
    const res = await fetch('/api/configuracion/respaldo/historial', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setBackupHistory(data.history || []);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [configRes, usersRes] = await Promise.all([
          fetch('/api/configuracion', { cache: 'no-store' }),
          fetch('/api/usuarios', { cache: 'no-store' }),
        ]);
        if (cancelled) return;

        if (configRes.ok) setConfig(normalizeConfig(await configRes.json()));
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsuarios(data.usuarios || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch('/api/configuracion/respaldo/programacion', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.schedule) {
          setBackupSchedule({ ...defaultBackupSchedule, ...data.schedule });
          if (data.schedule.sftpConfig) setSftpConfig({ ...defaultSftpConfig, ...data.schedule.sftpConfig });
        }
      })
      .catch(() => undefined);
    void loadBackupHistory();
  }, []);

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get('mensaje');
    if (message) {
      setActiveTab('respaldo');
      setBackupMessage(message);
    }
  }, []);

  const patchConfig = (patch: Partial<ConfigFiscal>) => setConfig((current) => normalizeConfig({ ...current, ...patch }));

  const saveConfig = async () => {
    setSaving(true);
    const res = await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo guardar la configuración.');
    setConfig(normalizeConfig(data.config));
    alert('Configuración guardada.');
  };

  const handleLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Selecciona una imagen válida.');
    if (file.size > 700_000) return alert('Usa un logo menor a 700 KB para que los PDF se generen rápido.');
    const reader = new FileReader();
    reader.onload = () => patchConfig({ logoUrl: String(reader.result), logoMimeType: file.type });
    reader.readAsDataURL(file);
  };

  const uploadCert = async (tipo: 'CSD' | 'FIEL') => {
    const cerInput = document.getElementById(`${tipo}-cer`) as HTMLInputElement | null;
    const keyInput = document.getElementById(`${tipo}-key`) as HTMLInputElement | null;
    const passInput = document.getElementById(`${tipo}-pass`) as HTMLInputElement | null;
    if (!cerInput?.files?.[0] || !keyInput?.files?.[0] || !passInput?.value) return alert('Selecciona .cer, .key y escribe la contraseña.');

    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('cer', cerInput.files[0]);
    fd.append('key', keyInput.files[0]);
    fd.append('password', passInput.value);
    setSaving(true);
    const res = await fetch('/api/configuracion/certificados', { method: 'POST', body: fd });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || `No se pudieron guardar los certificados ${tipo}.`);
    passInput.value = '';
    cerInput.value = '';
    keyInput.value = '';
    await loadConfig();
    alert(data.certificado?.estatus === 'ACTIVO' ? `${tipo} conectado y vigente.` : `${tipo} guardado, pero revisa su estatus.`);
  };

  const createUser = async () => {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo crear el usuario.');
    setNewUser({ nombre: '', email: '', password: '', rol: 'OPERATIVO', modulos: ['dashboard', 'facturacion'] });
    await loadUsers();
  };

  const updateUser = async (usuario: Usuario, patch: Partial<Usuario>) => {
    const updated = { ...usuario, ...patch };
    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) return alert((await res.json()).error || 'No se pudo actualizar el usuario.');
    await loadUsers();
  };

  const resetPassword = async (id: number) => {
    const newPassword = prompt('Nueva contraseña (mínimo 8 caracteres):');
    if (!newPassword) return;
    const res = await fetch(`/api/usuarios/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) return alert((await res.json()).error || 'No se pudo cambiar la contraseña.');
    alert('Contraseña actualizada.');
  };

  const deleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario operativo/admin?')) return;
    const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await res.json()).error || 'No se pudo eliminar.');
    await loadUsers();
  };

  const testMail = async () => {
    const res = await fetch('/api/configuracion/correo/probar', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo enviar el correo de prueba.');
    alert(data.message || 'Correo enviado.');
  };

  const saveLocalBackup = async () => {
    setBackupMessage('');
    window.location.href = '/api/configuracion/respaldo/descargar';
  };

  const downloadFullDatabaseBackup = () => {
    window.location.href = '/api/configuracion/respaldo/bd/descargar';
  };

  const handleBackupDestino = async (destino: BackupDestino) => {
    setSelectedBackupDestino(destino);
    setBackupMessage('');

    if (destino === 'local') {
      await saveLocalBackup();
      return;
    }

    if (destino === 'onedrive') {
      setBackupBusy(true);
      const res = await fetch('/api/configuracion/respaldo/onedrive/subir', { method: 'POST' });
      setBackupBusy(false);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }
      setBackupMessage(res.ok ? data.message : data.error || 'No se pudo enviar el respaldo a OneDrive.');
      if (res.ok) await loadBackupHistory();
      return;
    }

    if (destino === 'drive') {
      setBackupBusy(true);
      const res = await fetch('/api/configuracion/respaldo/drive/subir', { method: 'POST' });
      setBackupBusy(false);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }
      setBackupMessage(res.ok ? data.message : data.error || 'No se pudo enviar el respaldo a Google Drive.');
      if (res.ok) await loadBackupHistory();
      return;
    }

    setBackupMessage('Captura los datos SFTP y prueba la conexión.');
  };

  const saveBackupSchedule = async () => {
    const res = await fetch('/api/configuracion/respaldo/programacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...backupSchedule, sftpConfig }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo guardar la programación.');
    setBackupSchedule({ ...defaultBackupSchedule, ...data.schedule });
    setBackupMessage('Programación guardada en el servidor. El siguiente paso es conectar el ejecutor automático del sistema.');
  };

  const testSftpConnection = async () => {
    setSftpTesting(true);
    setSftpMessage('');
    const res = await fetch('/api/configuracion/respaldo/sftp/probar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sftpConfig),
    });
    setSftpTesting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSftpMessage(data.error || 'No se pudo conectar por SFTP.');
      return;
    }
    setSftpMessage(data.message || 'Conexión SFTP OK.');
  };

  const saveSftpBackup = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    const res = await fetch('/api/configuracion/respaldo/sftp/subir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sftpConfig),
    });
    setBackupBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBackupMessage(data.error || 'No se pudo guardar el respaldo por SFTP.');
      return;
    }
    setBackupMessage(data.message || `Respaldo SFTP creado: ${data.filename}`);
    await loadBackupHistory();
  };

  const restoreBackup = async () => {
    if (!restoreFile) return alert('Selecciona un archivo JSON o ZIP de respaldo.');
    if (restoreConfirmacion.trim().toUpperCase() !== 'RESTAURAR') return alert('Escribe RESTAURAR para confirmar.');
    if (!confirm('La restauración reemplazará la configuración y la base de datos con el contenido del respaldo. ¿Continuar?')) return;

    const fd = new FormData();
    fd.append('file', restoreFile);
    fd.append('confirmacion', restoreConfirmacion);

    setRestoreBusy(true);
    const res = await fetch('/api/configuracion/respaldo/restaurar', { method: 'POST', body: fd });
    setRestoreBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo restaurar el respaldo.');

    setRestoreConfirmacion('');
    setRestoreFile(null);
    await Promise.all([loadConfig(), loadUsers()]);
    alert('Respaldo restaurado. El sistema quedó con los datos del archivo cargado.');
  };

  const restoreFullDatabase = async () => {
    if (!restoreDbFile) return alert('Selecciona un archivo .sql o .zip de respaldo completo.');
    if (restoreDbConfirmacion.trim().toUpperCase() !== 'RESTAURAR_BD') return alert('Escribe RESTAURAR_BD para confirmar.');
    if (!confirm('La restauración reemplazará la base de datos completa. ¿Continuar?')) return;

    const fd = new FormData();
    fd.append('file', restoreDbFile);
    fd.append('confirmacion', restoreDbConfirmacion);

    setRestoreDbBusy(true);
    const res = await fetch('/api/configuracion/respaldo/bd/restaurar', { method: 'POST', body: fd });
    setRestoreDbBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo restaurar la base de datos completa.');

    setRestoreDbConfirmacion('');
    setRestoreDbFile(null);
    await Promise.all([loadConfig(), loadUsers(), loadBackupHistory()]);
    alert(data.message || 'Base de datos completa restaurada.');
  };

  const resetDatabase = async () => {
    const confirmacion = resetConfirmacion.trim().toUpperCase();
    const password = resetDbPassword;
    if (confirmacion !== 'REINICIAR') return alert('Escribe REINICIAR para confirmar.');
    if (!password) return alert('Confirma tu contraseña de administrador.');

    setResettingDb(true);
    const res = await fetch('/api/configuracion/reinicializar-bd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmacion, password }),
    });
    setResettingDb(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'No se pudo reinicializar la base de datos.');

    await Promise.all([loadConfig(), loadUsers()]);
    setResetConfirmacion('');
    setResetDbPassword('');
    setActiveTab('perfil');
    alert(data.message || 'Base de datos reinicializada.');
  };

  const tabButton = (tab: Tab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${activeTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}
    >
      {icon} {label}
    </button>
  );

  const backupViewButton = (view: BackupView, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setBackupView(view)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${backupView === view ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-blue-600">
              <ArrowLeft className="h-5 w-5" /> Panel
            </Link>
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Configuración</h1>
              <p className="text-sm text-slate-500">Deja listo el emisor, usuarios, certificados y correo del sistema.</p>
            </div>
          </div>
          <button onClick={saveConfig} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ['Perfil fiscal', completion.fiscal],
            ['CSD para timbrar', completion.csd],
            ['FIEL para SAT', completion.fiel],
            ['Correo saliente', completion.correo],
          ].map(([label, ok]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
              <div className={`mt-2 flex items-center gap-2 text-sm font-bold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                {ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {ok ? 'Listo' : 'Pendiente'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="w-full shrink-0 space-y-2 md:w-72">
            {tabButton('perfil', <Building2 className="h-5 w-5" />, 'Perfil fiscal y logo')}
            {tabButton('usuarios', <Users className="h-5 w-5" />, 'Usuarios y permisos')}
            {tabButton('certificados', <ShieldCheck className="h-5 w-5" />, 'Sellos y e.firma')}
            {tabButton('correo', <Mail className="h-5 w-5" />, 'Correo saliente')}
            {tabButton('sistema', <RotateCcw className="h-5 w-5" />, 'Reinicializar BD')}
            {tabButton('respaldo', <FileArchive className="h-5 w-5" />, 'Respaldo-recuperación')}
          </aside>

          <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            {loading ? (
              <div className="flex h-72 items-center justify-center text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando configuración...</div>
            ) : activeTab === 'perfil' ? (
              <section className="space-y-6">
                <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 lg:flex-row">
                  <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                    {config.logoUrl ? <img src={config.logoUrl} alt="Logo de la empresa" className="h-full w-full object-contain p-2" /> : <ImageIcon className="h-10 w-10 text-slate-300" />}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold">Logo de la empresa</h2>
                    <p className="max-w-2xl text-sm text-slate-500">Este logo aparecerá en facturas, cotizaciones y recibos de nómina. Usa PNG o JPG con fondo claro y tamaño recomendado de 800x400 píxeles.</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
                      <UploadCloud className="h-4 w-4" /> Seleccionar logo
                      <input name="logoEmpresa" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleLogo(event.target.files?.[0])} />
                    </label>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold">Datos fiscales del emisor</h2>
                  <p className="mt-1 text-sm text-slate-500">Son los datos obligatorios para emitir CFDI 4.0 y recibos de nómina.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Razón social" required>
                    <input name="razonSocial" className={inputClass} value={config.razonSocial || ''} onChange={(e) => patchConfig({ razonSocial: e.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Nombre comercial">
                    <input name="nombreComercial" className={inputClass} value={config.nombreComercial || ''} onChange={(e) => patchConfig({ nombreComercial: e.target.value })} />
                  </Field>
                  <Field label="RFC" required>
                    <input name="rfc" className={`${inputClass} uppercase`} value={config.rfc || ''} onChange={(e) => patchConfig({ rfc: e.target.value.toUpperCase() })} maxLength={13} />
                  </Field>
                  <Field label="Código postal fiscal" required>
                    <input name="codigoPostal" className={inputClass} value={config.codigoPostal || ''} onChange={(e) => patchConfig({ codigoPostal: e.target.value })} maxLength={5} />
                  </Field>
                  <Field label="Régimen fiscal" required>
                    <select name="regimenFiscal" className={inputClass} value={config.regimenFiscal || ''} onChange={(e) => patchConfig({ regimenFiscal: e.target.value })}>
                      <option value="">Selecciona...</option>
                      {REGIMENES.map(([clave, nombre]) => <option key={clave} value={clave}>{clave} - {nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="Registro patronal">
                    <input name="registroPatronal" className={inputClass} value={config.registroPatronal ?? ''} onChange={(e) => patchConfig({ registroPatronal: e.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Calle">
                    <input name="calle" className={inputClass} value={config.calle ?? ''} onChange={(e) => patchConfig({ calle: e.target.value })} />
                  </Field>
                  <Field label="Número exterior">
                    <input name="numeroExterior" className={inputClass} value={config.numeroExterior ?? ''} onChange={(e) => patchConfig({ numeroExterior: e.target.value })} />
                  </Field>
                  <Field label="Colonia">
                    <input name="colonia" className={inputClass} value={config.colonia ?? ''} onChange={(e) => patchConfig({ colonia: e.target.value })} />
                  </Field>
                  <Field label="Municipio">
                    <input name="municipio" className={inputClass} value={config.municipio ?? ''} onChange={(e) => patchConfig({ municipio: e.target.value })} />
                  </Field>
                  <Field label="Estado">
                    <input name="estado" className={inputClass} value={config.estado ?? ''} onChange={(e) => patchConfig({ estado: e.target.value })} />
                  </Field>
                  <Field label="Correo de contacto">
                    <input name="email" type="email" className={inputClass} value={config.email ?? ''} onChange={(e) => patchConfig({ email: e.target.value })} />
                  </Field>
                </div>
              </section>
            ) : activeTab === 'usuarios' ? (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Usuarios y permisos</h2>
                  <p className="mt-1 text-sm text-slate-500">Admin administra usuarios. Operativo solo entra a los módulos seleccionados.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                    <input name="newUserNombre" className={inputClass} placeholder="Nombre" value={newUser.nombre} onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })} />
                    <input name="newUserEmail" type="email" className={inputClass} placeholder="correo@empresa.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                    <input name="newUserPassword" className={inputClass} placeholder="Contraseña inicial" type="password" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                    <select name="newUserRol" className={inputClass} value={newUser.rol} onChange={(e) => setNewUser({ ...newUser, rol: e.target.value as Rol })}>
                      <option value="OPERATIVO">Operativo</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button onClick={createUser} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"><PlusCircle className="h-4 w-4" /> Crear</button>
                  </div>
                  {newUser.rol === 'OPERATIVO' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {MODULOS.map((modulo) => (
                        <label key={modulo.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                          <input name={`newUserModulo-${modulo.id}`} type="checkbox" checked={newUser.modulos.includes(modulo.id)} onChange={(e) => setNewUser({ ...newUser, modulos: e.target.checked ? [...newUser.modulos, modulo.id] : newUser.modulos.filter((id) => id !== modulo.id) })} />
                          {modulo.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {usuarios.map((usuario) => (
                    <div key={usuario.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{usuario.nombre}</p>
                          <p className="text-sm text-slate-500">{usuario.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <select name={`usuarioRol-${usuario.id}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold" value={usuario.rol} onChange={(e) => updateUser(usuario, { rol: e.target.value as Rol })}>
                            <option value="OPERATIVO">Operativo</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <button onClick={() => resetPassword(usuario.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><KeyRound className="inline h-4 w-4" /> Contraseña</button>
                          <button onClick={() => deleteUser(usuario.id)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 className="inline h-4 w-4" /> Eliminar</button>
                        </div>
                      </div>
                      {usuario.rol === 'OPERATIVO' && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {MODULOS.map((modulo) => (
                            <label key={modulo.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                              <input name={`usuarioModulo-${usuario.id}-${modulo.id}`} type="checkbox" checked={usuario.modulos.includes(modulo.id)} onChange={(e) => updateUser(usuario, { modulos: e.target.checked ? [...usuario.modulos, modulo.id] : usuario.modulos.filter((id) => id !== modulo.id) })} />
                              {modulo.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : activeTab === 'certificados' ? (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Sellos digitales y e.firma</h2>
                  <p className="mt-1 text-sm text-slate-500">CSD timbra facturas, global y nómina. FIEL descarga facturas recibidas del SAT.</p>
                </div>
                {[
                  ['CSD', 'Sellos digitales para timbrar', config.csdEstatus, config.csdMensaje, config.csdNoCertificado, config.csdVigenteHasta],
                  ['FIEL', 'e.firma para facturas recibidas', config.fielEstatus, config.fielMensaje, config.fielNoCertificado, config.fielVigenteHasta],
                ].map(([tipo, title, status, message, noCert, hasta]) => (
                  <div key={tipo} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-800">{title}</h3>
                        <p className="text-sm text-slate-500">{message || 'Carga archivos .cer y .key.'}</p>
                      </div>
                      <StatusPill status={String(status || 'SIN_CARGAR')} />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <input id={`${tipo}-cer`} name={`${tipo}-cer`} type="file" accept=".cer" className={inputClass} />
                      <input id={`${tipo}-key`} name={`${tipo}-key`} type="file" accept=".key" className={inputClass} />
                      <input id={`${tipo}-pass`} name={`${tipo}-pass`} type="password" placeholder="Contraseña" autoComplete="new-password" className={inputClass} />
                      <button onClick={() => uploadCert(tipo as 'CSD' | 'FIEL')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"><UploadCloud className="h-4 w-4" /> Guardar {tipo}</button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                      <p><span className="font-bold text-slate-600">No. certificado:</span> {noCert || 'Pendiente'}</p>
                      <p><span className="font-bold text-slate-600">Vigente hasta:</span> {hasta ? new Date(String(hasta)).toLocaleDateString('es-MX') : 'Pendiente'}</p>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <Field label="Proveedor PAC"><input name="pacProveedor" className={inputClass} value={config.pacProveedor || 'FINKOK'} onChange={(e) => patchConfig({ pacProveedor: e.target.value })} /></Field>
                  <Field label="Usuario PAC"><input name="pacUsuario" className={inputClass} value={config.pacUsuario || ''} onChange={(e) => patchConfig({ pacUsuario: e.target.value })} /></Field>
                  <Field label="Contraseña PAC"><input name="pacPassword" className={inputClass} type="password" autoComplete="new-password" placeholder={config.pacPasswordConfigurado ? 'Guardada, escribir solo para cambiar' : ''} onChange={(e) => patchConfig({ pacPasswordConfigurado: Boolean(e.target.value), ...(e.target.value ? { pacPassword: e.target.value } : {}) })} /></Field>
                </div>
              </section>
            ) : activeTab === 'correo' ? (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Correo saliente</h2>
                    <p className="mt-1 text-sm text-slate-500">Este correo enviará facturas, cotizaciones, recibos y consolidados.</p>
                  </div>
                  <StatusPill status={completion.correo ? 'CONFIGURADO' : 'SIN_CONFIGURAR'} />
                </div>
                {config.correoOrigen === 'ENV' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                    El correo está activo desde configuración externa. Para este SaaS se recomienda guardar el SMTP aquí en Configuración.
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Nombre del remitente"><input name="correoRemitenteNombre" className={inputClass} value={config.correoRemitenteNombre || ''} onChange={(e) => patchConfig({ correoRemitenteNombre: e.target.value })} /></Field>
                  <Field label="Correo del remitente"><input name="correoRemitenteEmail" type="email" className={inputClass} value={config.correoRemitenteEmail || ''} onChange={(e) => patchConfig({ correoRemitenteEmail: e.target.value })} /></Field>
                  <Field label="Servidor SMTP"><input name="correoHost" className={inputClass} placeholder="smtp.gmail.com" value={config.correoHost || ''} onChange={(e) => patchConfig({ correoHost: e.target.value })} /></Field>
                  <Field label="Puerto"><input name="correoPuerto" className={inputClass} type="number" value={config.correoPuerto || ''} onChange={(e) => patchConfig({ correoPuerto: Number(e.target.value) })} /></Field>
                  <Field label="Usuario SMTP"><input name="correoUsuario" className={inputClass} value={config.correoUsuario || ''} onChange={(e) => patchConfig({ correoUsuario: e.target.value })} /></Field>
                  <Field label="Contraseña SMTP"><input name="correoPassword" className={inputClass} type="password" autoComplete="new-password" placeholder={config.correoPasswordConfigurado ? 'Guardada, escribir solo para cambiar' : ''} onChange={(e) => patchConfig(e.target.value ? { correoPassword: e.target.value } : {})} /></Field>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                  <input name="correoSeguro" type="checkbox" checked={Boolean(config.correoSeguro)} onChange={(e) => patchConfig({ correoSeguro: e.target.checked })} />
                  Usar conexión SSL directa
                </label>
                <div className="flex flex-wrap gap-3">
                  <button onClick={saveConfig} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"><Save className="h-4 w-4" /> Guardar correo</button>
                  <button onClick={testMail} className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-white px-5 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50"><Mail className="h-4 w-4" /> Enviar prueba</button>
                </div>
              </section>
            ) : activeTab === 'respaldo' ? (
              <section className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Respaldo-recuperación</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">Respalda configuración y base de datos completa para recuperar el sistema en otro equipo.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <Database className="h-3.5 w-3.5" /> Sistema + BD
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                  {backupViewButton('crear', <FileArchive className="h-4 w-4" />, 'Crear')}
                  {backupViewButton('restaurar', <UploadCloud className="h-4 w-4" />, 'Restaurar')}
                  {backupViewButton('programar', <CalendarClock className="h-4 w-4" />, 'Programar')}
                  {backupViewButton('historial', <Database className="h-4 w-4" />, 'Historial')}
                </div>

                {backupView === 'crear' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <FileArchive className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="font-bold text-slate-800">Respaldo del sistema</h3>
                          <p className="text-sm text-slate-500">Incluye configuración y tablas operativas. Local descarga un ZIP al equipo del usuario.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {BACKUP_DESTINOS.map(({ id, label, Icon, status }) => (
                          <button
                            key={id}
                            onClick={() => handleBackupDestino(id)}
                            disabled={backupBusy && id === selectedBackupDestino}
                            className={`min-h-24 rounded-xl border p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60 ${id === selectedBackupDestino ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}
                          >
                            <Icon className="mb-2 h-5 w-5" />
                            <span className="block text-sm font-bold">{label}</span>
                            <span className="block text-xs font-semibold opacity-80">{backupBusy && id === selectedBackupDestino ? 'procesando' : status}</span>
                          </button>
                        ))}
                      </div>
                      {backupMessage && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700">{backupMessage}</p>}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <Database className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="font-bold text-slate-800">Base de datos completa</h3>
                          <p className="text-sm text-slate-500">Descarga un ZIP con el dump SQL completo de PostgreSQL.</p>
                        </div>
                      </div>
                      <button onClick={downloadFullDatabaseBackup} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                        <Download className="h-4 w-4" /> Descargar BD completa
                      </button>
                    </div>

                    {selectedBackupDestino === 'sftp' && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <FolderDown className="h-6 w-6 text-blue-600" />
                          <div>
                            <h3 className="font-bold text-slate-800">Conexión SFTP</h3>
                            <p className="text-sm text-slate-500">Captura los datos del servidor, prueba la conexión y guarda el respaldo remoto.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                          <input name="sftpHost" className={inputClass} placeholder="Servidor" value={sftpConfig.host} onChange={(e) => setSftpConfig((current) => ({ ...current, host: e.target.value }))} />
                          <input name="sftpPort" className={inputClass} type="text" inputMode="numeric" placeholder="Puerto" value={sftpConfig.port || ''} onChange={(e) => setSftpConfig((current) => ({ ...current, port: Number(e.target.value || 22) }))} />
                          <input name="sftpUsername" className={inputClass} placeholder="Usuario" value={sftpConfig.username} onChange={(e) => setSftpConfig((current) => ({ ...current, username: e.target.value }))} />
                          <input name="sftpPassword" className={inputClass} type="password" autoComplete="new-password" placeholder="Contraseña" value={sftpConfig.password} onChange={(e) => setSftpConfig((current) => ({ ...current, password: e.target.value }))} />
                          <input name="sftpRemotePath" className={inputClass} placeholder="Carpeta remota" value={sftpConfig.remotePath} onChange={(e) => setSftpConfig((current) => ({ ...current, remotePath: e.target.value }))} />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button onClick={testSftpConnection} disabled={sftpTesting} className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-white px-5 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-60">
                            {sftpTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Probar conexión
                          </button>
                          <button onClick={saveSftpBackup} disabled={backupBusy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                            {backupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />} Guardar en SFTP
                          </button>
                          {sftpMessage && <span className={`rounded-xl px-3 py-2 text-sm font-bold ${sftpMessage.toLowerCase().includes('ok') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{sftpMessage}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {backupView === 'restaurar' && (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <UploadCloud className="h-6 w-6 text-emerald-700" />
                        <div>
                          <h3 className="font-bold text-emerald-900">Restaurar JSON del sistema</h3>
                          <p className="text-sm text-emerald-700">Acepta .json o .zip con el respaldo lógico del sistema.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <label htmlFor="restoreBackupFile" className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100">
                          <span className="inline-flex min-w-0 items-center gap-2"><UploadCloud className="h-4 w-4 shrink-0 text-emerald-700" /><span className="truncate">{restoreFile ? restoreFile.name : 'Elegir archivo JSON o ZIP'}</span></span>
                          <span className="shrink-0 rounded-lg bg-emerald-100 px-3 py-1 text-xs text-emerald-800">Seleccionar</span>
                          <input id="restoreBackupFile" name="restoreBackupFile" type="file" accept="application/json,.json,.zip,application/zip" className="hidden" onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} />
                        </label>
                        <input name="restoreConfirmacion" value={restoreConfirmacion} onChange={(e) => setRestoreConfirmacion(e.target.value)} placeholder="Escribe RESTAURAR" className="rounded-xl border border-emerald-200 bg-white p-3 text-sm font-bold text-emerald-900 outline-none focus:border-emerald-500" />
                        <button onClick={restoreBackup} disabled={restoreBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                          {restoreBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Restaurar JSON
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <Database className="h-6 w-6 text-blue-700" />
                        <div>
                          <h3 className="font-bold text-blue-900">Restaurar base de datos completa</h3>
                          <p className="text-sm text-blue-700">Acepta .sql o .zip generado por el respaldo completo.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <label htmlFor="restoreDbFile" className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-3 text-sm font-bold text-blue-900 transition hover:bg-blue-100">
                          <span className="inline-flex min-w-0 items-center gap-2"><Database className="h-4 w-4 shrink-0 text-blue-700" /><span className="truncate">{restoreDbFile ? restoreDbFile.name : 'Elegir archivo SQL o ZIP'}</span></span>
                          <span className="shrink-0 rounded-lg bg-blue-100 px-3 py-1 text-xs text-blue-800">Seleccionar</span>
                          <input id="restoreDbFile" name="restoreDbFile" type="file" accept=".sql,.zip,application/zip" className="hidden" onChange={(event) => setRestoreDbFile(event.target.files?.[0] || null)} />
                        </label>
                        <input name="restoreDbConfirmacion" value={restoreDbConfirmacion} onChange={(e) => setRestoreDbConfirmacion(e.target.value)} placeholder="Escribe RESTAURAR_BD" className="rounded-xl border border-blue-200 bg-white p-3 text-sm font-bold text-blue-900 outline-none focus:border-blue-500" />
                        <button onClick={restoreFullDatabase} disabled={restoreDbBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                          {restoreDbBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} Restaurar BD completa
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {backupView === 'programar' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <CalendarClock className="h-6 w-6 text-blue-600" />
                      <div>
                        <h3 className="font-bold text-slate-800">Programación de respaldo</h3>
                        <p className="text-sm text-slate-500">Define frecuencia, hora, destino y retención.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"><input name="backupActivo" type="checkbox" checked={backupSchedule.activo} onChange={(e) => setBackupSchedule((current) => ({ ...current, activo: e.target.checked }))} />Activo</label>
                      <select name="backupFrecuencia" className={inputClass} value={backupSchedule.frecuencia} onChange={(e) => setBackupSchedule((current) => ({ ...current, frecuencia: e.target.value as BackupSchedule['frecuencia'] }))}><option value="diario">Diario</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option></select>
                      <input name="backupHora" type="time" className={inputClass} value={backupSchedule.hora} onChange={(e) => setBackupSchedule((current) => ({ ...current, hora: e.target.value }))} />
                      <select name="backupDestino" className={inputClass} value={backupSchedule.destino} onChange={(e) => setBackupSchedule((current) => ({ ...current, destino: e.target.value as BackupDestino }))}><option value="local">Local</option><option value="onedrive">OneDrive</option><option value="drive">Google Drive</option><option value="sftp">SFTP</option></select>
                      <input name="backupRetencion" type="number" min={1} max={365} className={inputClass} value={backupSchedule.retencion} onChange={(e) => setBackupSchedule((current) => ({ ...current, retencion: Number(e.target.value || 1) }))} />
                    </div>
                    <button onClick={saveBackupSchedule} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-white px-5 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50"><Save className="h-4 w-4" /> Guardar programación</button>
                  </div>
                )}

                {backupView === 'historial' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="font-bold text-slate-800">Historial de respaldos</h3><p className="text-sm text-slate-500">Últimos respaldos manuales y programados.</p></div>
                      <button onClick={loadBackupHistory} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Actualizar</button>
                    </div>
                    {backupHistory.length ? (
                      <div className="space-y-2">{backupHistory.slice(0, 8).map((entry) => (
                        <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-[140px_120px_1fr] md:items-center">
                          <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${entry.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{entry.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{entry.destino.toUpperCase()}</span>
                          <span className="text-xs font-bold text-slate-500">{entry.source === 'scheduled' ? 'Programado' : 'Manual'}</span>
                          <div className="min-w-0"><p className="truncate font-semibold text-slate-700">{entry.message}</p><p className="text-xs text-slate-500">{new Date(entry.finishedAt).toLocaleString('es-MX')}</p></div>
                        </div>
                      ))}</div>
                    ) : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">Todavía no hay respaldos registrados.</div>}
                  </div>
                )}
              </section>
            ) : (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Reinicializar base de datos</h2>
                  <p className="mt-1 text-sm text-slate-500">Borra la información capturada y deja el sistema desde cero. Solo usuarios ADMIN y SUPERADMIN pueden ejecutarlo.</p>
                </div>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-red-600" />
                      <div>
                        <h3 className="font-bold text-red-800">Factory reset de datos</h3>
                        <p className="mt-1 text-sm text-red-700">Se eliminarán facturas, clientes, productos, cotizaciones, empleados, recibos de nómina, facturas recibidas, solicitudes SAT y configuración fiscal/correo. Se conservarán los usuarios para no perder el acceso y los catálogos SAT base.</p>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-red-700">Confirmación</span>
                            <input name="resetConfirmacion" value={resetConfirmacion} onChange={(e) => setResetConfirmacion(e.target.value)} placeholder="Escribe REINICIAR" className="w-full rounded-xl border border-red-200 bg-white p-3 text-sm font-bold text-red-800 outline-none focus:border-red-500" />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-red-700">Contraseña admin</span>
                            <input name="resetDbPassword" type="password" value={resetDbPassword} onChange={(e) => setResetDbPassword(e.target.value)} placeholder="Contraseña" autoComplete="current-password" className="w-full rounded-xl border border-red-200 bg-white p-3 text-sm font-bold text-red-800 outline-none focus:border-red-500" />
                          </label>
                        </div>
                      </div>
                    </div>
                    <button onClick={resetDatabase} disabled={resettingDb} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      {resettingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Reinicializar BD
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
