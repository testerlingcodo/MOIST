import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getStudents, approveStudent, rejectStudent } from '../../api/students.api';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

export default function ApprovalsPage() {
  const { confirm, confirmProps } = useConfirm();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({ status: 'pending', limit: 100 });
      setStudents(res.data.data);
    } catch {
      toast.error('Failed to load pending registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await approveStudent(id);
      toast.success('Student approved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approve failed');
    }
  };

  const handleReject = async (id) => {
    if (!await confirm({ title: 'Reject Registration', message: 'This cannot be undone.', confirmLabel: 'Reject', variant: 'danger' })) return;
    try {
      await rejectStudent(id);
      toast.success('Registration rejected');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reject failed');
    }
  };

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Enrollment Approvals</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${students.length} registration${students.length !== 1 ? 's' : ''} awaiting approval`}
          </p>
        </div>
      </div>

      {/* Notification banner */}
      {!loading && students.length > 0 && (
        <div className="mb-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-amber-600">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">
              {students.length} student{students.length !== 1 ? 's' : ''} pending enrollment approval
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Please review each registration carefully before approving or rejecting. Approved students will be activated in the system.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-sm font-black min-w-8 h-8 px-2">
            {students.length}
          </span>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-green-600">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <p className="text-green-800 text-sm font-semibold">All caught up! No pending registrations at the moment.</p>
        </div>
      )}

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student No.', 'Name', 'Course', 'Year', 'Gender', 'Birthdate', 'Contact', 'Email', 'Actions'].map((h) => (
                <th key={h} className="table-header-cell">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-4 bg-slate-100 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-cell py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-sm font-medium">No pending registrations</p>
                    <p className="text-xs">All registrations have been reviewed.</p>
                  </div>
                </td>
              </tr>
            ) : students.map((student) => (
              <tr key={student.id} className="table-row">
                <td className="table-cell font-mono text-xs text-slate-600">{student.student_number}</td>
                <td className="table-cell">
                  <p className="font-semibold text-slate-900">{student.last_name}, {student.first_name}</p>
                  {student.middle_name && <p className="text-xs text-slate-400">{student.middle_name}</p>}
                </td>
                <td className="table-cell text-slate-600">{student.course || '-'}</td>
                <td className="table-cell text-slate-600">{student.year_level ? `Year ${student.year_level}` : '-'}</td>
                <td className="table-cell text-slate-600 capitalize">{student.gender || '-'}</td>
                <td className="table-cell text-slate-600">{student.birthdate || '-'}</td>
                <td className="table-cell text-slate-600">{student.contact_number || '-'}</td>
                <td className="table-cell text-slate-500 text-xs">{student.email || '-'}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                      onClick={() => handleApprove(student.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                      onClick={() => handleReject(student.id)}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
