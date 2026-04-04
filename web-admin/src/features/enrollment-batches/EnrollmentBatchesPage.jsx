import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import PrintableEnrollmentSheet from '../../components/enrollment/PrintableEnrollmentSheet';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const STATUS_TABS = [
  { label: 'For Evaluation',   value: 'for_subject_enrollment', color: 'text-blue-600' },
  { label: 'For Approval',     value: 'for_assessment',         color: 'text-violet-600' },
  { label: 'For Payment',      value: 'for_payment',            color: 'text-orange-600' },
  { label: 'For Registration', value: 'for_registration',       color: 'text-teal-600' },
  { label: 'Enrolled',         value: 'enrolled',               color: 'text-green-600' },
  { label: 'Pending',          value: 'pending',                color: 'text-amber-600' },
  { label: 'All',              value: '',                       color: 'text-slate-500' },
];

const STATUS_VARIANT = {
  pending:                'gray',
  for_subject_enrollment: 'warning',
  for_assessment:         'info',
  for_payment:            'info',
  for_registration:       'success',
  enrolled:               'success',
  dropped:                'danger',
};

const STATUS_LABEL = {
  pending:                'Pending',
  for_subject_enrollment: 'For Evaluation',
  for_assessment:         'For Approval',
  for_payment:            'For Payment',
  for_registration:       'For Registration',
  enrolled:               'Enrolled',
  dropped:                'Dropped',
};

function isAdminStaff(role) {
  return role === 'admin' || role === 'staff';
}

function canCreate(role) {
  return isAdminStaff(role) || role === 'registrar';
}

function canEvaluate(role) {
  return role === 'dean';
}

function canApprove(role) {
  return isAdminStaff(role) || role === 'registrar';
}

function canRegister(role) {
  return isAdminStaff(role) || role === 'registrar' || role === 'cashier';
}

function canOfficiallyEnroll(role) {
  return isAdminStaff(role) || role === 'registrar';
}

function StatusBadge({ status }) {
  return (
    <Badge variant={STATUS_VARIANT[status] || 'gray'}>
      {STATUS_LABEL[status] || status?.replace(/_/g, ' ') || 'unknown'}
    </Badge>
  );
}

function BatchSummary({ batch }) {
  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((sum, subject) => sum + Number(subject.units || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Student</p>
          <p className="font-semibold text-slate-900">
            {batch?.last_name}, {batch?.first_name}
          </p>
          <p className="text-slate-500">{batch?.student_number || '-'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Term</p>
          <p className="font-semibold text-slate-900">{batch?.school_year || '-'}</p>
          <p className="text-slate-500">{batch?.semester || '-'} Semester</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Course</p>
          <p className="font-semibold text-slate-900">{batch?.course || '-'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Year Level</p>
          <p className="font-semibold text-slate-900">{batch?.year_level || '-'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">Selected Subjects</p>
            <p className="text-xs text-slate-500">{subjects.length} subject(s)</p>
          </div>
          <p className="text-sm font-semibold text-slate-700">{totalUnits} units</p>
        </div>

        {subjects.length === 0 ? (
          <div className="px-4 py-5 text-sm text-slate-500">No subjects selected yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Code</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Subject</th>
                <th className="text-right px-4 py-2 text-slate-500 font-medium">Units</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.enrollment_id || subject.subject_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{subject.subject_code}</td>
                  <td className="px-4 py-2 text-slate-600">{subject.subject_name}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{subject.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Dean Notes</p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 min-h-16">
          {batch?.dean_notes || 'No notes provided.'}
        </div>
      </div>
    </div>
  );
}

function DetailModal({ batch, onClose, onOpenPrint }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Batch Status</p>
          <div className="mt-1">
            <StatusBadge status={batch?.status} />
          </div>
        </div>
        {(batch?.status === 'for_payment' || batch?.status === 'enrolled') && (
          <button className="btn-secondary" onClick={onOpenPrint}>
            View Printable Form
          </button>
        )}
      </div>

      <BatchSummary batch={batch} />

      <div className="flex justify-end">
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function NewBatchModal({ onClose, onCreated }) {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const { schoolYear, semester, label, loading: termLoading } = useActiveTerm();

  useEffect(() => {
    client.get('/students', { params: { limit: 100, status: 'active' } })
      .then((response) => setStudents(response.data?.data || []))
      .catch(() => toast.error('Failed to load students'));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!schoolYear || !semester) {
      toast.error('No active academic term set. Go to Academic Settings first.');
      return;
    }
    setLoading(true);
    try {
      await client.post('/enrollment-batches', { student_id: studentId, school_year: schoolYear, semester });
      toast.success('Student record encoded');
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Active Term Banner */}
      <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-3 ${schoolYear ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke={schoolYear ? '#16a34a' : '#d97706'} strokeWidth={2} className="w-4 h-4 flex-shrink-0">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${schoolYear ? 'text-green-700' : 'text-amber-700'}`}>Active Academic Term</p>
          <p className={`font-semibold ${schoolYear ? 'text-green-900' : 'text-amber-800'}`}>
            {termLoading ? 'Loading...' : schoolYear ? `${label || `${schoolYear} — ${semester} Semester`}` : 'No active term set — go to Academic Settings'}
          </p>
        </div>
      </div>

      <div>
        <label className="label">Student *</label>
        <select
          className="input"
          required
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
        >
          <option value="">- Select Student -</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.last_name}, {student.first_name} ({student.student_number})
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading || termLoading || !schoolYear}>
          {loading ? 'Creating...' : 'Encode Student'}
        </button>
      </div>
    </form>
  );
}

const OVERLOAD_UNITS = 25;

function fmt12eb(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function parseDays(str) {
  if (!str) return [];

  const raw = String(str).toUpperCase().replace(/[^A-Z]/g, '');
  const parsed = [];
  let index = 0;

  while (index < raw.length) {
    if (raw.startsWith('MON', index)) { parsed.push('Mon'); index += 3; continue; }
    if (raw.startsWith('TUE', index)) { parsed.push('Tue'); index += 3; continue; }
    if (raw.startsWith('WED', index)) { parsed.push('Wed'); index += 3; continue; }
    if (raw.startsWith('THU', index)) { parsed.push('Thu'); index += 3; continue; }
    if (raw.startsWith('FRI', index)) { parsed.push('Fri'); index += 3; continue; }
    if (raw.startsWith('SAT', index)) { parsed.push('Sat'); index += 3; continue; }
    if (raw.startsWith('SUN', index)) { parsed.push('Sun'); index += 3; continue; }
    if (raw.startsWith('TH', index)) { parsed.push('Thu'); index += 2; continue; }

    const token = raw[index];
    if (token === 'M') parsed.push('Mon');
    else if (token === 'T') parsed.push('Tue');
    else if (token === 'W') parsed.push('Wed');
    else if (token === 'F') parsed.push('Fri');
    else if (token === 'S') parsed.push('Sat');
    else if (token === 'U') parsed.push('Sun');
    index += 1;
  }

  return [...new Set(parsed)];
}

function toMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesConflict(s1, s2) {
  const d1 = parseDays(s1.schedule_days);
  const d2 = parseDays(s2.schedule_days);
  if (!d1.length || !d2.length) return false;
  if (!d1.some((d) => d2.includes(d))) return false;
  if (!s1.start_time || !s2.start_time || !s1.end_time || !s2.end_time) return false;
  return toMins(s1.start_time) < toMins(s2.end_time) && toMins(s2.start_time) < toMins(s1.end_time);
}

function SubjectRow({ subject, checked, isConflict, onChange }) {
  return (
    <label className={`flex items-start gap-3 px-4 py-3 border-t first:border-t-0 cursor-pointer transition-colors ${
      isConflict
        ? 'bg-red-50 border-red-200'
        : checked
          ? 'bg-blue-50/40 border-slate-100'
          : 'hover:bg-slate-50 border-slate-100'
    }`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-900 text-sm">{subject.code}</span>
          <span className="text-slate-600 text-sm">— {subject.name}</span>
          {subject.is_failed && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Failed — Retake</span>
          )}
          {subject.is_retake && !subject.is_failed && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Backlog</span>
          )}
          {!subject.prerequisite_met && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
              Prereq not passed: {subject.prerequisite_code}
            </span>
          )}
          {isConflict && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800">⚠ Time conflict</span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
          <span>{subject.units} units</span>
          {subject.schedule_days && <span>· {subject.schedule_days}</span>}
          {subject.start_time && subject.end_time && (
            <span>· {fmt12eb(subject.start_time)} – {fmt12eb(subject.end_time)}</span>
          )}
          {subject.section_name && <span>· Sec {subject.section_name}</span>}
          {subject.room && <span>· {subject.room}</span>}
          {subject.is_failed && subject.previous_grade != null && (
            <span className="text-red-500 font-medium">· Prev: {parseFloat(subject.previous_grade).toFixed(2)}</span>
          )}
        </div>
      </div>
    </label>
  );
}

function SubjectGroup({ title, subjects, badgeColor, selectedIds, conflictingIds, onToggle, onSelectAll, onUnselectAll }) {
  if (!subjects.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{title}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>{subjects.length}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onSelectAll(subjects)} className="text-xs text-blue-600 hover:underline font-medium">Select all</button>
          <span className="text-slate-300">|</span>
          <button type="button" onClick={() => onUnselectAll(subjects)} className="text-xs text-slate-500 hover:underline">Uncheck all</button>
        </div>
      </div>
      {subjects.map((s) => (
        <SubjectRow
          key={s.id}
          subject={s}
          checked={selectedIds.includes(String(s.id))}
          isConflict={conflictingIds.has(String(s.id))}
          onChange={() => onToggle(String(s.id))}
        />
      ))}
    </div>
  );
}

function EvaluateBatchModal({ batch, onClose, onSaved }) {
  const { confirm, confirmProps } = useConfirm();
  const [available, setAvailable] = useState({ regular: [], retakes: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [deanNotes, setDeanNotes] = useState(batch?.dean_notes || '');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds((batch?.subjects || []).map((s) => String(s.subject_id)));
    setDeanNotes(batch?.dean_notes || '');
  }, [batch]);

  useEffect(() => {
    if (!batch?.id) return;
    let active = true;
    setLoadingSubjects(true);
    client.get(`/enrollment-batches/${batch.id}/available-subjects`)
      .then((res) => { if (active) setAvailable(res.data || { regular: [], retakes: [] }); })
      .catch(() => toast.error('Failed to load available subjects'))
      .finally(() => { if (active) setLoadingSubjects(false); });
    return () => { active = false; };
  }, [batch?.id]);

  const allSubjects = useMemo(() => [...available.regular, ...available.retakes], [available]);

  const conflictingIds = useMemo(() => {
    const selected = allSubjects.filter((s) => selectedIds.includes(String(s.id)));
    const conflicts = new Set();
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        if (timesConflict(selected[i], selected[j])) {
          conflicts.add(String(selected[i].id));
          conflicts.add(String(selected[j].id));
        }
      }
    }
    return conflicts;
  }, [selectedIds, allSubjects]);

  const totalUnits = useMemo(
    () => allSubjects.filter((s) => selectedIds.includes(String(s.id))).reduce((sum, s) => sum + Number(s.units || 0), 0),
    [selectedIds, allSubjects]
  );

  const toggle = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAll = (group) => setSelectedIds((prev) => [...new Set([...prev, ...group.map((s) => String(s.id))])]);
  const unselectAll = (group) => { const ids = new Set(group.map((s) => String(s.id))); setSelectedIds((prev) => prev.filter((x) => !ids.has(x))); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedIds.length) { toast.error('Select at least one subject'); return; }
    if (conflictingIds.size > 0 && !await confirm({ title: 'Schedule Conflicts Detected', message: `${conflictingIds.size} subject(s) have time conflicts. Save anyway?`, confirmLabel: 'Save Anyway', variant: 'warning' })) return;
    setSaving(true);
    try {
      await client.patch(`/enrollment-batches/${batch.id}/evaluate`, { subject_ids: selectedIds, dean_notes: deanNotes });
      toast.success('Subjects enrolled. Forwarded for assessment.');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to evaluate batch');
    } finally {
      setSaving(false);
    }
  };

  const isOverload = totalUnits > OVERLOAD_UNITS;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <BatchSummary batch={batch} />

      {/* Unit counter */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isOverload ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
        <span className="text-sm text-slate-600 font-medium">Selected units</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${isOverload ? 'text-red-600' : totalUnits >= 21 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {totalUnits} units
          </span>
          {isOverload && <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">OVERLOAD</span>}
          {!isOverload && totalUnits >= 21 && <span className="text-[11px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Near limit</span>}
        </div>
      </div>

      {/* Subject list */}
      <div>
        <label className="label">Select Subjects *</label>
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
          {loadingSubjects ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">Loading subjects...</div>
          ) : available.regular.length === 0 && available.retakes.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">No subjects available.</div>
          ) : (
            <>
              <SubjectGroup
                title="Current Term Subjects"
                subjects={available.regular}
                badgeColor="bg-blue-100 text-blue-700"
                selectedIds={selectedIds}
                conflictingIds={conflictingIds}
                onToggle={toggle}
                onSelectAll={selectAll}
                onUnselectAll={unselectAll}
              />
              <SubjectGroup
                title="Backlog / Retake Subjects"
                subjects={available.retakes}
                badgeColor="bg-red-100 text-red-700"
                selectedIds={selectedIds}
                conflictingIds={conflictingIds}
                onToggle={toggle}
                onSelectAll={selectAll}
                onUnselectAll={unselectAll}
              />
            </>
          )}
        </div>
        {conflictingIds.size > 0 && (
          <p className="text-xs text-red-600 mt-1.5 font-medium">⚠ {conflictingIds.size} subject(s) have time conflicts. Review before confirming.</p>
        )}
      </div>

      <div>
        <label className="label">Dean Notes</label>
        <textarea
          className="input min-h-24"
          value={deanNotes}
          onChange={(event) => setDeanNotes(event.target.value)}
          placeholder="Add evaluation notes or remarks"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving || loadingSubjects}>
          {saving ? 'Saving...' : 'Confirm Subject Enrollment'}
        </button>
      </div>
      <ConfirmModal {...confirmProps} />
    </form>
  );
}

function ApproveBatchModal({ batch, onClose, onApproved }) {
  const [tuition, setTuition] = useState(null);
  const [tuitionLoading, setTuitionLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((sum, s) => sum + Number(s.units || 0), 0);

  useEffect(() => {
    if (!batch) return;
    let active = true;
    setTuitionLoading(true);
    client.get('/tuition', {
      params: {
        course: batch.course,
        year_level: batch.year_level,
        semester: batch.semester,
        limit: 1,
      },
    })
      .then((res) => { if (active) setTuition(res.data?.data?.[0] || null); })
      .catch(() => { if (active) setTuition(null); })
      .finally(() => { if (active) setTuitionLoading(false); });
    return () => { active = false; };
  }, [batch]);

  const computedFee = useMemo(() => {
    if (!tuition) return null;
    const misc = Number(tuition.misc_fee || 0);
    if (tuition.per_unit_fee && Number(tuition.per_unit_fee) > 0) {
      const perUnit = Number(tuition.per_unit_fee);
      return { tuitionFee: perUnit * totalUnits, miscFee: misc, total: perUnit * totalUnits + misc, perUnit, isPerUnit: true };
    }
    const flat = Number(tuition.total_amount || 0);
    return { tuitionFee: flat, miscFee: misc, total: flat + misc, isPerUnit: false };
  }, [tuition, totalUnits]);

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const handleApprove = async () => {
    setApproving(true);
    try {
      await client.patch(`/enrollment-batches/${batch.id}/approve`);
      toast.success('Approved. Forwarded for payment.');
      onApproved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve batch');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Student & term info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Student</p>
          <p className="font-semibold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-slate-500 font-mono text-xs">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Course / Year</p>
          <p className="font-semibold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-slate-500 text-xs">{batch?.school_year} · {batch?.semester} Sem</p>
        </div>
      </div>

      {/* Dean Notes */}
      {batch?.dean_notes && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Dean Notes</p>
          {batch.dean_notes}
        </div>
      )}

      {/* Subjects table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <p className="font-semibold text-slate-900 text-sm">Assigned Subjects</p>
          <span className="text-xs font-bold text-slate-600">{totalUnits} units total</span>
        </div>
        {subjects.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">No subjects assigned.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs">
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-right px-4 py-2 font-medium">Units</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subject_id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{s.subject_code}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.subject_name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 font-semibold">{s.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fee Computation */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">Fee Computation</p>
          <p className="text-xs text-slate-400 mt-0.5">Based on tuition setup for this course and term</p>
        </div>
        <div className="px-4 py-4">
          {tuitionLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          ) : !tuition ? (
            <div className="flex items-start gap-2 text-amber-700 text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 mt-0.5 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>No tuition record found for <strong>{batch?.course} Year {batch?.year_level}</strong> ({batch?.school_year} · {batch?.semester} Sem). Set it up in the Tuition page.</span>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {computedFee?.isPerUnit ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tuition ({totalUnits} units × {fmt(tuition.per_unit_fee)})</span>
                  <span className="font-semibold">{fmt(computedFee.tuitionFee)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>Tuition (flat rate)</span>
                  <span className="font-semibold">{fmt(computedFee.tuitionFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Miscellaneous Fee</span>
                <span className="font-semibold">{fmt(computedFee.miscFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total Amount Due</span>
                <span className="text-[#7a1324] text-base">{fmt(computedFee.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          disabled={approving}
          onClick={handleApprove}
        >
          {approving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Approving…
            </span>
          ) : 'Approve & Forward for Payment'}
        </button>
      </div>
    </div>
  );
}

const PAYMENT_METHOD_LABEL = { cash: 'Cash', gcash: 'GCash', maya: 'Maya', bank_transfer: 'Bank Transfer' };
const PAYMENT_STATUS_STYLE = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

function CashierPaymentModal({ batch, onClose, onDone }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showCashForm, setShowCashForm] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((sum, s) => sum + Number(s.units || 0), 0);
  const assessedAmount = Number(batch?.assessed_amount || 0);

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const loadPayments = useCallback(async () => {
    if (!batch?.id) return;
    setLoadingPayments(true);
    try {
      const res = await client.get(`/payments/batch/${batch.id}`);
      setPayments(res.data || []);
    } catch { setPayments([]); }
    finally { setLoadingPayments(false); }
  }, [batch?.id]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const totalPaid = payments.filter((p) => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0);
  const balance = assessedAmount - totalPaid;
  const isFullyPaid = assessedAmount > 0 && balance <= 0;

  const checkEnrolled = async () => {
    try {
      const res = await client.get(`/enrollment-batches/${batch.id}`);
      if (res.data.status === 'for_registration') {
        toast.success('Enrollment fee posted. Student moved to Registrar, and any remaining balance stays under walk-in/installment.');
        onDone();
        onClose();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  const handleRecordCash = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/payments/cash', {
        batch_id: batch.id,
        amount: parseFloat(cashAmount),
        notes: cashNotes || undefined,
      });
      toast.success('Cash payment recorded');
      setShowCashForm(false);
      setCashAmount('');
      setCashNotes('');
      await loadPayments();
      await checkEnrolled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  const handleVerify = async (paymentId) => {
    setActionId(paymentId);
    try {
      await client.patch(`/payments/${paymentId}/verify`);
      toast.success('Payment verified');
      await loadPayments();
      await checkEnrolled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally { setActionId(null); }
  };

  const handleReject = async (paymentId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setActionId(paymentId);
    try {
      await client.patch(`/payments/${paymentId}/reject`, { notes: reason || undefined });
      toast.success('Payment rejected');
      await loadPayments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally { setActionId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Student</p>
          <p className="font-semibold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-slate-500 font-mono text-xs">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Course / Year</p>
          <p className="font-semibold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-slate-500 text-xs">{batch?.school_year} · {batch?.semester} Sem</p>
        </div>
      </div>

      {/* Assessment summary */}
      <div className={`rounded-2xl border overflow-hidden ${isFullyPaid ? 'border-emerald-200' : 'border-orange-200'}`}>
        <div className={`px-4 py-3 flex items-center justify-between ${isFullyPaid ? 'bg-emerald-50' : 'bg-orange-50'}`}>
          <div>
            <p className={`font-semibold text-sm ${isFullyPaid ? 'text-emerald-900' : 'text-orange-900'}`}>Assessment</p>
            <p className={`text-xs mt-0.5 ${isFullyPaid ? 'text-emerald-600' : 'text-orange-600'}`}>{totalUnits} units · {subjects.length} subject(s)</p>
          </div>
          {isFullyPaid && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">FULLY PAID</span>
          )}
        </div>
        <div className="px-4 py-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Total Fee Due</span>
            <span className="font-semibold">{assessedAmount ? fmt(assessedAmount) : <span className="text-amber-600 italic">Not set — go to Tuition page</span>}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Total Paid (Verified)</span>
            <span className="font-semibold">{fmt(totalPaid)}</span>
          </div>
          <div className={`flex justify-between font-bold border-t border-slate-200 pt-2 ${balance > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
            <span>Balance</span>
            <span>{fmt(Math.max(0, balance))}</span>
          </div>
        </div>
      </div>

      {/* Payment records */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-900 text-sm">Payment Records</p>
          {!showCashForm && (
            <button
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
              onClick={() => { setShowCashForm(true); setCashAmount(String(Math.max(0, balance) || '')); }}
            >
              + Record Cash Payment
            </button>
          )}
        </div>

        {showCashForm && (
          <form onSubmit={handleRecordCash} className="mb-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Record Cash Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Amount (₱) *</label>
                <input type="number" step="0.01" min="0.01" required className="input"
                  value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">OR / Notes</label>
                <input type="text" className="input" placeholder="Official receipt no., remarks…"
                  value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowCashForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs" disabled={saving}>
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </form>
        )}

        {loadingPayments ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            No payment records yet.<br />
            <span className="text-xs">Record a cash payment above, or wait for student online submission.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${PAYMENT_STATUS_STYLE[p.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {p.status?.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method || 'Cash'}</span>
                    <span className="text-sm font-bold text-slate-900">{fmt(p.amount)}</span>
                    {p.submitted_by === 'student' && (
                      <span className="text-[10px] text-violet-500 font-semibold">via student portal</span>
                    )}
                  </div>
                  {(p.reference_number || p.xendit_invoice_id) && (
                    <p className="text-xs text-slate-400 mt-1">Ref #: <span className="font-mono font-semibold text-slate-600">{p.reference_number || p.xendit_invoice_id}</span></p>
                  )}
                  {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                  {p.verified_by_name && p.status !== 'pending' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {p.status === 'verified' ? '✓ Verified' : '✗ Rejected'} by {p.verified_by_name}
                    </p>
                  )}
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      disabled={actionId === p.id}
                      onClick={() => handleVerify(p.id)}
                    >
                      {actionId === p.id ? '…' : 'Verify'}
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-50"
                      disabled={actionId === p.id}
                      onClick={() => handleReject(p.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function printEnrollmentSlip(batch, paidAmount = 0) {
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const totalUnits = (batch.subjects || []).reduce((s, sub) => s + Number(sub.units || 0), 0);
  const dateNow = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const copies = ['Student', "Dean's", 'Finance', "Registrar's"];

  const assessed = Number(batch.assessed_amount || 0);
  const paid = Number(paidAmount || 0);
  const balance = Math.max(0, assessed - paid);

  const subjectRows = (batch.subjects || []).map((s) => `
    <tr>
      <td>${s.subject_code || ''}</td>
      <td class="subj-name">${s.subject_name || ''}</td>
      <td class="c">${s.units || ''}</td>
      <td>${s.schedule_days ? `${s.schedule_days}${s.start_time ? ' ' + s.start_time + (s.end_time ? '–' + s.end_time : '') : ''}` : '—'}</td>
      <td>${s.room || '—'}</td>
    </tr>`).join('');

  const sealUrl = `${window.location.origin}/moist-seal.png`;

  const oneSlip = (label) => `
    <div class="slip">
      <div class="hdr">
        <img src="${sealUrl}" alt="" onerror="this.style.display='none'" />
        <div class="school-info">
          <div class="school-name">MOIST, INC.</div>
          <div class="school-sub">Balingasag, Misamis Oriental</div>
          <div class="doc-type">Office of the Registrar &nbsp;|&nbsp; Certificate of Registration</div>
        </div>
        <span class="copy-tag">${label} Copy</span>
      </div>
      <div class="slip-body">
        <div class="slip-main">
          <div class="info">
            <div><span class="lbl">Student No.: </span>${batch.student_number || ''}</div>
            <div><span class="lbl">Name: </span>${(batch.last_name || '').toUpperCase()}, ${batch.first_name || ''}</div>
            <div><span class="lbl">Course / Year: </span>${batch.course || ''} — Year ${batch.year_level || ''}</div>
            <div><span class="lbl">School Year: </span>${batch.school_year || ''} · ${batch.semester || ''} Semester</div>
            <div><span class="lbl">Date Issued: </span>${dateNow}</div>
            <div class="status-row"><span class="lbl">Status: </span><span class="status-val">OFFICIALLY ENROLLED</span></div>
          </div>
          <table>
            <thead><tr><th>Code</th><th>Subject</th><th class="c">Units</th><th>Schedule</th><th>Room</th></tr></thead>
            <tbody>${subjectRows}</tbody>
            <tfoot><tr><td colspan="2" class="r bold">Total Units:</td><td class="c bold">${totalUnits}</td><td colspan="2">Sec: ${(batch.subjects || [])[0]?.section_name || 'TBA'}</td></tr></tfoot>
          </table>
          ${label === 'Student' ? `<div class="welcome">Welcome, Moistian!<br/>You are officially enrolled. We are proud to have you!</div>` : ''}
        </div>
        <div class="aside">
          <div class="aside-title">ASSESSMENT</div>
          <div class="aside-item">
            <div class="aside-lbl">Total Tuition Fee</div>
            <div class="aside-val">${assessed > 0 ? fmt(assessed) : '—'}</div>
          </div>
          <div class="aside-item aside-balance">
            <div class="aside-lbl">Enrollment Fee Paid</div>
            <div class="aside-val" style="color:#166534">${fmt(paid)}</div>
          </div>
          <div class="aside-item aside-balance">
            <div class="aside-lbl">Remaining Balance</div>
            <div class="aside-val" style="color:${balance > 0 ? '#7a1324' : '#166534'}">${assessed > 0 ? fmt(balance) : '—'}</div>
          </div>
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<title>Enrollment Slip — ${(batch.last_name || '').toUpperCase()}, ${batch.first_name || ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{width:100%;height:100%;margin:0;padding:0;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:8pt;color:#111;background:#fff}
  .page{display:flex;flex-direction:column;width:100%;height:100vh}
  @media print{.page{width:100%;height:100%}}
  .slip{padding:3mm 5mm;border:1px solid rgba(122,19,36,0.3);display:flex;flex-direction:column;gap:2px;overflow:hidden;flex:1;background:#fff}
  .slip+.slip{border-top:1.5px dashed rgba(122,19,36,0.5)}
  .hdr{display:flex;align-items:center;gap:5px;border-bottom:2px solid #f6c445;padding-bottom:4px;margin-bottom:3px}
  .hdr img{width:30px;height:30px;object-fit:contain;flex-shrink:0}
  .school-info{flex:1}
  .school-name{font-size:9pt;font-weight:900;color:#7a1324;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
  .school-sub{font-size:6pt;color:#555;line-height:1.3}
  .doc-type{font-size:6.5pt;font-weight:700;color:#374151;margin-top:1px}
  .copy-tag{font-size:6.5pt;background:#fff8eb;border:1px solid #f6c445;color:#7a1324;padding:2px 7px;border-radius:10px;font-weight:800;white-space:nowrap;align-self:flex-start}
  .slip-body{display:flex;gap:4mm;flex:1;margin-top:2px}
  .slip-main{flex:1;display:flex;flex-direction:column;gap:2px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;font-size:7.5pt;margin-bottom:3px}
  .lbl{color:#7a1324;font-weight:700}
  .status-row{grid-column:1/-1}
  .status-val{font-weight:900;color:#166534;letter-spacing:.4px}
  table{width:100%;border-collapse:collapse;font-size:7pt}
  th{background:#fff8eb;border:1px solid rgba(122,19,36,0.22);padding:1.5px 3px;text-align:left;font-weight:800;color:#5a0d1a;white-space:nowrap}
  td{border:1px solid rgba(122,19,36,0.15);padding:1.5px 3px;vertical-align:middle}
  tfoot td{background:#fff8eb;border:1px solid rgba(122,19,36,0.22);font-weight:800;color:#7a1324}
  .subj-name{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .c{text-align:center}.r{text-align:right}.bold{font-weight:800}
  .welcome{margin-top:auto;font-size:6.5pt;font-weight:900;color:#7a1324;text-align:center;line-height:1.5;letter-spacing:.3px;padding-top:3px;border-top:1.5px solid rgba(122,19,36,0.3)}
  .aside{width:42mm;flex-shrink:0;border-left:1.5px dashed rgba(122,19,36,0.4);padding-left:4mm;display:flex;flex-direction:column;gap:5px}
  .aside-title{font-size:7.5pt;font-weight:900;color:#7a1324;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid rgba(122,19,36,0.3);padding-bottom:2px}
  .aside-item{display:flex;flex-direction:column;gap:1px}
  .aside-lbl{font-size:6pt;color:#666}
  .aside-val{font-size:8.5pt;font-weight:800;color:#111}
  .aside-balance{border-top:1px solid rgba(122,19,36,0.25);padding-top:3px;margin-top:1px}
  @page{size:legal portrait;margin:6mm}
  @media print{html,body{height:100%}}
</style></head>
<body>
  <div class="page">
    ${copies.map((c) => oneSlip(c)).join('')}
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
  else { toast.error('Allow pop-ups to print the enrollment slip.'); }
}

function RegistrarRegisterModal({ batch, onClose, onRegistered }) {
  const [registering, setRegistering] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((sum, s) => sum + Number(s.units || 0), 0);
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!batch?.id) return;
    client.get(`/payments/batch/${batch.id}`)
      .then((res) => setPayments(res.data || []))
      .catch(() => setPayments([]))
      .finally(() => setLoadingPayments(false));
  }, [batch?.id]);

  const verifiedPaid = payments.filter((p) => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await client.patch(`/enrollment-batches/${batch.id}/register`);
      toast.success('Student officially enrolled!');
      printEnrollmentSlip(batch, verifiedPaid);
      onRegistered();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setRegistering(false); }
  };

  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Student</p>
          <p className="font-semibold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-slate-500 font-mono text-xs">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Course / Year</p>
          <p className="font-semibold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-slate-500 text-xs">{batch?.school_year} · {batch?.semester} Sem</p>
        </div>
      </div>

      {/* Payment verification */}
      <div className="rounded-2xl border border-emerald-200 overflow-hidden">
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <p className="font-semibold text-emerald-900 text-sm">Payment Status</p>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
            PAYMENT COMPLETE
          </span>
        </div>
        <div className="px-4 py-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Total Assessment</span>
            <span className="font-semibold">{fmt(batch?.assessed_amount)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-bold border-t border-emerald-100 pt-2">
            <span>Total Verified Payments</span>
            <span>{loadingPayments ? '…' : fmt(verifiedPaid)}</span>
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <p className="font-semibold text-slate-900 text-sm">Enrolled Subjects</p>
          <span className="text-xs font-bold text-slate-600">{subjects.length} subjects · {totalUnits} units</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs">
              <th className="text-left px-4 py-2 font-medium">Code</th>
              <th className="text-left px-4 py-2 font-medium">Subject</th>
              <th className="text-right px-4 py-2 font-medium">Units</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.subject_id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{s.subject_code}</td>
                <td className="px-4 py-2 text-slate-600">{s.subject_name}</td>
                <td className="px-4 py-2 text-right text-slate-700 font-semibold">{s.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
        <strong>Ready for Official Enrollment.</strong> Clicking the button below will officially enroll this student and open the <strong>4-copy enrollment slip</strong> for printing (Student · Dean's · Finance · Registrar's).
      </div>

      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary flex items-center gap-2"
          disabled={registering}
          onClick={handleRegister}
        >
          {registering ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Enrolling…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Officially Enroll &amp; Print Slip (4 copies)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function EnrollmentBatchesPage() {
  const { confirm, confirmProps } = useConfirm();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role;

  const defaultTab =
    role === 'cashier'    ? 'for_payment' :
    role === 'registrar'  ? 'for_registration' :
    role === 'staff'      ? 'for_assessment' :
    'for_subject_enrollment';

  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState({});
  const [newModal, setNewModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, batch: null });
  const [evaluateModal, setEvaluateModal] = useState({ open: false, batch: null });
  const [printModal, setPrintModal] = useState({ open: false, batch: null });
  const [approveModal, setApproveModal] = useState({ open: false, batch: null });
  const [paymentModal, setPaymentModal] = useState({ open: false, batch: null });
  const [registerModal, setRegisterModal] = useState({ open: false, batch: null });

  const loadCounts = useCallback(async () => {
    try {
      const statuses = ['for_subject_enrollment', 'for_assessment', 'for_payment', 'for_registration', 'enrolled', 'pending'];
      const results = await Promise.allSettled(
        statuses.map((s) => client.get('/enrollment-batches', { params: { status: s, limit: 1 } }))
      );
      const counts = {};
      statuses.forEach((s, i) => {
        if (results[i].status === 'fulfilled') counts[s] = results[i].value.data.total;
      });
      setTabCounts(counts);
    } catch { /* silent */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (activeTab) params.status = activeTab;
      const response = await client.get('/enrollment-batches', { params });
      setBatches(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load enrollment batches');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const roleLabel = useMemo(() => {
    if (!role) return 'Authorized users';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, [role]);

  const fetchBatchDetail = async (batchId) => {
    const response = await client.get(`/enrollment-batches/${batchId}`);
    return response.data;
  };

  const openDetail = async (batch) => {
    try {
      const detail = await fetchBatchDetail(batch.id);
      setDetailModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load batch');
    }
  };

  const openEvaluate = async (batch) => {
    try {
      const detail = await fetchBatchDetail(batch.id);
      setEvaluateModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load batch');
    }
  };

  const openPrint = async (batchId) => {
    try {
      const detail = await fetchBatchDetail(batchId);
      setPrintModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load printable batch');
    }
  };

  const openApprove = async (batch) => {
    try {
      const detail = await fetchBatchDetail(batch.id);
      setApproveModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load batch');
    }
  };

  const openPayment = async (batch) => {
    try {
      const detail = await fetchBatchDetail(batch.id);
      setPaymentModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load batch');
    }
  };

  const openRegister = async (batch) => {
    try {
      const detail = await fetchBatchDetail(batch.id);
      setRegisterModal({ open: true, batch: detail });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load batch');
    }
  };

  const handleDelete = async (batch) => {
    if (!await confirm({ title: 'Delete Enrollment Batch', message: `${batch.student_name || batch.student_id} — This cannot be undone.`, confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await client.delete(`/enrollment-batches/${batch.id}`);
      toast.success('Enrollment batch deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };


  const renderAction = (batch) => {
    if (batch.status === 'pending') {
      if (canCreate(role)) {
        return (
          <button
            className="text-slate-700 hover:text-slate-900 text-xs font-medium"
            onClick={async () => {
              try {
                await client.patch(`/enrollment-batches/${batch.id}/submit`);
                toast.success('Sent for subject enrollment');
                load();
              } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to submit batch');
              }
            }}
          >
            Send for Subject Enrollment
          </button>
        );
      }

      return (
        <button
          className="text-slate-600 hover:text-slate-700 text-xs font-medium"
          onClick={() => openDetail(batch)}
        >
          Open
        </button>
      );
    }

    if (batch.status === 'for_subject_enrollment') {
      if (canEvaluate(role)) {
        return (
          <button
            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            onClick={() => openEvaluate(batch)}
          >
            Enroll Subjects
          </button>
        );
      }

      return (
        <button
          className="text-slate-600 hover:text-slate-700 text-xs font-medium"
          onClick={() => openDetail(batch)}
        >
          Open
        </button>
      );
    }

    if (batch.status === 'for_assessment') {
      if (canApprove(role)) {
        return (
          <button
            className="text-green-600 hover:text-green-700 text-xs font-medium"
            onClick={() => openApprove(batch)}
          >
            Review & Approve
          </button>
        );
      }

      return (
        <button
          className="text-slate-600 hover:text-slate-700 text-xs font-medium"
          onClick={() => openDetail(batch)}
        >
          Open
        </button>
      );
    }

    if (batch.status === 'for_payment') {
      if (canRegister(role)) {
        return (
          <button
            className="text-violet-600 hover:text-violet-700 text-xs font-medium"
            onClick={() => openPayment(batch)}
          >
            Process Payment
          </button>
        );
      }

      return (
        <button
          className="text-slate-600 hover:text-slate-700 text-xs font-medium"
          onClick={() => openDetail(batch)}
        >
          Open
        </button>
      );
    }

    if (batch.status === 'for_registration') {
      if (canOfficiallyEnroll(role)) {
        return (
          <button
            className="text-teal-600 hover:text-teal-700 text-xs font-semibold"
            onClick={() => openRegister(batch)}
          >
            Officially Enroll &amp; Print
          </button>
        );
      }

      return (
        <button
          className="text-slate-600 hover:text-slate-700 text-xs font-medium"
          onClick={() => openDetail(batch)}
        >
          Open
        </button>
      );
    }

    return (
      <button
        className="text-slate-600 hover:text-slate-700 text-xs font-medium"
        onClick={() => openPrint(batch.id)}
      >
        View / Reprint
      </button>
    );
  };

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Enrollment Processing</h1>
          <p className="page-subtitle">Evaluation → Approval → Payment → Enrolled</p>
        </div>
        {canCreate(role) && (
          <button className="btn-primary" onClick={() => setNewModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Encode Student
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count = tab.value ? tabCounts[tab.value] : undefined;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-[#7a1324] text-[#7a1324]'
                  : `border-transparent ${tab.color} hover:text-slate-700`
              }`}
            >
              {tab.label}
              {count != null && (
                <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-[#7a1324] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student', 'School Year / Semester', 'Status', 'Dean', 'Actions'].map((header) => (
                <th key={header} className="table-header-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="table-cell py-12 text-center text-slate-400">Loading...</td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell py-12 text-center text-slate-400">
                  No batches found
                </td>
              </tr>
            ) : batches.map((batch) => (
              <tr key={batch.id} className="table-row">
                <td className="table-cell">
                  <div className="font-semibold text-slate-900">
                    {batch.last_name}, {batch.first_name}
                  </div>
                  <div className="text-xs text-slate-500">{batch.student_number}</div>
                </td>
                <td className="table-cell text-slate-600">
                  <div>{batch.school_year}</div>
                  <div className="text-xs text-slate-400">{batch.semester} Semester</div>
                </td>
                <td className="table-cell">
                  <StatusBadge status={batch.status} />
                </td>
                <td className="table-cell text-slate-600 text-sm">
                  {batch.dean_id ? `${batch.dean_id.slice(0, 8)}...` : '-'}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    {renderAction(batch)}
                    {role === 'admin' && (
                      <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDelete(batch)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-500">{total} total record(s)</div>

      <Modal isOpen={newModal} onClose={() => setNewModal(false)} title="Encode Student for Enrollment">
        <NewBatchModal onClose={() => setNewModal(false)} onCreated={load} />
      </Modal>

      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, batch: null })}
        title="Batch Details"
        size="lg"
      >
        <DetailModal
          batch={detailModal.batch}
          onClose={() => setDetailModal({ open: false, batch: null })}
          onOpenPrint={() => {
            const batchId = detailModal.batch?.id;
            setDetailModal({ open: false, batch: null });
            if (batchId) {
              openPrint(batchId);
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={evaluateModal.open}
        onClose={() => setEvaluateModal({ open: false, batch: null })}
        title="Subject Enrollment"
        size="xl"
      >
        <EvaluateBatchModal
          batch={evaluateModal.batch}
          onClose={() => setEvaluateModal({ open: false, batch: null })}
          onSaved={load}
        />
      </Modal>

      <Modal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ open: false, batch: null })}
        title="Enrollment Registration Form"
        size="lg"
      >
        <PrintableEnrollmentSheet
          batch={printModal.batch}
          onClose={() => setPrintModal({ open: false, batch: null })}
        />
      </Modal>

      <Modal
        isOpen={approveModal.open}
        onClose={() => setApproveModal({ open: false, batch: null })}
        title="Review & Approve Enrollment"
        size="lg"
      >
        <ApproveBatchModal
          batch={approveModal.batch}
          onClose={() => setApproveModal({ open: false, batch: null })}
          onApproved={() => { load(); loadCounts(); }}
        />
      </Modal>

      <Modal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, batch: null })}
        title="Process Payment"
        size="lg"
      >
        <CashierPaymentModal
          batch={paymentModal.batch}
          onClose={() => setPaymentModal({ open: false, batch: null })}
          onDone={() => { load(); loadCounts(); }}
        />
      </Modal>

      <Modal
        isOpen={registerModal.open}
        onClose={() => setRegisterModal({ open: false, batch: null })}
        title="Official Enrollment & Print Slip"
        size="lg"
      >
        <RegistrarRegisterModal
          batch={registerModal.batch}
          onClose={() => setRegisterModal({ open: false, batch: null })}
          onRegistered={() => { load(); loadCounts(); }}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
