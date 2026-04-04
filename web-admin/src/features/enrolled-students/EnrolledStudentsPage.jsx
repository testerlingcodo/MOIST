import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Badge from '../../components/ui/Badge';
import { useCourses } from '../../hooks/useCourses';

export default function EnrolledStudentsPage() {
  const { courses } = useCourses();
  const role = useSelector((state) => state.auth.user?.role);
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [batchDetail, setBatchDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/enrollment-batches', {
        params: { limit: 200, status: 'enrolled' },
      });
      setBatches(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load enrolled students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExpand = async (batch) => {
    if (expanded === batch.id) {
      setExpanded(null);
      setBatchDetail(null);
      return;
    }
    setExpanded(batch.id);
    setBatchDetail(null);
    setDetailLoading(true);
    try {
      const res = await client.get(`/enrollment-batches/${batch.id}`);
      setBatchDetail(res.data);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = batches.filter((b) => {
    if (courseFilter && b.course !== courseFilter) return false;
    if (yearFilter && String(b.year_level) !== yearFilter) return false;
    if (semesterFilter && b.semester !== semesterFilter) return false;
    if (search) {
      const hay = `${b.student_number || ''} ${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const visibleSubjects = expanded && batchDetail?.id === expanded
    ? (batchDetail.subjects || []).filter((subject) => subject.enrollment_status === 'enrolled' || !subject.enrollment_status)
    : [];

  return (
    <div className="p-8">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Enrollment Records</h1>
          <p className="page-subtitle">
            Students who have completed enrollment for the current term.
            {role === 'dean' && ' Shows your program\'s enrolled students.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[#7a1324]">{filtered.length}</p>
          <p className="text-xs text-slate-500">Enrolled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          type="text"
          className="input"
          placeholder="Search student number or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">All Year Levels</option>
          {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select className="input" value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
          <option value="">All Semesters</option>
          <option value="1st">1st Semester</option>
          <option value="2nd">2nd Semester</option>
          <option value="summer">Summer</option>
        </select>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student', 'Course & Year', 'Term', 'Status', 'Subjects', ''].map((h) => (
                <th key={h} className="table-header-cell">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">No enrolled students found</td></tr>
            ) : filtered.map((batch) => (
              <React.Fragment key={batch.id}>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="font-semibold text-slate-900">{batch.last_name}, {batch.first_name}</div>
                    <div className="text-xs text-slate-500">{batch.student_number}</div>
                  </td>
                  <td className="table-cell text-slate-600">
                    <div>{batch.course || '-'}</div>
                    <div className="text-xs text-slate-400">Year {batch.year_level || '-'}</div>
                  </td>
                  <td className="table-cell text-slate-600">
                    <div>{batch.school_year}</div>
                    <div className="text-xs text-slate-400">{batch.semester} Semester</div>
                  </td>
                  <td className="table-cell">
                    <Badge variant="success">Enrolled</Badge>
                  </td>
                  <td className="table-cell">
                    <button
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => handleExpand(batch)}
                    >
                      {expanded === batch.id ? 'Hide Subjects' : 'View Subjects'}
                    </button>
                  </td>
                  <td className="table-cell">
                    {batch.student_id && (
                      <button
                        className="flex items-center gap-1 text-xs font-semibold text-[#7a1324] hover:text-[#5a0d1a] transition-colors"
                        onClick={() => navigate(`/transcript/${batch.student_id}`)}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Transcript
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === batch.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-6 py-4">
                      {detailLoading ? (
                        <p className="text-sm text-slate-400">Loading subjects...</p>
                      ) : visibleSubjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {visibleSubjects.map((s) => (
                            <div key={s.subject_id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                              <p className="font-semibold text-slate-800">{s.subject_code} – {s.subject_name}</p>
                              <p className="text-slate-500 mt-0.5">{s.units} units · {s.schedule_days || 'No schedule'}</p>
                              <p className="text-slate-400">
                                Instructor: {s.teacher_last_name || s.teacher_first_name
                                  ? `${s.teacher_last_name || ''}${s.teacher_first_name ? `, ${s.teacher_first_name}` : ''}`
                                  : 'TBA'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No subject records found.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
