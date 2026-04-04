const variants = {
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-900',
  info: 'bg-yellow-50 text-[color:var(--brand-maroon)]',
  gray: 'bg-stone-100 text-stone-700',
};

export default function Badge({ children, variant = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function statusBadge(status) {
  const map = {
    active: 'success', paid: 'success', enrolled: 'success', passed: 'success',
    inactive: 'gray', pending: 'warning', for_evaluation: 'warning', dropped: 'warning', incomplete: 'warning',
    evaluated: 'info', approved: 'info',
    failed: 'danger', refunded: 'info', graduated: 'info', completed: 'info',
  };
  return map[status] || 'gray';
}
