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
  { value: 'transferee', label: 'Transferee' },
];
const SEMESTERS = ['1st Sem', '2nd Sem', 'Summer'];
const MAJOR_OPTIONS = {
  BSED: ['ENGLISH', 'MATHEMATICS', 'SOCIAL STUDIES EDUCATION', 'VALUES EDUCATION'],
  BSBA: ['MARKETING MGT.', 'FINANCIAL MGT.', 'HUMAN RESOURCE MGT.', 'OPERATION MGT.'],
};
const EMPTY_MAJOR_OPTIONS = [];
const GRID_CLASS_BY_COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-5',
};
const SPAN_CLASS_BY_VALUE = {
  1: 'sm:col-span-1 xl:col-span-1 2xl:col-span-1',
  2: 'sm:col-span-2 xl:col-span-2 2xl:col-span-2',
  3: 'sm:col-span-2 xl:col-span-3 2xl:col-span-3',
  4: 'sm:col-span-2 xl:col-span-4 2xl:col-span-4',
  5: 'sm:col-span-2 xl:col-span-4 2xl:col-span-5',
};

function normalizeCourseCode(value) {
  const normalized = (value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (normalized === 'BSE') return 'BSED';
  return normalized;
}

function SectionTitle({ children }) {
  return (
    <div className="section-title">{children}</div>
  );
}

function F({ label, required, error, hint, children, span }) {
  return (
    <div className={span ? `col-span-1 ${SPAN_CLASS_BY_VALUE[span] || ''}` : 'col-span-1'}>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-0.5">{error.message || 'Required'}</p>}
    </div>
  );
}

function Grid({ cols = 4, children }) {
  return (
    <div className={`grid ${GRID_CLASS_BY_COLS[cols] || GRID_CLASS_BY_COLS[4]} gap-x-4 gap-y-3`}>
      {children}
    </div>
  );
}

export default function RegisterPage({ onSuccess }) {
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const currentSY = (() => { const y = new Date().getFullYear(); return `${y}-${y + 1}`; })();

  useEffect(() => {
    axios.get('/api/v1/courses?activeOnly=1')
      .then(r => setCourses(r.data))
      .catch(() => {
        toast.error('Failed to load course offerings.');
      });
  }, []);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
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
      major: '',
      is_solo_parent: 'false',
    },
  });

  const employmentStatus = watch('employment_status');
  const enrollmentType = watch('enrollment_type');
  const selectedCourse = watch('course');
  const selectedMajor = watch('major');
  const normalizedSelectedCourse = normalizeCourseCode(selectedCourse);
  const selectedMajorOptions = MAJOR_OPTIONS[normalizedSelectedCourse] || EMPTY_MAJOR_OPTIONS;
  const showMajorField = selectedMajorOptions.length > 0;

  useEffect(() => {
    if (!showMajorField || (selectedMajor && !selectedMajorOptions.includes(selectedMajor))) {
      setValue('major', '');
    }
  }, [selectedMajor, selectedMajorOptions, setValue, showMajorField]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await axios.post('/api/v1/auth/register', {
        ...data,
        is_solo_parent: data.is_solo_parent === 'true',
      });
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 px-2 py-2 md:px-3 md:py-3 xl:px-4 xl:py-4">

      {/* ── HEADER ── */}
      <div className="mb-4">
        <div
          className="flex flex-col gap-4 rounded-2xl px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between lg:px-6"
          style={{ background: 'linear-gradient(135deg,#5a0d1a,#7a1324,#a01830)' }}
        >
          <div className="text-center lg:text-left">
            <div className="font-black text-xl tracking-widest" style={{ color: '#ffd700' }}>MOIST, INC.</div>
            <div className="text-xs text-white/75">Student Information Portal</div>
          </div>
          <div className="text-center lg:flex-1">
            <div className="text-xl font-extrabold text-white">Student Registration Form</div>
            <div className="text-xs text-white/60 mt-0.5">Fill out all required fields marked with <span className="text-red-300">*</span></div>
          </div>
          <div className="text-center text-xs text-white/50 lg:text-right">
            Date Registered:<br />
            <span className="text-white font-semibold">{today}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full">

        {/* ── TWO-COLUMN MAIN LAYOUT ── */}
        <div className="grid grid-cols-1 gap-4 items-stretch 2xl:grid-cols-[minmax(0,1.3fr)_minmax(420px,0.92fr)]">

          {/* ══ LEFT COLUMN — Personal Information ══ */}
          <div className="card p-4 space-y-4 xl:p-5">
            <SectionTitle>Personal Information</SectionTitle>

            {/* Name row */}
            <Grid cols={4}>
              <F label="Last Name" required error={errors.last_name} span={1}>
                <input {...register('last_name', { required: true })} className="input" />
              </F>
              <F label="First Name" required error={errors.first_name} span={1}>
                <input {...register('first_name', { required: true })} className="input" />
              </F>
              <F label="Middle Name" hint="If none, leave blank" span={1}>
                <input {...register('middle_name')} className="input" />
              </F>
              <F label="Ext." hint="Jr./Sr./II" span={1}>
                <input {...register('name_extension')} className="input" placeholder="If none, leave blank" />
              </F>
            </Grid>

            <Grid cols={4}>
              <F label="Course" required error={errors.course} span={showMajorField ? 2 : 4}>
                <select {...register('course', { required: true })} className="input">
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.code}>{c.code}{c.name ? ` – ${c.name}` : ''}</option>)}
                </select>
              </F>
              {showMajorField && (
                <F label="Major" required error={errors.major} span={2}>
                  <select {...register('major', { required: 'Select a major' })} className="input">
                    <option value="">Select Major</option>
                    {selectedMajorOptions.map((major) => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </select>
                </F>
              )}
            </Grid>

            <Grid cols={4}>
              <F label="Contact No." span={1}>
                <input {...register('contact_number')} className="input" placeholder="09" />
              </F>
              <F label="Sex" required error={errors.gender} span={1}>
                <select {...register('gender', { required: 'Required' })} className="input">
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </F>
              <F label="Birthdate" required error={errors.birthdate} span={1}>
                <input {...register('birthdate', { required: 'Required' })} type="date" className="input" />
              </F>
              <F label="Civil Status" span={1}>
                <select {...register('civil_status')} className="input">
                  {CIVIL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </F>
            </Grid>

            <Grid cols={4}>
              <F label="Permanent Address" span={2}>
                <input {...register('address')} className="input" placeholder="Street, Barangay, Municipality, Province" />
              </F>
              <F label="Enrollment Status" required error={errors.enrollment_type} span={1}>
                <select {...register('enrollment_type', { required: 'Required' })} className="input">
                  <option value="">Select</option>
                  {ENROLLMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </F>
              <F label="Year Level" required error={errors.year_level} span={1}>
                {enrollmentType === 'new' ? (
                  <>
                    <input type="hidden" {...register('year_level', { valueAsNumber: true })} value={1} />
                    <div className="input bg-slate-50 text-slate-600 font-semibold select-none">Year 1 — Fixed</div>
                  </>
                ) : enrollmentType === 'transferee' ? (
                  <select {...register('year_level', { required: 'Required', valueAsNumber: true })} className="input">
                    <option value="">Select Year</option>
                    {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                ) : (
                  <div className="input bg-slate-50 text-slate-400">Select enrollment status first</div>
                )}
              </F>
            </Grid>

            <Grid cols={4}>
              <F label="Birthplace" span={4}>
                <input {...register('birthplace')} className="input" placeholder="Street, Barangay, Municipality, Province" />
              </F>
            </Grid>

            <Grid cols={4}>
              <F label="Email Address" required error={errors.email} span={4}>
                <input
                  {...register('email', {
                    required: true,
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                  })}
                  type="email"
                  className="input"
                  placeholder="@gmail.com / @yahoo.com"
                />
              </F>
            </Grid>

            <Grid cols={4}>
              <F label="Mother's Name" span={2}>
                <input {...register('mother_name')} className="input" />
              </F>
              <F label="Father's Name" span={2}>
                <input {...register('father_name')} className="input" />
              </F>
            </Grid>

            <Grid cols={4}>
              <F label="Parent / Guardian Name" span={2}>
                <input {...register('guardian_name')} className="input" />
              </F>
              <F label="Guardian Contact" span={1}>
                <input {...register('guardian_contact')} className="input" placeholder="09" />
              </F>
              <F label="Solo Parent?" span={1}>
                <select {...register('is_solo_parent')} className="input">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </F>
            </Grid>
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="flex h-full flex-col space-y-4">

            {/* Educational Background */}
            <div className="card p-4 space-y-4 xl:p-5">
              <SectionTitle>Educational Background</SectionTitle>

              <Grid cols={5}>
                <F label="Elementary School" span={4}>
                  <input {...register('elementary_school')} className="input" placeholder="Ex: Balingasag Elementary School" />
                </F>
                <F label="Year" span={1}>
                  <input {...register('elementary_year')} className="input" placeholder="2008" />
                </F>
              </Grid>

              <Grid cols={5}>
                <F label="Junior High School" span={4}>
                  <input {...register('junior_high_school')} className="input" placeholder="Ex: MOIST, Inc." />
                </F>
                <F label="Year" span={1}>
                  <input {...register('junior_high_year')} className="input" placeholder="2012" />
                </F>
              </Grid>

              <Grid cols={5}>
                <F label="Senior High School" span={2}>
                  <input {...register('senior_high_school')} className="input" placeholder="Ex: Balingasag SHS" />
                </F>
                <F label="Strand" span={2}>
                  <select {...register('strand')} className="input">
                    <option value="">Select Strand</option>
                    {STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </F>
                <F label="Year" span={1}>
                  <input {...register('senior_high_year')} className="input" placeholder="2020" />
                </F>
              </Grid>

              <Grid cols={5}>
                <F label="School Last Attended (SHS or College)" span={4}>
                  <input {...register('school_last_attended')} className="input" placeholder="Ex: Balingasag Senior High School" />
                </F>
                <F label="Year" span={1}>
                  <input {...register('year_last_attended')} className="input" placeholder="2024" />
                </F>
              </Grid>

              <Grid cols={5}>
                <F label="School Last Attended Address" span={3}>
                  <input {...register('school_last_attended_address')} className="input" placeholder="Complete Address of the School" />
                </F>
                <F label="Course / Section" span={2}>
                  <input {...register('course_section_last_attended')} className="input" placeholder="Ex: BSIT-I / Grade 12" />
                </F>
              </Grid>
            </div>

            {/* Additional Information */}
            <div className="card p-4 space-y-4 xl:p-5">
              <SectionTitle>Additional Information</SectionTitle>

              <Grid cols={5}>
                <F label="Type of Disability (PWD only)" span={3}>
                  <input {...register('disability_type')} className="input" />
                </F>
                <F label="Causes of Disability (PWD only)" span={2}>
                  <input {...register('disability_cause')} className="input" />
                </F>
              </Grid>

              <Grid cols={5}>
                <F label="School Year" span={1}>
                  <input {...register('school_year')} className="input" />
                </F>
                <F label="Semester" span={1}>
                  <select {...register('semester')} className="input">
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </F>
                <F label="Currently Employed?" span={1}>
                  <select {...register('employment_status')} className="input">
                    <option value="not_employed">Not Employed</option>
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-Employed</option>
                  </select>
                </F>
                <F label="Religion" span={2}>
                  <input {...register('religion')} className="input" placeholder="Please specify" />
                </F>
              </Grid>

              {employmentStatus !== 'not_employed' && (
                <Grid cols={5}>
                  <F label="Name of Company" span={3}>
                    <input {...register('company_name')} className="input" />
                  </F>
                  <F label="Company Location" span={2}>
                    <input {...register('company_location')} className="input" />
                  </F>
                </Grid>
              )}

              <Grid cols={5}>
                <F label="Date Registered" span={1}>
                  <input value={today} disabled readOnly className="input bg-slate-50 text-slate-500" />
                </F>
                <F label="ALS Graduate? (If YES, School Name; else N/A)" span={4}>
                  <input {...register('als_info')} className="input" placeholder="N/A" />
                </F>
              </Grid>

              <Grid cols={5}>
                <F label="Member of Indigenous People? (If YES, Tribe Name; else N/A)" span={4}>
                  <input {...register('ip_info')} className="input" placeholder="N/A" />
                </F>
                <F label="Are you a Solo Parent?" span={1}>
                  <select {...register('is_solo_parent')} className="input">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </F>
              </Grid>
            </div>

            {/* Portal Account */}
            <div className="card p-4 space-y-4 xl:p-5">
              <SectionTitle>Portal Account</SectionTitle>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(240px,0.9fr)] xl:items-end">
                <div className="w-full">
                  <F label="Password" required error={errors.password} span={1}>
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Minimum 8 characters' },
                      })}
                      type="password"
                      className="input"
                      placeholder="Minimum 8 characters"
                    />
                  </F>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    After your registration is approved by the Registrar, you can log in to the student portal using your Student Number and this password.
                  </p>
                </div>
              </div>
            </div>

            {/* Consent + Submit */}
            <div className="card mt-auto p-4 xl:p-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  {...register('consent', { required: true })}
                  type="checkbox"
                  className="accent-red-800 mt-1 h-4 w-4 flex-shrink-0"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  I hereby allow MOIST, Inc. to use my information I provided which may be used for
                  processing of my enrollment and other academic purposes.
                </span>
              </label>
              {errors.consent && <p className="mb-3 mt-3 text-xs text-red-500">You must agree to continue.</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary mt-4 w-full py-3"
              >
                {submitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
