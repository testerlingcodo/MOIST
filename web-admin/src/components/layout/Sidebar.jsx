import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import client from '../../api/client';
import { logoutThunk } from '../../features/auth/authSlice';
import MoistSeal from '../branding/MoistSeal';

const navGroups = [
  {
    label: 'Dashboard',
    roles: ['admin', 'staff', 'teacher', 'dean', 'registrar', 'cashier'],
    items: [
      {
        to: '/', end: true,
        label: 'Dashboard',
        roles: ['admin', 'staff', 'teacher', 'dean', 'registrar', 'cashier'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
      },
    ],
  },
  {
    label: 'Academic Management',
    roles: ['admin', 'staff', 'teacher', 'dean', 'registrar'],
    items: [
      {
        to: '/students',
        label: 'Students',
        roles: ['admin', 'registrar', 'dean', 'teacher'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      },
      {
        to: '/subjects',
        label: 'Subjects',
        roles: ['admin', 'registrar', 'dean'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
      },
      {
        to: '/teachers',
        label: 'Instructors',
        roles: ['admin', 'staff', 'dean', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z" /><path d="M5 12v5c0 1.5 3.13 3 7 3s7-1.5 7-3v-5" /></svg>,
      },
      {
        to: '/teaching-load',
        label: 'Teaching Load',
        roles: ['admin', 'dean'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>,
      },
      {
        to: '/sections',
        label: 'Class Schedule',
        roles: ['admin', 'dean'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
      },
      {
        to: '/grades',
        label: 'Grades',
        roles: ['staff', 'teacher'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
      },
      {
        to: '/dean/grades',
        label: 'Grade Approvals',
        roles: ['dean'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
      },
      {
        to: '/all-grades',
        label: 'Submitted Grades',
        roles: ['admin', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /><path d="M5 12H2" /><path d="M5 6l-3 3 3 3" /></svg>,
      },
      {
        to: '/teacher/classes',
        label: 'My Classes',
        roles: ['teacher'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
      },
    ],
  },
  {
    label: 'Enrollment Management',
    roles: ['admin', 'registrar', 'staff'],
    items: [
      {
        to: '/enrollment-batches',
        label: 'Enrollment Processing',
        roles: ['admin', 'staff'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M3 3h18v4H3z" /><path d="M3 9h18v4H3z" /><path d="M3 15h12v4H3z" /><polyline points="17 15 19 17 23 13" /></svg>,
      },
      {
        to: '/enrolled-students',
        label: 'Enrollment Records',
        roles: ['admin', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
      },
      {
        to: '/approvals',
        label: 'Enrollment Approvals',
        roles: ['admin', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
      },
      {
        to: '/registration',
        label: 'Official Registration',
        roles: ['admin', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
      },
    ],
  },
  {
    label: 'Enrollment',
    roles: ['dean'],
    items: [
      {
        to: '/evaluation',
        label: 'Evaluation',
        roles: ['dean'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
      },
    ],
  },
  {
    label: 'Financial Management',
    roles: ['admin', 'cashier'],
    items: [
      {
        to: '/payments',
        label: 'Payments',
        roles: ['admin', 'cashier'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
      },
      {
        to: '/tuition',
        label: 'Tuition & Fees',
        roles: ['admin', 'cashier'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
      },
    ],
  },
  {
    label: 'Communication',
    roles: ['admin', 'staff', 'teacher', 'dean', 'registrar', 'cashier'],
    items: [
      {
        to: '/announcements',
        label: 'Announcements',
        roles: ['admin', 'staff', 'teacher', 'dean', 'registrar', 'cashier'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" /></svg>,
      },
      {
        to: '/document-requests',
        label: 'Document Requests',
        roles: ['admin', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
      },
    ],
  },
  {
    label: 'Reports & Analytics',
    roles: ['admin', 'registrar', 'dean'],
    items: [
      {
        to: '/reports',
        labelByRole: { dean: 'Academic Reports', default: 'Reports' },
        roles: ['admin', 'registrar', 'dean'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>,
      },
    ],
  },
  {
    label: 'System Administration',
    roles: ['admin', 'registrar'],
    items: [
      {
        to: '/users',
        label: 'Users',
        roles: ['admin'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
      },
      {
        to: '/academic-settings',
        label: 'Academic Settings',
        roles: ['admin'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
      },
      {
        to: '/courses',
        label: 'Course Offerings',
        roles: ['admin'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
      },
      {
        to: '/audit-logs',
        label: 'Audit Logs',
        roles: ['admin', 'registrar'],
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="11" y2="17" /><circle cx="17" cy="17" r="3" /><line x1="19.5" y1="19.5" x2="21" y2="21" /></svg>,
      },
    ],
  },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;
  const [queueCount, setQueueCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [gradesCount, setGradesCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadQueueCount() {
      const nextStatus = {
        admin:     'for_subject_enrollment',
        dean:      'for_subject_enrollment',
        staff:     'for_assessment',
        registrar: 'for_registration',
      }[role];

      if (!nextStatus) {
        setQueueCount(0);
        return;
      }

      try {
        const response = await client.get('/enrollment-batches', { params: { limit: 100, status: nextStatus } });
        if (active) {
          setQueueCount(Number(response.data?.total || 0));
        }
      } catch {
        if (active) {
          setQueueCount(0);
        }
      }
    }

    loadQueueCount();
    const intervalId = setInterval(loadQueueCount, 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [role]);

  useEffect(() => {
    if (role !== 'dean') return;
    let active = true;
    async function loadGradesCount() {
      try {
        const res = await client.get('/grades', { params: { submission_status: 'submitted', limit: 1 } });
        if (active) setGradesCount(Number(res.data?.total || 0));
      } catch {
        if (active) setGradesCount(0);
      }
    }
    loadGradesCount();
    const id = setInterval(loadGradesCount, 15000);
    return () => { active = false; clearInterval(id); };
  }, [role]);

  useEffect(() => {
    if (!['admin', 'registrar'].includes(role)) return;
    let active = true;

    async function loadApprovalsCount() {
      try {
        const res = await client.get('/students', { params: { status: 'pending', limit: 1 } });
        if (active) setApprovalsCount(Number(res.data?.total || 0));
      } catch {
        if (active) setApprovalsCount(0);
      }
    }

    loadApprovalsCount();
    const id = setInterval(loadApprovalsCount, 15000);
    return () => { active = false; clearInterval(id); };
  }, [role]);

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col bg-[color:var(--brand-maroon-dark)] text-white shadow-[24px_0_48px_rgba(95,15,28,0.18)] xl:w-[16.5rem]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <MoistSeal size={40} compact />
          </div>
          <div>
            <h1 className="leading-tight">
              <span className="text-white font-black text-sm tracking-[0.22em] uppercase">MOIST</span>
              <span className="text-amber-400 font-black text-sm">, INC.</span>
            </h1>
            <p className="text-amber-100/90 text-xs">Student Information Portal</p>
            <p className="text-slate-300 text-[11px] capitalize mt-1">{role || 'Admin'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1.5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role));
          if (!visibleItems.length) return null;
          return (
            <div key={group.label} className="mb-1">
              <p className="px-4 pb-1 pt-2.5 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-100/50">
                {group.label}
              </p>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                >
                  {item.icon}
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span>{item.labelByRole ? (item.labelByRole[role] || item.labelByRole.default) : item.label}</span>
                    {(item.to === '/enrollment-batches' || item.to === '/evaluation' || item.to === '/registration') && queueCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {queueCount}
                      </span>
                    )}
                    {item.to === '/approvals' && approvalsCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {approvalsCount}
                      </span>
                    )}
                    {item.to === '/dean/grades' && gradesCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {gradesCount}
                      </span>
                    )}
                  </span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3.5">
        <div className="mb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.email}</p>
            <p className="text-slate-300 text-[10px] capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(logoutThunk())}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/10 hover:text-white transition-colors text-xs"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
