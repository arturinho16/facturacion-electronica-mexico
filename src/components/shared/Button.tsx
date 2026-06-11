import React from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export function Button({ loading = false, variant = 'primary', className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading ? 'Procesando...' : children}
    </button>
  );
}
