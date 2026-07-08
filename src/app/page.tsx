'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, Package, FileText, BarChart3, PlusCircle, Receipt,
  FileCheck, Menu, X, Globe, Calendar, PieChart as PieChartIcon,
  TrendingUp, LayoutPanelLeft, LogOut, Archive, Settings, Inbox, Calculator, Stamp, Database
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

// ─── Interfaces ───────────────────────────────────────────────────────────
interface ResumenMensual {
  facturasTimbradas: number;
  facturasNoTimbradas: number;
  facturasCanceladas: number;
  dineroTimbrado: number;
  topCliente: string;
}

interface DatosDiarios {
  dia: string;
  monto: number;
  cantidad: number;
}

interface FacturaDashboard {
  estado?: string;
  total?: string | number;
  fecha?: string;
  client?: {
    nombreRazonSocial?: string;
  };
}

interface DatosEstado {
  name: string;
  cantidad: number;
  fill: string;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COLORES_ESTADO = {
  Timbradas: '#16a34a', // Verde
  Borradores: '#d97706', // Ámbar
  Canceladas: '#dc2626'  // Rojo
};

const NAV_ITEMS = [
  { href: '/', label: 'Panel', Icon: BarChart3 },
  { href: '/facturas/nueva', label: 'Nueva Factura', Icon: PlusCircle },
  { href: '/facturas', label: 'Facturas', Icon: Receipt },
  { href: '/facturas/global', label: 'Factura Global', Icon: Globe },
  { href: '/facturas/consolidado', label: 'Consolidado Mensual', Icon: Archive },
  { href: '/catalogos/clientes', label: 'Clientes', Icon: Users },
  { href: '/catalogos/productos', label: 'Productos', Icon: Package },
  { href: '/cotizaciones', label: 'Cotizaciones', Icon: FileCheck },
  { href: '/calculadoras', label: 'Calculadoras', Icon: Calculator },
  { href: '/empleados', label: 'Empleados', Icon: Users },
  { href: '/nomina/facturacion-masiva', label: 'Nómina Masiva', Icon: FileText },
  { href: '/facturas-recibidas', label: 'Facturas Recibidas', Icon: Inbox },
  { href: '/facturas-recibidas/consolidado', label: 'Consolidado Recibidas', Icon: Archive },
  { href: '/reportes/timbres', label: 'Timbres Usados', Icon: Stamp },
  { href: '/configuracion', label: 'Configuración', Icon: Settings },
] as const;

const MODULE_CARDS = [
  { href: '/catalogos/clientes', title: 'Clientes', description: 'Sube la CIF de tus clientes', Icon: Users, color: 'border-l-emerald-500 bg-emerald-50 text-emerald-600' },
  { href: '/catalogos/productos', title: 'Productos', description: 'Productos y servicios a facturar', Icon: Package, color: 'border-l-violet-500 bg-violet-50 text-violet-600' },

  { href: '/facturas/nueva', title: 'Nueva Factura', description: 'Generar CFDI 4.0 al instante.', Icon: FileText, color: 'border-l-sky-500 bg-sky-50 text-sky-600' },
  { href: '/facturas', title: 'Facturas Emitidas', description: 'Historial, descarga y envío por correo.', Icon: Receipt, color: 'border-l-amber-500 bg-amber-50 text-amber-600' },
  { href: '/facturas/global', title: 'Factura Global', description: 'Ventas al público en general.', Icon: Globe, color: 'border-l-indigo-500 bg-indigo-50 text-indigo-600' },
  { href: '/facturas/consolidado', title: 'Consolidado Mensual', description: 'Cierre contable y ZIP de XMLs.', Icon: Archive, color: 'border-l-cyan-500 bg-cyan-50 text-cyan-600' },
  { href: '/cotizaciones', title: 'Cotizaciones', description: 'Cotizaciones a clientes.', Icon: FileCheck, color: 'border-l-slate-500 bg-slate-100 text-slate-700' },
  { href: '/calculadoras', title: 'Calculadoras', description: 'ISR, IVA, nómina y cálculos laborales.', Icon: Calculator, color: 'border-l-blue-500 bg-blue-50 text-blue-600' },
  { href: '/empleados', title: 'Empleados', description: 'Gestión de empleados a timbrar.', Icon: Users, color: 'border-l-orange-500 bg-orange-50 text-orange-600' },
  { href: '/nomina/facturacion-masiva', title: 'Nómina Masiva', description: 'Timbrado de recibos en lote.', Icon: FileText, color: 'border-l-teal-500 bg-teal-50 text-teal-600' },
  { href: '/facturas-recibidas', title: 'Facturas Recibidas', description: 'Descarga de facturas del SAT.', Icon: Inbox, color: 'border-l-pink-500 bg-pink-50 text-pink-600' },
  { href: '/facturas-recibidas/consolidado', title: 'Consolidado Recibidas', description: 'Visualización y descargas por RFC.', Icon: Archive, color: 'border-l-rose-500 bg-rose-50 text-rose-600' },
  { href: '/reportes/timbres', title: 'Timbres Usados', description: 'Conteo por UUID y periodo.', Icon: Stamp, color: 'border-l-blue-500 bg-blue-50 text-blue-600' },
  { href: '/catalogoSat-productos-servicios', title: 'Catalogo de claves del SAT', description: 'Base global de claves SAT para productos y servicios.', Icon: Database, color: 'border-l-blue-500 bg-blue-50 text-blue-600' },
  { href: '/configuracion', title: 'Configuración', description: 'Perfil fiscal, usuarios y apariencia.', Icon: Settings, color: 'border-l-slate-800 bg-slate-100 text-slate-700' },
] as const;

export default function DashboardPage() {
  const router = useRouter();

  // Hook de inactividad (15 minutos)
  useInactivityTimeout(15);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [headerColor, setHeaderColor] = useState('#2563eb');

  // Controles del Dashboard
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioActual] = useState(new Date().getFullYear());
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'pastel' | 'lineas'>('barras');

  // Datos calculados
  const [resumen, setResumen] = useState<ResumenMensual>({
    facturasTimbradas: 0,
    facturasNoTimbradas: 0,
    facturasCanceladas: 0,
    dineroTimbrado: 0,
    topCliente: '-',
  });

  const [datosEstado, setDatosEstado] = useState<DatosEstado[]>([]);
  const [datosDiarios, setDatosDiarios] = useState<DatosDiarios[]>([]);

  useEffect(() => {
    async function cargarResumen() {
      setLoading(true);
      try {
        const desde = new Date(anioActual, mesSeleccionado, 1).toISOString();
        const hasta = new Date(anioActual, mesSeleccionado + 1, 0, 23, 59, 59).toISOString();

        const res = await fetch(`/api/facturas?desde=${desde}&hasta=${hasta}`);
        const facturas: FacturaDashboard[] = await res.json();

        // Clasificación de estados
        const timbradas = facturas.filter((f) => f.estado === 'TIMBRADO' || f.estado === 'ENVIADA');
        const noTimbradas = facturas.filter((f) => f.estado === 'BORRADOR');
        const canceladas = facturas.filter((f) => f.estado === 'CANCELADO' || f.estado === 'CANCELADA');

        // Dinero Total Timbrado
        const dineroTimbrado = timbradas.reduce((sum, f) => sum + parseFloat(String(f.total || '0')), 0);

        // Cliente con más facturas válidas
        const conteoClientes: Record<string, number> = {};
        timbradas.forEach((f) => {
          const nombre = f.client?.nombreRazonSocial || 'Desconocido';
          conteoClientes[nombre] = (conteoClientes[nombre] || 0) + 1;
        });

        let topCliente = '-';
        let maxFacturas = 0;
        for (const [nombre, conteo] of Object.entries(conteoClientes)) {
          if (conteo > maxFacturas) {
            maxFacturas = conteo;
            topCliente = nombre;
          }
        }

        if (topCliente.length > 20) topCliente = topCliente.substring(0, 20) + '...';

        setResumen({
          facturasTimbradas: timbradas.length,
          facturasNoTimbradas: noTimbradas.length,
          facturasCanceladas: canceladas.length,
          dineroTimbrado,
          topCliente: maxFacturas > 0 ? topCliente : 'Sin datos',
        });

        setDatosEstado([
          { name: 'Timbradas', cantidad: timbradas.length, fill: COLORES_ESTADO.Timbradas },
          { name: 'No Timbradas', cantidad: noTimbradas.length, fill: COLORES_ESTADO.Borradores },
          { name: 'Canceladas', cantidad: canceladas.length, fill: COLORES_ESTADO.Canceladas },
        ]);

        const diasDelMes = new Date(anioActual, mesSeleccionado + 1, 0).getDate();
        const diario: DatosDiarios[] = Array.from({ length: diasDelMes }, (_, i) => ({
          dia: `${i + 1}`,
          monto: 0,
          cantidad: 0
        }));

        timbradas.forEach((f) => {
          const dia = new Date(f.fecha || '').getDate();
          if (diario[dia - 1]) {
            diario[dia - 1].monto += parseFloat(String(f.total || '0'));
            diario[dia - 1].cantidad += 1;
          }
        });
        setDatosDiarios(diario);

      } catch (err) {
        console.error('Error cargando resumen:', err);
      } finally {
        setLoading(false);
      }
    }

    cargarResumen();
  }, [mesSeleccionado, anioActual]);

  useEffect(() => {
    async function cargarLogo() {
      const res = await fetch('/api/public/branding', { cache: 'no-store' }).catch(() => null);
      if (!res?.ok) {
        setLogoUrl('');
        setEmpresaNombre('');
        return;
      }
      const config = await res.json().catch(() => ({}));
      setLogoUrl(config.logoUrl || '');
      setEmpresaNombre(config.nombreComercial || '');
      setHeaderColor(/^#[0-9A-Fa-f]{6}$/.test(String(config.aparienciaHeaderColor || '')) ? config.aparienciaHeaderColor : '#2563eb');
    }

    cargarLogo();
  }, []);

  const formatMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  // Función de Logout (ahora sí, correctamente dentro del componente)
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const kpis = [
    { label: 'Timbradas Emitidas', value: loading ? '…' : String(resumen.facturasTimbradas), color: 'text-green-600' },
    { label: 'Dinero Timbrado', value: loading ? '…' : formatMXN(resumen.dineroTimbrado), color: 'text-blue-700' },
    { label: 'NO Timbradas', value: loading ? '…' : String(resumen.facturasNoTimbradas), color: 'text-amber-500' },
    { label: 'Canceladas', value: loading ? '…' : String(resumen.facturasCanceladas), color: 'text-red-500' },
    { label: 'Cliente Frecuente', value: loading ? '…' : resumen.topCliente, color: 'text-indigo-600', isText: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="shadow-lg" style={{ backgroundColor: headerColor }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0 flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo de la empresa" className="h-full w-full object-contain p-1" />
              ) : (
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              )}
            </div>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight">{empresaNombre || 'Configura tu empresa'}</h1>
              <p className="text-white/75 text-xs hidden sm:block">Sistema de Autofacturación CFDI 4.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/facturas/nueva" className="hidden sm:flex items-center gap-2 bg-white text-slate-800 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm shadow">
              <PlusCircle className="w-4 h-4" /> Nueva Factura
            </Link>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-red-600 transition-all text-sm shadow ml-2"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Nav desktop ── */}
        <div className="hidden border-t border-white/20 sm:block lg:hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
            {NAV_ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm transition-colors whitespace-nowrap ${href === '/' ? 'text-white bg-white/20 border-b-2 border-white font-bold' : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Nav móvil (hamburguesa) ── */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/20">
            <nav className="grid grid-cols-1 max-h-[70vh] overflow-y-auto">
              {NAV_ITEMS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-5 py-4 border-b border-white/10 ${href === '/' ? 'text-white bg-white/20 font-bold' : 'text-white/85 hover:bg-white/10 font-medium'}`}
                >
                  <Icon className="w-5 h-5 shrink-0" /> {label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-5 py-4 text-red-200 hover:bg-white/10 font-medium border-b border-white/10 text-left w-full"
              >
                <LogOut className="w-5 h-5" /> Cerrar Sesión
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* ── Contenido ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 pb-24">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 mt-1 text-sm">Bienvenido al sistema mas completo de Autofacturación en México.</p>
        </div>

        {/* ── Accesos Rápidos ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {MODULE_CARDS.map(({ href, title, description, Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`group min-h-[142px] rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md sm:min-h-[168px] sm:p-5 ${color}`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="inline-flex rounded-xl bg-inherit p-2.5 shadow-sm">
                  <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <PlusCircle className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <h3 className="text-sm font-bold leading-snug text-slate-800 sm:text-lg">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>
            </Link>
          ))}
        </div>

        {/* ── Resumen Mensual con Filtro ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Resumen de Operaciones</h2>
            </div>

            {/* Filtro de Meses */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                {MESES.map((mes, index) => (
                  <option key={mes} value={index}>{mes} {anioActual}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100 border-b border-slate-100">
            {kpis.map((k, idx) => (
              <div key={idx} className="p-4 sm:p-6 flex flex-col justify-center">
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1 leading-tight">{k.label}</p>
                <p className={`${k.isText ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-bold ${k.color} ${loading ? 'animate-pulse opacity-50' : ''} truncate`} title={String(k.value)}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Gráficos ── */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-base font-bold text-slate-700">Análisis Gráfico del Mes</h3>

              {/* Botones para cambiar de vista */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setVistaGrafico('barras')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${vistaGrafico === 'barras' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutPanelLeft className="w-4 h-4" /> Barras
                </button>
                <button
                  onClick={() => setVistaGrafico('pastel')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${vistaGrafico === 'pastel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <PieChartIcon className="w-4 h-4" /> Distribución
                </button>
                <button
                  onClick={() => setVistaGrafico('lineas')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${vistaGrafico === 'lineas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <TrendingUp className="w-4 h-4" /> Tendencia
                </button>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                  <span className="text-slate-400 font-medium">Cargando gráficos...</span>
                </div>
              ) : (
                <>
                  {/* Vista 1: Barras */}
                  {vistaGrafico === 'barras' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosEstado} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {datosEstado.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Vista 2: Pastel / Dona */}
                  {vistaGrafico === 'pastel' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={datosEstado}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="cantidad"
                        >
                          {datosEstado.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', fontWeight: 600, color: '#475569' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {/* Vista 3: Líneas de Tendencia Mensual */}
                  {vistaGrafico === 'lineas' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosDiarios} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <RechartsTooltip
                          formatter={(value) => [formatMXN(Number(value || 0)), 'Monto Timbrado']}
                          labelFormatter={(label) => `Día ${label} de ${MESES[mesSeleccionado]}`}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="monto"
                          stroke="#2563eb"
                          strokeWidth={4}
                          dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#1d4ed8' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
