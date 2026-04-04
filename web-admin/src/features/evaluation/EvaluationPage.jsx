import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const TABS = [
  { label: 'Not Yet Enrolled', value: 'none', color: 'text-slate-500' },
  { label: 'For Evaluation', value: 'for_subject_enrollment', color: 'text-blue-600' },
  { label: 'For Approval', value: 'for_assessment', color: 'text-violet-600' },
  { label: 'For Payment', value: 'for_payment', color: 'text-orange-600' },
  { label: 'Enrolled', value: 'enrolled', color: 'text-green-600' },
];

const STATUS_BADGE = {
  pending:                { label: 'Pending',        cls: 'bg-amber-50 text-amber-700' },
  for_subject_enrollment: { label: 'For Evaluation', cls: 'bg-blue-50 text-blue-700' },
  for_assessment:         { label: 'For Approval',   cls: 'bg-violet-50 text-violet-700' },
  for_payment:            { label: 'For Payment',    cls: 'bg-orange-50 text-orange-700' },
  enrolled:               { label: 'Enrolled',       cls: 'bg-green-50 text-green-700' },
};

function StatusBadge({ status }) {
  const b = STATUS_BADGE[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${b.cls}`}>{b.label}</span>;
}

function fmt12ev(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function parseDaysEv(str) {
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

function toMinsEv(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesConflictEv(s1, s2) {
  const d1 = parseDaysEv(s1.schedule_days);
  const d2 = parseDaysEv(s2.schedule_days);
  if (!d1.length || !d2.length || !d1.some((d) => d2.includes(d))) return false;
  if (!s1.start_time || !s2.start_time || !s1.end_time || !s2.end_time) return false;
  return toMinsEv(s1.start_time) < toMinsEv(s2.end_time) && toMinsEv(s2.start_time) < toMinsEv(s1.end_time);
}

function EvaluateModal({ batch, onClose, onSaved }) {
  const { confirmProps } = useConfirm();
  const [available, setAvailable] = useState({ regular: [], retakes: [], advanced: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [deanNotes, setDeanNotes] = useState(batch?.dean_notes || '');
  const [showAdvancedSubjects, setShowAdvancedSubjects] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [saving, setSaving] = useState(false);

  // Credit subjects state
  const [creditableSubjects, setCreditableSubjects] = useState([]);
  const [loadingCreditable, setLoadingCreditable] = useState(false);
  const [creditedRows, setCreditedRows] = useState([]);

  useEffect(() => {
    setSelectedIds((batch?.subjects || []).map(s => String(s.subject_id)));
    setDeanNotes(batch?.dean_notes || '');
    setShowAdvancedSubjects(false);
    setCreditedRows([]);
  }, [batch]);

  useEffect(() => {
    if (!batch?.id) return;
    let active = true;
    setLoadingSubjects(true);
    client.get(`/enrollment-batches/${batch.id}/available-subjects`, {
      params: { include_advanced: showAdvancedSubjects ? '1' : '0' },
    })
      .then(res => { if (active) setAvailable(res.data || { regular: [], retakes: [], advanced: [] }); })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => { if (active) setLoadingSubjects(false); });
    return () => { active = false; };
  }, [batch?.id, showAdvancedSubjects]);

  useEffect(() => {
    if (!batch?.id) return;
    let active = true;
    setLoadingCreditable(true);
    client.get(`/enrollment-batches/${batch.id}/creditable-subjects`)
      .then(res => { if (active) setCreditableSubjects(res.data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingCreditable(false); });
    return () => { active = false; };
  }, [batch?.id]);

  useEffect(() => {
    if (showAdvancedSubjects) return;
    const advancedIds = new Set((available.advanced || []).map((subject) => String(subject.id)));
    if (!advancedIds.size) return;
    setSelectedIds((current) => current.filter((id) => !advancedIds.has(id)));
  }, [showAdvancedSubjects, available.advanced]);

  const allSubjects = useMemo(() => [...available.regular, ...available.retakes, ...available.advanced], [available]);

  const conflictingIds = useMemo(() => {
    const sel = allSubjects.filter(s => selectedIds.includes(String(s.id)));
    const c = new Set();
    for (let i = 0; i < sel.length; i++)
      for (let j = i + 1; j < sel.length; j++)
        if (timesConflictEv(sel[i], sel[j])) { c.add(String(sel[i].id)); c.add(String(sel[j].id)); }
    return c;
  }, [selectedIds, allSubjects]);

  const totalUnits = useMemo(
    () => allSubjects.filter(s => selectedIds.includes(String(s.id))).reduce((sum, s) => sum + Number(s.units || 0), 0),
    [selectedIds, allSubjects]
  );

  const toggle = (id) => setSelectedIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  const selectAll = (group) => setSelectedIds(prev => [...new Set([...prev, ...group.map(s => String(s.id))])]);
  const unselectAll = (group) => { const ids = new Set(group.map(s => String(s.id))); setSelectedIds(prev => prev.filter(x => !ids.has(x))); };
  const isOverload = totalUnits > 25;

  // Credit subject handlers
  const addCreditRow = () => setCreditedRows(prev => [...prev, { subject_id: '', final_grade: '', source_school: '' }]);
  const removeCreditRow = (i) => setCreditedRows(prev => prev.filter((_, idx) => idx !== i));
  const updateCreditRow = (i, field, value) => setCreditedRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  const creditedSubjectIds = new Set(creditedRows.map(r => r.subject_id).filter(Boolean));
  const enrolledSubjectIds = new Set(selectedIds);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIds.length && creditedRows.length === 0) { toast.error('Select at least one subject or add a credited subject'); return; }
    if (conflictingIds.size > 0) { toast.error('Remove the schedule conflicts before saving this evaluation.'); return; }

    for (const row of creditedRows) {
      if (!row.subject_id) { toast.error('Please select a subject for each credited row'); return; }
      const grade = Number(row.final_grade);
      if (!row.final_grade || isNaN(grade) || grade < 1.0 || grade > 3.0) {
        toast.error('Credited subject grade must be between 1.0 and 3.0'); return;
      }
    }

    setSaving(true);
    try {
      await client.patch(`/enrollment-batches/${batch.id}/evaluate`, {
        subject_ids: selectedIds,
        dean_notes: deanNotes,
        include_advanced: showAdvancedSubjects,
        credited_subjects: creditedRows.map(r => ({
          subject_id: r.subject_id,
          final_grade: Number(r.final_grade),
          source_school: r.source_school || null,
        })),
      });
      toast.success('Subjects enrolled. Forwarded for assessment.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Evaluation failed');
    } finally { setSaving(false); }
  };

  const SubjectRowEv = ({ subject }) => {
    const sid = String(subject.id);
    const checked = selectedIds.includes(sid);
    const isConflict = conflictingIds.has(sid);
    return (
      <label className={`flex items-start gap-3 px-4 py-3 border-t first:border-t-0 cursor-pointer transition-colors ${
        isConflict ? 'bg-red-50 border-red-200' : checked ? 'bg-blue-50' : 'hover:bg-slate-50 border-slate-100'
      }`}>
        <input type="checkbox" checked={checked} onChange={() => toggle(sid)} className="mt-0.5 accent-[#7a1324]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-900 text-sm">{subject.code} — {subject.name}</span>
            {subject.is_failed && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Failed — Retake</span>}
            {subject.is_retake && !subject.is_failed && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Backlog</span>}
            {subject.is_advanced && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">Advanced</span>}
            {!subject.prerequisite_met && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">Prereq not passed: {subject.prerequisite_code}</span>}
            {isConflict && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800">⚠ Time conflict</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
            <span>{subject.units} units</span>
            <span>&middot; Year {subject.year_level}</span>
            {subject.section_name && <span>· Sec {subject.section_name}</span>}
            {subject.schedule_days && <span>· {subject.schedule_days}</span>}
            {subject.start_time && subject.end_time && <span>· {fmt12ev(subject.start_time)} – {fmt12ev(subject.end_time)}</span>}
            {subject.teacher_last_name && <span>· {subject.teacher_last_name}, {subject.teacher_first_name}</span>}
            {subject.is_failed && subject.previous_grade != null && <span className="text-red-500 font-medium">· Prev: {parseFloat(subject.previous_grade).toFixed(2)}</span>}
          </p>
        </div>
      </label>
    );
  };

  const GroupHeader = ({ title, group, badgeColor }) => (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{title}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>{group.length}</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => selectAll(group)} className="text-xs text-blue-600 hover:underline font-medium">Select all</button>
        <span className="text-slate-300">|</span>
        <button type="button" onClick={() => unselectAll(group)} className="text-xs text-slate-500 hover:underline">Uncheck all</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Student</p>
          <p className="font-bold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-xs text-slate-500">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Course / Year</p>
          <p className="font-semibold text-slate-800">{batch?.course} — Year {batch?.year_level}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">School Year</p>
          <p className="font-semibold text-slate-800">{batch?.school_year}</p>
          <p className="text-xs text-slate-500">{batch?.semester} Semester</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Pre-enrolled</p>
          <p className="font-semibold text-slate-800">{batch?.subjects?.length ?? 0} subject(s)</p>
        </div>
      </div>

      {/* Unit counter */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isOverload ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
        <span className="text-sm text-slate-600 font-medium">Selected units</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${isOverload ? 'text-red-600' : totalUnits >= 21 ? 'text-amber-600' : 'text-emerald-600'}`}>{totalUnits} units</span>
          {isOverload && <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">OVERLOAD</span>}
          {!isOverload && totalUnits >= 21 && <span className="text-[11px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Near limit</span>}
        </div>
      </div>

      {/* Credit Subjects */}
      <div className="border border-amber-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
          <div>
            <p className="text-sm font-semibold text-amber-900">Credit Subjects from Previous School</p>
            <p className="text-xs text-amber-700 mt-0.5">Subjects already passed — recorded as passed in transcript.</p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
            onClick={addCreditRow}
            disabled={loadingCreditable}
          >
            + Add Subject
          </button>
        </div>
        {creditedRows.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-400 text-center">
            No credited subjects. Click "+ Add Subject" to add one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {creditedRows.map((row, index) => {
              const options = creditableSubjects.filter(
                s => !enrolledSubjectIds.has(String(s.id)) && (!creditedSubjectIds.has(String(s.id)) || String(s.id) === row.subject_id)
              );
              return (
                <div key={index} className="px-4 py-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1 block">Subject</label>
                    <select className="input text-sm" value={row.subject_id} onChange={e => updateCreditRow(index, 'subject_id', e.target.value)}>
                      <option value="">Select subject...</option>
                      {options.map(s => (
                        <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.units} units, Yr {s.year_level})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1 block">Grade (1.0–3.0)</label>
                    <input
                      type="number" className="input text-sm" placeholder="e.g. 2.0"
                      min="1.0" max="3.0" step="0.25"
                      value={row.final_grade} onChange={e => updateCreditRow(index, 'final_grade', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1 block">Previous School (optional)</label>
                    <input type="text" className="input text-sm" placeholder="School name"
                      value={row.source_school} onChange={e => updateCreditRow(index, 'source_school', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <button type="button" className="w-full text-slate-400 hover:text-red-500 transition-colors text-xl leading-none pb-1"
                      onClick={() => removeCreditRow(index)} title="Remove">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <label className="label mb-0">Select Subjects *</label>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                className="accent-[#7a1324]"
                checked={showAdvancedSubjects}
                onChange={e => setShowAdvancedSubjects(e.target.checked)}
              />
              Include Advanced Subjects
            </label>
            <span className="text-xs text-slate-400">{selectedIds.length} selected</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Enable this when the Dean needs to assign higher-year subjects. Advanced subjects still require passed prerequisites and must not conflict with the selected schedule.
        </p>
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {loadingSubjects ? (
            <div className="px-4 py-5 text-sm text-slate-400">Loading subjects…</div>
          ) : available.regular.length === 0 && available.retakes.length === 0 && available.advanced.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-400">No subjects found.</div>
          ) : (
            <>
              {available.regular.length > 0 && (
                <>
                  <GroupHeader title="Current Term Subjects" group={available.regular} badgeColor="bg-blue-100 text-blue-700" />
                  {available.regular.map(s => <SubjectRowEv key={s.id} subject={s} />)}
                </>
              )}
              {available.retakes.length > 0 && (
                <>
                  <GroupHeader title="Backlog / Retake Subjects" group={available.retakes} badgeColor="bg-red-100 text-red-700" />
                  {available.retakes.map(s => <SubjectRowEv key={s.id} subject={s} />)}
                </>
              )}
              {showAdvancedSubjects && available.advanced.length > 0 && (
                <>
                  <GroupHeader title="Advanced Subjects" group={available.advanced} badgeColor="bg-violet-100 text-violet-700" />
                  {available.advanced.map(s => <SubjectRowEv key={s.id} subject={s} />)}
                </>
              )}
            </>
          )}
        </div>
        {conflictingIds.size > 0 && (
          <p className="text-xs text-red-600 mt-1.5 font-medium">⚠ {conflictingIds.size} subject(s) have time conflicts.</p>
        )}
      </div>

      <div>
        <label className="label">Dean's Notes</label>
        <textarea className="input min-h-16" value={deanNotes} onChange={e => setDeanNotes(e.target.value)} placeholder="Remarks or evaluation notes…" />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving || loadingSubjects || conflictingIds.size > 0}>
          {saving ? 'Submitting…' : 'Confirm & Forward for Assessment'}
        </button>
      </div>
      <ConfirmModal {...confirmProps} />
    </form>
  );
}

export default function EvaluationPage() {
  const { schoolYear, semester } = useActiveTerm();
  const [activeTab, setActiveTab] = useState('for_subject_enrollment');

  const [data, setData] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [evalModal, setEvalModal] = useState({ open: false, batch: null });

  const loadCounts = useCallback(async () => {
    if (!schoolYear || !semester) return;
    try {
      const statuses = ['for_subject_enrollment', 'for_assessment', 'for_payment', 'enrolled'];
      const [unenrolledRes, ...statusResults] = await Promise.allSettled([
        client.get('/enrollment-batches/unenrolled', { params: { school_year: schoolYear, semester } }),
        ...statuses.map(s => client.get('/enrollment-batches', { params: { school_year: schoolYear, semester, status: s, limit: 1 } })),
      ]);
      const newCounts = {};
      if (unenrolledRes.status === 'fulfilled') newCounts.none = unenrolledRes.value.data.total;
      statuses.forEach((s, i) => {
        if (statusResults[i].status === 'fulfilled') newCounts[s] = statusResults[i].value.data.total;
      });
      setCounts(newCounts);
    } catch { /* silent */ }
  }, [schoolYear, semester]);

  const loadTab = useCallback(async () => {
    if (!schoolYear || !semester) return;
    setLoading(true);
    try {
      if (activeTab === 'none') {
        const res = await client.get('/enrollment-batches/unenrolled', { params: { school_year: schoolYear, semester } });
        setData(res.data.data || []);
      } else {
        const res = await client.get('/enrollment-batches', { params: { school_year: schoolYear, semester, status: activeTab, limit: 100 } });
        setData(res.data.data || []);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [activeTab, schoolYear, semester]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadTab(); }, [loadTab]);

  const openEval = async (batch) => {
    try {
      const res = await client.get(`/enrollment-batches/${batch.id}`);
      setEvalModal({ open: true, batch: res.data });
    } catch { toast.error('Failed to load batch details'); }
  };

  const handleEvalSaved = () => { loadTab(); loadCounts(); };

  return (
    <div className="p-8">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Evaluation</h1>
          <p className="page-subtitle">
            {schoolYear ? `${schoolYear} — ${semester} Semester` : 'No active term set'}
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        {TABS.map(tab => {
          const count = counts[tab.value];
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? `border-[#7a1324] text-[#7a1324]`
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

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {activeTab === 'none'
                ? ['Student', 'Student No.', 'Course', 'Year Level', 'Status'].map(h => (
                    <th key={h} className="table-header-cell">{h}</th>
                  ))
                : ['Student', 'Student No.', 'Course', 'Year', 'Subjects', 'Status', 'Action'].map(h => (
                    <th key={h} className="table-header-cell">{h}</th>
                  ))
              }
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-cell py-12 text-center text-slate-400">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-9 h-9">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">No records found</p>
                  </div>
                </td>
              </tr>
            ) : activeTab === 'none' ? (
              data.map(student => (
                <tr key={student.id} className="table-row">
                  <td className="table-cell">
                    <p className="font-semibold text-slate-900">{student.last_name}, {student.first_name}</p>
                  </td>
                  <td className="table-cell font-mono text-xs text-slate-600">{student.student_number}</td>
                  <td className="table-cell text-slate-700 font-medium">{student.course || '—'}</td>
                  <td className="table-cell text-slate-600">{student.year_level ? `Year ${student.year_level}` : '—'}</td>
                  <td className="table-cell">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      Not Yet Enrolled
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              data.map(batch => (
                <tr key={batch.id} className="table-row">
                  <td className="table-cell">
                    <p className="font-semibold text-slate-900">{batch.last_name}, {batch.first_name}</p>
                  </td>
                  <td className="table-cell font-mono text-xs text-slate-600">{batch.student_number}</td>
                  <td className="table-cell text-slate-700 font-medium">{batch.course || '—'}</td>
                  <td className="table-cell text-slate-600">{batch.year_level ? `Year ${batch.year_level}` : '—'}</td>
                  <td className="table-cell text-slate-500 text-xs">{batch.subjects?.length ?? 0} subject(s)</td>
                  <td className="table-cell"><StatusBadge status={batch.status} /></td>
                  <td className="table-cell">
                    {batch.status === 'for_subject_enrollment' ? (
                      <button
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                        onClick={() => openEval(batch)}
                      >
                        Enroll Subjects
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={evalModal.open}
        onClose={() => setEvalModal({ open: false, batch: null })}
        title="Subject Enrollment Evaluation"
        size="lg"
      >
        {evalModal.batch && (
          <EvaluateModal
            batch={evalModal.batch}
            onClose={() => setEvalModal({ open: false, batch: null })}
            onSaved={handleEvalSaved}
          />
        )}
      </Modal>
    </div>
  );
}
