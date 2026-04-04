import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../api/students.api';
import Modal from '../../components/ui/Modal';
import Badge, { statusBadge } from '../../components/ui/Badge';
import StudentForm from './StudentForm';
import { useCourses } from '../../hooks/useCourses';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const PROCESS_LABELS = {
  pending: 'Enroll Draft',
  for_evaluation: 'To Be Evaluated',
  evaluated: 'For Approval',
  approved: 'For Registrar',
  enrolled: 'Enrolled',
  dropped: 'Dropped',
};

function QrCodeImage({ studentId, studentNumber }) {
  const data = `SIS-STUDENT:${studentId}:${studentNumber}`;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1e293b&margin=4`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl">
      <img src={url} alt="Student QR Code" className="w-44 h-44 rounded-lg" />
      <p className="text-xs text-slate-500 font-mono">{studentNumber}</p>
      <p className="text-xs text-slate-400">Scan with SIS mobile app</p>
    </div>
  );
}

export default function StudentsPage() {
  const { confirm, confirmProps } = useConfirm();
  const { courses } = useCourses();
  const role = useSelector((state) => state.auth.user?.role);
  const canManageStudents = role === 'admin' || role === 'registrar';

  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [yearLevelFilter, setYearLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, student: null });
  const [qrStudent, setQrStudent] = useState(null);

  const activeFilters = [
    search ? `Search: ${search}` : null,
    courseFilter ? `Course: ${courseFilter}` : null,
    yearLevelFilter ? `Year ${yearLevelFilter}` : null,
    statusFilter ? `Status: ${statusFilter}` : null,
  ].filter(Boolean);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({
        page,
        limit: 20,
        search: search || undefined,
        course: courseFilter || undefined,
        year_level: yearLevelFilter || undefined,
        status: statusFilter || undefined,
      });
      setStudents(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, search, courseFilter, yearLevelFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    try {
      if (modal.student) {
        await updateStudent(modal.student.id, data);
        toast.success('Student updated');
      } else {
        await createStudent(data);
        toast.success('Student created');
      }
      setModal({ open: false, student: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (student) => {
    if (!await confirm({
      title: 'Permanently Delete Student',
      message: `This will permanently delete ${student.last_name}, ${student.first_name} (${student.student_number}) and ALL their data including enrollments, grades, and payments. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
    })) return;
    try {
      await deleteStudent(student.id);
      toast.success('Student permanently deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCourseFilter('');
    setYearLevelFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  const renderProcessBadge = (student) => {
    if (!student.enrollment_process_status) {
      return <span className="text-xs text-slate-400">No active process</span>;
    }

    return (
      <div className="space-y-1">
        <Badge variant={statusBadge(student.enrollment_process_status)}>
          {PROCESS_LABELS[student.enrollment_process_status] || student.enrollment_process_status.replace(/_/g, ' ')}
        </Badge>
        {(student.enrollment_process_school_year || student.enrollment_process_semester) && (
          <p className="text-[11px] text-slate-500">
            {student.enrollment_process_school_year || '-'} {student.enrollment_process_semester ? `• ${student.enrollment_process_semester} Sem` : ''}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{total} total records</p>
        </div>
        {canManageStudents && (
          <button className="btn-primary" onClick={() => setModal({ open: true, student: null })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Student
          </button>
        )}
      </div>


      <div className="card mb-5 space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Student Filters</p>
            <p className="text-xs text-slate-500">Filter by course, year level, status, or keyword.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium">
              {students.length} shown
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              {total} total
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Search</span>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="input pl-9"
                placeholder="Name, number, email..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Course</span>
            <select
              className="input"
              value={courseFilter}
              onChange={(event) => {
                setCourseFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Year Level</span>
            <select
              className="input"
              value={yearLevelFilter}
              onChange={(event) => {
                setYearLevelFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All year levels</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
              <option value="6">Year 6</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="dropped">Dropped</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {activeFilters.length > 0 ? activeFilters.map((filter) => (
              <span key={filter} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {filter}
              </span>
            )) : (
              <span className="text-xs text-slate-400">No active filters</span>
            )}
          </div>

          <button className="btn-secondary" onClick={resetFilters}>Reset Filters</button>
        </div>
      </div>

      <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                {['Student No.', 'Name', 'Type', 'Course', 'Year', 'Account Status', 'Process', 'Actions'].map((header) => (
                  <th key={header} className="table-header-cell">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 8 }).map((__, columnIndex) => (
                      <td key={columnIndex} className="table-cell">
                        <div className="h-4 bg-slate-100 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell py-12 text-center text-slate-400">
                    No students found
                  </td>
                </tr>
              ) : students.map((student) => (
                <tr key={student.id} className="table-row">
                  <td className="table-cell font-mono text-xs text-slate-600">{student.student_number}</td>
                  <td className="table-cell font-semibold text-slate-900">{student.last_name}, {student.first_name}</td>
                  <td className="table-cell">
                    {student.enrollment_type === 'transferee' ? (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">Transferee</span>
                    ) : student.enrollment_type === 'new' ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">New</span>
                    ) : student.enrollment_type ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">{student.enrollment_type}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="table-cell text-slate-600">{student.course || '-'}</td>
                  <td className="table-cell text-slate-600">{student.year_level ? `Year ${student.year_level}` : '-'}</td>
                  <td className="table-cell">
                    <Badge variant={statusBadge(student.status)}>{student.status}</Badge>
                  </td>
                  <td className="table-cell">
                    {renderProcessBadge(student)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-slate-500 hover:text-blue-600 transition-colors"
                        title="View QR Code"
                        onClick={() => setQrStudent(student)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <rect x="3" y="3" width="5" height="5" rx="1" />
                          <rect x="16" y="3" width="5" height="5" rx="1" />
                          <rect x="3" y="16" width="5" height="5" rx="1" />
                          <path d="M21 16h-3v3h3v-3z" />
                          <path d="M21 21h-3" />
                          <path d="M18 21v-3" />
                          <path d="M12 3v3" />
                          <path d="M12 9v3" />
                          <path d="M9 12h3v3H9v3h3" />
                          <path d="M12 18v3" />
                        </svg>
                      </button>
                      {canManageStudents ? (
                        <>
                          <button
                            className="text-slate-500 hover:text-blue-600 transition-colors text-xs font-medium"
                            onClick={() => setModal({ open: true, student })}
                          >
                            Edit
                          </button>
                          {role === 'admin' && (
                            <button
                              className="text-slate-400 hover:text-red-600 transition-colors text-xs font-medium"
                              onClick={() => handleDelete(student)}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <span className="text-sm text-slate-500">Page {page} of {totalPages} - {total} records</span>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>Prev</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>Next</button>
              </div>
            </div>
          )}
        </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, student: null })}
        title={modal.student ? 'Edit Student' : 'Add Student'}
        size="lg"
      >
        <StudentForm
          defaultValues={modal.student}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, student: null })}
          isEdit={!!modal.student}
        />
      </Modal>

      <Modal
        isOpen={!!qrStudent}
        onClose={() => setQrStudent(null)}
        title="Student QR Code"
        size="sm"
      >
        {qrStudent && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-semibold text-slate-900">{qrStudent.last_name}, {qrStudent.first_name}</p>
              <p className="text-sm text-slate-500 font-mono">{qrStudent.student_number}</p>
            </div>
            <QrCodeImage studentId={qrStudent.id} studentNumber={qrStudent.student_number} />
            <p className="text-center text-xs text-slate-400">
              This QR code can be scanned by admin/staff in the mobile app.
            </p>
          </div>
        )}
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
