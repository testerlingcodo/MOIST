import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import client from '../../api/client';
import MoistSeal from '../../components/branding/MoistSeal';
import { useActiveTerm } from '../../hooks/useActiveTerm';

const quickActions = [
  // ── Admin ──────────────────────────────────────────────────────────────
  {
    label: 'Students',
    to: '/students',
    roles: ['admin'],
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    label: 'Enrollment',
    to: '/enrollment-batches',
    roles: ['admin', 'staff'],
    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    label: 'Approvals',
    to: '/approvals',
    roles: ['admin', 'registrar'],
    color: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    label: 'All Grades',
    to: '/all-grades',
    roles: ['admin', 'registrar'],
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  },
  {
    label: 'Payments',
    to: '/payments',
    roles: ['admin', 'cashier'],
    color: 'bg-green-50 text-green-700 hover:bg-green-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  },
  {
    label: 'Tuition',
    to: '/tuition',
    roles: ['admin', 'cashier'],
    color: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
  },
  {
    label: 'Subjects',
    to: '/subjects',
    roles: ['admin', 'dean', 'registrar'],
    color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
  },
  {
    label: 'Courses',
    to: '/courses',
    roles: ['admin'],
    color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
  },
  {
    label: 'Teachers',
    to: '/teachers',
    roles: ['admin', 'staff', 'dean', 'registrar'],
    color: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M12 3 1 9l11 6 11-6-11-6z" /><path d="M5 12v5c0 1.5 3.13 3 7 3s7-1.5 7-3v-5" /></svg>,
  },
  {
    label: 'Users',
    to: '/users',
    roles: ['admin'],
    color: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>,
  },
  {
    label: 'Reports',
    to: '/reports',
    roles: ['admin', 'dean', 'registrar'],
    color: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
  },
  {
    label: 'Audit Logs',
    to: '/audit-logs',
    roles: ['admin', 'registrar'],
    color: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="12" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    label: 'Academic Settings',
    to: '/academic-settings',
    roles: ['admin'],
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  },

  // ── Dean ───────────────────────────────────────────────────────────────
  {
    label: 'Evaluation',
    to: '/evaluation',
    roles: ['dean'],
    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    label: 'Grade Review',
    to: '/dean/grades',
    roles: ['dean'],
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  },
  {
    label: 'Teaching Load',
    to: '/teaching-load',
    roles: ['admin', 'dean'],
    color: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  },
  {
    label: 'Sections',
    to: '/sections',
    roles: ['admin', 'dean'],
    color: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    label: 'Enrolled Students',
    to: '/enrolled-students',
    roles: ['admin', 'dean', 'registrar'],
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>,
  },

  // ── Registrar ──────────────────────────────────────────────────────────
  {
    label: 'Registration',
    to: '/registration',
    roles: ['registrar'],
    color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  },
  {
    label: 'Document Requests',
    to: '/document-requests',
    roles: ['admin', 'registrar'],
    color: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },

  // ── Staff ──────────────────────────────────────────────────────────────
  {
    label: 'Grades',
    to: '/grades',
    roles: ['staff', 'teacher'],
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  },

  // ── Teacher ────────────────────────────────────────────────────────────
  {
    label: 'My Classes',
    to: '/teacher/classes',
    roles: ['teacher'],
    color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
  },
  {
    label: 'My Students',
    to: '/students',
    roles: ['teacher'],
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
  },

  // ── Shared ─────────────────────────────────────────────────────────────
  {
    label: 'Announcements',
    to: '/announcements',
    roles: ['admin', 'staff', 'dean', 'registrar', 'cashier', 'teacher'],
    color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  },
];

export default function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const { schoolYear, semester, label: activeTermLabel } = useActiveTerm();
  const [stats, setStats] = useState(null);
  const [teacherWorkload, setTeacherWorkload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const requests = [];
      const map = {};
      const activeTermParams = schoolYear && semester
        ? `&school_year=${encodeURIComponent(schoolYear)}&semester=${encodeURIComponent(semester)}`
        : '';

      if (user?.role === 'teacher') {
        map.workload = requests.push(client.get('/teachers/me/workload')) - 1;
      } else if (user?.role === 'dean') {
        map.enrolled     = requests.push(client.get(`/enrollment-batches?limit=1&status=enrolled${activeTermParams}`)) - 1;
        map.evalA        = requests.push(client.get(`/enrollment-batches?limit=1&status=for_assessment${activeTermParams}`)) - 1;
        map.evalB        = requests.push(client.get(`/enrollment-batches?limit=1&status=for_payment${activeTermParams}`)) - 1;
        map.pendingGrades= requests.push(client.get(`/grades?limit=1&submission_status=submitted${activeTermParams}`)) - 1;
        map.instructors  = requests.push(client.get('/teachers?limit=1&is_active=true')) - 1;
      } else if (user?.role === 'registrar') {
        map.students    = requests.push(client.get(`/enrollment-batches?limit=1${activeTermParams}`)) - 1;
        map.enrollments = requests.push(client.get(`/enrollment-batches?limit=1&status=enrolled${activeTermParams}`)) - 1;
        map.forApproval = requests.push(client.get(`/enrollment-batches?limit=1&status=for_assessment${activeTermParams}`)) - 1;
        map.gradesSub   = requests.push(client.get(`/grades?limit=1&submission_status=submitted${activeTermParams}`)) - 1;
      } else if (['admin', 'staff'].includes(user?.role)) {
        map.students    = requests.push(client.get(`/enrollment-batches?limit=1${activeTermParams}`)) - 1;
        map.enrollments = requests.push(client.get(`/enrollment-batches?limit=1&status=enrolled${activeTermParams}`)) - 1;
      }

      if (['admin', 'staff', 'cashier'].includes(user?.role)) {
        map.payments = requests.push(client.get(`/payments?limit=1${activeTermParams}`)) - 1;
      }

      try {
        const results = await Promise.allSettled(requests);
        const get = (key) => map[key] !== undefined && results[map[key]]?.status === 'fulfilled'
          ? results[map[key]].value.data.total
          : null;

        const workload = map.workload !== undefined && results[map.workload]?.status === 'fulfilled'
          ? results[map.workload].value.data : null;

        setTeacherWorkload(workload);

        if (user?.role === 'dean') {
          const enrolled = get('enrolled') ?? 0;
          const evalA    = get('evalA')    ?? 0;
          const evalB    = get('evalB')    ?? 0;
          setStats({
            totalEnrolled:    enrolled,
            pendingGrades:    get('pendingGrades'),
            totalInstructors: get('instructors'),
            totalEvaluated:   enrolled + evalA + evalB,
          });
        } else if (user?.role === 'registrar') {
          setStats({
            totalStudents:    get('students'),
            totalEnrollments: get('enrollments'),
            forApproval:      get('forApproval'),
            gradeSubmissions: get('gradesSub'),
          });
        } else {
          setStats({
            totalStudents: workload
              ? workload.total_students
              : get('students'),
            totalGrades:     workload ? workload.total_grades     : null,
            submittedGrades: workload ? workload.submitted_grades : null,
            draftGrades:     workload ? workload.draft_grades     : null,
            totalPayments:   get('payments'),
            totalEnrollments: get('enrollments'),
          });
        }
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.role, schoolYear, semester]);

  const statCards = user?.role === 'dean'
    ? [
        {
          label: 'Term Enrolled Students',
          value: stats?.totalEnrolled ?? '—',
          iconColor: 'bg-green-100 text-green-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          ),
        },
        {
          label: 'Pending Grade Submissions',
          value: stats?.pendingGrades ?? '—',
          iconColor: 'bg-amber-100 text-amber-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
        },
        {
          label: 'Total Instructors',
          value: stats?.totalInstructors ?? '—',
          iconColor: 'bg-blue-100 text-blue-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z" />
              <path d="M5 12v5c0 1.5 3.13 3 7 3s7-1.5 7-3v-5" />
            </svg>
          ),
        },
        {
          label: 'Term Evaluated',
          value: stats?.totalEvaluated ?? '—',
          iconColor: 'bg-violet-100 text-violet-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          ),
        },
      ]
    : user?.role === 'registrar'
    ? [
        {
          label: 'Term Students',
          value: stats?.totalStudents ?? '—',
          iconColor: 'bg-blue-100 text-blue-600',
          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
        },
        {
          label: 'Term Enrolled',
          value: stats?.totalEnrollments ?? '—',
          iconColor: 'bg-green-100 text-green-600',
          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>),
        },
        {
          label: 'For Approval',
          value: stats?.forApproval ?? '—',
          iconColor: 'bg-amber-100 text-amber-600',
          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>),
        },
        {
          label: 'Grade Submissions',
          value: stats?.gradeSubmissions ?? '—',
          iconColor: 'bg-violet-100 text-violet-600',
          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
        },
      ]
    : user?.role === 'teacher'
    ? [
        {
          label: 'Assigned Students',
          value: stats?.totalStudents ?? '—',
          iconColor: 'bg-blue-100 text-blue-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          label: 'Encoded Grades',
          value: stats?.totalGrades ?? '—',
          iconColor: 'bg-emerald-100 text-emerald-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          ),
        },
        {
          label: 'Submitted Grades',
          value: stats?.submittedGrades ?? '—',
          iconColor: 'bg-violet-100 text-violet-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ),
        },
      ]
    : [
        {
          label: 'Term Students',
          value: stats?.totalStudents ?? '—',
          iconColor: 'bg-blue-100 text-blue-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          label: 'Term Enrollments',
          value: stats?.totalEnrollments ?? '—',
          iconColor: 'bg-emerald-100 text-emerald-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
        },
        {
          label: 'Term Payments',
          value: stats?.totalPayments ?? '—',
          iconColor: 'bg-violet-100 text-violet-600',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          ),
        },
      ];

  return (
    <div className="min-h-full p-5 lg:p-6">
      <div className="brand-hero mb-6">
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="brand-chip bg-white/15 text-amber-100">MOIST Portal</span>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
              Unified academic workflow for students, evaluation, and enrollment.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/78">
              Welcome back, <span className="font-bold capitalize">{user?.role || 'admin'}</span>. Review live records, move approvals faster, and keep every office aligned from evaluation to final enrollment.
            </p>
            {(schoolYear || semester) && (
              <p className="mt-3 inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-amber-100">
                Active Term: {activeTermLabel || `${schoolYear} — ${semester} Semester`}
              </p>
            )}
          </div>
          <div className="hidden rounded-[28px] bg-white/10 p-3 backdrop-blur md:block">
            <MoistSeal size={92} />
          </div>
        </div>
      </div>

      <div className={`mb-6 grid grid-cols-1 gap-4 ${['dean', 'registrar'].includes(user?.role) ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-icon ${card.iconColor}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
              {loading ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded mt-1" />
              ) : (
                <p className="text-3xl font-bold text-slate-900 mt-0.5">{card.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {user?.role === 'teacher' && (
        <div className="card mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Assigned Subjects</h2>
          {teacherWorkload?.assigned_subject_count ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subjects</p>
                  <p className="mt-1 font-semibold text-slate-900">{teacherWorkload.assigned_subject_count}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year Level</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {teacherWorkload.assigned_year_level ? `Year ${teacherWorkload.assigned_year_level}` : 'All Years'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Specialization</p>
                  <p className="mt-1 font-semibold text-slate-900">{teacherWorkload.specialization || '-'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(teacherWorkload.assigned_subjects || []).map((subject) => (
                  <span key={subject.id} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {subject.code} • {subject.course} • {subject.semester}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No subjects assigned yet. Dean can assign instructors from the subject offerings page.
            </p>
          )}
          {teacherWorkload?.assigned_subject_count > 0 && (
            <div className="mt-4 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Draft grades: {stats?.draftGrades ?? 0}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
            <p className="text-sm text-slate-500">Open the tools you use most in one tap.</p>
          </div>
          <span className="brand-chip">MOIST Theme</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.filter(a => a.roles.includes(user?.role)).map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-xl transition-colors font-medium text-sm ${action.color}`}
            >
              {action.icon}
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
