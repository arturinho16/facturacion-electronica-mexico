"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SAT_NOMINA_CATALOGOS, validateEmpleadoNominaInput, type ValidationIssue } from "@/lib/nomina/catalogos";

const ESTADOS = [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Coahuila", "Colima",
    "Chiapas", "Chihuahua", "Ciudad de México", "Durango", "Guanajuato", "Guerrero", "Hidalgo",
    "Jalisco", "Estado de México", "Michoacán de Ocampo", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
    "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
    "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

const formatIssues = (issues: ValidationIssue[]) =>
    issues.map((issue) => `- ${issue.message}`).join("\n");

export default function NuevoEmpleadoPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Estado del formulario directamente alineado a la base de datos
    const [formData, setFormData] = useState({
        nombre: "", apellidoPaterno: "", apellidoMaterno: "", curp: "", nss: "", rfc: "",
        calle: "", colonia: "", numExterior: "", numInterior: "", cp: "", localidad: "",
        municipio: "", estado: "", email: "", grupo: "", sucursal: "", fechaRelacionLaboral: new Date().toISOString().split('T')[0],
        salario: 0, salarioCuotas: 0, contrato: "", regimenContratacion: "", riesgoPuesto: "1",
        tipoJornada: "", banco: "", clabe: "", periodicidad: "", departamento: "",
        puesto: "", numEmpleado: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const localIssues = validateEmpleadoNominaInput(formData);
        if (localIssues.length) {
            alert(`Revisa los campos obligatorios:\n${formatIssues(localIssues)}`);
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                salario: parseFloat(formData.salario.toString() || "0"),
                salarioCuotas: parseFloat(formData.salarioCuotas.toString() || "0"),
                fechaRelacionLaboral: new Date(formData.fechaRelacionLaboral).toISOString(),
            };

            const res = await fetch("/api/empleados", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Empleado agregado correctamente");
                router.push("/empleados");
            } else {
                const errorData = await res.json();
                const details = Array.isArray(errorData.issues) ? `\n${formatIssues(errorData.issues)}` : "";
                alert(`Error: ${errorData.error || "No se pudo guardar"}${details}`);
            }
        } catch {
            alert("Error de conexión al guardar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-4">
                    <Link href="/empleados" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar a Empleados
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Nuevo Empleado</h2>
                            <p className="text-sm text-slate-500">Completa los datos del trabajador para el timbrado de nómina</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
                        {/* SECCIÓN 1: IDENTIFICACIÓN Y AGRUPACIÓN */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre(s) *</label>
                                <input required name="nombre" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Apellido Paterno *</label>
                                <input required name="apellidoPaterno" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Apellido Materno</label>
                                <input name="apellidoMaterno" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Grupo</label>
                                <select name="grupo" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Selecciona un grupo</option>
                                    <option value="Administrativo">Administrativo</option>
                                    <option value="Operativo">Operativo</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Sucursal</label>
                                <select name="sucursal" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Seleccionar sucursal</option>
                                    <option value="Matriz">Matriz</option>
                                    <option value="Sucursal 1">Sucursal 1</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Número de Empleado (Control Interno) *</label>
                                <input required name="numEmpleado" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                        </div>

                        {/* SECCIÓN 2: DATOS FISCALES Y DE NÓMINA (INFERIOR DEL PDF) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CURP *</label>
                                <input required name="curp" onChange={handleChange} maxLength={18} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">RFC *</label>
                                <input required name="rfc" onChange={handleChange} maxLength={13} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Salario diario *</label>
                                <input required name="salario" onChange={handleChange} type="number" step="0.01" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Salario diario integrado *</label>
                                <input required name="salarioCuotas" onChange={handleChange} type="number" step="0.01" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de contrato *</label>
                                <select required name="contrato" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione el tipo de contrato</option>
                                    {SAT_NOMINA_CATALOGOS.TIPOS_CONTRATO.map((tipo) => (
                                        <option key={tipo.clave} value={tipo.clave}>{tipo.descripcion}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-[11px] text-slate-500">Contratos 01 a 08 requieren Registro Patronal en configuración fiscal.</p>
                            </div>

                            {/* DOMICILIO COMPLETO */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Calle *</label>
                                <input required name="calle" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Colonia *</label>
                                <input required name="colonia" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Régimen de contratación *</label>
                                <select required name="regimenContratacion" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione Régimen</option>
                                    {SAT_NOMINA_CATALOGOS.REGIMENES_CONTRATACION.map((reg) => (
                                        <option key={reg.clave} value={reg.clave}>{reg.descripcion}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-[11px] text-slate-500">Para contrato 09 o superior usa régimen 05 a 99.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Ext *</label>
                                <input required name="numExterior" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Int</label>
                                <input name="numInterior" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Localidad</label>
                                <input name="localidad" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de jornada *</label>
                                <select required name="tipoJornada" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione el tipo de jornada</option>
                                    {SAT_NOMINA_CATALOGOS.TIPOS_JORNADA.map((jor) => (
                                        <option key={jor.clave} value={jor.clave}>{jor.descripcion}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Código Postal *</label>
                                <input required name="cp" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Municipio *</label>
                                <input required name="municipio" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Estado *</label>
                                <select required name="estado" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Seleccione Estado</option>
                                    {ESTADOS.map((est) => (
                                        <option key={est} value={est}>{est}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Banco (Opcional)</label>
                                <select name="banco" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                                    <option value="">Seleccione Banco (Opcional)</option>
                                    {SAT_NOMINA_CATALOGOS.BANCOS_SAT.map((ban) => (
                                        <option key={ban.clave} value={ban.clave}>{ban.descripcion}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">E-Mail (Opcional)</label>
                                <input name="email" onChange={handleChange} type="email" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CLABE Interbancaria (Opcional)</label>
                                <input name="clabe" onChange={handleChange} maxLength={18} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Periodicidad de Pago *</label>
                                <select required name="periodicidad" onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-700">
                                    <option value="">Seleccione Periodicidad</option>
                                    {SAT_NOMINA_CATALOGOS.PERIODICIDADES_PAGO.map((per) => (
                                        <option key={per.clave} value={per.clave}>{per.descripcion}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Departamento (Opcional)</label>
                                <input name="departamento" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Puesto (Opcional)</label>
                                <input name="puesto" onChange={handleChange} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Seguridad Social (NSS) *</label>
                                <input required name="nss" onChange={handleChange} maxLength={11} type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Inicio de Relación Laboral</label>
                                <input required name="fechaRelacionLaboral" value={formData.fechaRelacionLaboral} onChange={handleChange} type="date" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <Link href="/empleados" className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                                Cancelar
                            </Link>
                            <button disabled={isSaving} type="submit" className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                                <Save size={18} />
                                {isSaving ? "Guardando en BD..." : "Guardar Empleado"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
