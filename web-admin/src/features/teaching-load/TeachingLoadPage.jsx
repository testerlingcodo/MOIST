import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useCourses } from '../../hooks/useCourses';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const SEMESTERS = [
  { key: '1st', label: '1st Semester', bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', header: 'bg-blue-50 border-blue-100 text-blue-800' },
  { key: '2nd', label: '2nd Semester', bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200', header: 'bg-violet-50 border-violet-100 text-violet-800' },
  { key: 'summer', label: 'Summer', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', header: 'bg-amber-50 border-amber-100 text-amber-800' },
];

const SEM_BAR = { '1st': 'bg-blue-500', '2nd': 'bg-violet-500', summer: 'bg-amber-500' };
const SEM_BADGE = { '1st': 'bg-blue-50 text-blue-700', '2nd': 'bg-violet-50 text-violet-700', summer: 'bg-amber-50 text-amber-700' };
const SEMESTER_SECTIONS = [
  ...SEMESTERS,
  { key: 'other', label: 'No Semester Set', bar: 'bg-slate-400', header: 'bg-slate-50 border-slate-100 text-slate-600' },
];

function timeToMins(value) {
  if (!value) return null;
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function hasConflict(a, b) {
  if (!a.semester || !b.semester || a.semester !== b.semester) return false;
  if (!a.schedule_days || !b.schedule_days || a.schedule_days !== b.schedule_days) return false;
  const aStart = timeToMins(a.start_time);
  const aEnd = timeToMins(a.end_time);
  const bStart = timeToMins(b.start_time);
  const bEnd = timeToMins(b.end_time);
  if (!aStart || !bStart) return false;
  return aStart < bEnd && bStart < aEnd;
}

function detectConflicts(subjects) {
  const ids = new Set();
  for (let i = 0; i < subjects.length; i += 1) {
    for (let j = i + 1; j < subjects.length; j += 1) {
      if (hasConflict(subjects[i], subjects[j])) {
        ids.add(subjects[i].id);
        ids.add(subjects[j].id);
      }
    }
  }
  return ids;
}

function fmt12(value) {
  if (!value) return '';
  const [hours, mins] = value.split(':').map(Number);
  return `${hours % 12 || 12}:${String(mins).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

function getSubjectCourses(subject) {
  if (subject?.is_minor && Array.isArray(subject.minor_courses) && subject.minor_courses.length) {
    return subject.minor_courses;
  }
  return subject?.course ? [subject.course] : [];
}

function matchesCourseFilter(subject, course) {
  if (!course) return true;
  return getSubjectCourses(subject).includes(course);
}

function getCourseLabel(subject) {
  const courses = getSubjectCourses(subject);
  if (!courses.length) return subject?.course || '-';
  return courses.join(', ');
}

function SubjectCard({ subject, isConflict, onRemove }) {
  return (
    <div className={`flex items-stretch overflow-hidden rounded-xl border ${isConflict ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className={`w-1 shrink-0 ${SEM_BAR[subject.semester] || 'bg-slate-300'}`} />
      <div className="flex-1 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-800">{subject.code}</span>
              <span className="truncate text-sm text-slate-500">{subject.name}</span>
              {isConflict && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  Conflict
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {getSubjectCourses(subject).length > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${subject.is_minor ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                  {subject.is_minor ? `Minor: ${getCourseLabel(subject)}` : getCourseLabel(subject)}
                </span>
              )}
              {subject.year_level && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Year {subject.year_level}</span>}
              {subject.section_name && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Sec {subject.section_name}</span>}
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{subject.units} units</span>
            </div>

            {(subject.schedule_days || subject.start_time) ? (
              <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium ${isConflict ? 'text-red-600' : 'text-slate-500'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {subject.schedule_days && <span>{subject.schedule_days}</span>}
                {subject.start_time && subject.end_time && <span>{fmt12(subject.start_time)} - {fmt12(subject.end_time)}</span>}
                {subject.room && <span>{subject.room}</span>}
              </div>
            ) : (
              <p className="mt-1 text-[11px] font-medium text-amber-500">No schedule set</p>
            )}
          </div>

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(subject.id)}
              className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Remove from load"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SemHeader({ semKey, count, units }) {
  const semester = SEMESTERS.find((item) => item.key === semKey);
  if (!semester) return null;

  return (
    <div className={`mb-2 mt-3 flex items-center justify-between rounded-lg border px-3 py-1.5 first:mt-0 ${semester.header}`}>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${semester.bar}`} />
        <span className="text-xs font-bold uppercase tracking-wide">{semester.label}</span>
        <span className="text-[10px] font-semibold opacity-70">{count} subject{count !== 1 ? 's' : ''}</span>
      </div>
      <span className="text-[10px] font-semibold opacity-70">{units} units</span>
    </div>
  );
}

function TeacherLoadEditor({ teacher, onChanged, showHeader = true, onBack, version = 0 }) {
  const { confirm, confirmProps } = useConfirm();
  const { courses } = useCourses();
  const [allSubjects, setAllSubjects] = useState([]);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get('/subjects', { params: { limit: 500, is_active: true } })
      .then((response) => setAllSubjects(response.data.data || []))
      .catch(() => {});
  }, [version]);

  const assigned = teacher.assigned_subjects || [];
  const assignedIds = new Set(assigned.map((subject) => subject.id));
  const conflicts = detectConflicts(assigned);
  const totalUnits = assigned.reduce((sum, subject) => sum + (Number(subject.units) || 0), 0);

  const assignedBySem = useMemo(() => {
    const grouped = {};
    assigned.forEach((subject) => {
      const key = subject.semester || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(subject);
    });
    return grouped;
  }, [assigned]);

  const available = allSubjects.filter((subject) => {
    if (assignedIds.has(subject.id)) return false;
    // Only exclude if actually assigned to a DIFFERENT existing teacher
    if ((subject.teacher_first_name || subject.teacher_last_name) && !assignedIds.has(subject.id)) return false;
    if (!matchesCourseFilter(subject, filterCourse)) return false;
    if (filterYear && String(subject.year_level) !== String(filterYear)) return false;
    if (filterSem && subject.semester !== filterSem) return false;
    return true;
  });

  const availableBySem = useMemo(() => {
    const grouped = {};
    available.forEach((subject) => {
      const key = subject.semester || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(subject);
    });
    return grouped;
  }, [available]);

  const handleSelectSubject = (subjectId) => {
    setAddSubjectId(subjectId);
    setPreview(allSubjects.find((subject) => subject.id === subjectId) || null);
  };

  const handleAssign = async () => {
    if (!addSubjectId) return;

    const subject = allSubjects.find((item) => item.id === addSubjectId);
    if (subject) {
      const conflictWith = assigned.find((item) => hasConflict(item, subject));
      if (conflictWith) {
        const proceed = await confirm({ title: 'Schedule Conflicts Detected', message: `Schedule conflict with ${conflictWith.code} (${conflictWith.schedule_days} ${fmt12(conflictWith.start_time)}-${fmt12(conflictWith.end_time)}). Assign anyway?`, confirmLabel: 'Save Anyway', variant: 'warning' });
        if (!proceed) return;
      }
    }

    setBusy(true);
    try {
      await client.post(`/teachers/${teacher.id}/teaching-load`, { subject_id: addSubjectId });
      setAddSubjectId('');
      setPreview(null);
      await onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign subject');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (subjectId) => {
    try {
      await client.delete(`/teachers/${teacher.id}/teaching-load/${subjectId}`);
      await onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove subject');
    }
  };

  return (
    <div>
      {showHeader && (
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-black text-slate-800">{teacher.last_name}, {teacher.first_name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {assigned.length} subject{assigned.length !== 1 ? 's' : ''} | {totalUnits} units total
              {teacher.specialization && ` | ${teacher.specialization}`}
            </p>
          </div>
          {conflicts.size > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-red-500">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-xs font-semibold text-red-600">{conflicts.size} schedule conflict{conflicts.size !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Subjects</p>
          {assigned.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No subjects assigned yet
            </div>
          ) : (
            <div>
              {SEMESTERS.map((semester) => {
                const group = assignedBySem[semester.key] || [];
                if (!group.length) return null;
                const semUnits = group.reduce((sum, subject) => sum + (Number(subject.units) || 0), 0);
                return (
                  <div key={semester.key}>
                    <SemHeader semKey={semester.key} count={group.length} units={semUnits} />
                    <div className="mb-3 space-y-2">
                      {group.map((subject) => (
                        <SubjectCard key={subject.id} subject={subject} isConflict={conflicts.has(subject.id)} onRemove={handleRemove} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {assignedBySem.other?.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">No Semester Set</span>
                  </div>
                  <div className="mb-3 space-y-2">
                    {assignedBySem.other.map((subject) => (
                      <SubjectCard key={subject.id} subject={subject} isConflict={conflicts.has(subject.id)} onRemove={handleRemove} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Assign Subject</p>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex gap-1 rounded-xl bg-slate-200 p-1">
              <button
                type="button"
                onClick={() => { setFilterSem(''); setAddSubjectId(''); setPreview(null); }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${!filterSem ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All
              </button>
              {SEMESTERS.map((semester) => (
                <button
                  key={semester.key}
                  type="button"
                  onClick={() => { setFilterSem(semester.key); setAddSubjectId(''); setPreview(null); }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${filterSem === semester.key ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {semester.key === 'summer' ? 'Summer' : `${semester.key} Sem`}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select value={filterCourse} onChange={(event) => { setFilterCourse(event.target.value); setAddSubjectId(''); setPreview(null); }} className="input flex-1 text-xs">
                <option value="">All Courses</option>
                {courses.map((course) => <option key={course} value={course}>{course}</option>)}
              </select>
              <select value={filterYear} onChange={(event) => { setFilterYear(event.target.value); setAddSubjectId(''); setPreview(null); }} className="input w-28 text-xs">
                <option value="">All Years</option>
                {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <select value={addSubjectId} onChange={(event) => handleSelectSubject(event.target.value)} className="input flex-1 text-sm">
                <option value="">- Select subject -</option>
                {filterSem ? (
                  available.map((subject) => {
                    const wouldConflict = assigned.some((item) => hasConflict(item, subject));
                    const sched = subject.schedule_days ? ` [${subject.schedule_days}${subject.start_time ? ` ${fmt12(subject.start_time)}` : ''}]` : '';
                    return (
                      <option key={subject.id} value={subject.id}>
                        {wouldConflict ? '* ' : ''}{subject.code} - {subject.name}{sched}
                      </option>
                    );
                  })
                ) : (
                  SEMESTERS.map((semester) => {
                    const group = availableBySem[semester.key] || [];
                    if (!group.length) return null;
                    return (
                      <optgroup key={semester.key} label={semester.label}>
                        {group.map((subject) => {
                          const wouldConflict = assigned.some((item) => hasConflict(item, subject));
                          const sched = subject.schedule_days ? ` [${subject.schedule_days}${subject.start_time ? ` ${fmt12(subject.start_time)}` : ''}]` : '';
                          return (
                            <option key={subject.id} value={subject.id}>
                              {wouldConflict ? '* ' : ''}{subject.code} - {subject.name}{sched}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })
                )}
              </select>
              <button type="button" className="btn-primary shrink-0 px-4 text-sm" onClick={handleAssign} disabled={!addSubjectId || busy}>
                {busy ? '...' : 'Assign'}
              </button>
            </div>

            {preview && (
              <div className={`space-y-1.5 rounded-lg border px-3 py-2.5 text-xs ${assigned.some((item) => hasConflict(item, preview)) ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{preview.code}</span>
                  <span className="text-slate-500">{preview.name}</span>
                  {preview.semester && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEM_BADGE[preview.semester] || 'bg-slate-100 text-slate-600'}`}>
                      {preview.semester} Sem
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                  {getSubjectCourses(preview).length > 0 && (
                    <span>{preview.is_minor ? `Minor: ${getCourseLabel(preview)}` : getCourseLabel(preview)} | Year {preview.year_level}</span>
                  )}
                  {preview.section_name && <span>Section {preview.section_name}</span>}
                  {preview.schedule_days && (
                    <span className="font-medium text-slate-700">
                      {preview.schedule_days}{preview.start_time ? ` ${fmt12(preview.start_time)}-${fmt12(preview.end_time)}` : ''}
                      {preview.room ? ` | ${preview.room}` : ''}
                    </span>
                  )}
                  <span>{preview.units} units</span>
                </div>

                {assigned.some((item) => hasConflict(item, preview)) && (
                  <p className="font-semibold text-red-600">
                    Schedule conflict with {assigned.find((item) => hasConflict(item, preview))?.code}
                  </p>
                )}
              </div>
            )}

            {available.length === 0 && !addSubjectId && (
              <p className="py-2 text-center text-xs text-slate-400">
                {filterSem
                  ? `No available subjects for ${SEMESTERS.find((item) => item.key === filterSem)?.label} — all may already be assigned`
                  : 'No available subjects — try adjusting filters or all subjects are already assigned'}
              </p>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}

function SubjectTable({ rows, dimmed = false }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          {['Code', 'Subject', 'Course', 'Year', 'Section', 'Day', 'Time', 'Units'].map((header) => (
            <th key={header} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map((subject) => (
          <tr key={subject.id} className="hover:bg-slate-50">
            <td className={`px-4 py-2.5 font-mono text-xs font-semibold ${dimmed ? 'text-slate-400' : 'text-slate-700'}`}>{subject.code}</td>
            <td className={`px-4 py-2.5 font-medium ${dimmed ? 'text-slate-500' : 'text-slate-800'}`}>{subject.name}</td>
            <td className={`px-4 py-2.5 ${dimmed ? 'text-slate-400' : 'text-slate-600'}`}>
              {subject.is_minor ? `Minor: ${getCourseLabel(subject)}` : getCourseLabel(subject)}
            </td>
            <td className={`px-4 py-2.5 ${dimmed ? 'text-slate-400' : 'text-slate-600'}`}>{subject.year_level ? `Year ${subject.year_level}` : '-'}</td>
            <td className={`px-4 py-2.5 ${dimmed ? 'text-slate-400' : 'text-slate-600'}`}>{subject.section_name || '-'}</td>
            <td className={`px-4 py-2.5 text-xs ${dimmed ? 'text-slate-400' : 'text-slate-600'}`}>{subject.schedule_days || '-'}</td>
            <td className={`px-4 py-2.5 text-xs ${dimmed ? 'text-slate-400' : 'text-slate-500'}`}>
              {subject.start_time && subject.end_time ? `${fmt12(subject.start_time)} - ${fmt12(subject.end_time)}` : '-'}
              {subject.room ? ` | ${subject.room}` : ''}
            </td>
            <td className={`px-4 py-2.5 text-center ${dimmed ? 'text-slate-400' : 'text-slate-600'}`}>{subject.units}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SemSection({ semKey, rows, dimmed }) {
  const semester = SEMESTERS.find((item) => item.key === semKey);
  const semUnits = rows.reduce((sum, subject) => sum + (Number(subject.units) || 0), 0);

  return (
    <div>
      <div className={`flex items-center justify-between border-b px-5 py-2 ${semester ? semester.header : 'border-slate-100 bg-slate-50 text-slate-600'}`}>
        <div className="flex items-center gap-2">
          {semester && <div className={`h-2 w-2 rounded-full ${semester.bar}`} />}
          <span className="text-xs font-bold uppercase tracking-wide">
            {semester ? semester.label : 'No Semester Set'}
          </span>
          <span className="text-[10px] opacity-60">{rows.length} subject{rows.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="text-[10px] font-semibold opacity-60">{semUnits} units</span>
      </div>
      <SubjectTable rows={rows} dimmed={dimmed} />
    </div>
  );
}

export default function TeachingLoadPage() {
  const { courses } = useCourses();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [search, setSearch] = useState('');
  const [activeTeacherId, setActiveTeacherId] = useState(null);
  const [version, setVersion] = useState(0);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 500, is_active: true };
      if (filterCourse) params.course = filterCourse;
      if (filterYear) params.year_level = filterYear;
      if (filterSemester) params.semester = filterSemester;
      const response = await client.get('/subjects', { params });
      setSubjects(response.data.data || []);
    } catch {
      toast.error('Failed to load teaching load');
    } finally {
      setLoading(false);
    }
  }, [filterCourse, filterSemester, filterYear]);

  const loadTeachers = useCallback(async () => {
    try {
      const response = await client.get('/teachers', { params: { limit: 200, is_active: true } });
      const nextTeachers = response.data.data || [];
      setTeachers(nextTeachers);
      setActiveTeacherId((current) => (
        current && !nextTeachers.some((teacher) => teacher.id === current) ? null : current
      ));
    } catch {
      toast.error('Failed to load instructors');
    }
  }, []);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  const handleTeacherChanged = useCallback(async () => {
    await Promise.all([loadSubjects(), loadTeachers()]);
    setVersion((v) => v + 1);
  }, [loadSubjects, loadTeachers]);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const query = search.toLowerCase();
    return teachers.filter((teacher) => (
      teacher.first_name?.toLowerCase().includes(query) ||
      teacher.last_name?.toLowerCase().includes(query) ||
      teacher.specialization?.toLowerCase().includes(query)
    ));
  }, [teachers, search]);

  const unassigned = useMemo(
    () => subjects.filter((subject) => !subject.teacher_first_name && !subject.teacher_last_name),
    [subjects]
  );

  const unassignedBySem = useMemo(() => {
    const grouped = {};
    unassigned.forEach((subject) => {
      const key = subject.semester || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(subject);
    });
    return grouped;
  }, [unassigned]);

  return (
    <div className="p-5 lg:p-6">
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Teaching Load</h1>
          <p className="page-subtitle">Click an instructor name to open subjects and manage load.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <div className="card p-4 lg:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Instructor List</p>
                <p className="mt-1 text-sm text-slate-500">Only one instructor opens at a time so the page stays clean.</p>
              </div>
              <input
                type="text"
                className="input w-full lg:max-w-sm"
                placeholder="Search by name or specialization..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="card py-12 text-center text-slate-400">No instructors found.</div>
          ) : (
            <div className="space-y-4">
              {filteredTeachers.map((teacher) => {
                const isOpen = activeTeacherId === teacher.id;
                const assignedSubjects = teacher.assigned_subjects || [];
                const totalUnits = assignedSubjects.reduce((sum, subject) => sum + (Number(subject.units) || 0), 0);

                return (
                  <div key={teacher.id} className="card overflow-hidden p-0">
                    <button
                      type="button"
                      onClick={() => setActiveTeacherId((current) => current === teacher.id ? null : teacher.id)}
                      className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${isOpen ? 'bg-[#7a1324]/5' : 'hover:bg-slate-50'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-slate-800">{teacher.last_name}, {teacher.first_name}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {assignedSubjects.length} subject{assignedSubjects.length !== 1 ? 's' : ''}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            {totalUnits} units
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">{teacher.specialization || 'No specialization set'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#7a1324]">{isOpen ? 'Close' : 'Manage Load'}</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-200 px-5 py-5">
                        <TeacherLoadEditor teacher={teacher} onChanged={handleTeacherChanged} showHeader={false} version={version} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-4 lg:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Unassigned Subject Filters</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <select value={filterCourse} onChange={(event) => setFilterCourse(event.target.value)} className="input w-full sm:w-40">
                <option value="">All Courses</option>
                {courses.map((course) => <option key={course} value={course}>{course}</option>)}
              </select>
              <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)} className="input w-full sm:w-36">
                <option value="">All Years</option>
                {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
              </select>
              <select value={filterSemester} onChange={(event) => setFilterSemester(event.target.value)} className="input w-full sm:w-40">
                <option value="">All Semesters</option>
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
                <option value="summer">Summer</option>
              </select>
              <button type="button" onClick={loadSubjects} className="btn-secondary text-sm">Refresh</button>
            </div>
          </div>

          {loading ? (
            <div className="card py-12 text-center text-slate-400">Loading...</div>
          ) : unassigned.length > 0 ? (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
                <p className="font-bold text-amber-800">Unassigned Subjects</p>
                <p className="mt-1 text-xs text-amber-600">
                  {unassigned.length} subject{unassigned.length !== 1 ? 's' : ''} waiting for instructor assignment
                </p>
              </div>
              {SEMESTER_SECTIONS.map((semester) => {
                const rows = unassignedBySem[semester.key];
                if (!rows?.length) return null;
                return <SemSection key={semester.key} semKey={semester.key} rows={rows} dimmed />;
              })}
            </div>
          ) : (
            <div className="card py-12 text-center text-slate-400">All filtered subjects already have instructors assigned.</div>
          )}
        </div>
      </div>
    </div>
  );
}
