import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DocumentReadyBanner({ notif }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2} className="w-5 h-5">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-bold text-green-800">{notif.title}</p>
          <span className="text-[10px] text-green-500 whitespace-nowrap flex-shrink-0">
            {timeAgo(notif.created_at)}
          </span>
        </div>
        <p className="text-sm text-green-700 leading-relaxed">{notif.body}</p>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [announcementsRes, studentNotifsRes] = await Promise.all([
          client.get('/announcements', { params: { limit: 50 } }),
          client.get('/student-notifications').catch(() => ({ data: [] })),
        ]);

        const announcements = (announcementsRes.data?.data || announcementsRes.data || [])
          .map((a) => ({ ...a, _source: 'announcement' }));
        const studentNotifs = (studentNotifsRes.data || [])
          .map((n) => ({ ...n, _source: 'student' }));

        // Mark student notifications as read
        if (studentNotifs.some((n) => !n.is_read)) {
          client.patch('/student-notifications/mark-all-read').catch(() => {});
        }

        const merged = [...studentNotifs, ...announcements].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        if (active) setItems(merged);
      } catch {
        toast.error('Failed to load notifications');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">Your personal notices and school-wide announcements</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-100 rounded-xl w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 rounded-xl w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded-xl w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-14">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-slate-300 mx-auto mb-3">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
          </svg>
          <p className="text-slate-400 font-medium text-sm">No notifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => {
            if (item._source === 'student') {
              return <DocumentReadyBanner key={item.id || i} notif={item} />;
            }
            return (
              <div key={item.id || i} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(122,19,36,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="w-4 h-4">
                        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                      </svg>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pl-10">{item.body || item.content || item.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
