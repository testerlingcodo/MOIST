import { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import client from '../../api/client';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const PH_GRADES = [
  { value: 1.0, label: '1.00 — Excellent (95–100%)' },
  { value: 1.25, label: '1.25 — Very Good (92–94%)' },
  { value: 1.5, label: '1.50 — Very Good (89–91%)' },
  { value: 1.75, label: '1.75 — Good (86–88%)' },
  { value: 2.0, label: '2.00 — Good (83–85%)' },
  { value: 2.25, label: '2.25 — Satisfactory (80–82%)' },
  { value: 2.5, label: '2.50 — Satisfactory (77–79%)' },
  { value: 2.75, label: '2.75 — Passing (75–76%)' },
  { value: 3.0, label: '3.00 — Passing (75%)' },
  { value: 5.0, label: '5.00 - Failed (below 75%)' },
];

const GRADE_PERIODS = [
  { key: 'prelim_grade', label: 'Prelim Grade' },
  { key: 'midterm_grade', label: 'Midterm Grade' },
  { key: 'semi_final_grade', label: 'Semi-Final Grade' },
  { key: 'final_grade', label: 'Final Grade' },
];

const PERIOD_STATUSES = [
  { field: 'prelim_grade', statusField: 'prelim_status', shortLabel: 'Prelim' },
  { field: 'midterm_grade', statusField: 'midterm_status', shortLabel: 'Midterm' },
  { field: 'semi_final_grade', statusField: 'semi_final_status', shortLabel: 'Semi-Final' },
  { field: 'final_grade', statusField: 'final_status', shortLabel: 'Final' },
];

function isApprovedStatus(status) {
  return status === 'under_review' || status === 'official';
}

function getActivePeriodMeta(grade) {
  return PERIOD_STATUSES.find((period) => !isApprovedStatus(grade?.[period.statusField] || 'draft')) || null;
}

function normalizeGradeValue(value) {
  if (value === '' || value === undefined || value === null || Number.isNaN(value)) return null;
  return value;
}

function autoRemarks(finalGrade) {
  const v = parseFloat(finalGrade);
  if (Number.isNaN(v)) return '';
  return v <= 3.0 ? 'passed' : 'failed';
}

function gradeColor(grade) {
  if (grade == null) return '#94a3b8';
  const v = parseFloat(grade);
  if (v === 5.0) return '#dc2626';
  if (v <= 2.0) return '#16a34a';
  if (v <= 3.0) return '#d97706';
  return '#dc2626';
}

function GradeForm({ grade, onSave, onCancel }) {
  const activePeriod = getActivePeriodMeta(grade);
  const { register, handleSubmit, control, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      prelim_grade: grade.prelim_grade ?? '',
      midterm_grade: grade.midterm_grade ?? '',
      semi_final_grade: grade.semi_final_grade ?? '',
      final_grade: grade.final_grade ?? '',
      remarks: grade.remarks ?? '',
    },
  });
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
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
        <p className="font-bold text-slate-800 text-sm">{grade.last_name}, {grade.first_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{grade.student_number} · {grade.subject_code}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {GRADE_PERIODS.map((period) => (
          <div key={period.key}>
            <label className="label">{period.label}</label>
            <select
              {...register(period.key, { valueAsNumber: true })}
              className="input"
              disabled={activePeriod ? activePeriod.field !== period.key : true}
            >
              <option value="">- Not yet encoded -</option>
              {PH_GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label className="label">Remarks</label>
        <select {...register('remarks')} className="input" disabled={!activePeriod}>
          <option value="">-</option>
          {activePeriod?.field === 'final_grade' && <option value="passed">Passed</option>}
          {activePeriod?.field === 'final_grade' && <option value="failed">Failed</option>}
          {activePeriod?.field === 'final_grade' && <option value="incomplete">Incomplete</option>}
          <option value="dropped">Dropped</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Selecting <span className="font-semibold text-slate-700">Dropped</span> will set all grades from Prelim to Final to <span className="font-semibold text-red-600">5.00</span>.
        </p>
      </div>

      {activePeriod && (
        <p className="text-xs text-slate-500">
          Editable now: <span className="font-semibold text-slate-700">{activePeriod.shortLabel}</span>
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Grade'}
        </button>
      </div>
    </form>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft:        { label: 'Draft',       cls: 'bg-slate-100 text-slate-600' },
    submitted:    { label: 'Under Review',   cls: 'bg-amber-100 text-amber-700' },
    under_review: { label: 'Approved',   cls: 'bg-violet-100 text-violet-700' },
    official:     { label: 'Official',    cls: 'bg-green-100 text-green-700' },
  };
  const { label, cls } = map[status] ?? { label: status ?? 'Not encoded', cls: 'bg-slate-100 text-slate-400' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>;
}

export default function TeacherClassesPage() {
  const { confirm, confirmProps } = useConfirm();
  const [workload, setWorkload] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [editGrade, setEditGrade] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    Promise.all([
      client.get('/teachers/me/workload'),
      client.get('/teachers/me/students'),
    ]).then(([wRes, sRes]) => {
      setWorkload(wRes.data);
      setAllStudents(sRes.data ?? []);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load workload'); setLoading(false); });
  }, []);

  const loadStudents = useCallback((subject) => {
    setSelectedSubject(subject);
    setSearch('');
    const subStudents = allStudents.filter(s => s.subject_id === subject.id);
    setStudents(subStudents);
  }, [allStudents]);

  const refreshStudents = useCallback(async () => {
    try {
      const res = await client.get('/teachers/me/students');
      const fresh = res.data ?? [];
      setAllStudents(fresh);
      if (selectedSubject) {
        setStudents(fresh.filter(s => s.subject_id === selectedSubject.id));
      }
    } catch { /* silent */ }
  }, [selectedSubject]);

  const handleSaveGrade = async (data) => {
    try {
      const payload = {};
      const activePeriod = getActivePeriodMeta(editGrade);

      if (data.remarks === 'dropped') {
        payload.remarks = 'dropped';
      } else if (activePeriod) {
        payload[activePeriod.field] = normalizeGradeValue(data[activePeriod.field]);
        if (activePeriod.field === 'final_grade') {
          payload.remarks = data.remarks || null;
        }
      }

      if (editGrade.id) {
        await client.patch(`/grades/${editGrade.id}`, payload);
      } else {
        await client.post('/grades', { enrollment_id: editGrade.enrollment_id, ...payload });
      }
      toast.success('Grade saved');
      setEditGrade(null);
      refreshStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleSubmitGrades = async () => {
    const unsubmitted = students.filter((student) => {
      const activePeriod = getActivePeriodMeta(student);
      return student.id &&
        activePeriod &&
        (student.submission_status === 'draft' || !student.submission_status) &&
        student[activePeriod.field] != null;
    });
    if (!unsubmitted.length) { toast.error('No draft grades to submit'); return; }
    if (!await confirm({ title: 'Submit Grades', message: `Submit ${unsubmitted.length} grade(s) to the dean for review?`, confirmLabel: 'Submit', variant: 'warning' })) return;
    try {
      await Promise.all(unsubmitted.map(s => client.post(`/grades/${s.id}/submit`)));
      toast.success('Grades submitted to dean review');
      refreshStudents();
    } catch {
      toast.error('Submit failed');
    }
  };

  const handleSubmitGrade = async (student) => {
    const activePeriod = getActivePeriodMeta(student);
    if (!student.id) {
      toast.error('Save the grade first before submitting');
      return;
    }
    if (!activePeriod || student[activePeriod.field] == null) {
      toast.error(`Encode the ${activePeriod?.shortLabel || 'current'} grade first`);
      return;
    }
    if (!await confirm({ title: 'Submit Grade', message: `Submit ${student.last_name}, ${student.first_name}'s grade to the dean for review?`, confirmLabel: 'Submit', variant: 'warning' })) return;
    try {
      await client.post(`/grades/${student.id}/submit`);
      toast.success('Grade submitted to dean review');
      refreshStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    }
  };

  const filteredStudents = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
      || (s.student_number || '').toLowerCase().includes(q);
  });

  const assignedSubjects = workload?.assigned_subjects ?? [];
  const encodedCount = students.filter((s) =>
    s.prelim_grade != null || s.midterm_grade != null || s.semi_final_grade != null || s.final_grade != null
  ).length;
  const submittedCount = students.filter(s => s.submission_status === 'submitted').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <svg className="w-6 h-6 animate-spin text-[#7a1324] mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading…
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">My Classes</h1>
        <p className="page-subtitle">
          {workload?.first_name} {workload?.last_name}
          {workload?.specialization ? ` · ${workload.specialization}` : ''}
          {' · '}{assignedSubjects.length} subject{assignedSubjects.length !== 1 ? 's' : ''} assigned
        </p>
      </div>

      <div className="flex gap-5" style={{ alignItems: 'flex-start' }}>
        {/* ── Left: Subject cards ── */}
        <div className="w-72 flex-shrink-0 space-y-3">
          {assignedSubjects.length === 0 ? (
            <div className="card text-center py-10 text-slate-400 text-sm">
              No subjects assigned yet.
            </div>
          ) : assignedSubjects.map((sub) => {
            const isActive = selectedSubject?.id === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => loadStudents(sub)}
                className={`w-full text-left rounded-2xl border transition-all duration-150 p-4 ${
                  isActive
                    ? 'bg-[#7a1324] border-[#7a1324] text-white shadow-lg'
                    : 'bg-white border-slate-200 hover:border-[#7a1324]/40 hover:shadow-sm'
                }`}
              >
                <div className={`text-xs font-black tracking-wider mb-1 ${isActive ? 'text-white/70' : 'text-[#7a1324]'}`}>
                  {sub.code}
                </div>
                <div className={`font-bold text-sm leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {sub.name}
                </div>
                <div className={`text-xs mt-2 ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                  {sub.course || 'General'} · Year {sub.year_level} · {sub.semester} Sem
                </div>
                {sub.section_name && (
                  <div className={`text-xs ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                    Section {sub.section_name} · {sub.room || 'TBA'}
                  </div>
                )}
                {sub.schedule_days && (
                  <div className={`text-xs ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                    {sub.schedule_days}
                    {sub.start_time && ` · ${sub.start_time}–${sub.end_time}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Right: Students / grade entry ── */}
        <div className="flex-1 min-w-0">
          {!selectedSubject ? (
            <div className="card text-center py-16 text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="font-semibold text-slate-500">Select a subject to view students</p>
              <p className="text-sm mt-1">Click any subject card on the left</p>
            </div>
          ) : editGrade ? (
            <div className="card max-w-lg">
              <h3 className="font-bold text-slate-800 mb-4">Enter Grade</h3>
              <GradeForm
                grade={editGrade}
                onSave={handleSaveGrade}
                onCancel={() => setEditGrade(null)}
              />
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {/* Subject info bar */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <span className="font-black text-[#7a1324] text-sm">{selectedSubject.code}</span>
                  <span className="ml-2 text-slate-700 font-semibold text-sm">{selectedSubject.name}</span>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedSubject.course} · Year {selectedSubject.year_level} · {selectedSubject.semester} Semester
                    {selectedSubject.section_name && ` · Section ${selectedSubject.section_name}`}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{students.length} students</span>
                  <span className="text-amber-600 font-semibold">{encodedCount} encoded</span>
                  <span className="text-green-600 font-semibold">{submittedCount} submitted</span>
                  {students.some(s => s.id && (s.submission_status === 'draft' || !s.submission_status)) && (
                    <button
                      onClick={handleSubmitGrades}
                      className="px-3 py-1.5 bg-[#7a1324] text-white text-xs font-bold rounded-lg hover:bg-[#5a0d1a] transition-colors"
                    >
                      Submit All Drafts
                    </button>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-slate-100">
                <input
                  type="text"
                  className="input max-w-xs"
                  placeholder="Search student name or number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Student table */}
              {filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No students found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Student', 'Student No.', 'Prelim', 'Midterm', 'Semi-Final', 'Final', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">{h !== 'Action' ? h : ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((s, i) => (
                      <tr key={s.enrollment_id} className={i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#7a1324]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-black text-[#7a1324]">
                                {(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}
                              </span>
                            </div>
                            <span className="font-semibold text-slate-800">{s.last_name}, {s.first_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{s.student_number}</td>
                        <td className="px-5 py-3 font-bold text-sm" style={{ color: gradeColor(s.prelim_grade) }}>
                          {s.prelim_grade != null ? parseFloat(s.prelim_grade).toFixed(2) : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-sm" style={{ color: gradeColor(s.midterm_grade) }}>
                          {s.midterm_grade != null ? parseFloat(s.midterm_grade).toFixed(2) : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-sm" style={{ color: gradeColor(s.semi_final_grade) }}>
                          {s.semi_final_grade != null ? parseFloat(s.semi_final_grade).toFixed(2) : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-sm" style={{ color: gradeColor(s.final_grade) }}>
                          {s.final_grade != null ? parseFloat(s.final_grade).toFixed(2) : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={s.submission_status} /></td>
                        <td className="px-5 py-3">
                          {(() => {
                            const activePeriod = getActivePeriodMeta(s);

                            if (!activePeriod) {
                              return <span className="text-xs text-slate-400">Locked</span>;
                            }

                            if (s.submission_status === 'submitted') {
                              return (
                                <div className="flex items-center gap-3">
                                  <button
                                    className="text-xs font-semibold text-[#7a1324] hover:text-[#5a0d1a] transition-colors"
                                    onClick={() => setEditGrade(s)}
                                  >
                                    Edit {activePeriod.shortLabel}
                                  </button>
                                  <span className="text-xs text-slate-400">With dean review</span>
                                </div>
                              );
                            }

                            if (s.submission_status === 'under_review' || s.submission_status === 'official') {
                              return <span className="text-xs text-slate-400">Locked</span>;
                            }

                            return (
                            <div className="flex items-center gap-3">
                              <button
                                className="text-xs font-semibold text-[#7a1324] hover:text-[#5a0d1a] transition-colors"
                                onClick={() => setEditGrade(s)}
                              >
                                Enter {activePeriod.shortLabel}
                              </button>
                              {s.id && (
                                <button
                                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                  onClick={() => handleSubmitGrade(s)}
                                >
                                  Submit {activePeriod.shortLabel}
                                </button>
                              )}
                            </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
