import { useForm } from 'react-hook-form';
import { useCourses } from '../../hooks/useCourses';

const STRANDS = ['STEM','ABM','HUMSS','GAS','TVL','SPORTS','ARTS & DESIGN'];
const CIVIL_STATUSES = ['single','married','widowed','separated','annulled'];
const ENROLLMENT_TYPES = ['new','old','transferee','returnee'];
const EMPLOYMENT_STATUSES = ['not_employed','employed','self_employed'];
const SEMESTERS = ['1st Sem','2nd Sem','Summer'];

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[color:var(--brand-maroon)] border-b pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children, error }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">Required</p>}
    </div>
  );
}

export default function StudentForm({ defaultValues, onSubmit, onCancel, isEdit }) {
  const { courses } = useCourses();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaultValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

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

      {/* ── PERSONAL INFORMATION ── */}
      <Section title="Personal Information">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Last Name" required error={errors.last_name}>
            <input {...register('last_name', { required: true })} className="input" />
          </Field>
          <Field label="First Name" required error={errors.first_name}>
            <input {...register('first_name', { required: true })} className="input" />
          </Field>
          <Field label="Middle Name">
            <input {...register('middle_name')} className="input" placeholder="If none, leave blank" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Name Extension">
            <input {...register('name_extension')} className="input" placeholder="Jr., Sr., II, III — if none, leave blank" />
          </Field>
          <Field label="Civil Status">
            <select {...register('civil_status')} className="input">
              <option value="">Select</option>
              {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sex">
            <select {...register('gender')} className="input">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Birthdate">
            <input {...register('birthdate')} type="date" className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Course" required error={errors.course}>
            <select {...register('course', { required: true })} className="input">
              <option value="">Select course</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Year Level">
            <select {...register('year_level', { valueAsNumber: true })} className="input">
              <option value="">Select year</option>
              {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Enrollment Type">
          <select {...register('enrollment_type')} className="input">
            <option value="">Select</option>
            {ENROLLMENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Number">
            <input {...register('contact_number')} className="input" placeholder="09xxxxxxxxx" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <input {...register('email', { required: true })} type="email" className="input" />
          </Field>
        </div>

        <Field label="Birthplace">
          <input {...register('birthplace')} className="input" placeholder="Street, Barangay, Municipality, Province" />
        </Field>

        <Field label="Permanent Address">
          <textarea {...register('address')} className="input" rows={2} placeholder="Street, Barangay, Municipality, Province" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Religion">
            <input {...register('religion')} className="input" placeholder="Please specify" />
          </Field>
          <Field label="Solo Parent?">
            <select {...register('is_solo_parent')} className="input">
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mother's Name">
            <input {...register('mother_name')} className="input" />
          </Field>
          <Field label="Father's Name">
            <input {...register('father_name')} className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Parent / Guardian Name">
            <input {...register('guardian_name')} className="input" />
          </Field>
          <Field label="Guardian Contact">
            <input {...register('guardian_contact')} className="input" placeholder="09xxxxxxxxx" />
          </Field>
        </div>
      </Section>

      {/* ── EDUCATIONAL BACKGROUND ── */}
      <Section title="Educational Background">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Elementary School">
            <input {...register('elementary_school')} className="input" placeholder="e.g. Balingasag Elementary School" />
          </Field>
          <Field label="Year Graduated">
            <input {...register('elementary_year')} className="input" placeholder="e.g. 2008" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Junior High School">
            <input {...register('junior_high_school')} className="input" placeholder="e.g. MOIST, Inc." />
          </Field>
          <Field label="Year Graduated">
            <input {...register('junior_high_year')} className="input" placeholder="e.g. 2012" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Senior High School">
            <input {...register('senior_high_school')} className="input" placeholder="e.g. Balingasag Senior High" />
          </Field>
          <Field label="Strand">
            <select {...register('strand')} className="input">
              <option value="">Select strand</option>
              {STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Year Graduated">
            <input {...register('senior_high_year')} className="input" placeholder="e.g. 2020" />
          </Field>
        </div>

        <Field label="School Last Attended (Senior High or College)">
          <input {...register('school_last_attended')} className="input" placeholder="e.g. Balingasag Senior High School" />
        </Field>

        <Field label="School Last Attended — Complete Address">
          <input {...register('school_last_attended_address')} className="input" placeholder="Complete address of the school" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Course / Section Last Attended">
            <input {...register('course_section_last_attended')} className="input" placeholder="e.g. BSIT-I / Grade 12-Gumamela" />
          </Field>
          <Field label="Year Last Attended">
            <input {...register('year_last_attended')} className="input" placeholder="e.g. 2024" />
          </Field>
        </div>
      </Section>

      {/* ── ADDITIONAL INFORMATION ── */}
      <Section title="Additional Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="School Year">
            <input {...register('school_year')} className="input" placeholder="e.g. 2026-2027" />
          </Field>
          <Field label="Semester">
            <select {...register('semester')} className="input">
              <option value="">Select</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type of Disability (PWD only)">
            <input {...register('disability_type')} className="input" placeholder="N/A" />
          </Field>
          <Field label="Cause of Disability (PWD only)">
            <input {...register('disability_cause')} className="input" placeholder="N/A" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Employment Status">
            <select {...register('employment_status')} className="input">
              <option value="not_employed">Not Employed</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-Employed</option>
            </select>
          </Field>
          <Field label="Name of Company">
            <input {...register('company_name')} className="input" placeholder="If not employed, input N/A" />
          </Field>
          <Field label="Company Location">
            <input {...register('company_location')} className="input" placeholder="If not employed, input N/A" />
          </Field>
        </div>

        <Field label="ALS Graduate? (If YES, input School Name; else input N/A)">
          <input {...register('als_info')} className="input" placeholder="N/A" />
        </Field>

        <Field label="Member of Indigenous People? (If YES, input Tribe Name; else input N/A)">
          <input {...register('ip_info')} className="input" placeholder="N/A" />
        </Field>
      </Section>

      {/* ── PORTAL ACCOUNT — create only ── */}
      {!isEdit && (
        <Section title="Portal Account">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
            <Field label="Password">
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="Min. 8 characters (leave blank to skip)"
              />
              <p className="text-xs text-slate-400 mt-1">
                If set, the student can log in using their Student ID and this password.
              </p>
            </Field>
          </div>
        </Section>
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
