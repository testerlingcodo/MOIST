const VARIANTS = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const v = VARIANTS[variant] || VARIANTS.danger;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-150">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${v.iconBg} ${v.iconColor}`}>
          {v.icon}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          {message && <p className="text-sm text-slate-500 leading-relaxed">{message}</p>}
        </div>

        <div className="flex gap-3 w-full">
          <button
            type="button"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${v.btn}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
