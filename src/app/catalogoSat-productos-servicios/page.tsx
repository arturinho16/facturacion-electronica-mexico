'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Edit2, PlusCircle, RotateCcw, Save, Search, X } from 'lucide-react';

type CatalogoSatItem = {
  id: string;
  claveSat: string;
  descripcionSat: string;
  categoria: string;
  subcategoria: string;
  tipo: string;
  activo: boolean;
  origen?: string | null;
  esUsuario: boolean;
};

type CatalogoResponse = {
  items: CatalogoSatItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categorias: string[];
  subcategorias: string[];
  tipos: string[];
};

const EMPTY_FORM = {
  claveSat: '',
  descripcionSat: '',
  categoria: '',
  subcategoria: '',
  tipo: 'Producto',
  activo: true,
  origen: 'Captura manual',
};

export default function CatalogoSatProductosServiciosPage() {
  const [items, setItems] = useState<CatalogoSatItem[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>(['Producto', 'Servicio']);
  const [suggestions, setSuggestions] = useState<CatalogoSatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [tipo, setTipo] = useState('');
  const [activo, setActivo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CatalogoSatItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (categoria) params.set('categoria', categoria);
    if (subcategoria) params.set('subcategoria', subcategoria);
    if (tipo) params.set('tipo', tipo);
    if (activo) params.set('activo', activo);
    params.set('page', String(page));
    params.set('pageSize', '20');
    return params;
  }, [activo, categoria, page, q, subcategoria, tipo]);

  const fetchCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalogoSat-productos-servicios?${queryParams.toString()}`, { cache: 'no-store' });
      const data: CatalogoResponse = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setCategorias(Array.isArray(data.categorias) ? data.categorias : []);
      setSubcategorias(Array.isArray(data.subcategorias) ? data.subcategorias : []);
      setTipos(Array.isArray(data.tipos) ? data.tipos : ['Producto', 'Servicio']);
      setTotal(Number(data.total || 0));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (error) {
      console.error('Error cargando catalogoSat-productos-servicios:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCatalogo();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchCatalogo]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalogoSat-productos-servicios/sugerencias?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error cargando sugerencias SAT:', error);
        setSuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [q]);

  const resetFilters = () => {
    setQ('');
    setCategoria('');
    setSubcategoria('');
    setTipo('');
    setActivo('');
    setPage(1);
    setSuggestions([]);
  };

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const startEdit = (item: CatalogoSatItem) => {
    setEditing(item);
    setForm({
      claveSat: item.claveSat,
      descripcionSat: item.descripcionSat,
      categoria: item.categoria,
      subcategoria: item.subcategoria,
      tipo: item.tipo,
      activo: item.activo,
      origen: item.origen || (item.esUsuario ? 'Captura manual' : 'SAT c_ClaveProdServ'),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const url = editing ? `/api/catalogoSat-productos-servicios/${editing.id}` : '/api/catalogoSat-productos-servicios';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo guardar la clave SAT.');
        return;
      }

      resetForm();
      await fetchCatalogo();
    } catch (error) {
      console.error('Error guardando clave SAT:', error);
      alert('Error de conexión al guardar la clave SAT.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (item: CatalogoSatItem) => {
    if (!confirm(`¿Desactivar la clave ${item.claveSat}? No se borrará físicamente.`)) return;

    const res = await fetch(`/api/catalogoSat-productos-servicios/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'No se pudo desactivar la clave SAT.');
      return;
    }

    await fetchCatalogo();
  };

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-base font-bold text-slate-500 transition-colors hover:text-blue-600">
              <ArrowLeft className="h-5 w-5" /> Panel
            </Link>
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Catalogo de claves del SAT</h1>
              <p className="text-sm text-slate-500">Base global de claves SAT para productos y servicios.</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
          >
            {showForm ? <X className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            {showForm ? 'Cerrar formulario' : 'Agregar clave'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Editar clave SAT' : 'Nueva clave SAT'}</h2>
              {editing && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {editing.esUsuario ? 'Captura usuario' : 'Clave base'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Clave SAT *</label>
                <input
                  value={form.claveSat}
                  onChange={(event) => updateForm('claveSat', event.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full rounded-lg border border-slate-200 p-3 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="43201800"
                  required
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700">Descripción SAT *</label>
                <input
                  value={form.descripcionSat}
                  onChange={(event) => updateForm('descripcionSat', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Servicios de desarrollo de software"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={(event) => updateForm('tipo', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Producto">Producto</option>
                  <option value="Servicio">Servicio</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Categoría *</label>
                <input
                  value={form.categoria}
                  onChange={(event) => updateForm('categoria', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tecnología"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Subcategoría *</label>
                <input
                  value={form.subcategoria}
                  onChange={(event) => updateForm('subcategoria', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Software"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Origen</label>
                <input
                  value={form.origen}
                  onChange={(event) => updateForm('origen', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Estado</label>
                <select
                  value={form.activo ? 'true' : 'false'}
                  onChange={(event) => updateForm('activo', event.target.value === 'true')}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={q}
                  onChange={(event) => {
                    const value = event.target.value;
                    setQ(value);
                    if (value.trim().length < 2) setSuggestions([]);
                    setPage(1);
                  }}
                  className="w-full bg-transparent py-3 outline-none"
                  placeholder="Buscar por clave SAT, descripción, categoría o subcategoría"
                />
              </div>
              {suggestions.length > 0 && q.trim().length >= 2 && (
                <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {suggestions.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setQ(item.claveSat);
                        setSuggestions([]);
                        setPage(1);
                      }}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-blue-50"
                    >
                      <div className="font-mono text-sm font-bold text-blue-700">{item.claveSat}</div>
                      <div className="text-sm text-slate-700">{item.descripcionSat}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.categoria} / {item.subcategoria}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={categoria}
              onChange={(event) => {
                setCategoria(event.target.value);
                setSubcategoria('');
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <select
              value={subcategoria}
              onChange={(event) => {
                setSubcategoria(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las subcategorías</option>
              {subcategorias.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <select
              value={tipo}
              onChange={(event) => {
                setTipo(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Producto y servicio</option>
              {tipos.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <div className="flex gap-2">
              <select
                value={activo}
                onChange={(event) => {
                  setActivo(event.target.value);
                  setPage(1);
                }}
                className="min-w-32 rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
              <button onClick={resetFilters} className="rounded-lg border border-slate-200 p-3 text-slate-500 hover:bg-slate-100" title="Limpiar filtros">
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-bold text-slate-600">{total.toLocaleString('es-MX')} claves encontradas</p>
            <p className="text-xs text-slate-400">Los registros se desactivan, no se borran físicamente.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-4 font-bold">Clave</th>
                  <th className="p-4 font-bold">Descripción</th>
                  <th className="p-4 font-bold">Categoría</th>
                  <th className="p-4 font-bold">Subcategoría</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold">Estado</th>
                  <th className="p-4 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400">Cargando catálogo...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400">No se encontraron claves SAT.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/60">
                    <td className="p-4 font-mono font-bold text-blue-700">{item.claveSat}</td>
                    <td className="max-w-md p-4">
                      <div className="font-semibold text-slate-800">{item.descripcionSat}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.esUsuario ? 'Agregada por usuario' : item.origen || 'Clave base'}</div>
                    </td>
                    <td className="p-4 text-slate-600">{item.categoria}</td>
                    <td className="p-4 text-slate-600">{item.subcategoria}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{item.tipo}</span>
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => startEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-100" title="Editar">
                          <Edit2 className="h-5 w-5" />
                        </button>
                        {item.activo && (
                          <button onClick={() => deactivate(item)} className="rounded-lg p-2 text-red-600 hover:bg-red-100" title="Desactivar">
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
