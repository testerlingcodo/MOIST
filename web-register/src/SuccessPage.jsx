export default function SuccessPage({ result }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-8 text-center"
          style={{ background: 'linear-gradient(135deg,#5a0d1a,#7a1324,#a01830)' }}
        >
          <div className="text-5xl mb-3">🎓</div>
          <div className="font-black text-base tracking-widest mb-1" style={{ color: '#ffd700' }}>MOIST, INC.</div>
          <div className="text-white/75 text-xs">Student Information Portal</div>
        </div>

        {/* Body */}
        <div className="px-6 py-8 space-y-5 text-center">
          <h2 className="text-2xl font-extrabold text-slate-800">Registration Submitted!</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your registration has been submitted successfully. Please wait for the Registrar to approve your account before you can log in.
          </p>

          {/* Student Number */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-5 px-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Student Number</div>
            <div className="text-4xl font-black tracking-widest" style={{ color: '#7a1324' }}>
              {result.studentNumber}
            </div>
            <div className="text-xs text-slate-400 mt-2">Keep this for your records</div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-left">
            <p className="text-sm text-yellow-800 leading-relaxed">
              <strong>What's next?</strong><br />
              Once approved by the Registrar, log in to the student portal using your student number and the password you set.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="text-center text-xs text-slate-400">
            MOIST, Inc. – Student Information Portal<br />
            This is an automated message.
          </div>
        </div>
      </div>
    </div>
  );
}
