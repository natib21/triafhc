// House Allocation Queue Management Module
import { store, QueueItem } from '../store';
import { Table, Modal, Toast } from '../components';

// ─── Priority factor metadata ─────────────────────────────────────────────
// These four are the ONLY factors the real backend recognizes for preview
// (PriorityFactorKey in house-allocation-queue.service.ts). FIFO and the
// final id tie-breaker are never previewable/removable — they're always
// system-calculated, so they get no button, just a tooltip.
type PriorityFactorKey = 'override' | 'tier' | 'history' | 'rank';

interface PriorityFactorPreviewResponse {
  beneficiaryId: string;
  factor: PriorityFactorKey;
  currentPosition: number;
  previewPosition: number;
  total: number;
  positionChanged: boolean;
  explanation: {
    isOverride: boolean;
    institution: { id: string | null; name: string; tierCode: string | null; tierPriority: number | null; allocationHistoryCount: number };
    beneficiary: { id: string | null; rankCode: string | null; rankPriority: number | null };
    registeredAt: string | null;
    priorityReason: string[];
  };
  message: string;
}

const PRIORITY_FACTOR_META: Record<PriorityFactorKey, { label: string; icon: string; color: string }> = {
  override: { label: 'Priority Override', icon: 'fa-star', color: 'amber' },
  tier: { label: 'Institution Tier', icon: 'fa-building-columns', color: 'purple' },
  history: { label: 'Allocation History', icon: 'fa-list-check', color: 'teal' },
  rank: { label: 'Beneficiary Rank', icon: 'fa-medal', color: 'blue' },
};

// ─── Module-scoped state ───────────────────────────────────────────────────
// Holds every row from the last fetch, unfiltered — filters operate on this
// in memory, so switching a dropdown never re-hits the API.
let allFlattenedData: any[] = [];

// Guards so we only ever bind the delegated listeners once per container
// element, even though renderTable() gets called on every refresh.
let outsideClickListenerAttached = false;

export function renderQueueManagement() {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Dashboard Queue Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">House Allocation Queue Management</h2>
          <p class="text-xs text-slate-500 mt-0.5">Prioritize waitlists, calculate estimated times, and execute final housing distributions.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button id="btn-check-position" class="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:bg-indigo-100 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5">
            <i class="fa-solid fa-magnifying-glass"></i> Check Queue Position
          </button>
          <button id="btn-next-queue" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-bolt"></i> Process Next in Queue
          </button>
        </div>
      </div>

      <!-- Queue Position Stats Widget -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-900 text-white p-5 rounded-xl border border-slate-950 flex items-center justify-between shadow-sm">
          <div>
            <p class="text-[10px] uppercase font-bold tracking-wider text-slate-300">Active Queue Waitlist</p>
            <p class="text-2xl font-bold mt-1" id="active-queue-count">0 Beneficiaries</p>
          </div>
          <div class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white text-base">
            <i class="fa-solid fa-clock"></i>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500">Est. Time to Clear Queue</p>
            <p class="text-xl font-bold text-slate-800 mt-1" id="avg-wait-time">N/A</p>
          </div>
          <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-base">
            <i class="fa-solid fa-hourglass-half"></i>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500">Historical Disbursals</p>
            <p class="text-xl font-bold text-emerald-600 mt-1" id="historical-disbursals">
              0 Houses Mapped
            </p>
          </div>
          <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-base">
            <i class="fa-solid fa-house"></i>
          </div>
        </div>
      </div>

      <!-- Priority Rules Explanation Grid -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h3 class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-info text-indigo-500"></i> Queue Priority Evaluation Rules
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          <div class="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
              <i class="fa-solid fa-star"></i>
              <span>⭐ Override</span>
            </div>
            <p class="text-[10px] text-slate-500 leading-normal">Applied when institution has active override tier. Evaluated first.</p>
          </div>

          <div class="bg-purple-50/50 border border-purple-100 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
              <i class="fa-solid fa-building-columns"></i>
              <span>🏛️ Tier</span>
            </div>
            <p class="text-[10px] text-slate-500 leading-normal">Institution tier priority value. Lower value = higher priority.</p>
          </div>

          <div class="bg-teal-50/50 border border-teal-100 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5 text-teal-700 font-bold text-xs">
              <i class="fa-solid fa-list-check"></i>
              <span>📋 History</span>
            </div>
            <p class="text-[10px] text-slate-500 leading-normal">Institutions with fewer previous allocations get priority.</p>
          </div>

          <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
              <i class="fa-solid fa-medal"></i>
              <span>🏅 Rank</span>
            </div>
            <p class="text-[10px] text-slate-500 leading-normal">Beneficiary rank priority. Lower value = higher priority.</p>
          </div>

          <div class="bg-slate-50 border border-slate-150 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
              <i class="fa-solid fa-clock"></i>
              <span>⏰ FIFO</span>
            </div>
            <p class="text-[10px] text-slate-500 leading-normal">Tie-breaker: earliest registration gets priority.</p>
          </div>

        </div>
      </div>

      <!-- Filter Bar -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-end gap-3">
        <div class="flex-1 min-w-[160px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rank</label>
          <select id="filter-rank" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500">
            <option value="">All Ranks</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Beneficiary Institution</label>
          <select id="filter-beneficiary-institution" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500">
            <option value="">All Institutions</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Request Institution</label>
          <select id="filter-requesting-institution" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500">
            <option value="">All Institutions</option>
          </select>
        </div>
        <button id="btn-clear-filters" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors">
          <i class="fa-solid fa-filter-circle-xmark mr-1"></i> Clear Filters
        </button>
      </div>

      <!-- Queue Allocation Table -->
      <div class="space-y-4">
        <!-- Priority Color Grouping Legend -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-layer-group text-indigo-500"></i> Priority Group Legend
          </span>
          <div class="flex flex-wrap items-center gap-3 text-[10px] font-bold">
            <div class="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700">
              <span class="w-2 h-2 bg-rose-500 rounded-full"></span> OVERRIDE
            </div>
            <div class="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md text-indigo-700">
              <span class="w-2 h-2 bg-indigo-500 rounded-full"></span> TIER + RANK
            </div>
            <div class="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
              <span class="w-2 h-2 bg-blue-500 rounded-full"></span> TIER ONLY
            </div>
            <div class="flex items-center gap-1.5 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded-md text-teal-700">
              <span class="w-2 h-2 bg-teal-500 rounded-full"></span> RANK ONLY
            </div>
            <div class="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600">
              <span class="w-2 h-2 bg-slate-400 rounded-full"></span> FIFO (No factors)
            </div>
          </div>
        </div>

        <div class="overflow-x-auto w-full">
          <div id="queue-table-container"></div>
        </div>
      </div>
    </div>
  `;

  // Reset per-mount state so re-mounting the view doesn't carry stale data
  // or double-bind the outside-click listener.
  allFlattenedData = [];
  outsideClickListenerAttached = false;

  // ─── Filter helpers ───────────────────────────────────────────────────

  function populateFilterOptions(data: any[]) {
    const rankSelect = document.getElementById('filter-rank') as HTMLSelectElement;
    const beneficiaryInstSelect = document.getElementById('filter-beneficiary-institution') as HTMLSelectElement;
    const requestingInstSelect = document.getElementById('filter-requesting-institution') as HTMLSelectElement;
    if (!rankSelect || !beneficiaryInstSelect || !requestingInstSelect) return;

    const fillOptions = (select: HTMLSelectElement, values: string[], placeholder: string) => {
      const previousValue = select.value;
      select.innerHTML = `<option value="">${placeholder}</option>` +
        values.map(v => `<option value="${v}">${v}</option>`).join('');
      // Preserve the current selection if it's still a valid option after refresh
      if (values.includes(previousValue)) select.value = previousValue;
    };

    const uniqueSorted = (vals: (string | undefined)[]) =>
      Array.from(new Set(vals.filter((v): v is string => !!v && v !== 'N/A'))).sort((a, b) => a.localeCompare(b));

    fillOptions(rankSelect, uniqueSorted(data.map(d => d.beneficiaryRank)), 'All Ranks');
    fillOptions(beneficiaryInstSelect, uniqueSorted(data.map(d => d.beneficiaryInstitutionName)), 'All Institutions');
    fillOptions(requestingInstSelect, uniqueSorted(data.map(d => d.requestingInstitutionName)), 'All Institutions');
  }

  function getFilteredData(): any[] {
    const rank = (document.getElementById('filter-rank') as HTMLSelectElement)?.value || '';
    const beneficiaryInst = (document.getElementById('filter-beneficiary-institution') as HTMLSelectElement)?.value || '';
    const requestingInst = (document.getElementById('filter-requesting-institution') as HTMLSelectElement)?.value || '';

    return allFlattenedData.filter(item => {
      if (rank && item.beneficiaryRank !== rank) return false;
      if (beneficiaryInst && item.beneficiaryInstitutionName !== beneficiaryInst) return false;
      if (requestingInst && item.requestingInstitutionName !== requestingInst) return false;
      return true;
    });
  }

  function renderFilteredTable() {
    renderTable(getFilteredData());
  }

  // ─── Table render (single source of truth — 3-dot dropdown actions) ───

  function renderTable(data: any[]) {
    Table.render<any>({
      containerId: 'queue-table-container',
      loading: false,
      placeholderText: 'Search waitlist queue...',
      columns: [
        {
          header: '#',
          key: 'position',
          sortable: true,
          render: (item) => `
            <span class="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-800 font-black rounded-lg text-xs border border-slate-200">
              ${item.position}
            </span>
          `
        },
        {
          header: 'Beneficiary',
          key: 'beneficiaryName',
          sortable: true,
          render: (item) => `
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800 text-sm">${item.beneficiaryName}</span>
                ${item.beneficiaryRank !== 'N/A' ? `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-medium rounded border border-blue-200">${item.beneficiaryRank}</span>` : ''}
                ${item.isOverrideQueue ? `
                  <span title="${item.overrideQueueReason}" class="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded border border-rose-300 flex items-center gap-1">
                    <i class="fa-solid fa-flag"></i> OVERRIDE
                  </span>` : ''}
              </div>
              <p class="text-[10px] text-slate-500 flex items-center gap-1">
                <i class="fa-solid fa-building text-slate-400 text-[9px]"></i>
                ${item.institutionName}
              </p>
            </div>
          `
        },
        {
          header: 'Beneficiary Institution',
          key: 'beneficiaryInstitutionName',
          sortable: true,
          render: (item) => {
            const hasInstitution = item.beneficiaryInstitutionName && item.beneficiaryInstitutionName !== 'N/A';
            if (!hasInstitution) {
              return `<span class="text-xs text-slate-400">No institution</span>`;
            }
            return `
              <div class="space-y-0.5">
                <p class="font-semibold text-slate-800 text-xs">${item.beneficiaryInstitutionName}</p>
                ${item.beneficiaryInstitutionCode && item.beneficiaryInstitutionCode !== 'N/A'
                  ? `<p class="text-[9px] text-slate-400 font-mono">${item.beneficiaryInstitutionCode}</p>`
                  : ''}
                ${item.beneficiaryInstitutionType && item.beneficiaryInstitutionType !== 'N/A'
                  ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[9px]">${item.beneficiaryInstitutionType}</span>`
                  : ''}
              </div>
            `;
          }
        },
        {
          header: 'Rank',
          key: 'beneficiaryRank',
          render: (item) => `
            <div class="space-y-1">
              ${item.beneficiaryRank !== 'N/A'
                ? `<div class="flex items-center gap-1.5">
                    <i class="fa-solid fa-medal text-blue-500 text-[10px]"></i>
                    <span class="font-semibold text-slate-700 text-xs">${item.beneficiaryRank}</span>
                   </div>
                   <p class="text-[9px] text-slate-400">Priority: ${item.beneficiaryRankPriority}</p>`
                : `<span class="text-xs text-slate-400">No rank</span>`
              }
            </div>
          `
        },
        {
          header: 'Request Institution',
          key: 'requestingInstitutionName',
          sortable: true,
          render: (item) => {
            const hasInstitution = item.requestingInstitutionName && item.requestingInstitutionName !== 'N/A';
            if (!hasInstitution) {
              return `<span class="text-xs text-slate-400">No institution</span>`;
            }
            return `
              <div class="space-y-0.5">
                <p class="font-semibold text-slate-800 text-xs">${item.requestingInstitutionName}</p>
                ${item.requestingInstitutionCode && item.requestingInstitutionCode !== 'N/A'
                  ? `<p class="text-[9px] text-slate-400 font-mono">${item.requestingInstitutionCode}</p>`
                  : ''}
                ${item.requestingInstitutionType && item.requestingInstitutionType !== 'N/A'
                  ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px]">${item.requestingInstitutionType}</span>`
                  : ''}
              </div>
            `;
          }
        },
        {
          header: 'Institution Tier',
          key: 'requestingInstitutionTier',
          render: (item) => {
            const hasTier = item.requestingInstitutionTier && item.requestingInstitutionTier !== 'N/A';
            return `
              <div class="space-y-1">
                ${hasTier
                  ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-medium">
                      <i class="fa-solid fa-building-columns text-[9px]"></i>
                      ${item.requestingInstitutionTier}
                     </span>
                     <p class="text-[9px] text-slate-400">Priority: ${item.requestingInstitutionTierPriority}</p>
                     ${item.requestingInstitutionTierName && item.requestingInstitutionTierName !== 'N/A'
                       ? `<p class="text-[9px] text-slate-400">${item.requestingInstitutionTierName}</p>`
                       : ''}`
                  : `<span class="text-xs text-slate-400">No tier assigned</span>`
                }
              </div>
            `;
          }
        },
        {
          header: 'Registered',
          key: 'registeredAt',
          render: (item) => {
            let dateTimeDisplay = 'N/A';
            let durationDisplay = 'N/A';

            if (item.registeredAt && item.registeredAt !== 'N/A') {
              const d = new Date(item.registeredAt);
              if (!isNaN(d.getTime())) {
                dateTimeDisplay = d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) + ' · ' + d.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                const diffMs = Date.now() - d.getTime();
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                if (days > 0) {
                  durationDisplay = `${days}d ${hours}h ago`;
                } else if (hours > 0) {
                  durationDisplay = `${hours}h ago`;
                } else {
                  durationDisplay = 'Less than an hour ago';
                }
              }
            }

            return `
              <div class="space-y-0.5">
                <p class="text-xs font-medium text-slate-700">${dateTimeDisplay}</p>
                <p class="text-[9px] text-slate-400">${durationDisplay}</p>
              </div>
            `;
          }
        },
        {
          header: 'Letter Reference',
          key: 'referenceNumber',
          render: (item) => `
            <div class="space-y-0.5">
              <p class="font-mono font-bold text-indigo-600 text-xs">${item.referenceNumber}</p>
              <p class="text-[9px] text-slate-400">${item.letterDate}</p>
            </div>
          `
        },
        {
          header: 'Nationality',
          key: 'beneficiaryNationality',
          render: (item) => `
            <div class="flex items-center gap-1.5">
              <i class="fa-solid fa-flag text-slate-400 text-[10px]"></i>
              <span class="text-xs text-slate-700">${item.beneficiaryNationality}</span>
            </div>
          `
        },
        {
          header: 'Phone',
          key: 'beneficiaryPhone',
          render: (item) => `
            <div class="flex items-center gap-1.5">
              <i class="fa-solid fa-phone text-slate-400 text-[10px]"></i>
              <span class="text-xs text-slate-700">${item.beneficiaryPhone}</span>
            </div>
          `
        },
        {
          header: 'Priority',
          key: 'priorityBreakdown',
          render: (item) => {
            const factors: Array<{ key: PriorityFactorKey; active: boolean; label: string; color: string }> = [
              { key: 'override', active: item.priorityBreakdown?.isOverride === true, label: 'OV', color: 'amber' },
              { key: 'tier', active: item.priorityBreakdown?.institution?.tierPriority != null, label: 'TI', color: 'purple' },
              { key: 'history', active: item.priorityBreakdown?.institution?.allocationHistoryCount != null, label: 'HI', color: 'teal' },
              { key: 'rank', active: item.priorityBreakdown?.beneficiary?.rankPriority != null, label: 'RK', color: 'blue' },
            ];

            const activeCount = factors.filter(f => f.active).length;

            const badges = factors.map(f => {
              const meta = PRIORITY_FACTOR_META[f.key];
              const isActive = f.active;
              const badgeClass = isActive
                ? `bg-${f.color}-50 text-${f.color}-700 border-${f.color}-200 hover:scale-105 hover:brightness-95 cursor-pointer`
                : `bg-slate-50 text-gray-400 border-gray-200 hover:scale-105 hover:brightness-95 cursor-pointer`;

              return `
                <button
                  type="button"
                  data-priority-factor="${f.key}"
                  data-beneficiary-id="${item.beneficiaryId}"
                  data-beneficiary-name="${item.beneficiaryName}"
                  title="${meta.label}: ${isActive ? 'Active' : 'Inactive'}"
                  class="w-6 h-6 rounded-md text-[9px] font-bold border transition-all flex items-center justify-center ${badgeClass}"
                >
                  ${f.label}
                </button>
              `;
            }).join('');

            return `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-slate-400 min-w-[20px]">${activeCount}/4</span>
                <div class="flex gap-0.5">${badges}</div>
              </div>
            `;
          }
        },
        {
          header: 'Status',
          key: 'beneficiaryStatus',
          render: (item) => {
            const statusColors: Record<string, string> = {
              'eligible': 'bg-blue-50 text-blue-700 border-blue-200',
              'waiting_list': 'bg-teal-50 text-teal-700 border-teal-200',
              'allocated': 'bg-emerald-50 text-emerald-700 border-emerald-200',
              'unauthorized_by_directive': 'bg-rose-50 text-rose-700 border-rose-200',
              'pending_review': 'bg-amber-50 text-amber-700 border-amber-200',
              'under_legal_revision': 'bg-purple-50 text-purple-700 border-purple-200'
            };
            const color = statusColors[String(item.beneficiaryStatus).toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200';
            return `
              <div class="space-y-1">
                <span class="px-2 py-0.5 ${color} border text-[10px] font-bold rounded-md block text-center">${item.beneficiaryStatus}</span>
                <span class="text-[9px] text-slate-400 text-center block">${item.requestStatus}</span>
              </div>
            `;
          }
        },
        {
          header: 'Actions',
          key: 'beneficiaryId',
          render: (item) => {
            if (item.beneficiaryStatus === 'allocated') {
              return `<span class="text-xs text-emerald-600 font-semibold block text-center"><i class="fa-solid fa-check-circle mr-1"></i>Allocated</span>`;
            }
            if (item.beneficiaryStatus === 'unauthorized_by_directive') {
              return `<span class="text-xs text-rose-600 font-semibold block text-center"><i class="fa-solid fa-ban mr-1"></i>Rejected</span>`;
            }
            if (item.beneficiaryStatus !== 'waiting_list') {
              return `<span class="text-xs text-slate-400 block text-center">Not in queue</span>`;
            }

            // 3-dot dropdown using <details>/<summary> — no JS state needed to open/close.
            return `
              <details class="dropdown-container relative">
                <summary class="dropdown-trigger list-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors mx-auto">
                  <i class="fa-solid fa-ellipsis-vertical text-slate-500 text-sm"></i>
                </summary>
                <div class="dropdown-menu absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    data-action="allocate"
                    data-beneficiary-id="${item.beneficiaryId}"
                    class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors"
                  >
                    <i class="fa-solid fa-check-circle"></i> Allocate House
                  </button>
                  <button
                    data-action="reject"
                    data-beneficiary-id="${item.beneficiaryId}"
                    class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <i class="fa-solid fa-ban"></i> Reject
                  </button>
                  <div class="border-t border-slate-100 my-1"></div>
                  ${item.isOverrideQueue ? `
                    <button
                      data-action="clear-override"
                      data-beneficiary-id="${item.beneficiaryId}"
                      data-beneficiary-name="${item.beneficiaryName}"
                      class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2 transition-colors"
                    >
                      <i class="fa-solid fa-flag-checkered"></i> Clear Override
                    </button>
                  ` : `
                    <button
                      data-action="set-override"
                      data-beneficiary-id="${item.beneficiaryId}"
                      data-beneficiary-name="${item.beneficiaryName}"
                      data-position="${item.position}"
                      class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 flex items-center gap-2 transition-colors"
                    >
                      <i class="fa-solid fa-arrow-up-from-ground-water"></i> Override to Front
                    </button>
                  `}
                  <div class="border-t border-slate-100 my-1"></div>
                  <button
                    data-action="explain"
                    data-beneficiary-id="${item.beneficiaryId}"
                    class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <i class="fa-solid fa-circle-info"></i> View Priority Explanation
                  </button>
                </div>
              </details>
            `;
          }
        }
      ],
      data,
      emptyState: `
        <div class="text-center py-12">
          <i class="fa-solid fa-inbox text-4xl text-slate-300 mb-3"></i>
          <p class="text-slate-500 text-sm">No beneficiaries match the current filters</p>
        </div>
      `,
      rowClassName: (item) => {
        if (item.isOverride) {
          return 'bg-rose-50/30';
        }
        const hasTier = item.institutionTierPriority !== 'N/A' && item.institutionTierPriority !== null;
        const hasRank = item.beneficiaryRankPriority !== 'N/A' && item.beneficiaryRankPriority !== null;
        if (hasTier && hasRank) return 'bg-indigo-50/30';
        if (hasTier) return 'bg-blue-50/30';
        if (hasRank) return 'bg-teal-50/30';
        return 'bg-slate-50/30';
      }
    });

    attachActionListeners();
  }

  // ─── Data-shaping helpers for the real, confirmed response shape ──────

  function getDisplayName(individual: any, fallbackId?: string): string {
    if (!individual) return fallbackId || 'Unknown Beneficiary';

    const getVal = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      return val.en || val.am || '';
    };

    const firstName = getVal(individual.firstName);
    const middleName = getVal(individual.middleName);
    const lastName = getVal(individual.lastName);
    let fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

    if (!fullName && individual.fullName && String(individual.fullName).trim()) {
      fullName = String(individual.fullName).trim();
    }

    let title = '';
    if (individual.currentTitle) {
      const ct = individual.currentTitle;
      title = ct.abbreviations?.en ||
              ct.abbreviations?.am ||
              ct.name?.en ||
              ct.name?.am ||
              (typeof ct.name === 'string' ? ct.name : '');
    }

    if (fullName) {
      return title ? `${title} ${fullName}` : fullName;
    }

    if (individual.user) {
      const user = individual.user;
      const uName = getVal(user.name);
      return uName || user.username || fallbackId || 'Unknown Beneficiary';
    }

    return individual.userId || fallbackId || 'Unknown Beneficiary';
  }

  function getInstitutionName(inst: any): string {
    if (!inst) return 'Unknown Institution';
    return inst.name?.en || inst.name?.am || inst.shortName || inst.code || 'Unknown Institution';
  }

  function formatDate(value: any): string {
    if (!value || value === 'N/A') return 'N/A';
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  }

  function waitingDurationDays(enteredAt: any): string {
    if (!enteredAt || enteredAt === 'N/A') return 'N/A';
    const entered = new Date(enteredAt).getTime();
    if (isNaN(entered)) return 'N/A';
    const days = Math.max(0, Math.floor((Date.now() - entered) / (1000 * 60 * 60 * 24)));
    return `${days}d`;
  }

  // ─── Load + flatten queue data ─────────────────────────────────────────

  const loadAndRenderTable = async () => {
    try {
      const response = await store.apiService.get('/house-allocation-queue');

      let items: any[] = [];
      let total = 0;
      let estimatedClearDays: number | null = null;

      // Confirmed real shape: { total, items, estimatedClearDays, estimatedClearDate }.
      // Array / { data } forms kept as defensive fallbacks only.
      if (Array.isArray(response)) {
        items = response;
        total = items.length;
      } else if (response && Array.isArray(response.items)) {
        items = response.items;
        total = response.total ?? items.length;
        estimatedClearDays = typeof response.estimatedClearDays === 'number' ? response.estimatedClearDays : null;
      } else if (response && Array.isArray(response.data)) {
        items = response.data;
        total = items.length;
      }

      const flattenedData: any[] = items.map((item: any) => {
        const priorityBreakdown = item.priorityBreakdown || {};
        const request = item.request || {};
        const beneficiary = item.beneficiary || {};
        const individual = beneficiary.beneficiaryIndividual || {};
        const institution = beneficiary.beneficiaryInstitution || {};
        const requestingInstitution = request.requestingInstitution || {};
        const requestingTier = requestingInstitution.currentTier || {};

        // CRITICAL: beneficiary.id (the queue-row/beneficiary entity id) is
        // NOT the same as priorityBreakdown.beneficiary.id (the individual's
        // row id) in the confirmed response. Every action (allocate/reject/
        // preview/position/override) must use beneficiary.id, never
        // priorityBreakdown.beneficiary.id.
        const beneficiaryId = beneficiary.id;

        const fullName = getDisplayName(individual, beneficiaryId);
        const instName = getInstitutionName(institution);

        return {
          position: item.position ?? 'N/A',
          priorityBreakdown,
          isOverride: !!priorityBreakdown.isOverride,
          priorityReason: priorityBreakdown.priorityReason || [],

          beneficiaryId: beneficiaryId || 'N/A',
          beneficiaryName: fullName,
          beneficiaryRank: priorityBreakdown.beneficiary?.rankCode || 'N/A',
          beneficiaryRankPriority: priorityBreakdown.beneficiary?.rankPriority ?? 'N/A',
          // No title field exists anywhere in the confirmed response —
          // shown as N/A rather than fabricated.
          beneficiaryTitle: 'N/A',
          beneficiaryEmail: individual.email || 'N/A',
          beneficiaryPhone: individual.phonePrimary || 'N/A',
          beneficiaryGender: individual.gender || 'N/A',
          beneficiaryNationalId: individual.nationalIdNumber || 'N/A',
          beneficiaryDateOfBirth: individual.dateOfBirth ? formatDate(individual.dateOfBirth) : 'N/A',
          beneficiaryStatus: beneficiary.status || 'N/A',
          beneficiaryNationality: individual.nationality || 'N/A',

          waitingListPosition: beneficiary.waitingListPosition ?? 'N/A',
          enteredWaitingListAt: beneficiary.enteredWaitingListAt || null,
          waitingDuration: waitingDurationDays(beneficiary.enteredWaitingListAt),

          isOverrideQueue: !!beneficiary.isOverrideQueue,
          overrideQueueReason: beneficiary.overrideQueueReason || 'N/A',

          deputyCeoDecision: beneficiary.deputyCeoDecision || 'N/A',
          directorDecision: beneficiary.directorDecision || 'N/A',
          teamLeaderDecision: beneficiary.teamLeaderDecision || 'N/A',

          institutionId: institution.id || requestingInstitution.id || 'N/A',
          institutionName: instName,
          institutionShortName: institution.shortName || requestingInstitution.shortName || 'N/A',
          institutionType: institution.institutionType || requestingInstitution.institutionType || 'N/A',
          institutionTier: priorityBreakdown.institution?.tierCode || 'N/A',
          institutionTierPriority: priorityBreakdown.institution?.tierPriority ?? 'N/A',
          allocationHistoryCount: priorityBreakdown.institution?.allocationHistoryCount ?? 0,

          beneficiaryInstitutionId: institution.id || 'N/A',
          beneficiaryInstitutionName: instName,
          beneficiaryInstitutionCode: institution.code || 'N/A',
          beneficiaryInstitutionType: institution.institutionType || 'N/A',
          beneficiaryInstitutionShortName: institution.shortName || 'N/A',

          requestId: request.id || 'N/A',
          referenceNumber: request.letterReferenceNumber || 'N/A',
          letterDate: request.letterDate ? formatDate(request.letterDate) : 'N/A',
          registeredAt: request.registeredAt ? formatDate(request.registeredAt) : 'N/A',
          authorizingOfficial: request.authorizingOfficial?.fullName || 'N/A',
          requestStatus: request.status || 'N/A',

          requestingInstitutionId: requestingInstitution.id || 'N/A',
          requestingInstitutionName: getInstitutionName(requestingInstitution),
          requestingInstitutionCode: requestingInstitution.code || 'N/A',
          requestingInstitutionShortName: requestingInstitution.shortName || 'N/A',
          requestingInstitutionType: requestingInstitution.institutionType || 'N/A',
          requestingInstitutionTier: requestingTier.code || 'N/A',
          requestingInstitutionTierPriority: requestingTier.allocationPriority ?? 'N/A',
          requestingInstitutionTierName: requestingTier.name?.en || requestingTier.name?.am || 'N/A',
        };
      });

      document.getElementById('active-queue-count')!.textContent = `${total} Beneficiaries`;
      document.getElementById('avg-wait-time')!.textContent =
        estimatedClearDays !== null ? `${estimatedClearDays} Days` : 'N/A';
      const allocatedCount = items.filter((q: any) => q.beneficiary?.status === 'allocated').length;
      document.getElementById('historical-disbursals')!.textContent = `${allocatedCount} Houses Mapped`;

      // Display-only sort — matches backend-provided position, never recalculates it.
      flattenedData.sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : Infinity;
        const pb = typeof b.position === 'number' ? b.position : Infinity;
        return pa - pb;
      });

      allFlattenedData = flattenedData;
      populateFilterOptions(allFlattenedData);
      renderFilteredTable();

    } catch (error: any) {
      console.error('Failed to load queue data:', error);
      Toast.error('Failed to load queue data. Please try again.');

      Table.render<any>({
        containerId: 'queue-table-container',
        loading: false,
        placeholderText: 'No queue data available',
        columns: [],
        data: [],
        emptyState: `
          <div class="text-center py-12">
            <i class="fa-solid fa-inbox text-4xl text-slate-300 mb-3"></i>
            <p class="text-slate-500 text-sm">Unable to load queue data</p>
            <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
              Retry
            </button>
          </div>
        `
      });
    }
  };

  // ─── Event delegation (bound once) ─────────────────────────────────────

  const attachActionListeners = () => {
    const tableContainer = document.getElementById('queue-table-container');
    if (!tableContainer) return;

    // Close any open dropdown when clicking outside it. Bound once globally.
    if (!outsideClickListenerAttached) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.dropdown-container')) {
          document.querySelectorAll('.dropdown-container[open]').forEach((details) => {
            (details as HTMLDetailsElement).removeAttribute('open');
          });
        }
      });
      outsideClickListenerAttached = true;
    }

    // Bind delegated listeners to the table container exactly once — this
    // element persists across re-renders (Table.render only swaps its
    // innerHTML), so re-adding listeners on every refresh would otherwise
    // stack duplicate handlers.
    if (tableContainer.dataset.listenersAttached === 'true') return;
    tableContainer.dataset.listenersAttached = 'true';

    tableContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Dropdown action items
      const dropdownItem = target.closest('.dropdown-item') as HTMLElement | null;
      if (dropdownItem) {
        const details = dropdownItem.closest('details');
        details?.removeAttribute('open');

        const action = dropdownItem.getAttribute('data-action');
        const beneficiaryId = dropdownItem.getAttribute('data-beneficiary-id');
        if (!beneficiaryId || beneficiaryId === 'N/A') return;

        switch (action) {
          case 'allocate':
            handleAllocate(beneficiaryId);
            break;
          case 'reject':
            handleReject(beneficiaryId);
            break;
          case 'set-override': {
            const beneficiaryName = dropdownItem.getAttribute('data-beneficiary-name') || 'This beneficiary';
            const position = dropdownItem.getAttribute('data-position') || 'N/A';
            handleSetOverride(beneficiaryId, beneficiaryName, position);
            break;
          }
          case 'clear-override': {
            const beneficiaryName = dropdownItem.getAttribute('data-beneficiary-name') || 'This beneficiary';
            handleClearOverride(beneficiaryId, beneficiaryName);
            break;
          }
          case 'explain':
            handleShowExplanation(beneficiaryId);
            break;
        }
        return;
      }

      // Priority factor preview badges
      const factorBtn = target.closest('[data-priority-factor]') as HTMLElement | null;
      if (factorBtn) {
        const factor = factorBtn.getAttribute('data-priority-factor') as PriorityFactorKey | null;
        const beneficiaryId = factorBtn.getAttribute('data-beneficiary-id');
        const beneficiaryName = factorBtn.getAttribute('data-beneficiary-name') || 'This beneficiary';
        if (factor && beneficiaryId && beneficiaryId !== 'N/A') {
          handlePreviewSingleFactor(beneficiaryId, factor, beneficiaryName);
        }
      }
    });
  };

  // ─── Top-level controls ────────────────────────────────────────────────

  document.getElementById('btn-next-queue')?.addEventListener('click', () => {
    handleProcessNext();
  });

  document.getElementById('btn-check-position')?.addEventListener('click', () => {
    handlePositionChecker();
  });

  document.getElementById('filter-rank')?.addEventListener('change', renderFilteredTable);
  document.getElementById('filter-beneficiary-institution')?.addEventListener('change', renderFilteredTable);
  document.getElementById('filter-requesting-institution')?.addEventListener('change', renderFilteredTable);

  document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
    (document.getElementById('filter-rank') as HTMLSelectElement).value = '';
    (document.getElementById('filter-beneficiary-institution') as HTMLSelectElement).value = '';
    (document.getElementById('filter-requesting-institution') as HTMLSelectElement).value = '';
    renderFilteredTable();
  });

  loadAndRenderTable();

  // Exposed so preview/allocate/reject/override handlers below can trigger
  // a full refresh without re-declaring the closure.
  (window as any).__reloadQueueTable = loadAndRenderTable;
}

// ─── Action handlers (module scope) ──────────────────────────────────────

/**
 * Process Next in Queue.
 * GET /house-allocation-queue/next returns a flat object:
 * { beneficiaryId, beneficiaryName, position, priorityReason, explanation }
 * — not a request/beneficiary tree. Do not read request.beneficiaries here.
 */
async function handleProcessNext() {
  try {
    const next: any = await store.apiService.get('/house-allocation-queue/next');

    if (!next || !next.beneficiaryId) {
      Toast.warning('No active waitlist requests remaining in queue.');
      return;
    }

    const explanation = next.explanation || {};
    const reasons: string[] = next.priorityReason || explanation.priorityReason || [];

    const modalHTML = `
      <div class="space-y-4">
        <div class="p-4 bg-indigo-900 rounded-xl text-white space-y-1">
          <p class="text-[10px] uppercase font-bold tracking-wider text-indigo-200">Next in Queue — Position #1</p>
          <h4 class="text-lg font-black">${next.beneficiaryName || 'Unknown Beneficiary'}</h4>
          <p class="text-xs text-indigo-100 font-medium">${explanation.institution?.name || 'Unknown Institution'}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-150">
          <div>
            <p class="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Institution Tier</p>
            <p class="text-slate-800 font-semibold mt-0.5">${explanation.institution?.tierCode || 'N/A'}</p>
          </div>
          <div>
            <p class="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Beneficiary Rank</p>
            <p class="text-slate-800 font-bold mt-0.5">${explanation.beneficiary?.rankCode || 'N/A'}</p>
          </div>
          <div>
            <p class="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Allocation History</p>
            <p class="text-slate-800 font-bold mt-0.5">${explanation.institution?.allocationHistoryCount ?? 0} previous</p>
          </div>
          <div>
            <p class="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Override</p>
            <p class="text-slate-800 font-bold mt-0.5">${explanation.isOverride ? 'Yes' : 'No'}</p>
          </div>
        </div>

        ${reasons.length ? `
          <div class="space-y-1.5">
            <p class="text-xs font-bold uppercase text-slate-500 tracking-wider">Why this beneficiary is first</p>
            <div class="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
              ${reasons.map(r => `<p class="text-xs text-slate-600">• ${r}</p>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    Modal.open({
      title: 'Top Priority Waitlist Dispatcher',
      content: modalHTML,
      confirmText: 'Approve & Allocate House',
      cancelText: 'Dismiss',
      onConfirm: async () => {
        try {
          await store.apiService.post(`/house-allocation-queue/${next.beneficiaryId}/allocate`, {
            houseId: '00000000-0000-0000-0000-000000000001'
          });
          Toast.success(`${next.beneficiaryName} has been successfully allocated a house.`);
          await (window as any).__reloadQueueTable?.();
        } catch (error: any) {
          Toast.error(error?.response?.message || error?.message || 'Failed to allocate house. Please try again.');
        }
      }
    });

  } catch (error: any) {
    Toast.info('Waitlist queue is completely clear.');
  }
}

function handleAllocate(beneficiaryId: string) {
  Modal.open({
    title: 'Confirm Housing Allocation',
    content: `
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Are you sure you want to approve and allocate state housing for this beneficiary?</p>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">House ID <span class="text-rose-500">*</span></label>
          <input
            id="allocate-house-id"
            type="text"
            placeholder="Enter house ID..."
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <p class="text-xs text-slate-400 mt-1">This will permanently mark this beneficiary as allocated and remove them from the active priority queue.</p>
      </div>
    `,
    isForm: true,
    confirmText: 'Approve & Allocate',
    onConfirm: async (modalEl) => {
      const houseId = (modalEl.querySelector('#allocate-house-id') as HTMLInputElement)?.value;
      if (!houseId || !houseId.trim()) {
        Toast.error('House ID is required.');
        return;
      }
      try {
        await store.apiService.post(`/house-allocation-queue/${beneficiaryId}/allocate`, {
          houseId: houseId.trim()
        });
        Toast.success('Housing successfully allocated and beneficiary finalized.');
        await (window as any).__reloadQueueTable?.();
      } catch (error: any) {
        Toast.error(error?.response?.message || error?.message || 'Failed to allocate housing. Please try again.');
      }
    }
  });
}

function handleReject(beneficiaryId: string) {
  const formHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-rose-50 border border-rose-150 rounded-lg text-rose-800 text-xs font-semibold">
        Rejecting beneficiary from waiting list
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
        <textarea
          name="rejectionReason"
          rows="3"
          required
          placeholder="State the official reason for rejecting this beneficiary..."
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
        ></textarea>
      </div>
    </div>
  `;

  Modal.open({
    title: 'Reject Beneficiary',
    content: formHTML,
    isForm: true,
    confirmText: 'Submit Rejection',
    onConfirm: async (modalEl) => {
      const reason = (modalEl.querySelector('[name="rejectionReason"]') as HTMLTextAreaElement).value;
      if (!reason.trim()) {
        throw new Error('A rejection reason must be specified.');
      }

      try {
        await store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, {
          status: 'unauthorized_by_directive',
          reason: reason.trim()
        });
        Toast.success('Beneficiary rejected and removed from queue.');
        await (window as any).__reloadQueueTable?.();
      } catch (error: any) {
        Toast.error(error?.response?.message || error?.message || 'Failed to reject beneficiary. Please try again.');
      }
    }
  });
}

async function fetchPriorityFactorPreview(
  beneficiaryId: string,
  factor: PriorityFactorKey,
): Promise<PriorityFactorPreviewResponse> {
  return store.apiService.get(
    `/house-allocation-queue/${beneficiaryId}/priority-factor-preview?factor=${factor}`
  );
}

/**
 * Sets a manual override for the given beneficiary, moving them to the
 * front of the queue. Uses the live allFlattenedData snapshot (populated by
 * loadAndRenderTable) to show a warning against whoever currently holds
 * position #1. Reload after success/clear always goes through
 * window.__reloadQueueTable, exposed by renderQueueManagement.
 */
async function handleSetOverride(beneficiaryId: string, beneficiaryName: string, currentPosition: string) {
  const current = allFlattenedData.find(d => d.beneficiaryId === beneficiaryId);
  const naturalLeader = allFlattenedData.find(d => d.position === 1);

  const warningHTML = (naturalLeader && naturalLeader.beneficiaryId !== beneficiaryId)
    ? `
      <div class="p-3 bg-rose-50 border border-rose-150 rounded-lg text-xs text-rose-800 space-y-1.5">
        <p class="font-bold flex items-center gap-1.5">
          <i class="fa-solid fa-triangle-exclamation"></i> This bypasses the standard priority rules
        </p>
        <p>
          Under tier / allocation history / rank / FIFO, <strong>${beneficiaryName}</strong> currently
          ranks at position <strong>#${currentPosition}</strong>
          (tier: ${current?.institutionTier ?? 'N/A'}, rank: ${current?.beneficiaryRank ?? 'N/A'},
          history: ${current?.allocationHistoryCount ?? 0} prior allocation${current?.allocationHistoryCount === 1 ? '' : 's'}).
        </p>
        <p>
          A manual override will place them ahead of
          <strong>${naturalLeader.beneficiaryName}</strong> (${naturalLeader.institutionName}),
          who currently holds position #1 under the standard hierarchy.
        </p>
      </div>
    `
    : `
      <div class="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-800">
        <i class="fa-solid fa-circle-info mr-1"></i>
        ${beneficiaryName} is already position #1 under the standard rules — an override isn't
        needed to move them further, but it will still be recorded as an active manual override.
      </div>
    `;

  Modal.open({
    title: 'Manual Queue Override',
    content: `
      <div class="space-y-4">
        ${warningHTML}
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">
            Override Reason <span class="text-rose-500">*</span>
          </label>
          <textarea
            name="overrideReason"
            rows="3"
            required
            placeholder="State the official justification for overriding the standard queue rules..."
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          ></textarea>
          <p class="text-[10px] text-slate-400 mt-1">Mandatory — permanently recorded for audit purposes.</p>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Confirm Override',
    onConfirm: async (modalEl) => {
      const reason = (modalEl.querySelector('[name="overrideReason"]') as HTMLTextAreaElement)?.value;
      if (!reason || !reason.trim()) {
        Toast.error('A reason is required to set a queue override.');
        return;
      }

      try {
        const result: any = await store.apiService.patch(`/house-allocation-queue/${beneficiaryId}/override`, {
          reason: reason.trim(),
        });
        Toast.success(result?.message || `${beneficiaryName} moved to the front of the queue.`);
        await (window as any).__reloadQueueTable?.();
      } catch (error: any) {
        console.error('Override failed:', error);
        Toast.error(error?.response?.message || error?.message || 'Failed to set override. Please try again.');
      }
    }
  });
}

async function handleClearOverride(beneficiaryId: string, beneficiaryName: string) {
  Modal.open({
    title: 'Clear Manual Override',
    content: `
      <div class="space-y-4">
        <div class="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-600">
          <strong>${beneficiaryName}</strong> currently has an active manual override. Clearing it
          returns them to whatever position the standard tier / history / rank / FIFO hierarchy gives them.
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">
            Reason for Clearing <span class="text-rose-500">*</span>
          </label>
          <textarea
            name="clearReason"
            rows="3"
            required
            placeholder="State the reason for removing this override..."
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          ></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Clear Override',
    onConfirm: async (modalEl) => {
      const reason = (modalEl.querySelector('[name="clearReason"]') as HTMLTextAreaElement)?.value;
      if (!reason || !reason.trim()) {
        throw new Error('A reason is required to clear a queue override.');
      }
      try {
        const result: any = await store.apiService.patch(`/house-allocation-queue/${beneficiaryId}/override/clear`, {
          reason: reason.trim(),
        });
        Toast.success(result?.message || `Override cleared for ${beneficiaryName}.`);
        await (window as any).__reloadQueueTable?.();
      } catch (error: any) {
        Toast.error(error?.response?.message || error?.message || 'Failed to clear override. Please try again.');
      }
    }
  });
}

/**
 * Clicking one priority-factor icon opens a focused, single-factor preview.
 * STATELESS — calls GET /house-allocation-queue/:id/priority-factor-preview?factor=...
 * Nothing is saved, removed, or restored.
 */
async function handlePreviewSingleFactor(
  beneficiaryId: string,
  factor: PriorityFactorKey,
  beneficiaryName: string,
) {
  const meta = PRIORITY_FACTOR_META[factor];

  Modal.open({
    title: `Preview: ${meta.label}`,
    content: `
      <div class="space-y-3">
        <div class="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-600">
          <p class="font-semibold text-slate-800">${beneficiaryName}</p>
          <p class="mt-1">Shows what would happen if <strong>${meta.label.toLowerCase()}</strong> were ignored for this beneficiary only. This is a preview — nothing is changed or saved.</p>
        </div>
        <div id="single-factor-preview-result" class="p-4 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-500">
          Calculating preview…
        </div>
      </div>
    `,
    cancelText: 'Close',
    onOpen: async (modalEl: HTMLElement) => {
      const resultBox = modalEl.querySelector('#single-factor-preview-result') as HTMLElement;
      if (!resultBox) return;

      try {
        const result = await fetchPriorityFactorPreview(beneficiaryId, factor);

        resultBox.className = `p-4 border rounded-lg space-y-3 ${
          result.positionChanged
            ? 'bg-amber-50 border-amber-150 text-amber-900'
            : 'bg-emerald-50 border-emerald-150 text-emerald-900'
        }`;

        resultBox.innerHTML = `
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-[10px] uppercase font-semibold opacity-70">Current Position</p>
              <p class="font-black text-lg">#${result.currentPosition}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase font-semibold opacity-70">Preview Position</p>
              <p class="font-black text-lg">#${result.previewPosition}</p>
            </div>
          </div>
          <p class="text-[11px] leading-snug">${result.message}</p>
          <p class="text-[9px] opacity-70">Total in queue: ${result.total}</p>
          <p class="text-[9px] opacity-70 italic">Preview only — nothing has been changed or saved.</p>
        `;
      } catch (error: any) {
        // Controller throws 400 if the beneficiary isn't WAITING_LIST, or
        // 404 if not found — surface the real backend message either way.
        resultBox.className = 'p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-lg text-xs';
        resultBox.innerHTML = error?.response?.message
          || error?.message
          || 'Failed to compute preview. Please try again.';
      }
    },
  });
}

async function handleShowExplanation(beneficiaryId: string) {
  try {
    const explanation: any = await store.apiService.get(`/house-allocation-queue/priority-breakdown/${beneficiaryId}`);
    const reasons: string[] = explanation.priorityReason || [];

    Modal.open({
      title: 'Queue Priority Explanation',
      content: `
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-150">
            <div>
              <p class="text-slate-400 uppercase text-[10px] font-semibold">Institution</p>
              <p class="font-semibold text-slate-800">${explanation.institution?.name || 'N/A'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase text-[10px] font-semibold">Tier</p>
              <p class="font-semibold text-slate-800">${explanation.institution?.tierCode || 'N/A'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase text-[10px] font-semibold">Allocation History</p>
              <p class="font-semibold text-slate-800">${explanation.institution?.allocationHistoryCount ?? 0} previous</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase text-[10px] font-semibold">Rank</p>
              <p class="font-semibold text-slate-800">${explanation.beneficiary?.rankCode || 'N/A'}</p>
            </div>
          </div>
          <div class="space-y-1">
            ${reasons.map((r, i) => `<p class="text-xs text-slate-600">${i + 1}. ${r}</p>`).join('')}
          </div>
        </div>
      `,
      cancelText: 'Close',
    });
  } catch (error: any) {
    Toast.error('Failed to load priority explanation.');
  }
}

function handlePositionChecker() {
  const formHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Enter Beneficiary Name or Reference Code</label>
        <input
          id="checker-search"
          type="text"
          placeholder="e.g., HAR-2026-000001 or Beneficiary Name"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
        <p class="text-[10px] text-slate-400 mt-1">Enter the reference number or beneficiary name to check queue position</p>
      </div>

      <div id="position-checker-result" class="hidden p-4 bg-indigo-50 border border-indigo-150 rounded-xl space-y-3.5 animate-fade-in">
        <!-- Checked position outputs here -->
      </div>
    </div>
  `;

  Modal.open({
    title: 'Interactive Queue Position Audit',
    content: formHTML,
    isForm: false,
    confirmText: 'Check Position',
    onConfirm: async () => {
      const input = document.getElementById('checker-search') as HTMLInputElement;
      const searchTerm = input?.value?.trim();

      if (!searchTerm) {
        Toast.warning('Please enter a reference code or beneficiary name');
        return;
      }

      const resultBox = document.getElementById('position-checker-result');
      if (!resultBox) return;

      try {
        const queueResponse = await store.apiService.get('/house-allocation-queue');
        let items: any[] = [];
        if (Array.isArray(queueResponse)) {
          items = queueResponse;
        } else if (queueResponse && Array.isArray(queueResponse.items)) {
          items = queueResponse.items;
        }

        const foundItem = items.find((item: any) => {
          const request = item.request || {};
          const individual = item.beneficiary?.beneficiaryIndividual || {};
          const name = individual.fullName || individual.userId || '';
          return (
            request.letterReferenceNumber === searchTerm ||
            String(name).toLowerCase().includes(searchTerm.toLowerCase())
          );
        });

        if (!foundItem) {
          resultBox.className = "p-4 bg-rose-50 border border-rose-150 text-rose-800 text-xs font-semibold rounded-xl mt-4 animate-fade-in";
          resultBox.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1.5"></i>No request found with: ${searchTerm}`;
          resultBox.classList.remove('hidden');
          return;
        }

        // CRITICAL: use beneficiary.id, not priorityBreakdown.beneficiary.id
        // or request.id — /position/:beneficiaryId expects the beneficiary
        // row id.
        const beneficiaryId = foundItem.beneficiary?.id;
        const priorityBreakdown = foundItem.priorityBreakdown || {};
        const reasons: string[] = priorityBreakdown.priorityReason || [];

        const positionResult: any = await store.apiService.get(`/house-allocation-queue/position/${beneficiaryId}`);

        resultBox.className = "p-5 bg-indigo-900 rounded-xl text-white space-y-3 mt-4 animate-fade-in";
        resultBox.innerHTML = `
          <div class="flex items-center justify-between border-b border-indigo-800 pb-2">
            <span class="text-[10px] uppercase font-black text-indigo-300 tracking-widest">Waitlist Audit Result</span>
            <span class="px-2 py-0.5 bg-indigo-800 text-indigo-200 font-mono text-[10px] rounded-md font-bold">${foundItem.request?.letterReferenceNumber || 'N/A'}</span>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <span class="text-indigo-200 text-[10px] uppercase font-bold tracking-wider">Queue Position</span>
              <p class="text-3xl font-black">#${positionResult.position ?? foundItem.position}</p>
            </div>
            <div class="space-y-1">
              <span class="text-indigo-200 text-[10px] uppercase font-bold tracking-wider">Total in Queue</span>
              <p class="text-3xl font-black text-indigo-300">${positionResult.total ?? 'N/A'}</p>
            </div>
          </div>

          ${reasons.length ? `
            <div class="space-y-1 pt-2 border-t border-indigo-800/60">
              <span class="text-indigo-200 text-[10px] uppercase font-bold tracking-wider">Priority Reasoning</span>
              <div class="space-y-0.5 text-[11px] text-indigo-200/90">
                ${reasons.map(r => `<p>• ${r}</p>`).join('')}
              </div>
            </div>
          ` : ''}
        `;
        resultBox.classList.remove('hidden');

      } catch (error: any) {
        resultBox.className = "p-4 bg-rose-50 border border-rose-150 text-rose-800 text-xs font-semibold rounded-xl mt-4 animate-fade-in";
        resultBox.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1.5"></i>Error checking position: ${error.message || 'Please try again'}`;
        resultBox.classList.remove('hidden');
      }
    }
  });
}