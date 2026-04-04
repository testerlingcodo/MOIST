import { useState, useEffect } from 'react';
import client from '../../api/client';

const COPY_LABELS = ['Dean Copy', 'Finance Copy', 'Registrar Copy', 'Student Copy'];

function scheduleLabel(subject) {
  const days = subject.schedule_days || 'TBA';
  const time =
    subject.start_time && subject.end_time
      ? `${subject.start_time}–${subject.end_time}`
      : 'TBA';
  return `${days} ${time}`;
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
  @page { size: legal portrait; margin: 6mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    font-family: 'Plus Jakarta Sans', Arial, sans-serif;
    background: white;
  }
  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
  }
  @media print { .page { width: 100%; height: 100%; } }
  .copy {
    border: 1px solid rgba(122,19,36,0.3);
    background: white;
    padding: 3px 7px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    gap: 2px;
    flex: 1;
  }
  .copy + .copy { border-top: 1.5px dashed rgba(122,19,36,0.5); }
  .hdr {
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 2px solid #f6c445;
    padding-bottom: 5px;
    margin-bottom: 4px;
  }
  .hdr img { width: 34px; height: 34px; object-fit: contain; flex-shrink: 0; }
  .school { flex: 1; }
  .school-name {
    font-size: 9px; font-weight: 900; color: #7a1324;
    letter-spacing: 0.07em; text-transform: uppercase; line-height: 1.1;
  }
  .school-sub { font-size: 6px; color: #555; line-height: 1.3; }
  .doc-type { font-size: 7px; font-weight: 700; color: #374151; margin-top: 1px; }
  .copy-label {
    font-size: 7px; background: #fff8eb; border: 1px solid #f6c445;
    color: #7a1324; padding: 2px 7px; border-radius: 10px; font-weight: 800;
    white-space: nowrap; align-self: flex-start;
  }
  .slip-body { display: flex; gap: 6px; flex: 1; margin-top: 2px; }
  .slip-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .info {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px 10px; margin-bottom: 4px; font-size: 7.5px;
  }
  .info-lbl { color: #7a1324; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 7px; }
  thead th {
    background: #fff8eb; border: 1px solid rgba(122,19,36,0.22);
    padding: 2px 3px; text-align: left; font-weight: 800;
    color: #5a0d1a; white-space: nowrap;
  }
  tbody td { border: 1px solid rgba(122,19,36,0.15); padding: 2px 3px; vertical-align: middle; }
  tfoot td {
    border: 1px solid rgba(122,19,36,0.22); padding: 2px 3px;
    font-weight: 800; color: #7a1324; background: #fff8eb;
  }
  .aside {
    width: 58px; flex-shrink: 0;
    border-left: 1.5px dashed rgba(122,19,36,0.4);
    padding-left: 5px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .aside-title {
    font-size: 7px; font-weight: 900; color: #7a1324;
    text-transform: uppercase; letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(122,19,36,0.3); padding-bottom: 2px;
  }
  .aside-item { display: flex; flex-direction: column; gap: 1px; }
  .aside-lbl { font-size: 6px; color: #666; }
  .aside-val { font-size: 8px; font-weight: 800; color: #111; }
  .aside-balance { border-top: 1px solid rgba(122,19,36,0.25); padding-top: 3px; margin-top: 1px; }
  .aside-note { margin-top: auto; font-size: 5.5px; color: #999; font-style: italic; line-height: 1.4; }
  .welcome { margin-top: auto; font-size: 6px; font-weight: 900; color: #7a1324; text-align: center; line-height: 1.5; letter-spacing: .2px; border-top: 1.5px solid rgba(122,19,36,0.3); padding-top: 3px; }
`;

function buildCopyHtml(batch, subjects, totalUnits, copyLabel, sealUrl, totalPaid) {
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const assessed = Number(batch?.assessed_amount || 0);
  const paid = Number(totalPaid || 0);
  const remaining = assessed - paid;

  const rows = subjects.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:5px">No subjects enrolled</td></tr>`
    : subjects.map(s => `
        <tr>
          <td style="font-weight:700">${s.subject_code || ''}</td>
          <td>${s.subject_name || ''}</td>
          <td style="text-align:center">${s.units || ''}</td>
          <td>${s.schedule_days || 'TBA'} ${s.start_time && s.end_time ? s.start_time + '–' + s.end_time : ''}</td>
          <td>${s.room || 'TBA'}</td>
        </tr>`).join('');

  return `
    <div class="copy">
      <div class="hdr">
        <img src="${sealUrl}" alt="seal" onerror="this.style.display='none'" />
        <div class="school">
          <div class="school-name">MOIST, INC.</div>
          <div class="school-sub">Balingasag, Misamis Oriental</div>
          <div class="doc-type">Enrollment Subject Slip</div>
        </div>
        <span class="copy-label">${copyLabel}</span>
      </div>

      <div class="slip-body">
        <div class="slip-main">
          <div class="info">
            <div><span class="info-lbl">Student: </span>${batch?.last_name || ''}, ${batch?.first_name || ''}</div>
            <div><span class="info-lbl">Student No.: </span>${batch?.student_number || '—'}</div>
            <div><span class="info-lbl">Course: </span>${batch?.course || '—'}</div>
            <div><span class="info-lbl">Year Level: </span>${batch?.year_level || '—'}</div>
            <div><span class="info-lbl">School Year: </span>${batch?.school_year || '—'}</div>
            <div><span class="info-lbl">Semester: </span>${batch?.semester || '—'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:14%">Code</th>
                <th style="width:35%">Subject</th>
                <th style="width:6%;text-align:center">Units</th>
                <th style="width:27%">Schedule</th>
                <th style="width:18%">Room</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="2">Total Units</td>
                <td style="text-align:center">${totalUnits}</td>
                <td colspan="2">Sec: ${subjects[0]?.section_name || 'TBA'}</td>
              </tr>
            </tfoot>
          </table>
          ${copyLabel === 'Student Copy' ? `<div class="welcome">Welcome, Moistian!<br/>You are officially enrolled. We are proud to have you!</div>` : ''}
        </div>

        <div class="aside">
          <div class="aside-title">ASSESSMENT</div>
          <div class="aside-item">
            <div class="aside-lbl">Total Tuition Fee</div>
            <div class="aside-val">${assessed > 0 ? fmt(assessed) : '—'}</div>
          </div>
          <div class="aside-item aside-balance">
            <div class="aside-lbl">Enrollment Fee Paid</div>
            <div class="aside-val" style="color:#166534">${paid > 0 ? fmt(paid) : '₱0.00'}</div>
          </div>
          <div class="aside-item aside-balance">
            <div class="aside-lbl">Remaining Balance</div>
            <div class="aside-val" style="color:${remaining > 0 ? '#7a1324' : '#166534'}">${assessed > 0 ? fmt(Math.max(0, remaining)) : '—'}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function buildPrintHtml(batch, subjects, totalUnits, totalPaid) {
  const sealUrl = `${window.location.origin}/moist-seal.png`;
  const slips = COPY_LABELS.map(label =>
    buildCopyHtml(batch, subjects, totalUnits, label, sealUrl, totalPaid)
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Enrollment Slip — ${batch?.last_name || ''}, ${batch?.first_name || ''}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="page">${slips}</div>
</body>
</html>`;
}

export default function PrintableEnrollmentSheet({ batch, onClose }) {
  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((sum, s) => sum + Number(s.units || 0), 0);
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const assessed = Number(batch?.assessed_amount || 0);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  useEffect(() => {
    if (!batch?.id) { setPaymentsLoading(false); return; }
    setPaymentsLoading(true);
    client.get(`/payments/batch/${batch.id}`)
      .then(res => { setPayments(res.data || []); setPaymentsLoading(false); })
      .catch((err) => { console.error('Failed to load payments:', err); setPayments([]); setPaymentsLoading(false); });
  }, [batch?.id]);

  const totalPaid = payments.filter(p => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0);
  const remaining = assessed - totalPaid;

  const handlePrint = () => {
    const html = buildPrintHtml(batch, subjects, totalUnits, totalPaid);
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) { alert('Allow pop-ups to print the enrollment slip.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => { win.focus(); win.print(); });
  };

  return (
    <div>
      {/* Screen controls */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#7a1324]">Enrollment Print Copies</h2>
          <p className="text-xs text-slate-500">
            4 copies on 1 legal portrait page (stacked landscape slips, cut along dashed lines).
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={handlePrint} disabled={paymentsLoading}>
            {paymentsLoading ? 'Loading...' : 'Print'}
          </button>
        </div>
      </div>

      {/* Screen preview — 2 slips stacked */}
      <div className="flex flex-col gap-2" style={{ fontFamily: 'Arial, sans-serif' }}>
        {COPY_LABELS.map((copy, idx) => (
          <div key={copy}>
            {idx > 0 && idx % 2 === 0 && (
              <div style={{ textAlign: 'center', fontSize: 8, color: '#aaa', borderTop: '1.5px dashed #ccc', borderBottom: '1.5px dashed #ccc', padding: '1px 0', margin: '4px 0' }}>
                ✂ page break ✂
              </div>
            )}
            {idx % 2 !== 0 && (
              <div style={{ textAlign: 'center', fontSize: 8, color: '#bbb', borderTop: '1.5px dashed #ddd', borderBottom: '1.5px dashed #ddd', padding: '1px 0', margin: '2px 0' }}>
                ✂ cut here ✂
              </div>
            )}
            <div
              style={{
                border: '1px solid rgba(122,19,36,0.25)',
                background: 'white',
                padding: '8px 10px',
                fontSize: 8,
                lineHeight: 1.35,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '2px solid #f6c445', paddingBottom: 5, marginBottom: 4 }}>
                <img src="/moist-seal.png" alt="seal" style={{ width: 34, height: 34, objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none'; }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: '#7a1324', letterSpacing: '0.06em', textTransform: 'uppercase' }}>MOIST, INC.</div>
                  <div style={{ fontSize: 6.5, color: '#555' }}>Balingasag, Misamis Oriental</div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: '#374151', marginTop: 1 }}>Enrollment Subject Slip</div>
                </div>
                <span style={{
                  fontSize: 7, background: '#fff8eb', border: '1px solid #f6c445',
                  color: '#7a1324', padding: '2px 7px', borderRadius: 10, fontWeight: 800,
                }}>{copy}</span>
              </div>

              {/* Body: main + aside */}
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 10px', marginBottom: 4, fontSize: 7.5 }}>
                    <div><span style={{ color: '#7a1324', fontWeight: 700 }}>Student: </span>{batch?.last_name}, {batch?.first_name}</div>
                    <div><span style={{ color: '#7a1324', fontWeight: 700 }}>Student No.: </span>{batch?.student_number || '—'}</div>
                    <div><span style={{ color: '#7a1324', fontWeight: 700 }}>Course: </span>{batch?.course || '—'}</div>
                    <div><span style={{ color: '#7a1324', fontWeight: 700 }}>Year Level: </span>{batch?.year_level || '—'}</div>
                    <div><span style={{ color: '#7a1324', fontWeight: 700 }}>School Year: </span>{batch?.school_year || '—'}</div>
                    <div><span style={{ color: '#7a1324', fontWeight: 700 }}>Semester: </span>{batch?.semester || '—'}</div>
                  </div>

                  {/* Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7 }}>
                    <thead>
                      <tr>
                        {['Code', 'Subject', 'Units', 'Schedule', 'Room'].map(h => (
                          <th key={h} style={{ background: '#fff8eb', border: '1px solid rgba(122,19,36,0.22)', padding: '2px 3px', textAlign: 'left', fontWeight: 800, color: '#5a0d1a' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: 6 }}>No subjects</td></tr>
                      ) : subjects.map((s) => (
                        <tr key={s.enrollment_id || s.subject_id}>
                          <td style={{ border: '1px solid rgba(122,19,36,0.15)', padding: '2px 3px', fontWeight: 700 }}>{s.subject_code}</td>
                          <td style={{ border: '1px solid rgba(122,19,36,0.15)', padding: '2px 3px' }}>{s.subject_name}</td>
                          <td style={{ border: '1px solid rgba(122,19,36,0.15)', padding: '2px 3px', textAlign: 'center' }}>{s.units}</td>
                          <td style={{ border: '1px solid rgba(122,19,36,0.15)', padding: '2px 3px' }}>{scheduleLabel(s)}</td>
                          <td style={{ border: '1px solid rgba(122,19,36,0.15)', padding: '2px 3px' }}>{s.room || 'TBA'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ border: '1px solid rgba(122,19,36,0.22)', padding: '2px 3px', fontWeight: 800, color: '#7a1324', background: '#fff8eb' }}>Total Units</td>
                        <td style={{ border: '1px solid rgba(122,19,36,0.22)', padding: '2px 3px', textAlign: 'center', fontWeight: 800, color: '#7a1324', background: '#fff8eb' }}>{totalUnits}</td>
                        <td colSpan={2} style={{ border: '1px solid rgba(122,19,36,0.22)', padding: '2px 3px', fontWeight: 800, color: '#7a1324', background: '#fff8eb' }}>Sec: {subjects[0]?.section_name || 'TBA'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Assessment aside */}
                <div style={{ width: 72, flexShrink: 0, borderLeft: '1.5px dashed rgba(122,19,36,0.35)', paddingLeft: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 7, fontWeight: 900, color: '#7a1324', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(122,19,36,0.25)', paddingBottom: 2 }}>ASSESSMENT</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{ fontSize: 6, color: '#666' }}>Total Tuition Fee</div>
                    <div style={{ fontSize: 8, fontWeight: 800 }}>{assessed > 0 ? fmt(assessed) : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid rgba(122,19,36,0.2)', paddingTop: 3 }}>
                    <div style={{ fontSize: 6, color: '#666' }}>Enrollment Fee Paid</div>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#166534' }}>{fmt(totalPaid)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid rgba(122,19,36,0.2)', paddingTop: 3 }}>
                    <div style={{ fontSize: 6, color: '#666' }}>Remaining Balance</div>
                    <div style={{ fontSize: 8, fontWeight: 800, color: remaining > 0 ? '#7a1324' : '#166534' }}>{assessed > 0 ? fmt(Math.max(0, remaining)) : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
