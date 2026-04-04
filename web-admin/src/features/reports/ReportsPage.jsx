import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import { useCourses } from '../../hooks/useCourses';

function StatCard({ label, value, sub, color = 'maroon' }) {
  const colors = {
    maroon: 'from-[#7a1324] to-[#5a0d1a] text-white',
    gold: 'from-amber-500 to-amber-600 text-white',
    blue: 'from-blue-600 to-blue-700 text-white',
    emerald: 'from-emerald-600 to-emerald-700 text-white',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-5 shadow-sm ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-black mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { schoolYear: activeSchoolYear, semester: activeSemester } = useActiveTerm();
  const { courses } = useCourses();
  const coursesRef = useRef(courses);
  useEffect(() => { coursesRef.current = courses; }, [courses]);

  const [stats, setStats] = useState(null);
  const [enrolledByCoure, setEnrolledByCourse] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolYear, setSchoolYear] = useState('');
  const [semester, setSemester] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    if (activeSchoolYear && !schoolYear) setSchoolYear(activeSchoolYear);
    if (activeSemester && !semester) setSemester(activeSemester);
  }, [activeSchoolYear, activeSemester]); // eslint-disable-line

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, enrollRes, pendingRes] = await Promise.all([
        client.get('/students', { params: { limit: 1 } }),
        client.get('/enrollment-batches', { params: { limit: 1, status: 'enrolled' } }),
        client.get('/students', { params: { limit: 1, status: 'pending' } }),
      ]);

      setStats({
        totalStudents: studentsRes.data?.total ?? 0,
        enrolled: enrollRes.data?.total ?? 0,
        pending: pendingRes.data?.total ?? 0,
      });

      // Load enrollment breakdown by course
      const courseBreakdowns = await Promise.all(
        coursesRef.current.map(async (course) => {
          const res = await client.get('/enrollment-batches', {
            params: {
              limit: 1,
              status: 'enrolled',
              course,
              ...(schoolYear ? { school_year: schoolYear } : {}),
              ...(semester ? { semester } : {}),
            },
          });
          return { course, count: res.data?.total ?? 0 };
        }),
      );
      setEnrolledByCourse(courseBreakdowns.filter((c) => c.count > 0));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [schoolYear, semester]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8" ref={printRef}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Enrollment and student statistics summary.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Report
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex gap-3 flex-wrap print:hidden">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="School Year (e.g. 2025-2026)"
          value={schoolYear}
          onChange={(e) => setSchoolYear(e.target.value)}
        />
        <select className="input max-w-xs" value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All Semesters</option>
          <option value="1st">1st Semester</option>
          <option value="2nd">2nd Semester</option>
          <option value="summer">Summer</option>
        </select>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h2 className="text-xl font-black text-[#7a1324]">MOIST, INC. — Student Information System</h2>
        <p className="text-sm text-slate-600">Misamis Oriental Institute of Science and Technology, Inc.</p>
        <p className="text-sm text-slate-500">Enrollment Report · Generated {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        {(schoolYear || semester) && (
          <p className="text-sm text-slate-500">
            {schoolYear && `School Year: ${schoolYear}`}
            {schoolYear && semester && ' · '}
            {semester && `${semester} Semester`}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading report data...</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Students" value={stats?.totalStudents} sub="All registered students" color="maroon" />
            <StatCard label="Currently Enrolled" value={stats?.enrolled} sub={`${semester || 'All semesters'} · ${schoolYear || 'All years'}`} color="emerald" />
            <StatCard label="Pending Approval" value={stats?.pending} sub="Awaiting Registrar approval" color="gold" />
          </div>

          {/* Enrolled by course */}
          <div className="card mb-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Enrolled Students by Course</h2>
            {enrolledByCoure.length === 0 ? (
              <p className="text-sm text-slate-400">No enrollment data for the selected term.</p>
            ) : (
              <div className="space-y-3">
                {enrolledByCoure
                  .sort((a, b) => b.count - a.count)
                  .map(({ course, count }) => {
                    const max = Math.max(...enrolledByCoure.map((c) => c.count));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={course}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{course}</span>
                          <span className="text-sm font-bold text-[#7a1324]">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7a1324] to-[#a01830]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Total enrolled summary for print */}
          <div className="hidden print:block">
            <table className="w-full text-sm border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left">Course</th>
                  <th className="border border-slate-300 px-3 py-2 text-right">Enrolled Count</th>
                </tr>
              </thead>
              <tbody>
                {enrolledByCoure.map(({ course, count }) => (
                  <tr key={course}>
                    <td className="border border-slate-300 px-3 py-2">{course}</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-semibold">{count}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-300 px-3 py-2">TOTAL</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    {enrolledByCoure.reduce((s, c) => s + c.count, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
