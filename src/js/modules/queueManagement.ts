// House Allocation Queue Management Module
import { store, QueueItem } from '../store';
import { Table, Modal, Toast } from '../components';

// ─── Priority factor metadata ─────────────────────────────────────────────
// These four are the ONLY factors the real backend recognizes for preview
// (PriorityFactorKey in house-allocation-queue.service.ts). FIFO and the
// final id tie-breaker are never previewable/removable — they're always
// system-calculated, so they get no button, just a tooltip.
type PriorityFactorKey = 'override' | 'tier' | 'history' | 'rank';

interface PriorityFactorDisplay {
  key: PriorityFactorKey;
  label: string;
  icon: string;      // Font Awesome class
  color: string;      // semantic color name
  active: boolean;
  detail: string;
  previewable: boolean; // always true for these 4 — there is no "removable"
}
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

// Tailwind class lookups per semantic color, active vs inactive state
const FACTOR_COLOR_CLASSES: Record<string, { active: string; inactive: string; text: string }> = {
  amber: { active: 'bg-amber-50 border-amber-200 text-amber-600', inactive: 'bg-slate-50 border-slate-150 text-slate-300', text: 'text-amber-700' },
  purple: { active: 'bg-purple-50 border-purple-200 text-purple-600', inactive: 'bg-slate-50 border-slate-150 text-slate-300', text: 'text-purple-700' },
  teal: { active: 'bg-teal-50 border-teal-200 text-teal-600', inactive: 'bg-slate-50 border-slate-150 text-slate-300', text: 'text-teal-700' },
  blue: { active: 'bg-blue-50 border-blue-200 text-blue-600', inactive: 'bg-slate-50 border-slate-150 text-slate-300', text: 'text-blue-700' },
  indigo: { active: 'bg-indigo-50 border-indigo-200 text-indigo-600', inactive: 'bg-slate-50 border-slate-150 text-slate-300', text: 'text-indigo-700' },
  slate: { active: 'bg-slate-100 border-slate-200 text-slate-500', inactive: 'bg-slate-50 border-slate-150 text-slate-300', text: 'text-slate-600' },
};

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

      <!-- Priority Rules Panel — vertical, professional, no fake scores -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <button id="priority-rules-toggle" class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-transparent">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-xs">
              <i class="fa-solid fa-sitemap"></i>
            </div>
            <span class="text-xs font-bold text-slate-800">Priority Rules</span>
            <span class="text-[10px] text-slate-400 hidden sm:inline">— how queue order is determined</span>
          </div>
          <i id="priority-rules-chevron" class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform"></i>
        </button>
        <div id="priority-rules-body" class="hidden border-t border-slate-100 px-4 py-3 divide-y divide-slate-100">

          <div class="flex items-start gap-3 py-2.5">
            <div class="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xs shrink-0">
              <i class="fa-solid fa-star"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-800">Priority Override</p>
              <p class="text-[10px] text-slate-500 leading-snug">Applied when the requesting institution has an active override tier. Evaluated first, ahead of every other rule.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 py-2.5">
            <div class="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-xs shrink-0">
              <i class="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-800">Institution Tier</p>
              <p class="text-[10px] text-slate-500 leading-snug">Evaluated after override. Institutions with a lower tier priority value are placed ahead of others.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 py-2.5">
            <div class="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 text-xs shrink-0">
              <i class="fa-solid fa-list-check"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-800">Allocation History</p>
              <p class="text-[10px] text-slate-500 leading-snug">Evaluated after tier. Institutions with fewer previous allocations are placed ahead of others.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 py-2.5">
            <div class="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs shrink-0">
              <i class="fa-solid fa-medal"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-800">Beneficiary Rank</p>
              <p class="text-[10px] text-slate-500 leading-snug">Evaluated after allocation history. A lower rank priority value is placed ahead of others.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 py-2.5">
            <div class="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs shrink-0">
              <i class="fa-solid fa-clock"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-800">FIFO / Tie Breaker</p>
              <p class="text-[10px] text-slate-500 leading-snug">Used only when every rule above is tied. The beneficiary who entered the waiting list earlier is placed ahead. System-calculated — cannot be manually changed.</p>
            </div>
          </div>

          <div class="flex items-start gap-3 py-2.5">
            <div class="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs shrink-0">
              <i class="fa-solid fa-ranking-star"></i>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-800">Final Queue Order</p>
              <p class="text-[10px] text-slate-500 leading-snug">Rules are applied strictly in the order above. The backend computes the final order on every request — it is never calculated on the frontend.</p>
            </div>
          </div>

        </div>
      </div>

      <!-- Queue Allocation Table -->
      <div class="overflow-x-auto w-full">
        <div id="queue-table-container"></div>
      </div>
    </div>
  `;

  // Priority Rules panel toggle
  const rulesToggle = document.getElementById('priority-rules-toggle');
  const rulesBody = document.getElementById('priority-rules-body');
  const rulesChevron = document.getElementById('priority-rules-chevron');
  rulesToggle?.addEventListener('click', () => {
    const isHidden = rulesBody?.classList.contains('hidden');
    rulesBody?.classList.toggle('hidden');
    rulesChevron?.classList.toggle('rotate-180', !!isHidden);
  });

  // ─── Helpers for reading the real, confirmed response shape ────────────

  function getFullName(individual: any, fallbackId?: string): string {
    if (!individual) return fallbackId || 'Unknown Beneficiary';
    // Confirmed shape: beneficiaryIndividual.fullName is a plain string
    // (often empty in current data), plus userId. There is no
    // firstName/lastName object on this entity — do not read one.
    if (individual.fullName && String(individual.fullName).trim()) {
      return String(individual.fullName).trim();
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

  // Normalizes item.priorityBreakdown into a display-ready factor list.
  // Confirmed real fields: isOverride, institution.{tierCode,tierPriority,
  // allocationHistoryCount}, beneficiary.{rankCode,rankPriority}. There is
  // no score/contribution field anywhere in the real response — none is
  // invented here.
  function getPriorityFactors(priorityBreakdown: any): PriorityFactorDisplay[] {
    const pb = priorityBreakdown || {};
    const institution = pb.institution || {};
    const beneficiary = pb.beneficiary || {};

    return [
      {
        key: 'override',
        ...PRIORITY_FACTOR_META.override,
        active: !!pb.isOverride,
        detail: pb.isOverride ? 'Override institution — evaluated first' : 'No institution override',
        previewable: true,
      },
      {
        key: 'tier',
        ...PRIORITY_FACTOR_META.tier,
        active: institution.tierPriority !== null && institution.tierPriority !== undefined,
        detail: institution.tierCode ? `Tier: ${institution.tierCode} (priority ${institution.tierPriority})` : 'No institution tier assigned',
        previewable: true,
      },
      {
        key: 'history',
        ...PRIORITY_FACTOR_META.history,
        active: true, // always evaluated, even at 0
        detail: `${institution.allocationHistoryCount ?? 0} previous allocation${institution.allocationHistoryCount === 1 ? '' : 's'} for this institution`,
        previewable: true,
      },
      {
        key: 'rank',
        ...PRIORITY_FACTOR_META.rank,
        active: beneficiary.rankPriority !== null && beneficiary.rankPriority !== undefined,
        detail: beneficiary.rankCode ? `Rank: ${beneficiary.rankCode} (priority ${beneficiary.rankPriority})` : 'No rank assigned',
        previewable: true,
      },
    ];
  }

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

        // CRITICAL: beneficiary.id (the queue-row/beneficiary entity id) is
        // NOT the same as priorityBreakdown.beneficiary.id (the individual's
        // row id) in the confirmed response — e.g. item 1 has
        // beneficiary.id = "77ab9274..." but priorityBreakdown.beneficiary.id
        // = "359db143...". Every action (allocate/reject/preview/position)
        // must use beneficiary.id, never priorityBreakdown.beneficiary.id.
        const beneficiaryId = beneficiary.id;

        const fullName = getFullName(individual, beneficiaryId);
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

          waitingListPosition: beneficiary.waitingListPosition ?? 'N/A',
          enteredWaitingListAt: beneficiary.enteredWaitingListAt || null,
          waitingDuration: waitingDurationDays(beneficiary.enteredWaitingListAt),

          // Confirmed field names on the beneficiary row itself.
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

          requestId: request.id || 'N/A',
          referenceNumber: request.letterReferenceNumber || 'N/A',
          letterDate: request.letterDate ? formatDate(request.letterDate) : 'N/A',
          registeredAt: request.registeredAt ? formatDate(request.registeredAt) : 'N/A',
          authorizingOfficial: request.authorizingOfficial?.fullName || 'N/A',
          requestStatus: request.status || 'N/A',
        };
      });

      // Stats — from the backend's own totals, never invented.
      document.getElementById('active-queue-count')!.textContent = `${total} Beneficiaries`;
      document.getElementById('avg-wait-time')!.textContent =
        estimatedClearDays !== null ? `${estimatedClearDays} Days` : 'N/A';
      const allocatedCount = items.filter((q: any) => q.beneficiary?.status === 'allocated').length;
      document.getElementById('historical-disbursals')!.textContent = `${allocatedCount} Houses Mapped`;

      // Display-only sort — matches backend-provided position, never
      // recalculates it.
      flattenedData.sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : Infinity;
        const pb = typeof b.position === 'number' ? b.position : Infinity;
        return pa - pb;
      });

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
  header: 'Priority',
  key: 'priorityBreakdown',
  render: (item) => {
    const factors: Array<{ key: PriorityFactorKey; active: boolean; detail: string }> = [
      { key: 'override', active: !!item.priorityBreakdown.isOverride, detail: item.priorityBreakdown.isOverride ? 'Override institution' : 'No override' },
      { key: 'tier', active: item.priorityBreakdown.institution?.tierPriority != null, detail: item.priorityBreakdown.institution?.tierCode || 'No tier' },
      { key: 'history', active: true, detail: `${item.priorityBreakdown.institution?.allocationHistoryCount ?? 0} previous allocations` },
      { key: 'rank', active: item.priorityBreakdown.beneficiary?.rankPriority != null, detail: item.priorityBreakdown.beneficiary?.rankCode || 'No rank' },
    ];

    const buttons = factors.map(f => {
      const meta = PRIORITY_FACTOR_META[f.key];
      const isActive = f.active;
      
      // Bold, prominent styling for active factors with glow effect
      const activeClass = isActive 
        ? `bg-${meta.color}-50 border-${meta.color}-300 text-${meta.color}-700 shadow-md ring-2 ring-${meta.color}-200/50 scale-105 font-bold`
        : `bg-slate-50 border-slate-150 text-slate-300 opacity-40`;
      
      const activeDot = isActive 
        ? `<span class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-${meta.color}-500 rounded-full animate-pulse ring-2 ring-white"></span>`
        : '';
      
      return `
        <button
          type="button"
          data-priority-factor="${f.key}"
          data-beneficiary-id="${item.beneficiaryId}"
          data-beneficiary-name="${item.beneficiaryName}"
          title="${meta.label}: ${f.detail}"
          class="relative w-8 h-8 flex items-center justify-center rounded-lg border text-sm ${activeClass} hover:brightness-95 transition-all duration-200 ${isActive ? 'cursor-pointer hover:scale-105' : 'cursor-default'}"
        >
          <i class="fa-solid ${meta.icon} ${isActive ? 'text-base' : 'text-xs'}"></i>
          ${activeDot}
          ${isActive ? `<span class="absolute -bottom-1.5 text-[6px] font-black text-${meta.color}-600 uppercase tracking-wider">●</span>` : ''}
        </button>
      `;
    }).join('');

    return `<div class="flex flex-wrap gap-2 items-center">${buttons}</div>`;
  }
},
          {
            header: 'Beneficiary',
            key: 'beneficiaryName',
            sortable: true,
            render: (item) => `
              <div class="space-y-1.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-800 text-sm">${item.beneficiaryName}</span>
                  ${item.isOverride ? '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-full border border-amber-200"><i class="fa-solid fa-star"></i> Override</span>' : ''}
                </div>
                <div class="flex flex-wrap gap-2 text-[10px] text-slate-500">
                  <span><i class="fa-solid fa-medal text-blue-500 mr-1"></i>${item.beneficiaryRank}</span>
                  <span><i class="fa-solid fa-id-badge text-slate-400 mr-1"></i>${item.beneficiaryTitle}</span>
                </div>
              </div>
            `
          },
          {
            header: 'Contact',
            key: 'beneficiaryEmail',
            render: (item) => `
              <div class="space-y-1 text-[10px] text-slate-500">
                <p><i class="fa-solid fa-envelope text-slate-400 mr-1"></i>${item.beneficiaryEmail}</p>
                <p><i class="fa-solid fa-phone text-slate-400 mr-1"></i>${item.beneficiaryPhone}</p>
              </div>
            `
          },
          {
            header: 'Identity',
            key: 'beneficiaryNationalId',
            render: (item) => `
              <div class="space-y-1 text-[10px] text-slate-500">
                <p><i class="fa-solid fa-id-card text-slate-400 mr-1"></i>${item.beneficiaryNationalId}</p>
                <p><i class="fa-solid fa-cake-candles text-slate-400 mr-1"></i>${item.beneficiaryDateOfBirth}</p>
                <p><i class="fa-solid fa-venus-mars text-slate-400 mr-1"></i>${item.beneficiaryGender}</p>
              </div>
            `
          },
          {
            header: 'Waiting List',
            key: 'waitingListPosition',
            render: (item) => `
              <div class="space-y-1 text-[10px] text-slate-500 text-center">
                <p class="font-mono font-bold text-slate-700">#${item.waitingListPosition}</p>
                <p>${item.enteredWaitingListAt ? formatDate(item.enteredWaitingListAt) : 'N/A'}</p>
                <p class="text-slate-400">${item.waitingDuration} waiting</p>
              </div>
            `
          },
          {
            header: 'Decisions',
            key: 'deputyCeoDecision',
            render: (item) => `
              <div class="space-y-1 text-[9px]">
                <p><span class="text-slate-400">Deputy CEO:</span> <span class="font-semibold">${item.deputyCeoDecision}</span></p>
                <p><span class="text-slate-400">Director:</span> <span class="font-semibold">${item.directorDecision}</span></p>
                <p><span class="text-slate-400">Team Leader:</span> <span class="font-semibold">${item.teamLeaderDecision}</span></p>
              </div>
            `
          },
          {
            header: 'Institution',
            key: 'institutionName',
            sortable: true,
            render: (item) => `
              <div class="space-y-1.5">
                <p class="font-semibold text-slate-800 text-sm">${item.institutionName}</p>
                <p class="text-[10px] text-slate-400 font-mono">${item.institutionShortName}</p>
                <div class="flex flex-wrap gap-1 text-[9px]">
                  <span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">${item.institutionType}</span>
                  <span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200"><i class="fa-solid fa-building-columns mr-1"></i>${item.institutionTier}</span>
                </div>
                <p class="text-[9px] text-slate-400">Tier priority: ${item.institutionTierPriority} · ${item.allocationHistoryCount} prior allocation${item.allocationHistoryCount === 1 ? '' : 's'}</p>
              </div>
            `
          },
          {
            header: 'Request',
            key: 'referenceNumber',
            render: (item) => `
              <div class="space-y-1 text-[10px] text-slate-500">
                <p class="font-mono font-bold text-indigo-900 text-xs">${item.referenceNumber}</p>
                <p>Letter: ${item.letterDate}</p>
                <p>Registered: ${item.registeredAt}</p>
                <p>Official: ${item.authorizingOfficial}</p>
              </div>
            `
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
                <div class="space-y-1.5">
                  <span class="px-2 py-0.5 ${color} border text-[10px] font-bold rounded-md block text-center">${item.beneficiaryStatus}</span>
                  <span class="px-2 py-0.5 bg-slate-50 border border-slate-150 text-slate-600 text-[9px] rounded-md block text-center">${item.requestStatus}</span>
                </div>
              `
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
              // NOTE: "Set Override" / "Remove Override" are intentionally
              // omitted. The backend endpoint that used to power them
              // (PATCH /house-allocation-queue/:id/priority) has been
              // removed — override is now purely a fact of the requesting
              // institution's tier (isOverrideTier), not a per-beneficiary
              // toggle this controller exposes. Adding these buttons back
              // would call an endpoint that no longer exists.
              return `
                <div class="flex flex-col gap-1.5">
                  <button data-allocate-id="${item.beneficiaryId}" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1">
                    <i class="fa-solid fa-check"></i> Allocate
                  </button>
                  <button data-reject-id="${item.beneficiaryId}" class="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                    <i class="fa-solid fa-ban"></i> Reject
                  </button>
                </div>
              `;
            }
          }
        ],
        data: flattenedData,
      });

      attachActionListeners();

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

  const attachActionListeners = () => {
    const tableContainer = document.getElementById('queue-table-container');
    if (!tableContainer) return;

    // Event delegation — one listener per container, re-attached on every
    // render, avoiding duplicate handlers across refreshes.
    tableContainer.querySelectorAll('[data-allocate-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const beneficiaryId = btn.getAttribute('data-allocate-id');
        if (beneficiaryId) handleAllocate(beneficiaryId);
      });
    });

    tableContainer.querySelectorAll('[data-reject-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const beneficiaryId = btn.getAttribute('data-reject-id');
        if (beneficiaryId) handleReject(beneficiaryId);
      });
    });

    tableContainer.querySelectorAll('[data-explain-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const beneficiaryId = btn.getAttribute('data-explain-id');
        if (beneficiaryId) handleShowExplanation(beneficiaryId);
      });
    });

    // Individual priority-factor buttons. Since the backend has no
    // removal/restore endpoint, clicking one opens the read-only preview
    // (clearly labeled as a simulation) rather than a fake "remove" action.
  // Inside attachActionListeners():
tableContainer.querySelectorAll('[data-priority-factor]').forEach(btn => {
  btn.addEventListener('click', () => {
    const factor = btn.getAttribute('data-priority-factor') as PriorityFactorKey | null;
    const beneficiaryId = btn.getAttribute('data-beneficiary-id');
    const beneficiaryName = btn.getAttribute('data-beneficiary-name') || 'This beneficiary';
    if (factor && beneficiaryId && beneficiaryId !== 'N/A') {
      handlePreviewSingleFactor(beneficiaryId, factor, beneficiaryName);
    }
  });
});
  };

  document.getElementById('btn-next-queue')?.addEventListener('click', () => {
    handleProcessNext();
  });

  document.getElementById('btn-check-position')?.addEventListener('click', () => {
    handlePositionChecker();
  });

  loadAndRenderTable();

  // Exposed so preview/allocate/reject handlers below can trigger a full
  // refresh without re-declaring the closure.
  (window as any).__reloadQueueTable = loadAndRenderTable;
}

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
        await store.apiService.post(`/house-allocation-queue/${next.beneficiaryId}/allocate`, {
          houseId: '00000000-0000-0000-0000-000000000001'
        });
        Toast.success(`${next.beneficiaryName} has been successfully allocated a house.`);
        (window as any).__reloadQueueTable?.();
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
      await store.apiService.post(`/house-allocation-queue/${beneficiaryId}/allocate`, {
        houseId: houseId.trim()
      });
      Toast.success('Housing successfully allocated and beneficiary finalized.');
      (window as any).__reloadQueueTable?.();
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

      await store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, {
        status: 'unauthorized_by_directive',
        reason: reason.trim()
      });
      Toast.success('Beneficiary rejected and removed from queue.');
      (window as any).__reloadQueueTable?.();
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
 * Clicking one priority-factor icon opens a focused, single-factor preview.
 * STATELESS — calls GET /house-allocation-queue/:id/priority-factor-preview?factor=...
 * Nothing is saved, removed, or restored. The confirmation-style modal the
 * task spec describes ("Remove Priority Factor?") is replaced with an
 * honest preview, since no removal endpoint exists on the backend.
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