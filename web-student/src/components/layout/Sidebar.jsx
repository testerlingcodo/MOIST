import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { logoutThunk } from '../../features/auth/authSlice';
import MoistSeal from '../branding/MoistSeal';
import client from '../../api/client';

const navItems = [
  {
    to: '/',
    end: true,
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/enrollment',
    label: 'My Enrollment',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: '/payments',
    label: 'My Payments / SOA',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
        <line x1="6" y1="15" x2="10" y2="15"/>
        <line x1="14" y1="15" x2="16" y2="15"/>
      </svg>
    ),
  },
  {
    to: '/grades',
    label: 'My Grades',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: '/prospectus',
    label: 'My Prospectus',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    to: '/announcements',
    label: 'Announcements',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    to: '/document-requests',
    label: 'Document Requests',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'My Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function SidebarLinks({ onNavigate }) {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    client.get('/student-notifications/unread-count')
      .then((res) => setUnreadCount(res.data?.count || 0))
      .catch(() => {});
  }, [location.pathname]); // re-check on every navigation

  // Clear badge when on notifications page
  useEffect(() => {
    if (location.pathname === '/announcements') setUnreadCount(0);
  }, [location.pathname]);

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {navItems.map((item) => {
        const showBadge = item.to === '/announcements' && unreadCount > 0;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
            }
          >
            <div className="relative flex-shrink-0">
              {item.icon}
              {showBadge && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-sm">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ mobile = false, open = false, onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const panel = (
    <div
      className="flex h-full w-64 flex-col text-white shadow-xl"
      style={{ background: 'linear-gradient(180deg,#5f0f1c 0%,#7a1324 100%)' }}
    >
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <MoistSeal size={38} />
          </div>
          <div>
            <p className="font-black text-sm tracking-wide text-white">MOIST</p>
            <p className="text-amber-200/80 text-[10px]">Student Portal</p>
          </div>
        </div>
      </div>

      <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <p className="text-white text-xs font-bold truncate">{user?.email || 'Student'}</p>
        <p className="text-amber-200/70 text-[10px] mt-0.5">Student Account</p>
      </div>

      <SidebarLinks onNavigate={onClose} />

      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => {
            if (onClose) onClose();
            dispatch(logoutThunk());
          }}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div className={`fixed inset-0 z-40 lg:hidden transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-slate-950/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <div className={`absolute inset-y-0 left-0 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {panel}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex h-screen sticky top-0 flex-shrink-0">
      {panel}
    </aside>
  );
}
