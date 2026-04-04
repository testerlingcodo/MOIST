import { useForm } from 'react-hook-form';
import { useCourses } from '../../hooks/useCourses';

export default function StudentForm({ defaultValues, onSubmit, onCancel, isEdit }) {
  const { courses } = useCourses();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaultValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Student Number */}
      <div>
        <label className="label">Student Number</label>
        {isEdit ? (
          <input {...register('student_number')} className="input bg-slate-50 text-slate-500" disabled />
        ) : (
          <div className="input bg-slate-50 text-slate-400 text-sm cursor-not-allowed select-none">
            Auto-generated (e.g. C001, C002…)
          </div>
        )}
      </div>

      {/* Status — edit only */}
      {isEdit && (
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      )}

      {/* Name */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Last Name *</label>
          <input {...register('last_name', { required: true })} className="input" />
          {errors.last_name && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
        <div>
          <label className="label">First Name *</label>
          <input {...register('first_name', { required: true })} className="input" />
          {errors.first_name && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
        <div>
          <label className="label">Middle Name</label>
          <input {...register('middle_name')} className="input" />
        </div>
      </div>

      {/* Gender & Birthdate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Gender</label>
          <select {...register('gender')} className="input">
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Birthdate</label>
          <input {...register('birthdate')} type="date" className="input" />
        </div>
      </div>

      {/* Course & Year Level */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Course *</label>
          <select {...register('course', { required: true })} className="input">
            <option value="">Select course</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.course && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
        <div>
          <label className="label">Year Level *</label>
          <select {...register('year_level', { required: true, valueAsNumber: true })} className="input">
            <option value="">Select year</option>
            {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
          {errors.year_level && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
      </div>

      {/* Contact & Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contact Number</label>
          <input {...register('contact_number')} className="input" placeholder="09xxxxxxxxx" />
        </div>
        <div>
          <label className="label">
            Email{' '}
            <span className="text-slate-400 font-normal text-xs">(optional — for password reset)</span>
          </label>
          <input {...register('email')} type="email" className="input" placeholder="student@email.com" />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="label">Address</label>
        <textarea {...register('address')} className="input" rows={2} />
      </div>

      {/* Portal password — create only */}
      {!isEdit && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
          <p className="text-sm font-semibold text-blue-700 mb-3">Portal Account</p>
          <div>
            <label className="label">Password</label>
            <input
              {...register('password')}
              type="password"
              className="input"
              placeholder="Min. 8 characters (leave blank to skip)"
            />
            <p className="text-xs text-slate-400 mt-1">
              If set, the student can log in using their Student ID and this password.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Student'}
        </button>
      </div>
    </form>
  );
}
