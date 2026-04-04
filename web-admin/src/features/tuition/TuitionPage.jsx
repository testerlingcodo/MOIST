import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

import { useCourses } from '../../hooks/useCourses';
const SEM_LABEL = { '1st': '1st Semester', '2nd': '2nd Semester', 'summer': 'Summer' };

function TuitionForm({ defaultValues, onSubmit, onCancel }) {
  const { schoolYear, semester, label, loading: termLoading } = useActiveTerm();
  const { courses, courseObjects } = useCourses();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues });

  useEffect(() => {
    if (!defaultValues?.school_year && schoolYear) setValue('school_year', schoolYear);
    if (!defaultValues?.semester && semester) setValue('semester', semester);
  }, [schoolYear, semester, defaultValues, setValue]);

  const selectedCourse = watch('course');
  const courseObj = courseObjects.find(c => c.code === selectedCourse);
  const availableYears = courseObj?.year_levels_offered?.length
    ? courseObj.year_levels_offered
    : selectedCourse ? [1, 2, 3, 4] : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!defaultValues?.school_year && (
        <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${schoolYear ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <span className={`text-xs font-semibold ${schoolYear ? 'text-green-700' : 'text-amber-700'}`}>Active Term:</span>
          <span className={`text-sm ${schoolYear ? 'text-green-900' : 'text-amber-800'}`}>
            {termLoading ? 'Loading...' : schoolYear ? (label || `${schoolYear} — ${semester} Semester`) : 'No active term set'}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">School Year *</label>
          <input {...register('school_year', { required: true })} className="input" placeholder="2025-2026" />
          {errors.school_year && <span className="text-red-500 text-xs">Required</span>}
        </div>
        <div>
          <label className="label">Semester *</label>
          <select {...register('semester', { required: true })} className="input">
            <option value="">Select</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
            <option value="summer">Summer</option>
          </select>
          {errors.semester && <span className="text-red-500 text-xs">Required</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Course</label>
          <select {...register('course')} className="input">
            <option value="">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year Level</label>
          <select {...register('year_level', { setValueAs: v => v === '' ? null : Number(v) })} className="input">
            <option value="">All Years</option>
            {selectedCourse
              ? availableYears.map(y => <option key={y} value={y}>Year {y}</option>)
              : [1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)
            }
          </select>
          {selectedCourse && courseObj && (
            <p className="text-xs text-slate-400 mt-1">
              {courseObj.code} offers Year {courseObj.year_levels_offered?.join(', ')}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Per Unit Fee *</label>
          <input {...register('per_unit_fee', { required: true, setValueAs: v => v === '' ? '' : parseFloat(v) })} type="number" step="0.01" className="input" placeholder="0.00" />
          {errors.per_unit_fee && <span className="text-red-500 text-xs">Required</span>}
        </div>
        <div>
          <label className="label">Misc Fee *</label>
          <input {...register('misc_fee', { required: true, setValueAs: v => v === '' ? '' : parseFloat(v) })} type="number" step="0.01" className="input" placeholder="0.00" defaultValue={0} />
          {errors.misc_fee && <span className="text-red-500 text-xs">Required</span>}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/** Build: { 'SY||sem': { school_year, semester, byCourse: { 'BSIT': { 1: record, 2: record, ... } } } } */
function buildMatrix(records) {
  const termMap = {};
  for (const r of records) {
    const termKey = `${r.school_year}||${r.semester}`;
    if (!termMap[termKey]) termMap[termKey] = { school_year: r.school_year, semester: r.semester, byCourse: {} };
    const course = r.course || '__ALL__';
    if (!termMap[termKey].byCourse[course]) termMap[termKey].byCourse[course] = {};
    const year = r.year_level || 0;
    termMap[termKey].byCourse[course][year] = r;
  }
  return Object.values(termMap).sort((a, b) => {
    if (b.school_year !== a.school_year) return b.school_year.localeCompare(a.school_year);
    const order = { '1st': 0, '2nd': 1, 'summer': 2 };
    return (order[a.semester] ?? 3) - (order[b.semester] ?? 3);
  });
}

function FeeCell({ record, onEdit, onDelete, canDelete }) {
  if (!record) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  return (
    <div className="group relative">
      <div className="text-xs space-y-0.5">
        <div className="font-medium text-gray-900">{record.per_unit_fee ? formatCurrency(record.per_unit_fee) : '—'}</div>
        <div className="text-gray-400">{formatCurrency(record.misc_fee ?? 0)} misc</div>
      </div>
      <div className="absolute top-0 right-0 hidden group-hover:flex items-center gap-1 bg-white shadow rounded px-1.5 py-0.5 border">
        <button
          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          onClick={() => onEdit(record)}
        >
          Edit
        </button>
        {canDelete && (
          <>
            <span className="text-gray-200">|</span>
            <button
              className="text-xs text-red-500 hover:text-red-700 font-medium"
              onClick={() => onDelete(record)}
            >
              Del
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TuitionPage() {
  const { confirm, confirmProps } = useConfirm();
  const role = useSelector((state) => state.auth.user?.role);
  const canDelete = role === 'admin';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, record: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/tuition?limit=200');
      setRecords(res.data.data);
    } catch { toast.error('Failed to load tuition'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (modal.record) {
        await client.patch(`/tuition/${modal.record.id}`, data);
        toast.success('Tuition updated');
      } else {
        await client.post('/tuition', data);
        toast.success('Tuition created');
      }
      setModal({ open: false, record: null });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
  };

  const handleDelete = async (r) => {
    if (!await confirm({ title: 'Delete Tuition Record', message: `${r.course || 'All Courses'}${r.year_level ? ` Year ${r.year_level}` : ''} — ${r.school_year} ${r.semester}`, confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await client.delete(`/tuition/${r.id}`);
      toast.success('Deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const { courseObjects } = useCourses();
  const getCourseYears = (courseCode) => {
    if (!courseCode || courseCode === '__ALL__') return [1, 2, 3, 4, 5, 6];
    const obj = courseObjects.find(c => c.code === courseCode);
    return obj?.year_levels_offered?.length ? obj.year_levels_offered : [1, 2, 3, 4];
  };

  const terms = buildMatrix(records);

  return (
    <div className="p-8 mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tuition & Fees</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fee schedule per course and year level.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, record: null })}>
          + Add Tuition
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>
      ) : terms.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No tuition records found.</div>
      ) : (
        <div className="space-y-8">
          {terms.map(term => {
            const courseKeys = Object.keys(term.byCourse).sort();
            return (
              <div key={`${term.school_year}||${term.semester}`} className="card p-0 overflow-hidden">
                {/* Term header */}
                <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-3">
                  <span className="font-semibold text-gray-800 text-sm">{term.school_year}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-600 text-sm">{SEM_LABEL[term.semester] || term.semester}</span>
                </div>

                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {courseKeys.map(course => {
                      const yearMap = term.byCourse[course];
                      const years = getCourseYears(course === '__ALL__' ? null : course);
                      return (
                        <tr key={course} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 w-32">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              {course === '__ALL__' ? 'All Courses' : course}
                            </span>
                          </td>
                          {years.map(y => (
                            <td key={y} className="px-4 py-4">
                              <div className="mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Yr {y}</div>
                              <FeeCell
                                record={yearMap[y] || yearMap[0] || null}
                                onEdit={(r) => setModal({ open: true, record: r })}
                                onDelete={handleDelete}
                                canDelete={canDelete}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, record: null })}
        title={modal.record ? 'Edit Tuition Record' : 'Add Tuition Record'}
      >
        <TuitionForm
          defaultValues={modal.record}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, record: null })}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
