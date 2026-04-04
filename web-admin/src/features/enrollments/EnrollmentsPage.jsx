import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import Badge, { statusBadge } from '../../components/ui/Badge';
import PrintableEnrollmentSheet from '../../components/enrollment/PrintableEnrollmentSheet';
import { getEnrollments, updateEnrollment, deleteEnrollment } from '../../api/enrollments.api';
import { useCourses } from '../../hooks/useCourses';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

function BatchStatusBadge({ status }) {
  return (
    <Badge variant={statusBadge(status)}>
      {status?.replace(/_/g, ' ') || 'unknown'}
    </Badge>
  );
}

function EvaluateBatchModal({ batch, onClose, onSaved }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deanNotes, setDeanNotes] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds((batch?.subjects || []).map((subject) => String(subject.subject_id)));
    setDeanNotes(batch?.dean_notes || '');
  }, [batch]);

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      setLoadingSubjects(true);
      try {
        const response = await client.get('/subjects', {
          params: {
            limit: 100,
            is_active: true,
            is_open: true,
            course: batch?.course,
            year_level: batch?.year_level,
            semester: batch?.semester,
          },
        });
        if (active) {
          setSubjects(response.data?.data || []);
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to load subjects');
      } finally {
        if (active) {
          setLoadingSubjects(false);
        }
      }
    }

    loadSubjects();
    return () => {
      active = false;
    };
  }, []);

  const selectedSubjects = subjects.filter((subject) => selectedIds.includes(String(subject.id)));

  const conflictingIds = new Set();
  for (let i = 0; i < selectedSubjects.length; i += 1) {
    for (let j = i + 1; j < selectedSubjects.length; j += 1) {
      const left = selectedSubjects[i];
      const right = selectedSubjects[j];
      if (!left.schedule_days || !right.schedule_days || left.schedule_days !== right.schedule_days) continue;
      if (!left.start_time || !left.end_time || !right.start_time || !right.end_time) continue;
      if (left.start_time < right.end_time && right.start_time < left.end_time) {
        conflictingIds.add(String(left.id));
        conflictingIds.add(String(right.id));
      }
    }
  }

  const toggleSubject = (subjectId) => {
    setSelectedIds((current) => (
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedIds.length) {
      toast.error('Select at least one subject');
      return;
    }

    setSaving(true);
    try {
      await client.patch(`/enrollment-batches/${batch.id}/evaluate`, {
        subject_ids: selectedIds,
        dean_notes: deanNotes,
      });
      toast.success('Student evaluation submitted');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to evaluate student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
        <p className="font-semibold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
        <p className="text-sm text-slate-500">{batch?.student_number} · {batch?.course || '-'} · Year {batch?.year_level || '-'}</p>
        <p className="text-sm text-slate-500">{batch?.school_year} · {batch?.semester} Semester</p>
      </div>

      <div>
        <label className="label">Select Subjects *</label>
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
          {loadingSubjects ? (
            <div className="px-4 py-5 text-sm text-slate-500">Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-500">No active subjects found.</div>
          ) : (
            subjects.map((subject) => {
              const subjectId = String(subject.id);
              const checked = selectedIds.includes(subjectId);
              return (
                <label key={subject.id} className="flex items-start gap-3 px-4 py-3 border-t first:border-t-0 border-slate-100 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleSubject(subjectId)} className="mt-1" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{subject.code} - {subject.name}</p>
                    <p className="text-xs text-slate-500">
                      {subject.units} units • {subject.semester || '-'} • {subject.schedule_days || 'No days'} • {subject.start_time && subject.end_time ? `${subject.start_time} - ${subject.end_time}` : 'No time'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Prerequisite: {subject.prerequisite_code ? `${subject.prerequisite_code} - ${subject.prerequisite_name}` : 'None'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Instructor: {subject.teacher_last_name ? `${subject.teacher_last_name}, ${subject.teacher_first_name}` : 'Dean to assign'}
                    </p>
                    {conflictingIds.has(subjectId) && checked && (
                      <p className="text-xs font-medium text-red-600">Schedule conflict detected with another selected subject</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div>
        <label className="label">Dean Notes</label>
        <textarea
          className="input min-h-28"
          value={deanNotes}
          onChange={(event) => setDeanNotes(event.target.value)}
          placeholder="Add evaluation notes or remarks"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving || loadingSubjects}>
          {saving ? 'Submitting...' : 'Evaluate Student'}
        </button>
      </div>
    </form>
  );
}

function RoleQueuePage({
  role,
  batches,
  loading,
  search,
  setSearch,
  courseFilter,
  setCourseFilter,
  statusFilter,
  setStatusFilter,
  onEvaluate,
  onApprove,
  onEnroll,
  onPrint,
}) {
  const nextActionCount = {
    dean: batches.filter((batch) => batch.status === 'for_evaluation').length,
    staff: batches.filter((batch) => batch.status === 'evaluated').length,
    registrar: batches.filter((batch) => batch.status === 'approved').length,
  }[role] || 0;

  const config = {
    dean: {
      title: 'Evaluation',
      subtitle: 'Dean / Program Head selects qualified subjects per student.',
      banner: {
        tone: 'amber',
        title: 'Students waiting for evaluation',
        description: nextActionCount === 1
          ? '1 student is ready for subject evaluation.'
          : `${nextActionCount} students are ready for subject evaluation.`,
      },
      statuses: [
        { label: 'For Evaluation', value: 'for_evaluation' },
        { label: 'Evaluated', value: 'evaluated' },
      ],
    },
    staff: {
      title: 'Evaluation Approval',
      subtitle: 'Staff approves evaluated subject loads before payment.',
      banner: {
        tone: 'blue',
        title: 'Evaluations waiting for approval',
        description: nextActionCount === 1
          ? '1 evaluated student is waiting for staff approval.'
          : `${nextActionCount} evaluated students are waiting for staff approval.`,
      },
      statuses: [
        { label: 'Evaluated', value: 'evaluated' },
        { label: 'Approved', value: 'approved' },
      ],
    },
    registrar: {
      title: 'Evaluation Release',
      subtitle: 'Registrar enrolls approved students after receipt verification and can print copies.',
      banner: {
        tone: 'emerald',
        title: 'Approved students ready for registrar',
        description: nextActionCount === 1
          ? '1 approved student is ready for final enrollment and printing.'
          : `${nextActionCount} approved students are ready for final enrollment and printing.`,
      },
      statuses: [
        { label: 'Approved', value: 'approved' },
        { label: 'Enrolled', value: 'enrolled' },
      ],
    },
  }[role];

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{config.title}</h1>
          <p className="page-subtitle">{config.subtitle}</p>
        </div>
      </div>

      {nextActionCount > 0 && (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 ${
            config.banner.tone === 'amber'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : config.banner.tone === 'blue'
                ? 'border-blue-200 bg-blue-50 text-blue-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm font-bold">
              {nextActionCount}
            </div>
            <div>
              <p className="text-sm font-semibold">{config.banner.title}</p>
              <p className="text-sm opacity-90">{config.banner.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          className="input"
          placeholder="Search student number or name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="input" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
          <option value="">All courses</option>
          {courses.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All relevant statuses</option>
          {config.statuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student', 'Course', 'Term', 'Status', 'Actions'].map((header) => (
                <th key={header} className="table-header-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={5} className="table-cell py-12 text-center text-slate-400">No students found</td></tr>
            ) : batches.map((batch) => (
              <tr key={batch.id} className="table-row">
                <td className="table-cell">
                  <div className="font-semibold text-slate-900">{batch.last_name}, {batch.first_name}</div>
                  <div className="text-xs text-slate-500">{batch.student_number}</div>
                </td>
                <td className="table-cell text-slate-600">
                  <div>{batch.course || '-'}</div>
                  <div className="text-xs text-slate-400">Year {batch.year_level || '-'}</div>
                </td>
                <td className="table-cell text-slate-600">
                  <div>{batch.school_year}</div>
                  <div className="text-xs text-slate-400">{batch.semester} Semester</div>
                </td>
                <td className="table-cell">
                  <BatchStatusBadge status={batch.status} />
                </td>
                <td className="table-cell">
                  {role === 'dean' && batch.status === 'for_evaluation' && (
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium" onClick={() => onEvaluate(batch.id)}>
                      Evaluate
                    </button>
                  )}
                  {role === 'dean' && batch.status === 'evaluated' && (
                    <span className="text-xs font-medium text-emerald-600">Evaluated</span>
                  )}
                  {role === 'staff' && batch.status === 'evaluated' && (
                    <button className="text-green-600 hover:text-green-700 text-xs font-medium" onClick={() => onApprove(batch.id)}>
                      Approve
                    </button>
                  )}
                  {role === 'staff' && batch.status === 'approved' && (
                    <span className="text-xs font-medium text-emerald-600">Approved</span>
                  )}
                  {role === 'registrar' && batch.status === 'approved' && (
                    <button className="text-violet-600 hover:text-violet-700 text-xs font-medium" onClick={() => onEnroll(batch.id)}>
                      Enroll & Print
                    </button>
                  )}
                  {role === 'registrar' && batch.status === 'enrolled' && (
                    <button className="text-slate-700 hover:text-slate-900 text-xs font-medium" onClick={() => onPrint(batch.id)}>
                      Print
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectRecordsPage({ role }) {
  const { confirm, confirmProps } = useConfirm();
  const canManage = role === 'admin' || role === 'staff' || role === 'registrar';
  const [enrollments, setEnrollments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ school_year: '', semester: '', status: '' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.school_year) params.school_year = filters.school_year;
      if (filters.semester) params.semester = filters.semester;
      if (filters.status) params.status = filters.status;

      const res = await getEnrollments(params);
      setEnrollments(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load subject enrollments');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDrop = async (id) => {
    try {
      await updateEnrollment(id, { status: 'dropped' });
      toast.success('Enrollment dropped');
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm({ title: 'Remove Enrollment', message: 'Remove this subject enrollment record?', confirmLabel: 'Remove', variant: 'danger' })) return;
    try {
      await deleteEnrollment(id);
      toast.success('Enrollment removed');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Enrollment Records</h1>
          <p className="page-subtitle">Individual subject enrollment records generated from approved enrollment batches.</p>
        </div>
      </div>

      <div className="card mb-5 flex gap-3 flex-wrap">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="School Year (e.g. 2025-2026)"
          value={filters.school_year}
          onChange={(e) => setFilters((current) => ({ ...current, school_year: e.target.value }))}
        />
        <select
          className="input max-w-xs"
          value={filters.semester}
          onChange={(e) => setFilters((current) => ({ ...current, semester: e.target.value }))}
        >
          <option value="">All Semesters</option>
          <option value="1st">1st Semester</option>
          <option value="2nd">2nd Semester</option>
          <option value="summer">Summer</option>
        </select>
        <select
          className="input max-w-xs"
          value={filters.status}
          onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="evaluated">Evaluated</option>
          <option value="approved">Approved</option>
          <option value="enrolled">Enrolled</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student', 'Subject', 'School Year', 'Semester', 'Status', 'Actions'].map((header) => (
                <th key={header} className="table-header-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : enrollments.length === 0 ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">No subject enrollments found</td></tr>
            ) : enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="table-row">
                <td className="table-cell">
                  <div className="font-semibold text-slate-900">{enrollment.last_name}, {enrollment.first_name}</div>
                  <div className="text-xs text-slate-500">{enrollment.student_number}</div>
                </td>
                <td className="table-cell">
                  <div className="text-slate-700">{enrollment.subject_name}</div>
                  <div className="text-xs text-slate-500">{enrollment.subject_code} · {enrollment.units} units</div>
                </td>
                <td className="table-cell text-slate-600">{enrollment.school_year}</td>
                <td className="table-cell text-slate-600">{enrollment.semester}</td>
                <td className="table-cell">
                  <Badge variant={statusBadge(enrollment.status)}>{enrollment.status}</Badge>
                </td>
                <td className="table-cell">
                  {canManage ? (
                    <div className="flex gap-3">
                      {enrollment.status === 'enrolled' && (
                        <button className="text-amber-600 hover:text-amber-700 text-xs font-medium" onClick={() => handleDrop(enrollment.id)}>
                          Drop
                        </button>
                      )}
                      <button className="text-slate-400 hover:text-red-500 text-xs font-medium" onClick={() => handleDelete(enrollment.id)}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}

export default function EnrollmentsPage() {
  const { courses } = useCourses();
  const role = useSelector((state) => state.auth.user?.role);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [evaluateModal, setEvaluateModal] = useState({ open: false, batch: null });
  const [printModal, setPrintModal] = useState({ open: false, batch: null });

  const usesRoleQueue = ['dean', 'staff', 'registrar'].includes(role);

  const loadBatches = useCallback(async () => {
    if (!usesRoleQueue) return;
    setLoading(true);
    try {
      const response = await client.get('/enrollment-batches', { params: { limit: 100 } });
      setBatches(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load enrollment queue');
    } finally {
      setLoading(false);
    }
  }, [usesRoleQueue]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const filteredBatches = useMemo(() => {
    if (!usesRoleQueue) return [];

    const statusByRole = {
      dean: ['for_evaluation', 'evaluated'],
      staff: ['evaluated', 'approved'],
      registrar: ['approved', 'enrolled'],
    }[role] || [];

    return batches.filter((batch) => {
      if (!statusByRole.includes(batch.status)) return false;
      if (statusFilter && batch.status !== statusFilter) return false;
      if (courseFilter && batch.course !== courseFilter) return false;
      if (search) {
        const haystack = `${batch.student_number || ''} ${batch.first_name || ''} ${batch.last_name || ''}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [batches, courseFilter, role, search, statusFilter, usesRoleQueue]);

  const fetchBatchDetail = async (batchId) => {
    const response = await client.get(`/enrollment-batches/${batchId}`);
    return response.data;
  };

  const handleEvaluateOpen = async (batchId) => {
    try {
      const detail = await fetchBatchDetail(batchId);
      setEvaluateModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load student evaluation');
    }
  };

  const handleApprove = async (batchId) => {
    try {
      await client.patch(`/enrollment-batches/${batchId}/approve`);
      toast.success('Evaluated subjects approved');
      loadBatches();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve evaluation');
    }
  };

  const handleEnroll = async (batchId) => {
    try {
      const response = await client.patch(`/enrollment-batches/${batchId}/register`);
      toast.success('Student enrolled successfully');
      setPrintModal({ open: true, batch: response.data });
      loadBatches();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to enroll student');
    }
  };

  const handlePrint = async (batchId) => {
    try {
      const detail = await fetchBatchDetail(batchId);
      setPrintModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load printable subjects');
    }
  };

  if (!usesRoleQueue) {
    return <SubjectRecordsPage role={role} />;
  }

  return (
    <>
      <RoleQueuePage
        role={role}
        batches={filteredBatches}
        loading={loading}
        search={search}
        setSearch={setSearch}
        courseFilter={courseFilter}
        setCourseFilter={setCourseFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onEvaluate={handleEvaluateOpen}
        onApprove={handleApprove}
        onEnroll={handleEnroll}
        onPrint={handlePrint}
      />

      <Modal
        isOpen={evaluateModal.open}
        onClose={() => setEvaluateModal({ open: false, batch: null })}
        title="Evaluate Student Subjects"
        size="lg"
      >
        <EvaluateBatchModal
          batch={evaluateModal.batch}
          onClose={() => setEvaluateModal({ open: false, batch: null })}
          onSaved={loadBatches}
        />
      </Modal>

      <Modal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ open: false, batch: null })}
        title="Printable Enrollment Sheet"
        size="xl"
      >
        <PrintableEnrollmentSheet
          batch={printModal.batch}
          onClose={() => setPrintModal({ open: false, batch: null })}
        />
      </Modal>
    </>
  );
}
