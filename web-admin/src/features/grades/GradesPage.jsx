import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getGrades, encodeGrade, updateGrade, submitGrade } from '../../api/grades.api';
import client from '../../api/client';
import Badge, { statusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useForm, useWatch } from 'react-hook-form';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const SUBMISSION_LABEL = {
  draft:        { text: 'Draft',     variant: 'gray'    },
  submitted:    { text: 'Under Review', variant: 'warning' },
  under_review: { text: 'Approved by Dean',  variant: 'info'    },
  official:     { text: 'Official',  variant: 'success' },
};

const GRADE_PERIODS = [
  { key: 'prelim_grade', label: 'Prelim Grade' },
  { key: 'midterm_grade', label: 'Midterm Grade' },
  { key: 'semi_final_grade', label: 'Semi-Final Grade' },
  { key: 'final_grade', label: 'Final Grade' },
];

const PERIOD_STATUSES = [
  { key: 'prelim_grade', statusKey: 'prelim_status', shortLabel: 'Prelim' },
  { key: 'midterm_grade', statusKey: 'midterm_status', shortLabel: 'Midterm' },
  { key: 'semi_final_grade', statusKey: 'semi_final_status', shortLabel: 'Semi-Final' },
  { key: 'final_grade', statusKey: 'final_status', shortLabel: 'Final' },
];

function isApprovedStatus(status) {
  return status === 'under_review' || status === 'official';
}

function getActivePeriodMeta(grade) {
  return PERIOD_STATUSES.find((period) => !isApprovedStatus(grade?.[period.statusKey] || 'draft'))
    || PERIOD_STATUSES[0];
}

function normalizeGradeValue(value) {
  if (value === '' || value === undefined || value === null || Number.isNaN(value)) return null;
  return value;
}

const PH_GRADES = [
  { value: 1.0, label: '1.00 - Excellent (95-100%)' },
  { value: 1.25, label: '1.25 - Very Good (92-94%)' },
  { value: 1.5, label: '1.50 - Very Good (89-91%)' },
  { value: 1.75, label: '1.75 - Good (86-88%)' },
  { value: 2.0, label: '2.00 - Good (83-85%)' },
  { value: 2.25, label: '2.25 - Satisfactory (80-82%)' },
  { value: 2.5, label: '2.50 - Satisfactory (77-79%)' },
  { value: 2.75, label: '2.75 - Passing (75-76%)' },
  { value: 3.0, label: '3.00 - Passing/Lowest (75%)' },
  { value: 5.0, label: '5.00 - Failed (below 75%)' },
];

function autoRemarks(finalGrade) {
  const grade = parseFloat(finalGrade);
  if (!finalGrade || Number.isNaN(grade)) return '';
  if (grade >= 1.0 && grade <= 3.0) return 'passed';
  if (grade === 5.0) return 'failed';
  return '';
}

function GradeForm({ defaultValues, onSubmit, onCancel, canEdit, editablePeriodKey, isTeacher }) {
  const { register, handleSubmit, control, setValue, formState: { isSubmitting } } = useForm({ defaultValues });
  const finalGrade = useWatch({ control, name: 'final_grade' });
  const remarks = useWatch({ control, name: 'remarks' });

  useEffect(() => {
    if (remarks === 'dropped') {
      GRADE_PERIODS.forEach((period) => {
        setValue(period.key, 5.0);
      });
      return;
    }

    const suggested = autoRemarks(finalGrade);
    if (suggested && remarks !== 'dropped') setValue('remarks', suggested);
  }, [finalGrade, remarks, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!canEdit && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Dean-approved grades are locked for teachers.
        </div>
      )}
      {canEdit && isTeacher && editablePeriodKey && (
        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Current editable period: {PERIOD_STATUSES.find((period) => period.key === editablePeriodKey)?.shortLabel}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GRADE_PERIODS.map((period) => (
          <div key={period.key}>
            <label className="label">{period.label}</label>
            <select
              {...register(period.key, { valueAsNumber: true })}
              className="input"
              disabled={!canEdit || (isTeacher && editablePeriodKey !== period.key)}
            >
              <option value="">- Not yet encoded -</option>
              {PH_GRADES.map((grade) => (
                <option key={grade.value} value={grade.value}>{grade.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label className="label">Remarks</label>
        <select {...register('remarks')} className="input" disabled={!canEdit || (isTeacher && !editablePeriodKey)}>
          <option value="">- Select -</option>
          {(!isTeacher || editablePeriodKey === 'final_grade') && <option value="passed">Passed</option>}
          {(!isTeacher || editablePeriodKey === 'final_grade') && <option value="failed">Failed</option>}
          {(!isTeacher || editablePeriodKey === 'final_grade') && <option value="incomplete">Incomplete</option>}
          <option value="dropped">Dropped</option>
        </select>
        {isTeacher && (
          <p className="mt-1 text-xs text-slate-500">
            Selecting <span className="font-semibold text-slate-700">Dropped</span> will auto-fill Prelim to Final with <span className="font-semibold text-red-600">5.00</span>.
          </p>
        )}
      </div>

      {!defaultValues?.id && (
        <div>
          <label className="label">Enrollment ID *</label>
          <input
            {...register('enrollment_id', { required: true })}
            className="input"
            placeholder="UUID"
            disabled={!canEdit}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        {canEdit && (
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Grade'}
          </button>
        )}
      </div>
    </form>
  );
}

export default function GradesPage() {
  const { confirm, confirmProps } = useConfirm();
  const role = useSelector((state) => state.auth.user?.role);
  const canManageGrades = role === 'admin' || role === 'staff' || role === 'teacher';
  const isTeacher = role === 'teacher';

  const [grades, setGrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ school_year: '', semester: '', submission_status: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, grade: null });
  const [teacherWorkload, setTeacherWorkload] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.school_year) params.school_year = filters.school_year;
      if (filters.semester) params.semester = filters.semester;
      if (filters.submission_status) params.submission_status = filters.submission_status;

      const requests = [getGrades(params)];
      if (isTeacher) requests.push(client.get('/teachers/me/workload'));

      const [gradesRes, workloadRes] = await Promise.all(requests);
      setGrades(gradesRes.data.data);
      setTotal(gradesRes.data.total);
      if (workloadRes) setTeacherWorkload(workloadRes.data);
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [page, filters, isTeacher]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    try {
      const payload = { ...data };

      if (isTeacher && modal.grade) {
        const activePeriod = getActivePeriodMeta(modal.grade);
        Object.keys(payload).forEach((key) => {
          delete payload[key];
        });
        if (data.remarks === 'dropped') {
          payload.remarks = 'dropped';
        } else {
          payload[activePeriod.key] = normalizeGradeValue(data[activePeriod.key]);
        }
        if (activePeriod.key === 'final_grade' || data.remarks === 'dropped') {
          payload.remarks = data.remarks || null;
        }
      }

      if (modal.grade) {
        await updateGrade(modal.grade.id, payload);
        toast.success('Grade updated');
      } else {
        await encodeGrade(payload);
        toast.success('Grade encoded');
      }
      setModal({ open: false, grade: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleSubmitGrade = async (grade) => {
    if (!await confirm({ title: 'Submit Grade', message: `Submit ${grade.last_name}, ${grade.first_name}'s grade to the dean for review?`, confirmLabel: 'Submit', variant: 'warning' })) return;
    try {
      await submitGrade(grade.id);
      toast.success('Grade submitted to dean review');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-5 lg:p-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grades</h1>
          <p className="page-subtitle">
            {isTeacher ? 'Encode, edit, and submit grades for your assigned subject.' : `${total} total records`}
          </p>
        </div>
        {canManageGrades && (
          <button className="btn-primary" onClick={() => setModal({ open: true, grade: null })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Encode Grade
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="card mb-5">
          {teacherWorkload?.assigned_subject_count ? (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                Subjects: {teacherWorkload.assigned_subject_count}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                Year Level: {teacherWorkload.assigned_year_level ? `Year ${teacherWorkload.assigned_year_level}` : 'All Years'}
              </span>
              {teacherWorkload.specialization && (
                <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 font-medium text-cyan-700">
                  Specialization: {teacherWorkload.specialization}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                Draft Grades: {teacherWorkload.draft_grades || 0}
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No subject assigned yet. Ask the dean to assign subject offerings.</p>
          )}
        </div>
      )}

      <div className="card mb-5 flex gap-3 flex-wrap">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="School Year (e.g. 2025-2026)"
          value={filters.school_year}
          onChange={(event) => {
            setFilters((current) => ({ ...current, school_year: event.target.value }));
            setPage(1);
          }}
        />
        <select
          className="input max-w-xs"
          value={filters.semester}
          onChange={(event) => {
            setFilters((current) => ({ ...current, semester: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">All Semesters</option>
          <option value="1st">1st Semester</option>
          <option value="2nd">2nd Semester</option>
          <option value="summer">Summer</option>
        </select>
        <select
          className="input max-w-xs"
          value={filters.submission_status}
          onChange={(event) => {
            setFilters((current) => ({ ...current, submission_status: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">All Submission States</option>
          <option value="draft">Draft</option>
          <option value="submitted">Under Review</option>
          <option value="under_review">Approved (Dean)</option>
          <option value="official">Official</option>
        </select>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student', 'Subject', 'SY / Sem', 'Prelim', 'Midterm', 'Semi-Final', 'Final', 'Remarks', 'Submission', 'Actions'].map((header) => (
                <th key={header} className="table-header-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : grades.length === 0 ? (
              <tr><td colSpan={10} className="table-cell py-12 text-center text-slate-400">No grades found</td></tr>
            ) : grades.map((grade) => {
              const teacherLocked = isTeacher && ['under_review', 'official'].includes(grade.submission_status);
              return (
                <tr key={grade.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-semibold text-slate-900">{grade.last_name}, {grade.first_name}</div>
                    <div className="text-xs text-slate-500">{grade.student_number}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-slate-700">{grade.subject_name}</div>
                    <div className="text-xs text-slate-500">{grade.subject_code}</div>
                  </td>
                  <td className="table-cell text-slate-600">{grade.school_year} · {grade.semester}</td>
                  <td className="table-cell font-semibold">{grade.prelim_grade ?? '—'}</td>
                  <td className="table-cell font-semibold">{grade.midterm_grade ?? '—'}</td>
                  <td className="table-cell font-semibold">{grade.semi_final_grade ?? '—'}</td>
                  <td className="table-cell font-semibold">{grade.final_grade ?? '—'}</td>
                  <td className="table-cell">
                    {grade.remarks ? <Badge variant={statusBadge(grade.remarks)}>{grade.remarks}</Badge> : '—'}
                  </td>
                  <td className="table-cell">
                    {(() => { const s = SUBMISSION_LABEL[grade.submission_status] || SUBMISSION_LABEL.draft; return <Badge variant={s.variant}>{s.text}</Badge>; })()}
                  </td>
                  <td className="table-cell">
                    {canManageGrades ? (
                      <div className="flex items-center gap-3">
                        <button
                          className={`text-xs font-medium ${teacherLocked ? 'text-slate-400' : 'text-blue-600 hover:text-blue-700'}`}
                          onClick={() => setModal({ open: true, grade })}
                          disabled={teacherLocked}
                        >
                          {teacherLocked ? 'Locked' : 'Edit'}
                        </button>
                        {isTeacher && (!grade.submission_status || grade.submission_status === 'draft') && (
                          <button
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                            onClick={() => handleSubmitGrade(grade)}
                          >
                            Submit
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>← Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, grade: null })}
        title={modal.grade ? 'Edit Grade' : 'Encode Grade'}
      >
        <GradeForm
          defaultValues={modal.grade}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, grade: null })}
          canEdit={!(isTeacher && ['under_review', 'official'].includes(modal.grade?.submission_status))}
          editablePeriodKey={getActivePeriodMeta(modal.grade).key}
          isTeacher={isTeacher}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
