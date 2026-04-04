import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';

const YEARS = [1, 2, 3, 4];
const SEMESTERS = ['1st', '2nd', 'summer'];
const SEM_LABELS = { '1st': '1st Semester', '2nd': '2nd Semester', summer: 'Summer Term' };
const GRADE_COLUMNS = [
  { key: 'prelim_grade', label: 'Prelim' },
  { key: 'midterm_grade', label: 'Midterm' },
  { key: 'semi_final_grade', label: 'Semi-Final' },
  { key: 'final_grade', label: 'Final' },
];

function canShowGrade(subject) {
  return ['under_review', 'official'].includes(subject?.grade_status);
}

function gradeColor(grade) {
  if (grade == null) return '#94a3b8';
  const value = parseFloat(grade);
  if (value === 5.0) return '#dc2626';
  if (value <= 2.0) return '#16a34a';
  if (value <= 3.0) return '#d97706';
  return '#dc2626';
}

function gradeStr(value) {
  if (value == null) return '-';
  return parseFloat(value).toFixed(2);
}

function remarkLabel(subject) {
  const { remarks, enrollment_id } = subject;
  if (!enrollment_id) return { label: '-', color: '#cbd5e1', bg: 'transparent' };

  if (remarks === 'passed') return { label: 'PASSED', color: '#16a34a', bg: '#dcfce7' };
  if (remarks === 'failed') return { label: 'FAILED', color: '#dc2626', bg: '#fee2e2' };
  if (remarks === 'incomplete') return { label: 'INC', color: '#d97706', bg: '#fef3c7' };
  if (remarks === 'dropped') return { label: 'DROPPED', color: '#475569', bg: '#e2e8f0' };

  return { label: '-', color: '#cbd5e1', bg: 'transparent' };
}

function buildGradeCells(subject, cellRenderer) {
  return GRADE_COLUMNS.map((column) => cellRenderer(column, subject[column.key]));
}

function buildPrintHtml({ student, gpa, subjects }, logoUrl) {
  const totalPassed = subjects.filter((subject) => subject.grade_status === 'official' && subject.remarks === 'passed').length;
  const totalSubjects = subjects.length;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateTimeStr = now.toLocaleString('en-PH');

  function semRows(semSubjects) {
    return semSubjects.map((subject, index) => {
      const enrolled = !!subject.enrollment_id;
      const showGrades = canShowGrade(subject);
      const { label, color, bg } = remarkLabel(subject);
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      const nameColor = enrolled ? '#1e293b' : '#94a3b8';
      const gradeCells = buildGradeCells(subject, (_column, value) => {
        const display = enrolled && showGrades ? gradeStr(value) : '-';
        const currentColor = enrolled && showGrades && value != null ? gradeColor(value) : '#94a3b8';
        return `<td style="padding:3px 6px;border:1px solid #e2e8f0;font-size:10px;font-weight:700;color:${currentColor};text-align:center">${display}</td>`;
      }).join('');

      return `<tr style="background:${rowBg}">
        <td style="padding:3px 6px;border:1px solid #e2e8f0;font-family:monospace;font-size:9px;color:#64748b;white-space:nowrap">${subject.code}</td>
        <td style="padding:3px 6px;border:1px solid #e2e8f0;font-size:10px;color:${nameColor};text-align:left">${subject.name}</td>
        <td style="padding:3px 6px;border:1px solid #e2e8f0;font-size:10px;color:#64748b;text-align:center">${subject.units}</td>
        ${gradeCells}
        <td style="padding:3px 6px;border:1px solid #e2e8f0;text-align:center">
          <span style="display:inline-block;padding:1px 6px;border-radius:20px;font-size:8px;font-weight:800;letter-spacing:0.4px;color:${color};background:${bg}">${label}</span>
        </td>
      </tr>`;
    }).join('');
  }

  function semBlock(semSubjects, semLabel) {
    if (!semSubjects.length) return '';

    const totalUnits = semSubjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
    const taken = semSubjects.filter((subject) => subject.enrollment_id).length;
    const official = semSubjects.filter((subject) => subject.enrollment_id && subject.grade_status === 'official' && subject.final_grade != null);
    const semGpa = official.length
      ? (official.reduce((sum, subject) => sum + parseFloat(subject.final_grade) * subject.units, 0) / official.reduce((sum, subject) => sum + subject.units, 0)).toFixed(2)
      : null;

    return `
      <div style="margin-bottom:10px;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;background:#f1f5f9;padding:4px 8px;border:1px solid #e2e8f0;border-bottom:none">
          <span style="font-weight:700;font-size:10px;color:#1e293b">${semLabel}</span>
          <span style="font-size:8px;color:#94a3b8">${taken}/${semSubjects.length} taken | ${totalUnits} units${semGpa ? `<span style="margin-left:8px;color:#475569;font-weight:700">GPA ${semGpa}</span>` : ''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:3px 6px;border:1px solid #e2e8f0;font-size:8px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;text-align:center">Code</th>
              <th style="padding:3px 6px;border:1px solid #e2e8f0;font-size:8px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;text-align:left;width:28%">Subject</th>
              <th style="padding:3px 6px;border:1px solid #e2e8f0;font-size:8px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;text-align:center">Units</th>
              ${GRADE_COLUMNS.map((column) => `
                <th style="padding:3px 6px;border:1px solid #e2e8f0;font-size:8px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;text-align:center">${column.label}</th>
              `).join('')}
              <th style="padding:3px 6px;border:1px solid #e2e8f0;font-size:8px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;text-align:center">Remarks</th>
            </tr>
          </thead>
          <tbody>${semRows(semSubjects)}</tbody>
        </table>
      </div>`;
  }

  function yearBlock(year) {
    const yearSubjects = subjects.filter((subject) => subject.year_level === year);
    const hasSubjects = SEMESTERS.some((semester) => yearSubjects.some((subject) => subject.semester === semester));
    if (!hasSubjects) return '';

    const yearUnits = yearSubjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
    const yearPassed = yearSubjects.filter((subject) => subject.grade_status === 'official' && subject.remarks === 'passed').length;

    return `
      <div style="margin-bottom:14px">
        <div style="background:linear-gradient(90deg,#5a0d1a,#7a1324);color:#fff;padding:5px 10px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:800;font-size:12px;letter-spacing:0.3px">Year ${year}</span>
          <span style="font-size:9px;color:rgba(255,255,255,0.65)">${yearPassed} passed | ${yearUnits} total units</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;padding:8px 8px 0">
          ${SEMESTERS.map((semester) => {
            const semSubjects = yearSubjects.filter((subject) => subject.semester === semester);
            return semBlock(semSubjects, SEM_LABELS[semester]);
          }).join('')}
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Transcript - ${student?.name || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    @page { size: letter portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; color: #1e293b; margin: 0; padding: 0; }
  </style>
</head>
<body>
<div style="max-width:100%;padding:0">
  <div style="display:flex;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #7a1324">
    <div style="width:46px;height:46px;border-radius:8px;background:#f8fafc;display:flex;align-items:center;justify-content:center;margin-right:10px;border:1px solid #e2e8f0;overflow:hidden;flex-shrink:0">
      <img src="${logoUrl}" alt="MOIST" style="width:40px;height:40px;object-fit:contain" onerror="this.style.display='none';document.getElementById('seal-text').style.display='block'"/>
      <span id="seal-text" style="display:none;font-size:7px;font-weight:900;color:#7a1324;letter-spacing:1px">MOIST</span>
    </div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:900;color:#7a1324;letter-spacing:0.5px">MOIST, INC.</div>
      <div style="font-size:9px;color:#64748b;margin-top:1px">Mindanao Online Information System for Technology</div>
      <div style="font-size:8px;color:#94a3b8;margin-top:1px;letter-spacing:0.3px;text-transform:uppercase">Academic Transcript of Records</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Date Generated</div>
      <div style="font-size:10px;color:#475569;font-weight:700;margin-top:1px">${dateStr}</div>
    </div>
  </div>

  <div style="display:flex;gap:14px;margin-bottom:12px;align-items:center">
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0 16px">
      ${[
        ['Full Name', student?.name],
        ['Student No.', student?.student_number],
        ['Course', student?.course],
        ['Year Level', student?.year_level ? `Year ${student.year_level}` : '-'],
      ].map(([label, value]) => `
        <div style="padding-bottom:6px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:7.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          <div style="font-size:11px;font-weight:800;color:#1e293b;margin-top:1px">${value || '-'}</div>
        </div>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 20px;background:linear-gradient(135deg,#5a0d1a,#7a1324);border-radius:10px;min-width:110px;flex-shrink:0">
      <div style="font-size:8px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.5px">Official GPA</div>
      <div style="font-size:30px;font-weight:900;color:#fff;line-height:1.1;margin:2px 0">${gpa ?? '-'}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.5)">${totalPassed}/${totalSubjects} passed</div>
    </div>
  </div>

  ${YEARS.map((year) => yearBlock(year)).join('')}

  <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;page-break-inside:avoid">
    ${[['Prepared by', 'Registrar Staff'], ['Reviewed by', 'Academic Dean'], ['Certified by', 'University Registrar']].map(([role, name]) => `
      <div style="text-align:center">
        <div style="border-top:1.5px solid #1e293b;padding-top:6px;margin-top:44px">
          <div style="font-size:11px;font-weight:700;color:#1e293b">${name}</div>
          <div style="font-size:9px;color:#94a3b8;margin-top:1px">${role}</div>
        </div>
      </div>`).join('')}
  </div>

  <div style="margin-top:18px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between">
    <span style="font-size:7.5px;color:#cbd5e1">MOIST Integrated Student Information System | Internal Academic Record</span>
    <span style="font-size:7.5px;color:#cbd5e1">Printed: ${dateTimeStr}</span>
  </div>
</div>
</body>
</html>`;
}

function printTranscript(data) {
  const logoUrl = `${window.location.origin}/moist-seal.png`;
  const html = buildPrintHtml(data, logoUrl);
  const printWindow = window.open('', '_blank', 'width=1200,height=850');
  if (!printWindow) {
    alert('Allow pop-ups to print the transcript.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 800);
}

function RemarkBadge({ subject }) {
  const { label, color, bg } = remarkLabel(subject);
  if (label === '-') return <span className="text-xs text-slate-300">-</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: 0.4,
        color,
        background: bg,
      }}
    >
      {label}
    </span>
  );
}

function SemCard({ subjects, semLabel }) {
  const totalUnits = subjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
  const taken = subjects.filter((subject) => subject.enrollment_id).length;
  const official = subjects.filter((subject) => subject.enrollment_id && subject.grade_status === 'official' && subject.final_grade != null);
  const semGpa = official.length
    ? (official.reduce((sum, subject) => sum + parseFloat(subject.final_grade) * subject.units, 0) / official.reduce((sum, subject) => sum + subject.units, 0)).toFixed(2)
    : null;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-slate-200 bg-slate-100 px-3 py-1.5">
        <span className="text-xs font-bold text-slate-700">{semLabel}</span>
        <span className="text-[10px] text-slate-400">
          {taken}/{subjects.length} taken | {totalUnits} units
          {semGpa && <span className="ml-2 font-bold text-slate-600">GPA {semGpa}</span>}
        </span>
      </div>
      <div className="overflow-hidden rounded-b-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-400">Code</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-400">Subject</th>
              <th className="border-b border-slate-200 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">Units</th>
              {GRADE_COLUMNS.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  {column.label}
                </th>
              ))}
              <th className="border-b border-slate-200 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, index) => {
              const enrolled = !!subject.enrollment_id;
              const showGrades = canShowGrade(subject);

              return (
                <tr key={subject.subject_id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{subject.code}</td>
                  <td className={`px-3 py-2 text-left ${enrolled ? 'text-slate-800' : 'text-slate-300'}`}>{subject.name}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{subject.units}</td>
                  {buildGradeCells(subject, (column, value) => (
                    <td key={column.key} className="px-3 py-2 text-center font-bold" style={{ color: enrolled && showGrades && value != null ? gradeColor(value) : '#cbd5e1' }}>
                      {enrolled && showGrades ? gradeStr(value) : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <RemarkBadge subject={subject} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TranscriptPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    client.get(`/students/${studentId}/prospectus`)
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.response?.data?.error || 'Failed to load transcript.');
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="h-8 w-8 animate-spin text-[#7a1324]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Loading transcript...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="font-semibold text-red-500">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-sm text-slate-500 underline">Go back</button>
        </div>
      </div>
    );
  }

  const student = data?.student;
  const gpa = data?.gpa;
  const subjects = data?.subjects ?? [];
  const totalPassed = subjects.filter((subject) => subject.grade_status === 'official' && subject.remarks === 'passed').length;
  const totalSubjects = subjects.length;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-slate-200">|</span>
        <span className="text-sm font-bold text-slate-700">Academic Transcript</span>
        <span className="text-xs text-slate-300">|</span>
        <span className="text-sm text-slate-500">{student?.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-400">Portrait | Letter</span>
          <button
            onClick={() => printTranscript(data)}
            className="flex items-center gap-2 rounded-xl bg-[#7a1324] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#5a0d1a]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-5a1 1 0 00-1-1H9a1 1 0 00-1 1v5a1 1 0 001 1zm1-9V5a1 1 0 00-1-1H9a1 1 0 00-1 1v3"
              />
            </svg>
            Print Transcript
          </button>
        </div>
      </div>

      <div className="mx-auto p-6">
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-[#5a0d1a] via-[#7a1324] to-[#a01830]" />
          <div className="flex items-start gap-6 p-6">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#7a1324]/10">
              <span className="text-2xl font-black text-[#7a1324]">
                {(student?.name || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ['Full Name', student?.name],
                ['Student Number', student?.student_number],
                ['Course', student?.course],
                ['Year Level', student?.year_level ? `Year ${student.year_level}` : '-'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{value || '-'}</p>
                </div>
              ))}
            </div>
            <div className="flex min-w-[120px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#5a0d1a] to-[#7a1324] px-8 py-5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Official GPA</p>
              <p className="mt-1 text-4xl font-black leading-none text-white">{gpa ?? '-'}</p>
              <p className="mt-1.5 text-[9px] text-white/50">{totalPassed}/{totalSubjects} passed</p>
            </div>
          </div>
        </div>

        {YEARS.map((year) => {
          const yearSubjects = subjects.filter((subject) => subject.year_level === year);
          const hasSubjects = SEMESTERS.some((semester) => yearSubjects.some((subject) => subject.semester === semester));
          if (!hasSubjects) return null;

          const yearPassed = yearSubjects.filter((subject) => subject.grade_status === 'official' && subject.remarks === 'passed').length;
          const yearUnits = yearSubjects.reduce((sum, subject) => sum + (subject.units || 0), 0);

          return (
            <div key={year} className="mb-6">
              <div className="flex items-center justify-between rounded-t-xl px-4 py-2.5" style={{ background: 'linear-gradient(90deg,#5a0d1a,#7a1324)' }}>
                <span className="text-sm font-black tracking-wide text-white">Year {year}</span>
                <span className="text-[10px] text-white/60">{yearPassed} passed | {yearUnits} total units</span>
              </div>
              <div className="overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 pb-0">
                {SEMESTERS.map((semester) => {
                  const semSubjects = yearSubjects.filter((subject) => subject.semester === semester);
                  if (!semSubjects.length) return null;
                  return <SemCard key={semester} subjects={semSubjects} semLabel={SEM_LABELS[semester]} />;
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Transcript now shows academic remarks like Passed or Failed, while GPA stays based on official final grades only.
        </div>
      </div>
    </div>
  );
}
