import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { useCourses } from '../../hooks/useCourses';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const SEMESTERS = ['1st', '2nd', 'summer'];
const DAYS = ['Mon/Wed', 'Tue/Thu', 'Fri', 'Sat', 'Sun'];

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Full subject form for admin/registrar (no instructor field)
function SubjectForm({ defaultValues, subjects, onSubmit, onCancel, courses }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      ...defaultValues,
      is_minor: defaultValues?.is_minor ? true : false,
    },
  });

  const [minorCourses, setMinorCourses] = useState(defaultValues?.minor_courses || []);
  const isMinor = !!watch('is_minor');

  const toggleMinorCourse = (course) => {
    setMinorCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  };

  const handleSubmitWrapped = (data) => {
    onSubmit({ ...data, minor_courses: isMinor ? minorCourses : [] });
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitWrapped)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Subject Code *</label>
          <input {...register('code', { required: true })} className="input" placeholder="e.g. IT101" />
          {errors.code && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
        <div>
          <label className="label">Units *</label>
          <input {...register('units', { required: true, valueAsNumber: true })} type="number" min="1" max="6" className="input" />
          {errors.units && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
      </div>

      <div>
        <label className="label">Subject Name *</label>
        <input {...register('name', { required: true })} className="input" />
        {errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}
      </div>

      {/* Subject Type */}
      <div className="flex items-center gap-6 py-1">
        <span className="label mb-0">Subject Type *</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={!isMinor} onChange={() => setValue('is_minor', false)} />
          <span className="text-sm font-medium text-slate-700">Major</span>
          <span className="text-xs text-slate-400">(one course)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={isMinor} onChange={() => setValue('is_minor', true)} />
          <span className="text-sm font-medium text-slate-700">Minor</span>
          <span className="text-xs text-slate-400">(multiple courses)</span>
        </label>
      </div>

      {/* Course assignment */}
      {!isMinor ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Course *</label>
            <select {...register('course', { required: !isMinor })} className="input">
              <option value="">Select course</option>
              {courses.map((course) => <option key={course} value={course}>{course}</option>)}
            </select>
            {errors.course && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="label">Year Level *</label>
            <select {...register('year_level', { required: true, valueAsNumber: true })} className="input">
              <option value="">Select year</option>
              {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Semester *</label>
            <select {...register('semester', { required: true })} className="input">
              <option value="">Select semester</option>
              {SEMESTERS.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <label className="label mb-0">Courses (select all that apply) *</label>
                {minorCourses.length === 0 && <p className="text-amber-600 text-xs mt-0.5">Select at least one course</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMinorCourses([...courses])}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-[#7a1324] hover:text-[#7a1324]"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setMinorCourses([])}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-red-300 hover:text-red-500"
                >
                  Unselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {courses.map((course) => (
                <label key={course} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={minorCourses.includes(course)}
                    onChange={() => toggleMinorCourse(course)}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-700">{course}</span>
                </label>
              ))}
            </div>
            {minorCourses.length > 0 && (
              <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                {minorCourses.length} of {courses.length} course{courses.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Year Level *</label>
              <select {...register('year_level', { required: true, valueAsNumber: true })} className="input">
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Semester *</label>
              <select {...register('semester', { required: true })} className="input">
                <option value="">Select semester</option>
                {SEMESTERS.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      <div>
        <label className="label">Prerequisite</label>
        <select {...register('prerequisite_subject_id')} className="input">
          <option value="">None</option>
          {subjects
            .filter((subject) => subject.id !== defaultValues?.id)
            .map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="label">Section</label>
          <input {...register('section_name')} className="input" placeholder="e.g. 1A" />
        </div>
        <div>
          <label className="label">Days</label>
          <select {...register('schedule_days')} className="input">
            <option value="">Select days</option>
            {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Start Time</label>
          <input {...register('start_time')} type="time" className="input" />
        </div>
        <div>
          <label className="label">End Time</label>
          <input {...register('end_time')} type="time" className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Room</label>
          <input {...register('room')} className="input" placeholder="e.g. LAB-IT" />
        </div>
        <label className="flex items-center gap-2 pt-8">
          <input type="checkbox" {...register('is_open')} />
          <span className="text-sm text-slate-700">Open for enrollment</span>
        </label>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea {...register('description')} className="input" rows={2} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Subject'}
        </button>
      </div>
    </form>
  );
}

// Instructor assignment form for dean/admin
function AssignInstructorForm({ defaultValues, teachers, onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { teacher_id: defaultValues?.teacher_id || '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold">{defaultValues?.code} – {defaultValues?.name}</p>
        <p className="text-xs text-slate-500 mt-1">
          {defaultValues?.course} · Year {defaultValues?.year_level} · {defaultValues?.semester} Semester
        </p>
      </div>

      <div>
        <label className="label">Assign Instructor</label>
        <select {...register('teacher_id')} className="input">
          <option value="">— Unassigned —</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.last_name}, {teacher.first_name}
              {teacher.specialization ? ` • ${teacher.specialization}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Assign Instructor'}
        </button>
      </div>
    </form>
  );
}

export default function SubjectsPage() {
  const { confirm, confirmProps } = useConfirm();
  const { courses } = useCourses();
  const role = useSelector((state) => state.auth.user?.role);
  const canCreate = role === 'admin' || role === 'registrar';
  const canEditSchedule = role === 'admin' || role === 'registrar';
  const canAssignInstructor = role === 'admin';
  const canDelete = role === 'admin';
  const isTeacher = role === 'teacher';

  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, subject: null });
  const [assignModal, setAssignModal] = useState({ open: false, subject: null });
  const [teacherWorkload, setTeacherWorkload] = useState(null);
  const [filters, setFilters] = useState({ search: '', course: '', semester: '', yearLevel: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const res = await client.get('/teachers/me/workload');
        setTeacherWorkload(res.data);
        setSubjects(res.data.assigned_subjects || []);
        setTeachers([]);
      } else {
        const [subjectsRes, teachersRes] = await Promise.all([
          client.get('/subjects', {
            params: {
              limit: 200,
              search: filters.search || undefined,
              course: filters.course || undefined,
              semester: filters.semester || undefined,
              year_level: filters.yearLevel || undefined,
            },
          }),
          client.get('/teachers', { params: { limit: 200 } }),
        ]);
        setSubjects(subjectsRes.data.data);
        setTeachers(teachersRes.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [filters.course, filters.search, filters.semester, filters.yearLevel, isTeacher]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    try {
      const isMinor = !!data.is_minor;
      const payload = {
        ...data,
        units: Number(data.units || 3),
        year_level: data.year_level ? Number(data.year_level) : null,
        prerequisite_subject_id: data.prerequisite_subject_id || null,
        section_name: data.section_name || null,
        schedule_days: data.schedule_days || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        room: data.room || null,
        is_open: !!data.is_open,
        is_minor: isMinor ? 1 : 0,
        course: isMinor ? null : (data.course || null),
        minor_courses: isMinor ? (data.minor_courses || []) : [],
      };

      if (modal.subject?.id) {
        await client.patch(`/subjects/${modal.subject.id}`, payload);
        toast.success('Subject updated');
      } else {
        await client.post('/subjects', payload);
        toast.success('Subject created');
      }
      setModal({ open: false, subject: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleAssignInstructor = async (data) => {
    try {
      await client.patch(`/subjects/${assignModal.subject.id}`, {
        teacher_id: data.teacher_id || null,
      });
      toast.success('Instructor assigned');
      setAssignModal({ open: false, subject: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assignment failed');
    }
  };

  const handleDelete = async (subject) => {
    if (!await confirm({ title: `Delete "${subject.code}"?`, message: `${subject.name} — This cannot be undone.`, confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await client.delete(`/subjects/${subject.id}`);
      toast.success('Subject deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggle = async (subject) => {
    try {
      await client.patch(`/subjects/${subject.id}`, {
        is_active: !subject.is_active,
        is_open: !subject.is_active ? false : subject.is_open,
      });
      toast.success(subject.is_active ? 'Subject deactivated' : 'Subject activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Subject Offerings</h1>
          <p className="text-sm text-slate-500">
            {isTeacher
              ? 'Your assigned subjects and schedules.'
              : role === 'dean'
                ? 'View subject offerings. To assign instructors, go to Instructors → Teaching Load.'
                : canCreate
                  ? 'Manage subject offerings, sections, and schedules.'
                  : 'View subject offerings.'}
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setModal({ open: true, subject: { is_open: true, section_name: '1A' } })}>
            + Add Subject
          </button>
        )}
      </div>

      {!isTeacher && (
        <div className="card mb-5 grid grid-cols-4 gap-3">
          <input
            type="text"
            className="input"
            placeholder="Search code, name, course"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <select
            className="input"
            value={filters.course}
            onChange={(event) => setFilters((current) => ({ ...current, course: event.target.value }))}
          >
            <option value="">All courses</option>
            {courses.map((course) => <option key={course} value={course}>{course}</option>)}
          </select>
          <select
            className="input"
            value={filters.yearLevel}
            onChange={(event) => setFilters((current) => ({ ...current, yearLevel: event.target.value }))}
          >
            <option value="">All year levels</option>
            {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select
            className="input"
            value={filters.semester}
            onChange={(event) => setFilters((current) => ({ ...current, semester: event.target.value }))}
          >
            <option value="">All semesters</option>
            {SEMESTERS.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
          </select>
        </div>
      )}

      {isTeacher && (
        <div className="card mb-5">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Assigned Subjects: {teacherWorkload?.assigned_subject_count || 0}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Draft Grades: {teacherWorkload?.draft_grades || 0}
            </span>
            {teacherWorkload?.specialization && (
              <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 font-medium text-cyan-700">
                Specialization: {teacherWorkload.specialization}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Code / Name', 'Curriculum', 'Prerequisite', 'Day', 'Time', 'Instructor', 'Status', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-medium text-gray-600">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No subjects found</td></tr>
            ) : subjects.map((subject) => (
              <tr key={subject.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{subject.code}</div>
                  <div className="text-xs text-gray-500">{subject.name}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    {subject.is_minor ? (
                      <>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">Minor</span>
                        <span className="text-xs text-gray-500">{subject.minor_courses?.join(', ') || '—'}</span>
                      </>
                    ) : (
                      <span>{subject.course || '-'}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Year {subject.year_level || '-'} • {subject.semester || '-'} • {subject.units} units
                  </div>
                  <div className="text-xs text-gray-500">{subject.section_name || '-'} • {subject.room || 'TBA'}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {subject.prerequisite_code ? `${subject.prerequisite_code} - ${subject.prerequisite_name}` : 'None'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">
                  {subject.schedule_days || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">
                  {subject.start_time && subject.end_time
                    ? `${fmt12(subject.start_time)} – ${fmt12(subject.end_time)}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {subject.teacher_last_name
                    ? `${subject.teacher_last_name}, ${subject.teacher_first_name}`
                    : 'Dean to assign'}
                  {subject.teacher_specialization && (
                    <div className="text-xs text-cyan-700">{subject.teacher_specialization}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <Badge variant={subject.is_active ? 'success' : 'gray'}>
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={subject.is_open ? 'info' : 'warning'}>
                      {subject.is_open ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    {canEditSchedule && (
                      <button className="text-primary-600 hover:underline text-xs text-left" onClick={() => setModal({ open: true, subject })}>
                        Edit Schedule
                      </button>
                    )}
                    {canAssignInstructor && (
                      <button className="text-blue-600 hover:underline text-xs text-left" onClick={() => setAssignModal({ open: true, subject })}>
                        Assign Instructor
                      </button>
                    )}
                    {canEditSchedule && (
                      <button
                        className={`text-xs hover:underline text-left ${subject.is_active ? 'text-red-500' : 'text-green-600'}`}
                        onClick={() => handleToggle(subject)}
                      >
                        {subject.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="text-red-500 hover:text-red-700 text-xs text-left"
                        onClick={() => handleDelete(subject)}
                      >
                        Delete
                      </button>
                    )}
                    {!canEditSchedule && !canAssignInstructor && !canDelete && (
                      <span className="text-xs text-slate-400">View only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, subject: null })}
        title={modal.subject?.id ? 'Edit Subject Offering' : 'Add Subject Offering'}
        size="xl"
      >
        <SubjectForm
          defaultValues={modal.subject}
          subjects={subjects}
          courses={courses}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, subject: null })}
        />
      </Modal>

      <Modal
        isOpen={assignModal.open}
        onClose={() => setAssignModal({ open: false, subject: null })}
        title="Assign Instructor"
        size="md"
      >
        <AssignInstructorForm
          defaultValues={assignModal.subject}
          teachers={teachers}
          onSubmit={handleAssignInstructor}
          onCancel={() => setAssignModal({ open: false, subject: null })}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
