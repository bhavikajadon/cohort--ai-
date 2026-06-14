import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { LayoutDashboard, Users, Filter, Send, Zap, Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Campaigns from './pages/Campaigns';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

type Page = 'dashboard' | 'customers' | 'segments' | 'campaigns';

const NAV = [
  { id: 'dashboard' as Page, label: 'Overview', icon: LayoutDashboard },
  { id: 'customers' as Page, label: 'Shoppers', icon: Users },
  { id: 'segments' as Page, label: 'Segments', icon: Filter },
  { id: 'campaigns' as Page, label: 'Campaigns', icon: Send },
];

function Sidebar({ page, setPage, open, setOpen }: {
  page: Page; setPage: (p: Page) => void; open: boolean; setOpen: (b: boolean) => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 bg-brand-white border-r border-brand-border
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center shadow-orange-sm flex-shrink-0">
              <Zap size={15} className="text-white" fill="currentColor" />
            </div>
            <div>
              <div className="font-display font-800 text-brand-black text-base leading-none tracking-tight">
                Cohort AI
              </div>
              <div className="text-brand-gray-light text-[10px] mt-0.5 uppercase tracking-widest">
                AI · CRM
              </div>
            </div>
          </div>
        </div>

        {/* Brand context */}
        <div className="mx-4 mb-5 bg-brand-orange-pale border border-brand-orange/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand-orange rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-display font-bold">TH</span>
            </div>
            <div>
              <div className="text-brand-black text-xs font-semibold leading-none">Tommy Hilfiger</div>
              <div className="text-brand-gray text-[10px] mt-0.5">India · Fashion & Apparel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setPage(id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                page === id
                  ? 'bg-brand-orange text-white shadow-orange-sm font-medium'
                  : 'text-brand-gray hover:text-brand-black hover:bg-brand-surface'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-brand-border">
          <div className="text-brand-gray-light text-[10px] uppercase tracking-wider">Xeno FDE Challenge</div>
          <div className="text-brand-gray-light text-[10px] mt-0.5">June 2026</div>
        </div>
      </aside>
    </>
  );
}

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const PAGE_MAP: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard onNavigate={setPage} />,
    customers: <Customers />,
    segments: <Segments onNavigate={setPage} />,
    campaigns: <Campaigns />,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-brand-bg flex">
        <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} />

        <main className="flex-1 min-w-0 overflow-auto">
          {/* Mobile topbar */}
          <div className="lg:hidden flex items-center gap-3 p-4 bg-brand-white border-b border-brand-border sticky top-0 z-10">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu size={20} className="text-brand-gray" />
            </button>
            <div className="font-display font-bold text-brand-black text-sm">Cohort AI</div>
          </div>

          <div className="max-w-5xl mx-auto p-5 lg:p-8">
            {PAGE_MAP[page]}
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;