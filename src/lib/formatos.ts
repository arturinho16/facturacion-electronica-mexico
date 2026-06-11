export function formatMoneyMX(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `$${new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0)}`;
}

export function formatMoneyMXPlain(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}
