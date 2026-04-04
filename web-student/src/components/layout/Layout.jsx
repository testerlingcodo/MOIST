import { useState } from 'react';
import Sidebar from './Sidebar';
import MoistSeal from '../branding/MoistSeal';

export default function Layout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <Sidebar mobile open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#7a1324]/10 bg-[rgba(255,253,248,0.96)] px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#7a1324]/10 bg-white text-[#7a1324]"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <MoistSeal size={32} />
              <div>
                <p className="text-sm font-black text-[#7a1324] leading-tight">MOIST</p>
                <p className="text-[10px] text-slate-500 leading-tight">Student Portal</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="min-h-full w-full">
          {children}
          </div>
        </main>
        </div>
    </div>
  );
}
