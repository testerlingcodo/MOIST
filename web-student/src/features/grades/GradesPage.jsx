import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';

const GRADE_PERIODS = [
  { key: 'prelim_grade', label: 'Prelim' },
  { key: 'midterm_grade', label: 'Midterm' },
  { key: 'semi_final_grade', label: 'Semi-Final' },
  { key: 'grade', label: 'Final' },
];

const STATUS_CONFIG = {
  submitted: { label: 'Under Review', cls: 'bg-amber-50 text-amber-700' },
  under_review: { label: 'Approved by Dean', cls: 'bg-blue-50 text-blue-700' },
  official: { label: 'Official', cls: 'bg-emerald-50 text-emerald-700' },
};

function getVisibleStatus(record) {
  const statuses = [record.prelim_status, record.midterm_status, record.semi_final_status, record.final_status].filter(Boolean);
  if (statuses.includes('official')) return 'official';
  if (statuses.includes('under_review')) return 'under_review';
  if (statuses.includes('submitted')) return 'submitted';
  return null;
}

function gradeColor(g) {
  if (g === null || g === undefined) return 'text-slate-400';
  const value = parseFloat(g);
  if (value <= 1.5) return 'text-emerald-600 font-bold';
  if (value <= 2.5) return 'text-blue-600 font-semibold';
  if (value <= 3.0) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function GradeCell({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-300 text-sm">-</span>;
  return <span className={`text-sm ${gradeColor(value)}`}>{parseFloat(value).toFixed(2)}</span>;
}

function instructorLabel(record) {
  if (record?.teacher_last_name || record?.teacher_first_name) {
    return `${record.teacher_last_name || ''}${record.teacher_first_name ? `, ${record.teacher_first_name}` : ''}`;
  }
  return 'TBA';
}

export default function GradesPage() {
  const { user } = useSelector((state) => state.auth);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const res = await client.get(`/students/${user.studentId}/enrollments`);
        if (active) setEnrollments(res.data?.data || res.data || []);
      } catch {
        toast.error('Failed to load grades');
      } finally {
        if (active) setLoading(false);
      }
    }

    if (user?.studentId) load();
    return () => {
      active = false;
    };
  }, [user]);

  const grouped = enrollments.reduce((accumulator, enrollment) => {
    const key = `${enrollment.school_year}__${enrollment.semester}`;
    if (!accumulator[key]) {
      accumulator[key] = {
        label: `${enrollment.school_year} - ${enrollment.semester} Semester`,
        records: [],
      };
    }
    accumulator[key].records.push(enrollment);
    return accumulator;
  }, {});

  const terms = Object.keys(grouped).sort().reverse();

  const calcGWA = (records) => {
    const graded = records.filter((record) => record.grade != null);
    if (!graded.length) return null;

    const totalUnits = graded.reduce((sum, record) => sum + (Number(record.units) || 0), 0);
    if (!totalUnits) return null;

    const weighted = graded.reduce((sum, record) => sum + (parseFloat(record.grade) * (Number(record.units) || 0)), 0);
    return (weighted / totalUnits).toFixed(2);
  };

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="page-title">My Grades</h1>
        <p className="page-subtitle">Academic records by semester</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((item) => (
            <div key={item} className="card animate-pulse">
              <div className="mb-4 h-5 w-1/3 rounded-xl bg-slate-100" />
              <div className="space-y-2">
                {[0, 1, 2].map((row) => <div key={row} className="h-10 rounded-xl bg-slate-100" />)}
              </div>
            </div>
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="card py-14 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-slate-300">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm font-medium text-slate-400">No enrollment records found.</p>
          <p className="mt-1 text-xs text-slate-300">Your grades will appear here once you are enrolled.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {terms.map((termKey) => {
            const { label, records } = grouped[termKey];
            const gwa = calcGWA(records);
            const totalUnits = records.reduce((sum, record) => sum + (Number(record.units) || 0), 0);

            return (
              <div key={termKey} className="table-container overflow-x-auto">
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ background: 'linear-gradient(180deg,rgba(246,196,69,0.14),rgba(255,248,235,0.85))' }}
                >
                  <div>
                    <p className="text-sm font-bold text-[#7a1324]">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{records.length} subject(s) - {totalUnits} units</p>
                  </div>
                  {gwa && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">GWA</p>
                      <p className={`text-lg font-black ${gradeColor(parseFloat(gwa))}`}>{gwa}</p>
                    </div>
                  )}
                </div>

                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr>
                      <th className="table-header-cell">Code</th>
                      <th className="table-header-cell">Subject</th>
                      <th className="table-header-cell text-center">Units</th>
                      {GRADE_PERIODS.map((period) => (
                        <th key={period.key} className="table-header-cell text-center">{period.label}</th>
                      ))}
                      <th className="table-header-cell">Remarks</th>
                      <th className="table-header-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => {
                      const status = STATUS_CONFIG[getVisibleStatus(record)];
                      return (
                        <tr key={index} className="table-row">
                          <td className="table-cell font-mono text-xs text-slate-600">{record.subject_code || record.code || '-'}</td>
                          <td className="table-cell">
                            <p className="font-semibold text-slate-900">{record.subject_name || record.name || '-'}</p>
                            <p className="mt-0.5 text-xs text-slate-400">Instructor: {instructorLabel(record)}</p>
                          </td>
                          <td className="table-cell text-center text-slate-600">{record.units || '-'}</td>
                          {GRADE_PERIODS.map((period) => (
                            <td key={period.key} className="table-cell text-center">
                              <GradeCell value={record[period.key]} />
                            </td>
                          ))}
                          <td className="table-cell">
                            {record.remarks ? (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  record.remarks === 'passed'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : record.remarks === 'failed'
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {record.remarks.charAt(0).toUpperCase() + record.remarks.slice(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {status ? (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>
                                {status.label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
