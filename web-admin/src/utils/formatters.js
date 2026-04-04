import { format } from 'date-fns';

export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export function formatGrade(grade) {
  if (grade == null) return '—';
  return parseFloat(grade).toFixed(2);
}
