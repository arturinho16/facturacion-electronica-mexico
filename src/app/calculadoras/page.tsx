'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  FileText,
  Info,
  Percent,
  PlusCircle,
  ReceiptText,
  Trash2,
  Wallet,
} from 'lucide-react';
import { formatMoneyMX } from '@/lib/formatos';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

type CalculatorTab = 'iva' | 'isr' | 'sueldo' | 'aguinaldo' | 'finiquito' | 'liquidacion' | 'ptu' | 'arrendamiento';
type IvaMode = 'agregar' | 'desglosar';
type IsrMode = 'general' | 'resico';
type SalaryMode = 'bruto-a-neto' | 'neto-a-bruto';
type PersonType = 'fisica' | 'moral';

type PtuWorker = {
  id: number;
  nombre: string;
  salarioAnual: number;
  fechaAlta: string;
  fechaBaja: string;
  dias: number;
  tipo: 'operativo' | 'confianza' | 'excluido';
};

const UMA_DIARIA_2026 = 117.31;
const UMA_ANUAL_2026 = 42794.64;
const SALARIO_MINIMO_GENERAL_2026 = 315.04;
const DIAS_ANIO = 365;
const DIAS_MES = 30.4;
const SUBSIDIO_EMPLEO_MENSUAL_2026 = 535.65;

const ISR_ANUAL_2026 = [
  { lower: 0.01, upper: 10135.11, fixed: 0, rate: 0.0192 },
  { lower: 10135.12, upper: 86022.11, fixed: 194.59, rate: 0.064 },
  { lower: 86022.12, upper: 151176.19, fixed: 5051.37, rate: 0.1088 },
  { lower: 151176.2, upper: 175735.66, fixed: 12140.13, rate: 0.16 },
  { lower: 175735.67, upper: 210403.69, fixed: 16069.64, rate: 0.1792 },
  { lower: 210403.7, upper: 424353.97, fixed: 22282.14, rate: 0.2136 },
  { lower: 424353.98, upper: 668840.14, fixed: 67981.92, rate: 0.2352 },
  { lower: 668840.15, upper: 1276925.98, fixed: 125485.07, rate: 0.3 },
  { lower: 1276925.99, upper: 1702567.97, fixed: 307910.81, rate: 0.32 },
  { lower: 1702567.98, upper: 5107703.92, fixed: 444116.23, rate: 0.34 },
  { lower: 5107703.93, upper: Infinity, fixed: 1601862.46, rate: 0.35 },
];

const ISR_MENSUAL_SUELDOS_2026 = [
  { lower: 0.01, upper: 844.59, fixed: 0, rate: 0.0192 },
  { lower: 844.6, upper: 7168.51, fixed: 16.22, rate: 0.064 },
  { lower: 7168.52, upper: 12598.02, fixed: 420.95, rate: 0.1088 },
  { lower: 12598.03, upper: 14644.64, fixed: 1011.68, rate: 0.16 },
  { lower: 14644.65, upper: 17533.64, fixed: 1339.14, rate: 0.1792 },
  { lower: 17533.65, upper: 35362.83, fixed: 1856.84, rate: 0.2136 },
  { lower: 35362.84, upper: 55736.68, fixed: 5665.16, rate: 0.2352 },
  { lower: 55736.69, upper: 106410.5, fixed: 10457.09, rate: 0.3 },
  { lower: 106410.51, upper: 141880.66, fixed: 25659.23, rate: 0.32 },
  { lower: 141880.67, upper: 425641.99, fixed: 37009.69, rate: 0.34 },
  { lower: 425642, upper: Infinity, fixed: 133488.54, rate: 0.35 },
];

const CALCULATORS = [
  { id: 'iva', label: 'IVA', description: 'Agregar o desglosar IVA', Icon: Percent },
  { id: 'isr', label: 'ISR', description: 'Estimación anual o mensual', Icon: ReceiptText },
  { id: 'sueldo', label: 'Sueldo', description: 'Bruto, neto e integración', Icon: Wallet },
  { id: 'aguinaldo', label: 'Aguinaldo', description: 'Proporcional anual', Icon: CalendarDays },
  { id: 'finiquito', label: 'Finiquito', description: 'Prestaciones devengadas', Icon: FileText },
  { id: 'liquidacion', label: 'Liquidación', description: 'Despido injustificado', Icon: BriefcaseBusiness },
  { id: 'ptu', label: 'PTU', description: 'Reparto por trabajadores', Icon: Banknote },
  { id: 'arrendamiento', label: 'Arrendamiento', description: 'IVA y retenciones', Icon: Building2 },
] as const;

const inputClass = 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-800 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20';

function money(value: number) {
  return formatMoneyMX(Number.isFinite(value) ? value : 0);
}

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function num(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function positive(value: unknown) {
  return Math.max(0, num(value));
}

function toDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysInclusive(from: Date | null, to: Date | null) {
  if (!from || !to || to < from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

function overlapDaysInYear(from: Date | null, to: Date | null, year: number) {
  if (!from || !to || to < from) return 0;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const effectiveStart = from > start ? from : start;
  const effectiveEnd = to < end ? to : end;
  return daysInclusive(effectiveStart, effectiveEnd);
}

function yearsWorked(from: Date | null, to: Date | null) {
  return daysInclusive(from, to) / DIAS_ANIO;
}

function vacationDaysByYears(years: number) {
  const fullYears = Math.max(1, Math.floor(years));
  if (fullYears <= 5) return 10 + fullYears * 2;
  return 20 + Math.ceil((fullYears - 5) / 5) * 2;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(date.getFullYear() + years);
  return next;
}

function servicePeriodInfo(from: Date | null, to: Date | null) {
  if (!from || !to || to < from) {
    return { completedYears: 0, currentYear: 1, currentServiceDays: 0, proportionalVacationDays: 0 };
  }

  let completedYears = to.getFullYear() - from.getFullYear();
  let anniversary = addYears(from, completedYears);
  if (to < anniversary) {
    completedYears -= 1;
    anniversary = addYears(from, completedYears);
  }

  const currentYear = Math.max(1, completedYears + 1);
  const currentServiceDays = daysInclusive(anniversary, to);
  const proportionalVacationDays = vacationDaysByYears(currentYear) * (currentServiceDays / DIAS_ANIO);
  return { completedYears, currentYear, currentServiceDays, proportionalVacationDays };
}

function tariffTax(base: number, table: typeof ISR_ANUAL_2026) {
  const taxable = Math.max(0, base);
  if (taxable <= 0) return 0;
  const bracket = table.find((row) => taxable >= row.lower && taxable <= row.upper) || table[table.length - 1];
  return Math.max(0, (taxable - bracket.lower) * bracket.rate + bracket.fixed);
}

function annualIsr(base: number) {
  return tariffTax(base, ISR_ANUAL_2026);
}

function monthlyIsr(base: number, withSubsidy = false) {
  const beforeSubsidy = tariffTax(base, ISR_MENSUAL_SUELDOS_2026);
  const subsidy = withSubsidy ? Math.min(beforeSubsidy, SUBSIDIO_EMPLEO_MENSUAL_2026) : 0;
  return Math.max(0, beforeSubsidy - subsidy);
}

function dailySalary(monthlySalary: number) {
  return positive(monthlySalary) / DIAS_MES;
}

function finiquitoIsrEstimate(monthlySalary: number, taxable: number) {
  const baseSalary = Math.max(0, positive(monthlySalary) - estimatedWorkerImss(positive(monthlySalary)));
  const rate = baseSalary ? tariffTax(baseSalary, ISR_MENSUAL_SUELDOS_2026) / baseSalary : 0;
  return Math.max(0, taxable * rate);
}

function separationIsrEstimate(monthlySalary: number, taxable: number) {
  const rate = positive(monthlySalary) ? Math.min(monthlyIsr(positive(monthlySalary), true) / positive(monthlySalary), 0.0192) : 0;
  return Math.max(0, taxable * rate);
}

function resicoRate(monthlyIncome: number) {
  if (monthlyIncome <= 25000) return 0.01;
  if (monthlyIncome <= 50000) return 0.011;
  if (monthlyIncome <= 83333.33) return 0.015;
  if (monthlyIncome <= 208333.33) return 0.02;
  return 0.025;
}

function estimatedWorkerImss(monthlyGross: number, aguinaldoDays = 15, vacationDays = 12, vacationPremium = 25) {
  const factor = 1 + (positive(aguinaldoDays) + positive(vacationDays) * (positive(vacationPremium) / 100)) / DIAS_ANIO;
  const sdi = Math.min(dailySalary(monthlyGross) * factor, UMA_DIARIA_2026 * 25);
  const monthlySbc = sdi * DIAS_MES;
  const excedenteUma = Math.max(0, sdi - UMA_DIARIA_2026 * 3) * DIAS_MES * 0.004;
  const prestacionesDinero = monthlySbc * 0.0025;
  const gastosPensionados = monthlySbc * 0.00375;
  const invalidezVida = monthlySbc * 0.00625;
  const cesantiaVejez = monthlySbc * 0.01125;
  return Math.max(0, excedenteUma + prestacionesDinero + gastosPensionados + invalidezVida + cesantiaVejez);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function NumericInput({
  value,
  onChange,
  integer = false,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      className={inputClass}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={String(value)}
      disabled={disabled}
      onChange={(event) => {
        const sanitized = event.target.value.replace(/[^\d.,-]/g, '').replace(/(?!^)-/g, '');
        onChange(integer ? Math.trunc(positive(sanitized)) : positive(sanitized));
      }}
    />
  );
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0 ${strong ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
      <span className="text-sm">{label}</span>
      <span className="text-right text-sm font-bold">{value}</span>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function CalculadorasPage() {
  useInactivityTimeout(15);

  const [active, setActive] = useState<CalculatorTab>('iva');
  const [iva, setIva] = useState({ mode: 'agregar' as IvaMode, amount: 1000, rate: 16 });
  const [isr, setIsr] = useState({ incomeType: 'sueldos' as 'sueldos' | 'actividad' | 'arrendamiento', mode: 'general' as IsrMode, period: 'mensual' as 'mensual' | 'anual', income: 10000, hasDeductions: false, deductions: 0 });
  const [salary, setSalary] = useState({ mode: 'bruto-a-neto' as SalaryMode, period: 'mensual' as 'mensual' | 'quincenal' | 'semanal' | 'diario', amount: 10000, includeImss: true, startDate: '2025-05-05', aguinaldoDays: 15, vacationDays: 12, vacationPremium: 25, riskPremium: 0, infonavitDiscount: 0, imssObreroExtra: 0, otherDeductions: 0 });
  const [aguinaldo, setAguinaldo] = useState({ start: '2025-05-05', end: '2026-05-07', manualDays: 127, useManualDays: false, monthlySalary: 10000, aguinaldoDays: 15, uma: UMA_DIARIA_2026 });
  const [finiquito, setFiniquito] = useState({ start: '2025-05-05', end: '2026-05-07', manualDaysYear: 127, useManualDays: false, monthlySalary: 10000, unpaidDays: 7, unusedVacationDays: 0, aguinaldoDays: 15, vacationPremium: 25, otherPayments: 0, discounts: 0, uma: UMA_DIARIA_2026 });
  const [liquidacion, setLiquidacion] = useState({ start: '2025-05-05', end: '2026-05-07', manualYears: 1.01, useManualYears: false, manualDaysYear: 127, useManualDays: false, monthlySalary: 10000, unusedVacationDays: 0, aguinaldoDays: 15, vacationPremium: 25, include20Days: false, indemnizationMonths: 3, twentyDaysPerYear: 20, seniorityDaysPerYear: 12, minimumWage: SALARIO_MINIMO_GENERAL_2026, otherPayments: 0, discounts: 0, uma: UMA_DIARIA_2026 });
  const [ptu, setPtu] = useState({
    fiscalYear: 2025,
    amount: 600000,
    uma: UMA_DIARIA_2026,
    workers: [
      { id: 1, nombre: 'Nombre del trabajador', salarioAnual: 120000, fechaAlta: '2025-01-01', fechaBaja: '', dias: 365, tipo: 'operativo' as const },
    ] as PtuWorker[],
  });
  const [arr, setArr] = useState({ lessorType: 'fisica' as PersonType, rent: 10000, month: 'Mayo', year: 2026, lessorName: '', lessorRfc: '', lesseeName: '', lesseeRfc: '', ivaRate: 16, lesseeIsMoral: true, houseRoom: false, blindDeduction: false, isrRetentionRate: 10, ivaRetentionRate: 10.6667, localTaxRate: 0, discounts: 0 });

  const ivaResult = useMemo(() => {
    const rate = positive(iva.rate) / 100;
    const amount = positive(iva.amount);
    const subtotal = iva.mode === 'agregar' ? amount : amount / (1 + rate);
    const tax = subtotal * rate;
    const total = subtotal + tax;
    return { subtotal, tax, total, rate };
  }, [iva]);

  const isrResult = useMemo(() => {
    const income = positive(isr.income);
    const annualIncome = isr.period === 'mensual' ? income * 12 : income;
    const monthlyIncome = isr.period === 'mensual' ? income : income / 12;
    if (isr.mode === 'resico') {
      const rate = resicoRate(monthlyIncome);
      const monthlyTax = monthlyIncome * rate;
      return {
        annualIncome,
        monthlyIncome,
        deductions: 0,
        taxableAnnual: annualIncome,
        taxableMonthly: monthlyIncome,
        subsidy: 0,
        monthlyTax,
        annualTax: monthlyTax * 12,
        netMonthly: monthlyIncome - monthlyTax,
        effectiveRate: annualIncome ? (monthlyTax * 12) / annualIncome : 0,
        rate,
      };
    }

    const deductionCap = Math.min(annualIncome * 0.15, UMA_ANUAL_2026 * 5);
    const deductions = Math.min(positive(isr.deductions) * (isr.period === 'mensual' ? 12 : 1), deductionCap);
    const taxableAnnual = Math.max(0, annualIncome - deductions);
    const taxableMonthly = taxableAnnual / 12;
    const subsidy = isr.incomeType === 'sueldos' ? Math.min(tariffTax(taxableMonthly, ISR_MENSUAL_SUELDOS_2026), SUBSIDIO_EMPLEO_MENSUAL_2026) : 0;
    const monthlyTax = isr.incomeType === 'sueldos' ? monthlyIsr(taxableMonthly, true) : annualIsr(taxableAnnual) / 12;
    const annualTax = monthlyTax * 12;
    return {
      annualIncome,
      monthlyIncome,
      deductions,
      taxableAnnual,
      taxableMonthly,
      subsidy,
      monthlyTax,
      annualTax,
      netMonthly: monthlyIncome - monthlyTax,
      effectiveRate: annualIncome ? annualTax / annualIncome : 0,
      rate: 0,
    };
  }, [isr]);

  const salaryResult = useMemo(() => {
    const amount = positive(salary.amount);
    const calcFromGross = (gross: number) => {
      const monthlyGross = salary.period === 'diario' ? gross * DIAS_MES : salary.period === 'semanal' ? gross * 4.345 : salary.period === 'quincenal' ? gross * 2 : gross;
      const imss = (salary.includeImss ? estimatedWorkerImss(monthlyGross, salary.aguinaldoDays, salary.vacationDays, salary.vacationPremium) : 0) + positive(salary.imssObreroExtra);
      const tax = monthlyIsr(monthlyGross, true);
      const otherDeductions = positive(salary.otherDeductions) + positive(salary.infonavitDiscount);
      return { gross: monthlyGross, monthlyGross, imss, tax, otherDeductions, net: Math.max(0, monthlyGross - imss - tax - otherDeductions) };
    };

    if (salary.mode === 'bruto-a-neto') {
      return calcFromGross(amount);
    }

    let low = amount;
    let high = amount * 1.8 + 10000;
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      if (calcFromGross(mid).net < amount) low = mid;
      else high = mid;
    }
    return calcFromGross(high);
  }, [salary]);

  const salaryIntegration = useMemo(() => {
    const daily = dailySalary(salaryResult.monthlyGross);
    const factor = 1 + (positive(salary.aguinaldoDays) + positive(salary.vacationDays) * (positive(salary.vacationPremium) / 100)) / DIAS_ANIO;
    return { daily, factor, sdi: Math.min(daily * factor, UMA_DIARIA_2026 * 25) };
  }, [salary, salaryResult.monthlyGross]);

  const aguinaldoResult = useMemo(() => {
    const start = toDate(aguinaldo.start);
    const end = toDate(aguinaldo.end);
    const year = end?.getFullYear() || 2026;
    const days = aguinaldo.useManualDays ? positive(aguinaldo.manualDays) : overlapDaysInYear(start, end, year);
    const daily = dailySalary(aguinaldo.monthlySalary);
    const full = daily * positive(aguinaldo.aguinaldoDays);
    const proportional = full * (days / DIAS_ANIO);
    const exempt = Math.min(proportional, positive(aguinaldo.uma) * 30);
    return { year, days, full, proportional, exempt, taxable: Math.max(0, proportional - exempt) };
  }, [aguinaldo]);

  const finiquitoResult = useMemo(() => {
    const start = toDate(finiquito.start);
    const end = toDate(finiquito.end);
    const workedYears = yearsWorked(start, end);
    const service = servicePeriodInfo(start, end);
    const daysYear = finiquito.useManualDays ? positive(finiquito.manualDaysYear) : overlapDaysInYear(start, end, end?.getFullYear() || 2026);
    const daily = dailySalary(finiquito.monthlySalary);
    const unusedVacationPay = daily * positive(finiquito.unusedVacationDays);
    const proportionalVacationPay = daily * service.proportionalVacationDays;
    const vacationPay = unusedVacationPay + proportionalVacationPay;
    const vacationPremium = vacationPay * (positive(finiquito.vacationPremium) / 100);
    const aguinaldoPay = daily * positive(finiquito.aguinaldoDays) * (daysYear / DIAS_ANIO);
    const unpaidSalary = daily * positive(finiquito.unpaidDays);
    const gross = unpaidSalary + vacationPay + vacationPremium + aguinaldoPay + positive(finiquito.otherPayments);
    const exempt = Math.min(aguinaldoPay, positive(finiquito.uma) * 30) + Math.min(vacationPremium, positive(finiquito.uma) * 15);
    const taxable = Math.max(0, gross - exempt);
    const isrEstimate = finiquitoIsrEstimate(finiquito.monthlySalary, taxable);
    const discounts = positive(finiquito.discounts);
    return { workedYears, service, daysYear, unpaidSalary, unusedVacationPay, proportionalVacationPay, vacationPay, vacationPremium, aguinaldoPay, otherPayments: positive(finiquito.otherPayments), discounts, gross, exempt, taxable, isrEstimate, net: Math.max(0, gross - isrEstimate - discounts) };
  }, [finiquito]);

  const liquidacionResult = useMemo(() => {
    const start = toDate(liquidacion.start);
    const end = toDate(liquidacion.end);
    const workedYears = liquidacion.useManualYears ? positive(liquidacion.manualYears) : yearsWorked(start, end);
    const service = servicePeriodInfo(start, end);
    const completedYears = Math.max(1, liquidacion.useManualYears ? Math.floor(positive(liquidacion.manualYears)) : service.completedYears);
    const daily = dailySalary(liquidacion.monthlySalary);
    const constitutional = daily * (positive(liquidacion.indemnizationMonths) * 30);
    const twentyDays = liquidacion.include20Days ? daily * positive(liquidacion.twentyDaysPerYear) * completedYears : 0;
    const seniorityDaily = Math.min(daily, positive(liquidacion.minimumWage) * 2);
    const seniority = seniorityDaily * positive(liquidacion.seniorityDaysPerYear) * completedYears;
    const fin = {
      ...finiquito,
      start: liquidacion.start,
      end: liquidacion.end,
      monthlySalary: liquidacion.monthlySalary,
      unpaidDays: 0,
      unusedVacationDays: liquidacion.unusedVacationDays,
      aguinaldoDays: liquidacion.aguinaldoDays,
      vacationPremium: liquidacion.vacationPremium,
    };
    const endDate = toDate(fin.end);
    const daysYear = liquidacion.useManualDays ? positive(liquidacion.manualDaysYear) : overlapDaysInYear(toDate(fin.start), endDate, endDate?.getFullYear() || 2026);
    const unusedVacationPay = daily * positive(fin.unusedVacationDays);
    const proportionalVacationPay = daily * service.proportionalVacationDays;
    const vacationPay = unusedVacationPay + proportionalVacationPay;
    const vacationPremium = vacationPay * (positive(fin.vacationPremium) / 100);
    const aguinaldoPay = daily * positive(fin.aguinaldoDays) * (daysYear / DIAS_ANIO);
    const finiquitoGross = vacationPay + vacationPremium + aguinaldoPay;
    const separationGross = constitutional + twentyDays + seniority;
    const separationExempt = Math.min(separationGross, positive(liquidacion.uma) * 90 * completedYears);
    const benefitsExempt = Math.min(aguinaldoPay, positive(liquidacion.uma) * 30) + Math.min(vacationPremium, positive(liquidacion.uma) * 15);
    const gross = separationGross + finiquitoGross + positive(liquidacion.otherPayments);
    const taxable = Math.max(0, gross - separationExempt - benefitsExempt);
    const isrEstimate = separationIsrEstimate(liquidacion.monthlySalary, taxable);
    const discounts = positive(liquidacion.discounts);
    return { workedYears, completedYears, service, constitutional, twentyDays, seniority, unusedVacationPay, proportionalVacationPay, vacationPay, vacationPremium, aguinaldoPay, finiquitoGross, separationGross, separationExempt, benefitsExempt, otherPayments: positive(liquidacion.otherPayments), discounts, gross, taxable, isrEstimate, net: Math.max(0, gross - isrEstimate - discounts) };
  }, [liquidacion, finiquito]);

  const ptuResult = useMemo(() => {
    const workersWithDays = ptu.workers.map((worker) => {
      const alta = toDate(worker.fechaAlta);
      const baja = worker.fechaBaja ? toDate(worker.fechaBaja) : new Date(positive(ptu.fiscalYear), 11, 31);
      const calculatedDays = overlapDaysInYear(alta, baja, positive(ptu.fiscalYear));
      return { ...worker, dias: positive(worker.dias) || calculatedDays };
    });
    const eligible = workersWithDays.filter((worker) => worker.tipo !== 'excluido' && positive(worker.dias) >= 60 && positive(worker.salarioAnual) > 0);
    const fund = positive(ptu.amount);
    const dayFund = fund * 0.5;
    const salaryFund = fund * 0.5;
    const totalDays = eligible.reduce((sum, worker) => sum + positive(worker.dias), 0);
    const totalSalary = eligible.reduce((sum, worker) => sum + positive(worker.salarioAnual), 0);
    const exemptPerWorker = positive(ptu.uma) * 15;
    const rows = workersWithDays.map((worker) => {
      const applies = worker.tipo !== 'excluido' && positive(worker.dias) >= 60 && positive(worker.salarioAnual) > 0;
      const byDays = applies && totalDays ? (positive(worker.dias) / totalDays) * dayFund : 0;
      const bySalary = applies && totalSalary ? (positive(worker.salarioAnual) / totalSalary) * salaryFund : 0;
      const gross = byDays + bySalary;
      const exempt = Math.min(gross, exemptPerWorker);
      return { ...worker, applies, byDays, bySalary, gross, exempt, taxable: Math.max(0, gross - exempt) };
    });
    const totalExempt = rows.reduce((sum, row) => sum + row.exempt, 0);
    const totalTaxable = rows.reduce((sum, row) => sum + row.taxable, 0);
    return { eligible, totalDays, totalSalary, dayFactor: totalDays ? dayFund / totalDays : 0, salaryFactor: totalSalary ? salaryFund / totalSalary : 0, rows, totalExempt, totalTaxable };
  }, [ptu]);

  const arrResult = useMemo(() => {
    const deduction = arr.lessorType === 'fisica' && arr.blindDeduction ? positive(arr.rent) * 0.35 : 0;
    const rent = Math.max(0, positive(arr.rent) - positive(arr.discounts));
    const iva = arr.houseRoom ? 0 : rent * (positive(arr.ivaRate) / 100);
    const withholdingsApply = arr.lessorType === 'fisica' && arr.lesseeIsMoral;
    const isrRetention = withholdingsApply ? Math.max(0, rent - deduction) * (positive(arr.isrRetentionRate) / 100) : 0;
    const ivaRetention = withholdingsApply && !arr.houseRoom ? rent * (positive(arr.ivaRetentionRate) / 100) : 0;
    const localTax = rent * (positive(arr.localTaxRate) / 100);
    return { rent, deduction, iva, localTax, isrRetention, ivaRetention, totalInvoice: rent + iva + localTax, netPayment: rent + iva + localTax - isrRetention - ivaRetention };
  }, [arr]);

  const setWorker = (id: number, patch: Partial<PtuWorker>) => {
    setPtu((current) => ({ ...current, workers: current.workers.map((worker) => (worker.id === id ? { ...worker, ...patch } : worker)) }));
  };

  const activeMeta = CALCULATORS.find((item) => item.id === active) || CALCULATORS[0];
  const ActiveIcon = activeMeta.Icon;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-blue-600">
              <ArrowLeft className="h-5 w-5" /> Panel
            </Link>
            <Calculator className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Calculadoras</h1>
              <p className="text-sm text-slate-500">Cálculos fiscales y laborales de referencia para México 2026.</p>
            </div>
          </div>
        </div>

        <Notice>
          Los resultados son estimaciones operativas. Las tablas, UMAs, salarios mínimos y retenciones deben revisarse cuando cambie la ley, el SAT, IMSS, STPS o CONASAMI.
        </Notice>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {CALCULATORS.map(({ id, label, description, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`min-h-28 rounded-xl border p-3 text-left shadow-sm transition hover:bg-blue-50 ${active === id ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              <Icon className="mb-2 h-5 w-5" />
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span>
            </button>
          ))}
        </div>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{activeMeta.label}</h2>
                <p className="text-sm text-slate-500">{activeMeta.description}</p>
              </div>
            </div>

            {active === 'iva' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Modo">
                  <select className={inputClass} value={iva.mode} onChange={(e) => setIva({ ...iva, mode: e.target.value as IvaMode })}>
                    <option value="agregar">Agregar IVA</option>
                    <option value="desglosar">Desglosar IVA incluido</option>
                  </select>
                </Field>
                <Field label={iva.mode === 'agregar' ? 'Monto base' : 'Monto con IVA'}>
                  <NumericInput value={iva.amount} onChange={(value) => setIva({ ...iva, amount: value })} />
                </Field>
                <Field label="Tasa IVA %">
                  <NumericInput value={iva.rate} onChange={(value) => setIva({ ...iva, rate: value })} />
                </Field>
              </div>
            )}

            {active === 'isr' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Tipo de ingresos">
                  <select className={inputClass} value={isr.incomeType} onChange={(e) => setIsr({ ...isr, incomeType: e.target.value as typeof isr.incomeType })}>
                    <option value="sueldos">Sueldos y salarios</option>
                    <option value="actividad">Actividad empresarial</option>
                    <option value="arrendamiento">Arrendamiento</option>
                  </select>
                </Field>
                <Field label="Régimen">
                  <select className={inputClass} value={isr.mode} onChange={(e) => setIsr({ ...isr, mode: e.target.value as IsrMode })}>
                    <option value="general">Tarifa general PF</option>
                    <option value="resico">RESICO PF</option>
                  </select>
                </Field>
                <Field label="Tipo de cálculo">
                  <select className={inputClass} value={isr.period} onChange={(e) => setIsr({ ...isr, period: e.target.value as 'mensual' | 'anual' })}>
                    <option value="mensual">Ingreso mensual</option>
                    <option value="anual">Ingreso anual</option>
                  </select>
                </Field>
                <Field label={isr.period === 'mensual' ? 'Ingreso mensual bruto' : 'Ingreso anual bruto'}>
                  <NumericInput value={isr.income} onChange={(value) => setIsr({ ...isr, income: value })} />
                </Field>
                <Field label={isr.period === 'mensual' ? 'Deducciones mensuales' : 'Deducciones anuales'}>
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <NumericInput disabled={isr.mode === 'resico' || !isr.hasDeductions} value={isr.deductions} onChange={(value) => setIsr({ ...isr, deductions: value })} />
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={isr.hasDeductions} onChange={(e) => setIsr({ ...isr, hasDeductions: e.target.checked })} />
                      Usar
                    </label>
                  </div>
                </Field>
              </div>
            )}

            {active === 'sueldo' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Conversión">
                  <select className={inputClass} value={salary.mode} onChange={(e) => setSalary({ ...salary, mode: e.target.value as SalaryMode })}>
                    <option value="bruto-a-neto">Bruto a neto</option>
                    <option value="neto-a-bruto">Neto a bruto estimado</option>
                  </select>
                </Field>
                <Field label="Período">
                  <select className={inputClass} value={salary.period} onChange={(e) => setSalary({ ...salary, period: e.target.value as typeof salary.period })}>
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="semanal">Semanal</option>
                    <option value="diario">Diario</option>
                  </select>
                </Field>
                <Field label={salary.mode === 'bruto-a-neto' ? 'Sueldo mensual bruto' : 'Sueldo mensual neto deseado'}>
                  <NumericInput value={salary.amount} onChange={(value) => setSalary({ ...salary, amount: value })} />
                </Field>
                <Field label="Fecha de inicio laboral">
                  <input className={inputClass} type="date" value={salary.startDate} onChange={(e) => setSalary({ ...salary, startDate: e.target.value })} />
                </Field>
                <Field label="Días de aguinaldo">
                  <NumericInput value={salary.aguinaldoDays} onChange={(value) => setSalary({ ...salary, aguinaldoDays: value })} />
                </Field>
                <Field label="Vacaciones y prima">
                  <div className="grid grid-cols-2 gap-3">
                    <NumericInput value={salary.vacationDays} onChange={(value) => setSalary({ ...salary, vacationDays: value })} />
                    <NumericInput value={salary.vacationPremium} onChange={(value) => setSalary({ ...salary, vacationPremium: value })} />
                  </div>
                </Field>
                <Field label="Deducciones adicionales">
                  <div className="grid grid-cols-2 gap-3">
                    <NumericInput value={salary.imssObreroExtra} onChange={(value) => setSalary({ ...salary, imssObreroExtra: value })} />
                    <NumericInput value={salary.otherDeductions} onChange={(value) => setSalary({ ...salary, otherDeductions: value })} />
                  </div>
                </Field>
                <Field label="IMSS, riesgo e INFONAVIT">
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={salary.includeImss} onChange={(e) => setSalary({ ...salary, includeImss: e.target.checked })} />
                      IMSS
                    </label>
                    <NumericInput value={salary.riskPremium} onChange={(value) => setSalary({ ...salary, riskPremium: value })} />
                    <NumericInput value={salary.infonavitDiscount} onChange={(value) => setSalary({ ...salary, infonavitDiscount: value })} />
                  </div>
                </Field>
              </div>
            )}

            {active === 'aguinaldo' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Fecha de ingreso">
                  <input className={inputClass} type="date" value={aguinaldo.start} onChange={(e) => setAguinaldo({ ...aguinaldo, start: e.target.value })} />
                </Field>
                <Field label="Fecha de cálculo o baja">
                  <input className={inputClass} type="date" value={aguinaldo.end} onChange={(e) => setAguinaldo({ ...aguinaldo, end: e.target.value })} />
                </Field>
                <Field label="Sueldo mensual bruto">
                  <NumericInput value={aguinaldo.monthlySalary} onChange={(value) => setAguinaldo({ ...aguinaldo, monthlySalary: value })} />
                </Field>
                <Field label="Días de aguinaldo">
                  <NumericInput value={aguinaldo.aguinaldoDays} onChange={(value) => setAguinaldo({ ...aguinaldo, aguinaldoDays: value })} />
                </Field>
                <Field label="Días trabajados manuales">
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <NumericInput integer value={aguinaldo.manualDays} onChange={(value) => setAguinaldo({ ...aguinaldo, manualDays: value })} />
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={aguinaldo.useManualDays} onChange={(e) => setAguinaldo({ ...aguinaldo, useManualDays: e.target.checked })} />
                      Usar
                    </label>
                  </div>
                </Field>
                <Field label="UMA diaria">
                  <NumericInput value={aguinaldo.uma} onChange={(value) => setAguinaldo({ ...aguinaldo, uma: value })} />
                </Field>
              </div>
            )}

            {active === 'finiquito' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Fecha de ingreso">
                  <input className={inputClass} type="date" value={finiquito.start} onChange={(e) => setFiniquito({ ...finiquito, start: e.target.value })} />
                </Field>
                <Field label="Último día trabajado">
                  <input className={inputClass} type="date" value={finiquito.end} onChange={(e) => setFiniquito({ ...finiquito, end: e.target.value })} />
                </Field>
                <Field label="Sueldo mensual bruto">
                  <NumericInput value={finiquito.monthlySalary} onChange={(value) => setFiniquito({ ...finiquito, monthlySalary: value })} />
                </Field>
                <Field label="Días pendientes de pago">
                  <NumericInput integer value={finiquito.unpaidDays} onChange={(value) => setFiniquito({ ...finiquito, unpaidDays: value })} />
                </Field>
                <Field label="Vacaciones no usadas">
                  <NumericInput value={finiquito.unusedVacationDays} onChange={(value) => setFiniquito({ ...finiquito, unusedVacationDays: value })} />
                </Field>
                <Field label="Aguinaldo y prima vacacional">
                  <div className="grid grid-cols-2 gap-3">
                    <NumericInput value={finiquito.aguinaldoDays} onChange={(value) => setFiniquito({ ...finiquito, aguinaldoDays: value })} />
                    <NumericInput value={finiquito.vacationPremium} onChange={(value) => setFiniquito({ ...finiquito, vacationPremium: value })} />
                  </div>
                </Field>
                <Field label="Días trabajados del año">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                    <NumericInput integer value={finiquito.manualDaysYear} onChange={(value) => setFiniquito({ ...finiquito, manualDaysYear: value })} />
                    <NumericInput value={finiquito.uma} onChange={(value) => setFiniquito({ ...finiquito, uma: value })} />
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={finiquito.useManualDays} onChange={(e) => setFiniquito({ ...finiquito, useManualDays: e.target.checked })} />
                      Usar
                    </label>
                  </div>
                </Field>
                <Field label="Otros pagos y descuentos">
                  <div className="grid grid-cols-2 gap-3">
                    <NumericInput value={finiquito.otherPayments} onChange={(value) => setFiniquito({ ...finiquito, otherPayments: value })} />
                    <NumericInput value={finiquito.discounts} onChange={(value) => setFiniquito({ ...finiquito, discounts: value })} />
                  </div>
                </Field>
              </div>
            )}

            {active === 'liquidacion' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Fecha de ingreso">
                  <input className={inputClass} type="date" value={liquidacion.start} onChange={(e) => setLiquidacion({ ...liquidacion, start: e.target.value })} />
                </Field>
                <Field label="Último día trabajado">
                  <input className={inputClass} type="date" value={liquidacion.end} onChange={(e) => setLiquidacion({ ...liquidacion, end: e.target.value })} />
                </Field>
                <Field label="Sueldo mensual bruto">
                  <NumericInput value={liquidacion.monthlySalary} onChange={(value) => setLiquidacion({ ...liquidacion, monthlySalary: value })} />
                </Field>
                <Field label="Vacaciones no usadas">
                  <NumericInput value={liquidacion.unusedVacationDays} onChange={(value) => setLiquidacion({ ...liquidacion, unusedVacationDays: value })} />
                </Field>
                <Field label="Salario mínimo para prima">
                  <NumericInput value={liquidacion.minimumWage} onChange={(value) => setLiquidacion({ ...liquidacion, minimumWage: value })} />
                </Field>
                <Field label="Años manuales y días del año">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                    <NumericInput value={liquidacion.manualYears} onChange={(value) => setLiquidacion({ ...liquidacion, manualYears: value })} />
                    <NumericInput integer value={liquidacion.manualDaysYear} onChange={(value) => setLiquidacion({ ...liquidacion, manualDaysYear: value })} />
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={liquidacion.useManualYears || liquidacion.useManualDays} onChange={(e) => setLiquidacion({ ...liquidacion, useManualYears: e.target.checked, useManualDays: e.target.checked })} />
                      Usar
                    </label>
                  </div>
                </Field>
                <Field label="Días base de liquidación">
                  <div className="grid grid-cols-3 gap-3">
                    <NumericInput value={liquidacion.indemnizationMonths} onChange={(value) => setLiquidacion({ ...liquidacion, indemnizationMonths: value })} />
                    <NumericInput value={liquidacion.twentyDaysPerYear} onChange={(value) => setLiquidacion({ ...liquidacion, twentyDaysPerYear: value })} />
                    <NumericInput value={liquidacion.seniorityDaysPerYear} onChange={(value) => setLiquidacion({ ...liquidacion, seniorityDaysPerYear: value })} />
                  </div>
                </Field>
                <Field label="Prima vacacional y UMA">
                  <div className="grid grid-cols-2 gap-3">
                    <NumericInput value={liquidacion.vacationPremium} onChange={(value) => setLiquidacion({ ...liquidacion, vacationPremium: value })} />
                    <NumericInput value={liquidacion.uma} onChange={(value) => setLiquidacion({ ...liquidacion, uma: value })} />
                  </div>
                </Field>
                <Field label="Aguinaldo, otros pagos y descuentos">
                  <div className="grid grid-cols-3 gap-3">
                    <NumericInput value={liquidacion.aguinaldoDays} onChange={(value) => setLiquidacion({ ...liquidacion, aguinaldoDays: value })} />
                    <NumericInput value={liquidacion.otherPayments} onChange={(value) => setLiquidacion({ ...liquidacion, otherPayments: value })} />
                    <NumericInput value={liquidacion.discounts} onChange={(value) => setLiquidacion({ ...liquidacion, discounts: value })} />
                  </div>
                </Field>
                <Field label="Indemnización 20 días">
                  <label className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700">
                    <input type="checkbox" checked={liquidacion.include20Days} onChange={(e) => setLiquidacion({ ...liquidacion, include20Days: e.target.checked })} />
                    Incluir 20 días por año
                  </label>
                </Field>
              </div>
            )}

            {active === 'ptu' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <Field label="Ejercicio fiscal">
                    <NumericInput integer value={ptu.fiscalYear} onChange={(value) => setPtu({ ...ptu, fiscalYear: value })} />
                  </Field>
                  <Field label="PTU total por repartir">
                    <NumericInput value={ptu.amount} onChange={(value) => setPtu({ ...ptu, amount: value })} />
                  </Field>
                  <Field label="UMA diaria para exento">
                    <NumericInput value={ptu.uma} onChange={(value) => setPtu({ ...ptu, uma: value })} />
                  </Field>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      onClick={() => setPtu((current) => ({ ...current, workers: [...current.workers, { id: Date.now(), nombre: `Trabajador ${current.workers.length + 1}`, salarioAnual: 0, fechaAlta: `${current.fiscalYear}-01-01`, fechaBaja: '', dias: 0, tipo: 'operativo' }] }))}
                    >
                      <PlusCircle className="h-4 w-4" /> Agregar trabajador
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {ptu.workers.map((worker) => (
                    <div key={worker.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_145px_145px_120px_110px_140px_44px]">
                      <input className={inputClass} value={worker.nombre} onChange={(e) => setWorker(worker.id, { nombre: e.target.value })} />
                      <NumericInput value={worker.salarioAnual} onChange={(value) => setWorker(worker.id, { salarioAnual: value })} />
                      <input className={inputClass} type="date" value={worker.fechaAlta} onChange={(e) => setWorker(worker.id, { fechaAlta: e.target.value })} />
                      <input className={inputClass} type="date" value={worker.fechaBaja} onChange={(e) => setWorker(worker.id, { fechaBaja: e.target.value })} />
                      <NumericInput integer value={worker.dias} onChange={(value) => setWorker(worker.id, { dias: value })} />
                      <select className={inputClass} value={worker.tipo} onChange={(e) => setWorker(worker.id, { tipo: e.target.value as PtuWorker['tipo'] })}>
                        <option value="operativo">Operativo</option>
                        <option value="confianza">Confianza</option>
                        <option value="excluido">Excluido</option>
                      </select>
                      <button type="button" className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50" onClick={() => setPtu((current) => ({ ...current, workers: current.workers.filter((item) => item.id !== worker.id) }))}>
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === 'arrendamiento' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">Tipo de arrendador</p>
                  <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setArr({ ...arr, lessorType: 'fisica' })}
                      className={`px-4 py-2.5 text-sm font-bold ${arr.lessorType === 'fisica' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Persona Física
                    </button>
                    <button
                      type="button"
                      onClick={() => setArr({ ...arr, lessorType: 'moral' })}
                      className={`px-4 py-2.5 text-sm font-bold ${arr.lessorType === 'moral' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Persona Moral
                    </button>
                  </div>
                </div>
                <Field label="Renta mensual sin IVA">
                  <NumericInput value={arr.rent} onChange={(value) => setArr({ ...arr, rent: value })} />
                </Field>
                <Field label="Período">
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputClass} value={arr.month} onChange={(e) => setArr({ ...arr, month: e.target.value })} />
                    <NumericInput integer value={arr.year} onChange={(value) => setArr({ ...arr, year: value })} />
                  </div>
                </Field>
                <Field label="Arrendador nombre y RFC">
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputClass} value={arr.lessorName} onChange={(e) => setArr({ ...arr, lessorName: e.target.value })} placeholder="Nombre o razón social" />
                    <input className={inputClass} value={arr.lessorRfc} onChange={(e) => setArr({ ...arr, lessorRfc: e.target.value.toUpperCase() })} placeholder="RFC" />
                  </div>
                </Field>
                <Field label="Arrendatario nombre y RFC">
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputClass} value={arr.lesseeName} onChange={(e) => setArr({ ...arr, lesseeName: e.target.value })} placeholder="Nombre o razón social" />
                    <input className={inputClass} value={arr.lesseeRfc} onChange={(e) => setArr({ ...arr, lesseeRfc: e.target.value.toUpperCase() })} placeholder="RFC" />
                  </div>
                </Field>
                <Field label="Tasa IVA %">
                  <NumericInput value={arr.ivaRate} onChange={(value) => setArr({ ...arr, ivaRate: value })} />
                </Field>
                <Field label="Retención ISR %">
                  <NumericInput value={arr.isrRetentionRate} onChange={(value) => setArr({ ...arr, isrRetentionRate: value })} />
                </Field>
                <Field label="Retención IVA, impuesto local, descuento">
                  <div className="grid grid-cols-3 gap-3">
                    <NumericInput value={arr.ivaRetentionRate} onChange={(value) => setArr({ ...arr, ivaRetentionRate: value })} />
                    <NumericInput value={arr.localTaxRate} onChange={(value) => setArr({ ...arr, localTaxRate: value })} />
                    <NumericInput value={arr.discounts} onChange={(value) => setArr({ ...arr, discounts: value })} />
                  </div>
                </Field>
                <Field label="Supuestos">
                  <div className="space-y-2 rounded-xl border-2 border-slate-300 bg-white p-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={arr.lesseeIsMoral} onChange={(e) => setArr({ ...arr, lesseeIsMoral: e.target.checked })} />
                      Arrendatario es persona moral
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={arr.houseRoom} onChange={(e) => setArr({ ...arr, houseRoom: e.target.checked })} />
                      Casa habitación exenta de IVA
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={arr.blindDeduction} onChange={(e) => setArr({ ...arr, blindDeduction: e.target.checked })} />
                      Mostrar deducción ciega 35%
                    </label>
                  </div>
                </Field>
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold">Resultado</h3>
            </div>

            {active === 'iva' && (
              <div>
                <ResultRow label="Subtotal" value={money(ivaResult.subtotal)} />
                <ResultRow label={`IVA ${pct(ivaResult.rate)}`} value={money(ivaResult.tax)} />
                <ResultRow label="Total" value={money(ivaResult.total)} strong />
              </div>
            )}

            {active === 'isr' && (
              <div>
                <ResultRow label="Ingreso bruto mensual" value={money(isrResult.monthlyIncome)} />
                <ResultRow label="Equivalente anual" value={money(isrResult.annualIncome)} />
                <ResultRow label={isr.period === 'mensual' ? 'Deducciones aplicadas (mensual)' : 'Deducciones aplicadas (anual)'} value={money(isr.period === 'mensual' ? isrResult.deductions / 12 : isrResult.deductions)} />
                <ResultRow label="Base gravable mensual" value={money(isrResult.taxableMonthly)} />
                {isr.incomeType === 'sueldos' && isr.mode === 'general' && <ResultRow label="Subsidio al empleo mensual" value={`-${money(isrResult.subsidy)}`} />}
                {isr.mode === 'resico' && <ResultRow label="Tasa RESICO aplicada" value={pct(isrResult.rate)} />}
                <ResultRow label="ISR mensual estimado" value={money(isrResult.monthlyTax)} />
                <ResultRow label="ISR anual estimado" value={money(isrResult.annualTax)} />
                <ResultRow label="Neto mensual estimado" value={money(isrResult.netMonthly)} strong />
                <ResultRow label="Tasa efectiva" value={pct(isrResult.effectiveRate)} />
              </div>
            )}

            {active === 'sueldo' && (
              <div>
                <ResultRow label="Sueldo bruto mensual" value={money(salaryResult.gross)} />
                <ResultRow label="ISR estimado" value={money(salaryResult.tax)} />
                <ResultRow label="IMSS obrero estimado" value={money(salaryResult.imss)} />
                <ResultRow label="Sueldo neto mensual" value={money(salaryResult.net)} strong />
                <ResultRow label="Salario diario" value={money(salaryIntegration.daily)} />
                <ResultRow label="Factor integración" value={salaryIntegration.factor.toFixed(4)} />
                <ResultRow label="SDI estimado" value={money(salaryIntegration.sdi)} />
              </div>
            )}

            {active === 'aguinaldo' && (
              <div>
                <ResultRow label={`Días trabajados ${aguinaldoResult.year}`} value={String(aguinaldoResult.days)} />
                <ResultRow label="Aguinaldo año completo" value={money(aguinaldoResult.full)} />
                <ResultRow label="Aguinaldo proporcional bruto" value={money(aguinaldoResult.proportional)} strong />
                <ResultRow label="Exento estimado" value={money(aguinaldoResult.exempt)} />
                <ResultRow label="Gravado estimado" value={money(aguinaldoResult.taxable)} />
              </div>
            )}

            {active === 'finiquito' && (
              <div>
                <ResultRow label="Sueldo pendiente" value={money(finiquitoResult.unpaidSalary)} />
                <ResultRow label="Vacaciones no usadas" value={money(finiquitoResult.unusedVacationPay)} />
                <ResultRow label={`Vacaciones proporcionales (${finiquitoResult.service.proportionalVacationDays.toFixed(2)} días - año ${finiquitoResult.service.currentYear})`} value={money(finiquitoResult.proportionalVacationPay)} />
                <ResultRow label="Prima vacacional" value={money(finiquitoResult.vacationPremium)} />
                <ResultRow label="Aguinaldo proporcional" value={money(finiquitoResult.aguinaldoPay)} />
                <ResultRow label="Otros pagos" value={money(finiquitoResult.otherPayments)} />
                <ResultRow label="Finiquito bruto" value={money(finiquitoResult.gross)} strong />
                <ResultRow label="Base gravable estimada" value={money(finiquitoResult.taxable)} />
                <ResultRow label="ISR estimado" value={money(finiquitoResult.isrEstimate)} />
                <ResultRow label="Descuentos" value={money(finiquitoResult.discounts)} />
                <ResultRow label="Neto estimado" value={money(finiquitoResult.net)} strong />
              </div>
            )}

            {active === 'liquidacion' && (
              <div>
                <ResultRow label="3 meses de salario" value={money(liquidacionResult.constitutional)} />
                <ResultRow label="20 días por año" value={money(liquidacionResult.twentyDays)} />
                <ResultRow label="Prima de antigüedad" value={money(liquidacionResult.seniority)} />
                <ResultRow label="Vacaciones no usadas" value={money(liquidacionResult.unusedVacationPay)} />
                <ResultRow label={`Vacaciones prop. (${liquidacionResult.service.proportionalVacationDays.toFixed(2)} días)`} value={money(liquidacionResult.proportionalVacationPay)} />
                <ResultRow label="Prima vacacional" value={money(liquidacionResult.vacationPremium)} />
                <ResultRow label="Aguinaldo proporcional" value={money(liquidacionResult.aguinaldoPay)} />
                <ResultRow label="Finiquito incluido" value={money(liquidacionResult.finiquitoGross)} />
                <ResultRow label="Otros pagos" value={money(liquidacionResult.otherPayments)} />
                <ResultRow label="Total bruto" value={money(liquidacionResult.gross)} strong />
                <ResultRow label="Exento separación" value={money(liquidacionResult.separationExempt)} />
                <ResultRow label="Base gravable estimada" value={money(liquidacionResult.taxable)} />
                <ResultRow label="ISR estimado" value={money(liquidacionResult.isrEstimate)} />
                <ResultRow label="Descuentos" value={money(liquidacionResult.discounts)} />
                <ResultRow label="Neto estimado" value={money(liquidacionResult.net)} strong />
              </div>
            )}

            {active === 'ptu' && (
              <div>
                <ResultRow label="PTU por repartir" value={money(ptu.amount)} />
                <ResultRow label="Trabajadores que aplican" value={String(ptuResult.eligible.length)} />
                <ResultRow label="Total exento ISR" value={money(ptuResult.totalExempt)} />
                <ResultRow label="Total gravado ISR" value={money(ptuResult.totalTaxable)} />
                <ResultRow label="Total días considerados" value={String(ptuResult.totalDays)} />
                <ResultRow label="Factor por día" value={money(ptuResult.dayFactor)} />
                <ResultRow label="Factor por peso salario" value={ptuResult.salaryFactor.toFixed(6)} />
                <div className="mt-4 space-y-2">
                  {ptuResult.rows.map((row) => (
                    <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="truncate text-sm font-bold text-slate-800">{row.nombre}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                        <span>Por días: {money(row.byDays)}</span>
                        <span>Por salario: {money(row.bySalary)}</span>
                        <span>Exento ISR: {money(row.exempt)}</span>
                        <span>Gravado ISR: {money(row.taxable)}</span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-blue-700">{row.applies ? `Total que recibirá: ${money(row.gross)}` : 'No aplica'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === 'arrendamiento' && (
              <div>
                <ResultRow label="Tipo de arrendador" value={arr.lessorType === 'fisica' ? 'Persona Física' : 'Persona Moral'} />
                <ResultRow label="Renta" value={money(arrResult.rent)} />
                <ResultRow label="Deducción ciega 35%" value={money(arrResult.deduction)} />
                <ResultRow label="IVA trasladado" value={money(arrResult.iva)} />
                <ResultRow label="Impuesto local" value={money(arrResult.localTax)} />
                <ResultRow label="Total factura" value={money(arrResult.totalInvoice)} strong />
                <ResultRow label="Retención ISR" value={money(arrResult.isrRetention)} />
                <ResultRow label="Retención IVA" value={money(arrResult.ivaRetention)} />
                <ResultRow label="Pago neto" value={money(arrResult.netPayment)} strong />
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
