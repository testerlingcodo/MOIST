import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import { useForm, Controller } from 'react-hook-form';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const ALL_YEARS = [1, 2, 3, 4, 5, 6];

function YearLevelCheckboxes({ value = [], onChange }) {
  const toggle = (y) => {
    const next = value.includes(y) ? value.filter((x) => x !== y) : [...value, y].sort();
    onChange(next);
  };
  return (
    <div className="flex gap-3">
      {ALL_YEARS.map((y) => {
        const checked = value.includes(y);
        return (
          <button
            key={y}
            type="button"
            onClick={() => toggle(y)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all ${
              checked
                ? 'border-[#7a1324] bg-[#7a1324] text-white'
                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
            }`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}

function CourseForm({ defaultValues, onSubmit, onCancel }) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      code: defaultValues?.code || '',
      name: defaultValues?.name || '',
      year_levels_offered: defaultValues?.year_levels_offered?.length
        ? defaultValues.year_levels_offered
        : [1, 2, 3, 4, 5, 6],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Course Code *</label>
        <input
          {...register('code', { required: 'Course code is required' })}
          className="input uppercase"
          placeholder="e.g. BSIT"
          style={{ textTransform: 'uppercase' }}
        />
        {errors.code && <span className="text-red-500 text-xs">{errors.code.message}</span>}
      </div>
      <div>
        <label className="label">Course Name</label>
        <input
          {...register('name')}
          className="input"
          placeholder="e.g. Bachelor of Science in Information Technology"
        />
      </div>
      <div>
        <label className="label">Year Levels Offered</label>
        <p className="mb-2 text-xs text-slate-400">Select which year levels are currently accepting students.</p>
        <Controller
          name="year_levels_offered"
          control={control}
          rules={{ validate: (v) => v?.length > 0 || 'Select at least one year level' }}
          render={({ field }) => (
            <YearLevelCheckboxes value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.year_levels_offered && (
          <span className="mt-1 block text-xs text-red-500">{errors.year_levels_offered.message}</span>
        )}
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

function YearBadges({ years = [] }) {
  if (!years.length) return <span className="text-xs text-slate-400">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ALL_YEARS.map((y) => (
        <span
          key={y}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${
            years.includes(y)
              ? 'bg-[#7a1324]/10 text-[#7a1324]'
              : 'bg-slate-100 text-slate-300'
          }`}
        >
          {y}
        </span>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  const { confirm, confirmProps } = useConfirm();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, record: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/courses');
      setCourses(res.data);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (modal.record) {
        await client.patch(`/courses/${modal.record.id}`, data);
        toast.success('Course updated');
      } else {
        await client.post('/courses', data);
        toast.success('Course added');
      }
      setModal({ open: false, record: null });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
  };

  const toggleActive = async (course) => {
    try {
      await client.patch(`/courses/${course.id}`, { is_active: !course.is_active });
      toast.success(course.is_active ? 'Course deactivated' : 'Course activated');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (course) => {
    if (!await confirm({ title: `Delete "${course.code}"?`, message: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await client.delete(`/courses/${course.id}`);
      toast.success('Course deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const active = courses.filter((c) => c.is_active);
  const inactive = courses.filter((c) => !c.is_active);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Course Offerings</h1>
          <p className="page-subtitle">Set which courses are active and which year levels are currently accepting students.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, record: null })}>
          + Add Course
        </button>
      </div>

      {loading ? (
        <div className="card py-20 text-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Active courses */}
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3">
              <span className="text-sm font-semibold text-slate-800">Active Courses</span>
              <span className="text-xs text-slate-400">{active.length} course{active.length !== 1 ? 's' : ''}</span>
            </div>
            {active.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No active courses.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Code</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Name</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Year Levels Offered</th>
                    <th className="px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {active.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{c.name || <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-3">
                        <YearBadges years={c.year_levels_offered || []} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            className="text-xs font-medium text-[#7a1324] hover:text-[#5f0f1c]"
                            onClick={() => setModal({ open: true, record: c })}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs font-medium text-amber-600 hover:text-amber-800"
                            onClick={() => toggleActive(c)}
                          >
                            Deactivate
                          </button>
                          <button
                            className="text-xs font-medium text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(c)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Inactive courses */}
          {inactive.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3">
                <span className="text-sm font-semibold text-slate-500">Inactive Courses</span>
                <span className="text-xs text-slate-400">{inactive.length} course{inactive.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  {inactive.map((c) => (
                    <tr key={c.id} className="opacity-60 transition-colors hover:bg-slate-50">
                      <td className="w-32 px-5 py-3">
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{c.name || '—'}</td>
                      <td className="px-5 py-3">
                        <YearBadges years={c.year_levels_offered || []} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          className="text-xs font-medium text-green-600 hover:text-green-800"
                          onClick={() => toggleActive(c)}
                        >
                          Activate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, record: null })}
        title={modal.record ? 'Edit Course' : 'Add Course'}
      >
        <CourseForm
          defaultValues={modal.record}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, record: null })}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
