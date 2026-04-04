import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';

const STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'SPORTS', 'ARTS & DESIGN'];
const CIVIL_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'annulled', label: 'Annulled' },
];
const ENROLLMENT_TYPES = [
  { value: 'new', label: 'New Student' },
  { value: 'old', label: 'Old Student' },
  { value: 'transferee', label: 'Transferee' },
  { value: 'returnee', label: 'Returnee' },
];
const SEMESTERS = ['1st Sem', '2nd Sem', 'Summer'];

function Section({ title, children }) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="section-title">{title}</h2>
      {children}
    </div>
  );
}

function Row({ cols = 2, children }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-3`}>
      {children}
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error.message || 'This field is required'}</p>}
    </div>
  );
}

export default function RegisterPage({ onSuccess }) {
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const currentSY = (() => {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  })();

  useEffect(() => {
    axios.get('/api/courses')
      .then(r => setCourses(r.data.filter(c => c.is_active)))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      civil_status: 'single',
      disability_type: 'N/A',
      disability_cause: 'N/A',
      school_year: currentSY,
      semester: '1st Sem',
      employment_status: 'not_employed',
      company_name: 'N/A',
      company_location: 'N/A',
      als_info: 'N/A',
      ip_info: 'N/A',
      is_solo_parent: false,
    },
  });

  const employmentStatus = watch('employment_status');

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        is_solo_parent: data.is_solo_parent === 'true' || data.is_solo_parent === true,
      };
      const res = await axios.post('/api/auth/register', payload);
      onSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6 text-center">
        <div
          className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl text-white mb-4"
          style={{ background: 'linear-gradient(135deg,#5a0d1a,#7a1324,#a01830)' }}
        >
          <div>
            <div className="font-black text-lg tracking-widest" style={{ color: '#ffd700' }}>MOIST, INC.</div>
            <div className="text-xs text-white/75">Student Information Portal</div>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Student Registration Form</h1>
        <p className="text-sm text-slate-500 mt-1">Fill out all required fields marked with <span className="text-red-500">*</span></p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-5">

        {/* ── PERSONAL INFORMATION ── */}
        <Section title="Personal Information">
          <Row cols={3}>
            <Field label="Last Name" required error={errors.last_name}>
              <input {...register('last_name', { required: true })} className="input" />
            </Field>
            <Field label="First Name" required error={errors.first_name}>
              <input {...register('first_name', { required: true })} className="input" />
            </Field>
            <Field label="Middle Name" hint="If none, leave it blank">
              <input {...register('middle_name')} className="input" />
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="Name Extension" hint="If none, leave it blank">
              <input {...register('name_extension')} className="input" placeholder="Jr., Sr., II, III" />
            </Field>
            <Field label="Civil Status">
              <select {...register('civil_status')} className="input">
                {CIVIL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="Course" required error={errors.course}>
              <select {...register('course', { required: true })} className="input">
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.code}>{c.code}{c.name ? ` – ${c.name}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Major / Specialization" hint="Leave blank if not applicable">
              <input {...register('major')} className="input" placeholder="e.g. Database Management" />
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="Contact Number">
              <input {...register('contact_number')} className="input" placeholder="09" />
            </Field>
            <Field label="Sex">
              <select {...register('gender')} className="input">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="Birthdate">
              <input {...register('birthdate')} type="date" className="input" />
            </Field>
            <Field label="Enrollment Status">
              <select {...register('enrollment_type')} className="input">
                <option value="">Select</option>
                {ENROLLMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Permanent Address">
            <input {...register('address')} className="input" placeholder="Street, Barangay, Municipality, Province" />
          </Field>

          <Field label="Birthplace">
            <input {...register('birthplace')} className="input" placeholder="Street, Barangay, Municipality, Province" />
          </Field>

          <Field label="Email Address" required error={errors.email}>
            <input
              {...register('email', {
                required: true,
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
              type="email"
              className="input"
              placeholder="@gmail.com / @yahoo.com"
            />
          </Field>

          <Row cols={2}>
            <Field label="Mother's Name">
              <input {...register('mother_name')} className="input" />
            </Field>
            <Field label="Father's Name">
              <input {...register('father_name')} className="input" />
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="Parent / Guardian Name">
              <input {...register('guardian_name')} className="input" />
            </Field>
            <Field label="Guardian Contact">
              <input {...register('guardian_contact')} className="input" placeholder="09" />
            </Field>
          </Row>
        </Section>

        {/* ── EDUCATIONAL BACKGROUND ── */}
        <Section title="Educational Background">
          <Row cols={2}>
            <Field label="Elementary School">
              <input {...register('elementary_school')} className="input" placeholder="Ex: Balingasag Elementary School" />
            </Field>
            <Field label="Year Graduated">
              <input {...register('elementary_year')} className="input" placeholder="Ex: 2008" />
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="Junior High School">
              <input {...register('junior_high_school')} className="input" placeholder="Ex: MOIST, Inc." />
            </Field>
            <Field label="Year Graduated">
              <input {...register('junior_high_year')} className="input" placeholder="Ex: 2012" />
            </Field>
          </Row>

          <Row cols={3}>
            <Field label="Senior High School">
              <input {...register('senior_high_school')} className="input" placeholder="Ex: Balingasag SHS" />
            </Field>
            <Field label="Strand">
              <select {...register('strand')} className="input">
                <option value="">Select Strand</option>
                {STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Year Graduated">
              <input {...register('senior_high_year')} className="input" placeholder="Ex: 2020" />
            </Field>
          </Row>

          <Field label="School Last Attended *Senior High or College">
            <input {...register('school_last_attended')} className="input" placeholder="Ex: Balingasag Senior High School" />
          </Field>

          <Field label="School Last Attended Address">
            <input {...register('school_last_attended_address')} className="input" placeholder="Complete Address of the School" />
          </Field>

          <Row cols={2}>
            <Field label="Course / Section Last Attended">
              <input {...register('course_section_last_attended')} className="input" placeholder="Ex: BSIT-I / Grade 12-Gumamela" />
            </Field>
            <Field label="Year Last Attended">
              <input {...register('year_last_attended')} className="input" placeholder="Ex: 2024" />
            </Field>
          </Row>
        </Section>

        {/* ── ADDITIONAL INFORMATION ── */}
        <Section title="Additional Information">
          <Row cols={2}>
            <Field label="Type of Disability (for PWD Only)">
              <input {...register('disability_type')} className="input" />
            </Field>
            <Field label="Causes of Disability (for PWD Only)">
              <input {...register('disability_cause')} className="input" />
            </Field>
          </Row>

          <Row cols={2}>
            <Field label="School Year">
              <input {...register('school_year')} className="input" placeholder="e.g. 2026-2027" />
            </Field>
            <Field label="Semester">
              <select {...register('semester')} className="input">
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Currently Employed?">
            <select {...register('employment_status')} className="input">
              <option value="not_employed">Not Employed</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-Employed</option>
            </select>
          </Field>

          {employmentStatus !== 'not_employed' && (
            <Row cols={2}>
              <Field label="Name of Company">
                <input {...register('company_name')} className="input" />
              </Field>
              <Field label="Company Location">
                <input {...register('company_location')} className="input" />
              </Field>
            </Row>
          )}

          <Field label="Religion">
            <input {...register('religion')} className="input" placeholder="Please specify" />
          </Field>

          <Field label="Date Registered">
            <input value={today} disabled className="input bg-slate-50 text-slate-500" readOnly />
          </Field>

          <Field label="Are you a graduate of Alternative Learning System (ALS)?">
            <input {...register('als_info')} className="input" placeholder="If YES, input the School Name, else input N/A" />
          </Field>

          <Field label="Are you a member of Indigenous People (IP)?">
            <input {...register('ip_info')} className="input" placeholder="If YES, input the Tribe Name, else input N/A" />
          </Field>

          <Field label="Are you a Solo Parent?">
            <select {...register('is_solo_parent')} className="input">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </Field>
        </Section>

        {/* ── PORTAL ACCOUNT ── */}
        <Section title="Portal Account">
          <p className="text-sm text-slate-500">Create a password to access the student portal after your registration is approved.</p>
          <Field label="Password" required error={errors.password}>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
              type="password"
              className="input"
              placeholder="Minimum 8 characters"
            />
          </Field>
        </Section>

        {/* ── CONSENT ── */}
        <div className="card p-5">
          <label className="flex gap-3 cursor-pointer">
            <input
              {...register('consent', { required: true })}
              type="checkbox"
              className="mt-0.5 accent-red-800 w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              I hereby allow MOIST, Inc. to use my information I provided which may be used for
              processing of my enrollment and other academic purposes.
            </span>
          </label>
          {errors.consent && <p className="text-red-500 text-xs mt-2">You must agree to continue.</p>}
        </div>

        <div className="pb-8">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-4 text-base"
          >
            {submitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}
