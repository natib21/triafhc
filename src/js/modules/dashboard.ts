// Dashboard Overview Module
import { store } from '../store';

export function renderDashboard() {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  const totalInsts = store.institutions.length;
  const activeReqs = store.allocationRequests.filter(r => r.status === 'PENDING').length;
  const queuedCount = store.allocationQueue.filter(q => q.status === 'QUEUED').length;
  const completedReqs = store.allocationRequests.filter(r => r.status === 'COMPLETED').length;

  const html = `
    <div class="space-y-6 animate-fade-in">
      <!-- Welcome Banner -->
      <div class="p-6 sm:p-8 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold font-sans tracking-tight text-white">Federal Housing Corporation</h2>
          <p class="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-xl font-medium">
            Welcome to the FHC Enterprise Administrative Portal. Manage institution tiers, allocate houses to qualifying public servants, and monitor state housing requests.
          </p>
        </div>
        <div class="flex items-center gap-2.5">
          <button data-nav-tab="allocation-requests" class="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 rounded-lg text-xs font-bold tracking-wider uppercase transition-all">
            <i class="fa-solid fa-plus mr-1.5"></i> New Request
          </button>
          <button data-nav-tab="queue-management" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg text-xs font-bold tracking-wider uppercase transition-all shadow-xs">
            Manage Queue <i class="fa-solid fa-arrow-right ml-1.5"></i>
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Stat Item 1 -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Institutions</p>
            <p class="text-2xl font-bold text-slate-900">${totalInsts}</p>
          </div>
          <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <i class="fa-solid fa-building text-lg"></i>
          </div>
        </div>

        <!-- Stat Item 2 -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Requests</p>
            <p class="text-2xl font-bold text-amber-600">${activeReqs}</p>
          </div>
          <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <i class="fa-regular fa-paper-plane text-lg animate-pulse"></i>
          </div>
        </div>

        <!-- Stat Item 3 -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Queue Size</p>
            <p class="text-2xl font-bold text-indigo-600">${queuedCount}</p>
          </div>
          <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <i class="fa-solid fa-list-ol text-lg"></i>
          </div>
        </div>

        <!-- Stat Item 4 -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Allocations Completed</p>
            <p class="text-2xl font-bold text-emerald-600">${completedReqs}</p>
          </div>
          <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <i class="fa-solid fa-circle-check text-lg"></i>
          </div>
        </div>
      </div>

      <!-- Secondary Info Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Requests -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-sm tracking-tight">Recent Housing Requests</h3>
            <button data-nav-tab="allocation-requests" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider">View All</button>
          </div>

          <div class="divide-y divide-slate-100">
            ${store.allocationRequests.slice(-4).reverse().map(req => {
              const inst = store.institutions.find(i => i.id === req.institutionId);
              let statusBadge = '';
              if (req.status === 'PENDING') {
                statusBadge = '<span class="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded border border-amber-200">PENDING</span>';
              } else if (req.status === 'APPROVED') {
                statusBadge = '<span class="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">APPROVED</span>';
              } else if (req.status === 'COMPLETED') {
                statusBadge = '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200">COMPLETED</span>';
              } else {
                statusBadge = '<span class="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-semibold rounded border border-rose-200">REJECTED</span>';
              }

              return `
                <div class="py-3.5 flex items-center justify-between gap-4">
                  <div class="space-y-0.5 min-w-0">
                    <p class="font-semibold text-slate-800 text-xs truncate">${req.referenceNumber}</p>
                    <p class="text-slate-500 text-xs truncate">${inst ? inst.name.en : 'Unknown Institution'}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-slate-400 font-mono">${req.letterDate}</span>
                    ${statusBadge}
                  </div>
                </div>
              `;
            }).join('') || `<p class="text-slate-400 text-xs py-4 text-center">No recent allocation requests.</p>`}
          </div>
        </div>

        <!-- Portal Health & Sync Status -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-800 text-sm tracking-tight">System Connectivity</h3>
          
          <div class="space-y-3">
            <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-700">API Gateway Mode</p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  ${store.apiMode === 'mock' 
                    ? 'In-memory Offline Simulation' 
                    : 'External Live REST API'}
                </p>
              </div>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded uppercase ${
                store.apiMode === 'mock' 
                  ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }">
                ${store.apiMode === 'mock' ? 'MOCK_LOCAL' : 'LIVE_REST'}
              </span>
            </div>

            <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
              <p class="text-xs font-bold text-slate-700">API Endpoint URL</p>
              <p class="text-[11px] font-mono text-slate-500 break-all select-all bg-white p-1.5 rounded-md border border-slate-200">${store.baseURL}</p>
            </div>

            <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
              <p class="text-xs font-bold text-slate-700">Bearer Auth Token</p>
              <p class="text-[11px] font-mono text-slate-500 truncate select-all bg-white p-1.5 rounded-md border border-slate-200">Bearer ${store.token}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  contentArea.innerHTML = html;
}
