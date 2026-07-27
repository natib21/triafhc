// House Allocation Requests Module
import { store } from '../store';
import { Modal, Toast,Table } from '../components';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
const BENEFICIARY_PAGE_SIZE = 20;
const STATUS_MAP = {
  'draft': { label: 'Draft', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  'submitted': { label: 'Submitted', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'under_deputy_ceo_review': { label: 'Deputy CEO Review', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'under_director_review': { label: 'Director Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'pending_team_leader_decision': { label: 'Team Leader Review', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'under_team_officer_review': { label: 'Team Officer Review', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'partial_waiting_list': { label: 'Partial Waiting List', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  'partial_allocation': { label: 'Partial Allocation', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  'waiting_list': { label: 'Waiting List', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  'allocated': { label: 'Allocated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft', icon: 'fa-regular fa-file-pen' },
  { key: 'submitted', label: 'Submitted', icon: 'fa-regular fa-file-lines' },
  { key: 'under_deputy_ceo_review', label: 'Deputy CEO Review', icon: 'fa-regular fa-user-tie' },
  { key: 'under_director_review', label: 'Director Review', icon: 'fa-regular fa-user' },
  { key: 'pending_team_leader_decision', label: 'Team Leader Review', icon: 'fa-regular fa-clipboard-check' },
  { key: 'under_team_officer_review', label: 'Team Officer Review', icon: 'fa-regular fa-user-gear' },
//   { key: 'partial_waiting_list', label: 'Partial Waiting List', icon: 'fa-regular fa-clock', conditional: true },
//   { key: 'partial_allocation', label: 'Partial Allocation', icon: 'fa-regular fa-building', conditional: true },
//   { key: 'waiting_list', label: 'Waiting List', icon: 'fa-regular fa-list', conditional: true },
//   { key: 'allocated', label: 'Allocated', icon: 'fa-regular fa-circle-check', conditional: true }
// ];
]

const BENEFICIARY_STATUS_MAP = {
  'pending_review': { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'eligible': { label: 'Eligible', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'under_legal_revision': { label: 'Legal Revision', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'waiting_list': { label: 'Waiting List', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  'allocated': { label: 'Allocated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'unauthorized_by_directive': { label: 'Unauthorized', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const WORKFLOW_ROLE_MAP = {
  'submitted': { role: 'deputy_ceo', action: 'start_review', label: 'Start Deputy Review' },
  'under_deputy_ceo_review': { role: 'deputy_ceo', action: 'submit_decision', label: 'Submit Decision' },
  'under_director_review': { role: 'director', action: 'submit_decision', label: 'Submit Decision' },
  'pending_team_leader_decision': { role: 'team_leader', action: 'submit_decision', label: 'Submit Decision' },
  'under_team_officer_review': { role: 'team_officer', action: 'process', label: 'Process Beneficiaries' }
};


const OVERRIDE_LEGEND = {
  label: 'Priority Override',
  icon: 'fa-solid fa-flag',
  color: 'bg-rose-100 text-rose-700 border-rose-300',
  description: 'Manual override that places the beneficiary at the front of the queue, bypassing standard priority rules (tier, history, rank, FIFO).'
};
const BENEFICIARY_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'under_legal_revision', label: 'Legal Revision' },
  { value: 'waiting_list', label: 'Waiting List' },
  { value: 'allocated', label: 'Allocated' },
  { value: 'unauthorized_by_directive', label: 'Unauthorized' }
];

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
// ─── MODULE STATE ──────────────────────────────────────────────────────────

let isRendering = false;
let isFetchingUser = false;
let renderTimeout = null;
let storeUnsubscribe = null;
let currentFilter = 'all';
let searchQuery = '';

let activeTab = 'requests'; // 'requests' | 'beneficiaries'
let beneficiaryViewMode = 'all'; // kept for API compatibility with fetchBeneficiaries
let beneficiarySelectedRequestId = '';
// Add these to the MODULE STATE section
let beneficiaryFilters = {
  search: '',
  requestInstitutionId: '',
  beneficiaryInstitutionId: '',
  rank: '',
  status: '',
  override: '', // '', 'yes', 'no'
  dateFrom: '',
  dateTo: '',
  allocationHistoryMin: '', // New
  allocationHistoryMax: ''  // New
};
let beneficiaryPage = 1;
let beneficiaryData = [];
let beneficiaryTotalCount = 0;
let isLoadingBeneficiaries = false;


const BENEFICIARY_STATUS_LEGEND = {
  'waiting_list': {
    label: 'Waiting List',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'fa-regular fa-clock',
    description: 'Beneficiary is in the queue waiting for house allocation. They will be processed in priority order.'
  },
  'eligible': {
    label: 'Eligible',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'fa-regular fa-circle-check',
    description: 'Beneficiary has been reviewed and approved by the reviewer. Ready for team officer processing.'
  },
  'pending_review': {
    label: 'Pending Review',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'fa-regular fa-hourglass-half',
    description: 'Beneficiary is awaiting review by the appropriate authority.'
  },
  'under_legal_revision': {
    label: 'Legal Revision',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'fa-regular fa-scale-balanced',
    description: 'Beneficiary requires legal review before proceeding with allocation.'
  },
  'allocated': {
    label: 'Allocated',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'fa-regular fa-circle-check',
    description: 'Beneficiary has been successfully allocated a house.'
  },
  'unauthorized_by_directive': {
    label: 'Unauthorized',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'fa-regular fa-ban',
    description: 'Beneficiary has been rejected and is not authorized for allocation.'
  }
};

// const OVERRIDE_LEGEND = {
//   label: 'Priority Override',
//   icon: 'fa-solid fa-flag',
//   color: 'bg-rose-100 text-rose-700 border-rose-300',
//   description: 'Manual override that places the beneficiary at the front of the queue, bypassing standard priority rules (tier, history, rank, FIFO).'
// };

// ─── BENEFICIARY STATS CARDS ────────────────────────────────────────────
function renderBeneficiaryStatsCards(data) {
  const total = data.length;
  
  // Status counts
  const statusCounts = {};
  const statusOptions = ['waiting_list', 'eligible', 'pending_review', 'under_legal_revision', 'allocated', 'unauthorized_by_directive'];
  statusOptions.forEach(s => statusCounts[s] = 0);
  
  data.forEach(d => {
    const status = (d.status || '').toLowerCase();
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  });
  
  // Institution counts
  const beneficiaryInst = new Set();
  const requestingInst = new Set();
  data.forEach(d => {
    const benInst = d.beneficiaryInstitutionName || getInstitutionName(d.beneficiaryInstitution) || '';
    if (benInst && benInst !== 'N/A') beneficiaryInst.add(benInst);
    const reqInst = d.requestingInstitutionName || d.requestingInstitution?.name?.en || '';
    if (reqInst && reqInst !== 'N/A') requestingInst.add(reqInst);
  });
  
  // Override count
  const withOverride = data.filter(d => !!(d.isOverrideQueue ?? d.isOverride)).length;
  
  // Allocation history stats
  let totalHistory = 0;
  let maxHistory = 0;
  data.forEach(d => {
    const history = d.allocationHistoryCount ?? d.beneficiaryInstitution?.allocationHistoryCount ?? 0;
    totalHistory += history;
    if (history > maxHistory) maxHistory = history;
  });
  const avgHistory = data.length > 0 ? (totalHistory / data.length) : 0;

  return `
    <!-- Main Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <!-- Total Beneficiaries -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-[#714B67]/40 transition-all group">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Beneficiaries</p>
          <p class="text-2xl font-extrabold text-slate-900 group-hover:text-[#714B67] transition-colors">${total}</p>
          <p class="text-[9px] text-slate-400">${beneficiaryInst.size} institutions</p>
        </div>
        <div class="p-3 bg-[#714B67]/10 text-[#714B67] rounded-xl group-hover:bg-[#714B67]/20 transition-all">
          <i class="fa-regular fa-users text-lg"></i>
        </div>
      </div>

      <!-- Waiting List -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-teal-400 transition-all group cursor-help" title="${BENEFICIARY_STATUS_LEGEND.waiting_list.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-clock text-teal-500"></i> Waiting List
          </p>
          <p class="text-2xl font-extrabold text-teal-600 group-hover:text-teal-700 transition-colors">${statusCounts.waiting_list}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((statusCounts.waiting_list/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-100 transition-all">
          <i class="fa-regular fa-list text-lg"></i>
        </div>
      </div>

      <!-- Eligible -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-blue-400 transition-all group cursor-help" title="${BENEFICIARY_STATUS_LEGEND.eligible.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-circle-check text-blue-500"></i> Eligible
          </p>
          <p class="text-2xl font-extrabold text-blue-600 group-hover:text-blue-700 transition-colors">${statusCounts.eligible}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((statusCounts.eligible/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-all">
          <i class="fa-regular fa-circle-check text-lg"></i>
        </div>
      </div>

      <!-- Unauthorized -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-rose-400 transition-all group cursor-help" title="${BENEFICIARY_STATUS_LEGEND.unauthorized_by_directive.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-ban text-rose-500"></i> Unauthorized
          </p>
          <p class="text-2xl font-extrabold text-rose-600 group-hover:text-rose-700 transition-colors">${statusCounts.unauthorized_by_directive}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((statusCounts.unauthorized_by_directive/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-all">
          <i class="fa-regular fa-ban text-lg"></i>
        </div>
      </div>
    </div>

    <!-- Secondary Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <!-- Pending Review -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-amber-400 transition-all group cursor-help" title="${BENEFICIARY_STATUS_LEGEND.pending_review.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-hourglass-half text-amber-500"></i> Pending Review
          </p>
          <p class="text-2xl font-extrabold text-amber-600 group-hover:text-amber-700 transition-colors">${statusCounts.pending_review}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((statusCounts.pending_review/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-all">
          <i class="fa-regular fa-hourglass-half text-lg"></i>
        </div>
      </div>

      <!-- Legal Revision -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-purple-400 transition-all group cursor-help" title="${BENEFICIARY_STATUS_LEGEND.under_legal_revision.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-scale-balanced text-purple-500"></i> Legal Revision
          </p>
          <p class="text-2xl font-extrabold text-purple-600 group-hover:text-purple-700 transition-colors">${statusCounts.under_legal_revision}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((statusCounts.under_legal_revision/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-100 transition-all">
          <i class="fa-regular fa-scale-balanced text-lg"></i>
        </div>
      </div>

      <!-- Allocated -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-emerald-400 transition-all group cursor-help" title="${BENEFICIARY_STATUS_LEGEND.allocated.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-circle-check text-emerald-500"></i> Allocated
          </p>
          <p class="text-2xl font-extrabold text-emerald-600 group-hover:text-emerald-700 transition-colors">${statusCounts.allocated}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((statusCounts.allocated/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-all">
          <i class="fa-regular fa-circle-check text-lg"></i>
        </div>
      </div>

      <!-- Override -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-rose-400 transition-all group cursor-help" title="${OVERRIDE_LEGEND.description}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-solid fa-flag text-rose-500"></i> Override
          </p>
          <p class="text-2xl font-extrabold text-rose-600 group-hover:text-rose-700 transition-colors">${withOverride}</p>
          <p class="text-[9px] text-slate-400">${total > 0 ? Math.round((withOverride/total)*100) : 0}% of total</p>
        </div>
        <div class="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-all">
          <i class="fa-solid fa-flag text-lg"></i>
        </div>
      </div>
    </div>

    <!-- Institution Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-indigo-400 transition-all group">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-building text-indigo-500"></i> Beneficiary Institutions
          </p>
          <p class="text-xl font-extrabold text-indigo-600 group-hover:text-indigo-700 transition-colors">${beneficiaryInst.size}</p>
          <p class="text-[9px] text-slate-400">Unique institutions</p>
        </div>
        <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-all">
          <i class="fa-regular fa-building-columns text-lg"></i>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-cyan-400 transition-all group">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <i class="fa-regular fa-file-lines text-cyan-500"></i> Requesting Institutions
          </p>
          <p class="text-xl font-extrabold text-cyan-600 group-hover:text-cyan-700 transition-colors">${requestingInst.size}</p>
          <p class="text-[9px] text-slate-400">Unique institutions</p>
        </div>
        <div class="p-3 bg-cyan-50 text-cyan-600 rounded-xl group-hover:bg-cyan-100 transition-all">
          <i class="fa-regular fa-file-lines text-lg"></i>
        </div>
      </div>
    </div>

    <!-- Allocation History Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all group">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total History</p>
          <p class="text-xl font-extrabold text-slate-800">${totalHistory}</p>
          <p class="text-[9px] text-slate-400">Allocations</p>
        </div>
        <div class="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-200 transition-all">
          <i class="fa-regular fa-list-check text-sm"></i>
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all group">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg History</p>
          <p class="text-xl font-extrabold text-slate-800">${avgHistory.toFixed(1)}</p>
          <p class="text-[9px] text-slate-400">Per beneficiary</p>
        </div>
        <div class="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-200 transition-all">
          <i class="fa-regular fa-chart-simple text-sm"></i>
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all group">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max History</p>
          <p class="text-xl font-extrabold text-slate-800">${maxHistory}</p>
          <p class="text-[9px] text-slate-400">Highest allocation count</p>
        </div>
        <div class="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-200 transition-all">
          <i class="fa-regular fa-arrow-up text-sm"></i>
        </div>
      </div>
    </div>

    <!-- Status Legend -->
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
        <i class="fa-regular fa-circle-info text-[#714B67]"></i> Status Legend
      </p>
      <div class="flex flex-wrap gap-3">
        ${Object.entries(BENEFICIARY_STATUS_LEGEND).map(([key, value]) => `
          <div class="flex items-center gap-1.5 cursor-help group relative" title="${value.description}">
            <span class="px-2 py-0.5 ${value.color} border text-[10px] font-bold rounded-md flex items-center gap-1">
              <i class="${value.icon} text-[9px]"></i>
              ${value.label}
            </span>
            <span class="hidden group-hover:inline text-[9px] text-slate-400">ⓘ</span>
          </div>
        `).join('')}
        <div class="flex items-center gap-1.5 cursor-help group relative" title="${OVERRIDE_LEGEND.description}">
          <span class="px-2 py-0.5 ${OVERRIDE_LEGEND.color} border text-[10px] font-bold rounded-md flex items-center gap-1">
            <i class="${OVERRIDE_LEGEND.icon} text-[9px]"></i>
            ${OVERRIDE_LEGEND.label}
          </span>
          <span class="hidden group-hover:inline text-[9px] text-slate-400">ⓘ</span>
        </div>
      </div>
    </div>
  `;
}



// ─── BENEFICIARIES UI RENDERING ─────────────────────────────────────────

function renderBeneficiariesSection() {
  const container = document.getElementById('beneficiaries-container');
  if (!container) return;

  const filteredData = applyClientSideBeneficiaryFilters(beneficiaryData);
  const totalPages = Math.max(1, Math.ceil(beneficiaryTotalCount / BENEFICIARY_PAGE_SIZE));

  container.innerHTML = `
    <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <i class="fa-regular fa-users text-[#714B67]"></i>
          <h2 class="text-sm font-bold text-slate-800">Beneficiaries</h2>
          <span class="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">${beneficiaryTotalCount} total</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400">${filteredData.length} filtered</span>
          <button id="ben-refresh-btn" class="flex items-center gap-1 text-xs font-semibold text-[#714B67] hover:underline" ${isLoadingBeneficiaries ? 'disabled' : ''}>
            <i class="fa-solid fa-rotate ${isLoadingBeneficiaries ? 'animate-spin' : ''}"></i> Refresh
          </button>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="px-4 pt-4">
        ${!isLoadingBeneficiaries && beneficiaryData.length > 0 ? renderBeneficiaryStatsCards(beneficiaryData) : ''}
      </div>
      
      <!-- Filter Bar -->
      <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search -->
          <div class="flex-1 min-w-[140px] max-w-[200px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Search</label>
            <input type="text" id="ben-search-input" placeholder="By name..." 
              value="${beneficiaryFilters.search}"
              class="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
          </div>
          
          <!-- Status -->
          <div class="flex-1 min-w-[120px] max-w-[160px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Status</label>
            <select id="ben-status-filter" class="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              ${BENEFICIARY_STATUS_OPTIONS.map(opt => `
                <option value="${opt.value}" ${beneficiaryFilters.status === opt.value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
          
          <!-- Override -->
          <div class="flex-1 min-w-[100px] max-w-[140px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Override</label>
            <select id="ben-override-filter" class="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              <option value="">All</option>
              <option value="yes" ${beneficiaryFilters.override === 'yes' ? 'selected' : ''}>Has Override</option>
              <option value="no" ${beneficiaryFilters.override === 'no' ? 'selected' : ''}>No Override</option>
            </select>
          </div>
          
          <!-- Rank -->
          <div class="flex-1 min-w-[100px] max-w-[140px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Rank</label>
            <select id="ben-rank-filter" class="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              <option value="">All Ranks</option>
              ${getUniqueRanks().map(rank => `
                <option value="${rank}" ${beneficiaryFilters.rank === rank ? 'selected' : ''}>${rank}</option>
              `).join('')}
            </select>
          </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <!-- Beneficiary Institution -->
          <div class="flex-1 min-w-[140px] max-w-[200px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Beneficiary Institution</label>
            <select id="ben-beneficiary-inst-filter" class="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              <option value="">All Institutions</option>
              ${getUniqueBeneficiaryInstitutions().map(inst => `
                <option value="${inst.id}" ${beneficiaryFilters.beneficiaryInstitutionId === inst.id ? 'selected' : ''}>${inst.name}</option>
              `).join('')}
            </select>
          </div>
          
          <!-- Requesting Institution -->
          <div class="flex-1 min-w-[140px] max-w-[200px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Requesting Institution</label>
            <select id="ben-requesting-inst-filter" class="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              <option value="">All Institutions</option>
              ${getUniqueRequestingInstitutions().map(inst => `
                <option value="${inst.id}" ${beneficiaryFilters.requestInstitutionId === inst.id ? 'selected' : ''}>${inst.name}</option>
              `).join('')}
            </select>
          </div>
          
          <!-- Allocation History Range -->
          <div class="flex-1 min-w-[180px] max-w-[260px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Allocation History</label>
            <div class="flex items-center gap-1">
              <input type="number" id="ben-history-min" placeholder="Min" min="0"
                value="${beneficiaryFilters.allocationHistoryMin || ''}"
                class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              <span class="text-xs text-slate-400">-</span>
              <input type="number" id="ben-history-max" placeholder="Max" min="0"
                value="${beneficiaryFilters.allocationHistoryMax || ''}"
                class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
            </div>
          </div>
          
          <!-- Date Range -->
          <div class="flex-1 min-w-[200px] max-w-[280px]">
            <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Registered Date</label>
            <div class="flex items-center gap-1">
              <input type="date" id="ben-date-from" 
                value="${beneficiaryFilters.dateFrom || ''}"
                class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
              <span class="text-xs text-slate-400">to</span>
              <input type="date" id="ben-date-to" 
                value="${beneficiaryFilters.dateTo || ''}"
                class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]">
            </div>
          </div>
          
          <button id="ben-clear-filters" class="px-3 py-1 mt-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
            <i class="fa-solid fa-filter-circle-xmark mr-1"></i> Clear
          </button>
        </div>
      </div>
      
      <div id="beneficiaries-table-wrap">
        ${isLoadingBeneficiaries ? renderBeneficiaryLoadingState() : renderBeneficiaryTable()}
      </div>
    </div>
  `;

  // ─── ATTACH FILTER LISTENERS ──────────────────────────────────────────
  document.getElementById('ben-refresh-btn')?.addEventListener('click', () => {
    fetchBeneficiaries();
  });

  document.getElementById('ben-search-input')?.addEventListener('input', (e) => {
    beneficiaryFilters.search = (e.target as HTMLInputElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-status-filter')?.addEventListener('change', (e) => {
    beneficiaryFilters.status = (e.target as HTMLSelectElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-override-filter')?.addEventListener('change', (e) => {
    beneficiaryFilters.override = (e.target as HTMLSelectElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-beneficiary-inst-filter')?.addEventListener('change', (e) => {
    beneficiaryFilters.beneficiaryInstitutionId = (e.target as HTMLSelectElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-requesting-inst-filter')?.addEventListener('change', (e) => {
    beneficiaryFilters.requestInstitutionId = (e.target as HTMLSelectElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-rank-filter')?.addEventListener('change', (e) => {
    beneficiaryFilters.rank = (e.target as HTMLSelectElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-history-min')?.addEventListener('change', (e) => {
    beneficiaryFilters.allocationHistoryMin = (e.target as HTMLInputElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-history-max')?.addEventListener('change', (e) => {
    beneficiaryFilters.allocationHistoryMax = (e.target as HTMLInputElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-date-from')?.addEventListener('change', (e) => {
    beneficiaryFilters.dateFrom = (e.target as HTMLInputElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-date-to')?.addEventListener('change', (e) => {
    beneficiaryFilters.dateTo = (e.target as HTMLInputElement).value;
    beneficiaryPage = 1;
    fetchBeneficiaries();
  });

  document.getElementById('ben-clear-filters')?.addEventListener('click', () => {
    beneficiaryFilters.search = '';
    beneficiaryFilters.status = '';
    beneficiaryFilters.override = '';
    beneficiaryFilters.beneficiaryInstitutionId = '';
    beneficiaryFilters.requestInstitutionId = '';
    beneficiaryFilters.rank = '';
    beneficiaryFilters.allocationHistoryMin = '';
    beneficiaryFilters.allocationHistoryMax = '';
    beneficiaryFilters.dateFrom = '';
    beneficiaryFilters.dateTo = '';
    beneficiaryPage = 1;
    
    (document.getElementById('ben-search-input') as HTMLInputElement).value = '';
    (document.getElementById('ben-status-filter') as HTMLSelectElement).value = '';
    (document.getElementById('ben-override-filter') as HTMLSelectElement).value = '';
    (document.getElementById('ben-beneficiary-inst-filter') as HTMLSelectElement).value = '';
    (document.getElementById('ben-requesting-inst-filter') as HTMLSelectElement).value = '';
    (document.getElementById('ben-rank-filter') as HTMLSelectElement).value = '';
    (document.getElementById('ben-history-min') as HTMLInputElement).value = '';
    (document.getElementById('ben-history-max') as HTMLInputElement).value = '';
    (document.getElementById('ben-date-from') as HTMLInputElement).value = '';
    (document.getElementById('ben-date-to') as HTMLInputElement).value = '';
    fetchBeneficiaries();
  });

  document.getElementById('ben-page-prev')?.addEventListener('click', () => {
    if (beneficiaryPage > 1) {
      beneficiaryPage--;
      fetchBeneficiaries();
    }
  });

  document.getElementById('ben-page-next')?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(beneficiaryTotalCount / BENEFICIARY_PAGE_SIZE));
    if (beneficiaryPage < totalPages) {
      beneficiaryPage++;
      fetchBeneficiaries();
    }
  });
}

// ─── HELPER FUNCTIONS FOR FILTERS ──────────────────────────────────────

function getUniqueBeneficiaryInstitutions() {
  const instMap = new Map();
  beneficiaryData.forEach(d => {
    const id = d.beneficiaryInstitution?.id;
    const name = d.beneficiaryInstitutionName || getInstitutionName(d.beneficiaryInstitution) || '';
    if (id && name && name !== 'N/A') {
      instMap.set(id, { id, name });
    }
  });
  return Array.from(instMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getUniqueRequestingInstitutions() {
  const instMap = new Map();
  beneficiaryData.forEach(d => {
    const id = d.requestingInstitution?.id;
    const name = d.requestingInstitutionName || d.requestingInstitution?.name?.en || '';
    if (id && name && name !== 'N/A') {
      instMap.set(id, { id, name });
    }
  });
  return Array.from(instMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getUniqueRanks() {
  const ranks = new Set();
  beneficiaryData.forEach(d => {
    const rank = d.beneficiaryIndividual?.currentRank?.code || '';
    if (rank && rank !== 'N/A') {
      ranks.add(rank);
    }
  });
  return Array.from(ranks).sort();
}

function renderBeneficiaryLoadingState() {
  return `
    <div class="p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="mt-3 text-xs text-slate-500">Loading beneficiaries...</p>
      </div>
    </div>
  `;
}

function renderBeneficiaryTable() {
  const filteredData = applyClientSideBeneficiaryFilters(beneficiaryData);
  const totalPages = Math.max(1, Math.ceil(beneficiaryTotalCount / BENEFICIARY_PAGE_SIZE));

  if (filteredData.length === 0) {
    return `
      <div class="p-12 text-center">
        <i class="fa-regular fa-users text-4xl text-slate-300 mb-3 block"></i>
        <p class="text-sm font-semibold text-slate-500">No beneficiaries found</p>
        <p class="text-xs text-slate-400 mt-1">Try adjusting your filters or search criteria.</p>
      </div>
      <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
        <span class="text-[10px] text-slate-400">Page ${beneficiaryPage} of ${totalPages} · ${beneficiaryTotalCount} total</span>
        <div class="flex items-center gap-1">
          <button id="ben-page-prev" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors ${beneficiaryPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${beneficiaryPage <= 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button id="ben-page-next" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors ${beneficiaryPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${beneficiaryPage >= totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div id="beneficiaries-table-container" class="overflow-x-auto w-full"></div>
    <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
      <span class="text-[10px] text-slate-400">
        Page ${beneficiaryPage} of ${totalPages} · ${beneficiaryTotalCount} total · Showing ${filteredData.length} filtered
      </span>
      <div class="flex items-center gap-1">
        <button id="ben-page-prev" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors ${beneficiaryPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${beneficiaryPage <= 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button id="ben-page-next" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors ${beneficiaryPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${beneficiaryPage >= totalPages ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>`
}

// ─── INITIALIZE MODULE ─────────────────────────────────────────────────────

export function initAllocationRequests() {
  console.log('initAllocationRequests: Starting...');
  
  // Clean up any existing subscription
  cleanupAllocationRequests();
  
  // Register a single store subscription with debounce
  storeUnsubscribe = store.subscribe(() => {
    if (renderTimeout) {
      clearTimeout(renderTimeout);
    }
    renderTimeout = setTimeout(() => {
      console.log('Store changed, re-rendering...');
      if (!isRendering) {
        renderAllocationRequests();
      }
    }, 50);
  });
  
  // ✅ If user is already loaded, just render
  if (store.currentUser) {
    console.log('initAllocationRequests: User already loaded, rendering...');
    renderAllocationRequests();
    return;
  }
  
  // ✅ User not loaded - fetch and then render
  console.log('initAllocationRequests: No user found, fetching...');
  
  // Use store.initializeUser() which handles mock mode
  store.initializeUser()
    .then(() => {
      console.log('initAllocationRequests: User initialized successfully');
      // ✅ Force re-render after user loads
      // The store subscription should trigger this, but we do it explicitly
      setTimeout(() => {
        if (!isRendering) {
          console.log('initAllocationRequests: Forcing re-render after user load');
          renderAllocationRequests();
        }
      }, 50);
    })
    .catch((error) => {
      console.error('initAllocationRequests: Failed to initialize user:', error);
      // Show error state
      const contentArea = document.getElementById('main-content-area');
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="min-h-screen bg-[#F8F9FA] p-6">
            <div class="max-w-[1600px] mx-auto">
              <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-circle-exclamation text-lg"></i>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-rose-800">Failed to Load User Data</h3>
                    <p class="text-sm text-rose-600 mt-1">${error.message || 'Unable to load user data. Please refresh the page.'}</p>
                    <button onclick="window.retryRenderAllocationRequests()" class="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm">
                      <i class="fa-solid fa-rotate mr-2"></i>Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    });
  
  // ✅ Show loading state immediately
  renderAllocationRequests();
}
// ─── CLEANUP FUNCTION ─────────────────────────────────────────────────────

 function cleanupAllocationRequests() {
  console.log('cleanupAllocationRequests: Cleaning up...');
  if (storeUnsubscribe) {
    storeUnsubscribe();
    storeUnsubscribe = null;
  }
  
  if (renderTimeout) {
    clearTimeout(renderTimeout);
    renderTimeout = null;
  }
  
  isRendering = false;
  isFetchingUser = false;
}



function switchAllocationTab(tab) {
  if (tab === activeTab) return;
  activeTab = tab;
  renderAllocationRequests();
  
  // Auto-fetch beneficiaries when switching to the Beneficiaries tab
  if (tab === 'beneficiaries' && !isLoadingBeneficiaries && beneficiaryData.length === 0) {
    fetchBeneficiaries();
  }
}

// ─── RENDER ALLOCATION REQUESTS ──────────────────────────────────────────

 function renderAllocationRequests() {
  try {
    console.log('renderAllocationRequests: Starting...');
    
    // Prevent multiple simultaneous renders
    if (isRendering) {
      console.log('renderAllocationRequests: Already rendering, skipping...');
      return;
    }
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) return;

    if (!store) {
      console.error('renderAllocationRequests: store is undefined');
      showError('Store is not initialized.');
      return;
    }
    
    // ✅ PURE RENDER: Check user, show loading if null, but DO NOT fetch
    if (!store.currentUser) {
      console.log('User data not loaded yet, showing loading...');
      
      contentArea.innerHTML = `
        <div class="min-h-screen bg-[#F8F9FA] p-6">
          <div class="max-w-[1600px] mx-auto">
            <div class="flex items-center justify-center p-12">
              <div class="text-center">
                <div class="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p class="mt-3 text-sm text-slate-500">Loading user data...</p>
                <button onclick="window.retryRenderAllocationRequests()" class="mt-3 text-xs text-[#714B67] hover:underline">
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      return; // ⚠️ IMPORTANT: Return early, DO NOT fetch
    }
    
    console.log('User loaded:', store.currentUser?.email);
    console.log('User roles:', store.currentUser?.roles);

    store.allocationRequests = store.allocationRequests || [];
    isRendering = true;

    contentArea.innerHTML = `
      <div class="min-h-screen bg-[#F8F9FA] p-6">
        <div class="max-w-[1600px] mx-auto">
          <!-- Header -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-[#714B67] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                <i class="fa-solid fa-database text-white text-sm"></i>
              </div>
              <div>
                <nav class="flex text-[10px] text-gray-500 gap-1 uppercase tracking-wider font-bold">
                  <span class="hover:text-[#714B67] cursor-pointer">Operations</span>
                  <span>/</span>
                  <span class="hover:text-[#714B67] cursor-pointer">House Allocation</span>
                  <span>/</span>
                  <span class="text-[#714B67]">Workflow Tracker</span>
                </nav>
                <h1 class="text-lg font-extrabold tracking-tight text-gray-900 leading-none">
                  House Allocation Requests
                </h1>
              </div>
            </div>
            <button id="btn-create-request" class="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5f3e56] active:bg-[#4d3246] text-white text-xs font-bold rounded-lg shadow-sm transition-all">
              <i class="fa-solid fa-plus"></i> File Allocation Request
            </button>
          </div>
          <!-- View Tabs (compact, icon + short label) -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-1.5 mb-6 inline-flex items-center gap-1">
            <button id="tab-requests" class="tab-switch-btn flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'requests' ? 'bg-[#714B67] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}" data-tab="requests">
              <i class="fa-regular fa-folder-open"></i> Requests
            </button>
            <button id="tab-beneficiaries" class="tab-switch-btn flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'beneficiaries' ? 'bg-[#714B67] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}" data-tab="beneficiaries">
              <i class="fa-regular fa-users"></i> Beneficiaries
            </button>
          </div>

          <!-- REQUESTS PANEL -->
          <div id="requests-tab-panel" class="${activeTab === 'requests' ? '' : 'hidden'}">

            <!-- Metrics Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="metrics-grid">
              ${renderMetrics()}
            </div>

            <!-- Status Filter Buttons -->
            <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4 mb-6">
              <div class="flex items-center gap-2 flex-wrap" id="filter-container">
                <button class="filter-btn px-3 py-1.5 bg-[#714B67]/10 text-[#714B67] font-semibold text-xs rounded-lg transition-all border border-[#714B67]/20 shadow-sm" data-filter="all">All Documents</button>
                <button class="filter-btn px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-sm" data-filter="active">Active Pipeline</button>
                ${Object.keys(STATUS_MAP).map(status => `
                  <button class="filter-btn px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-sm" data-filter="${status.toLowerCase()}">
                    ${STATUS_MAP[status].label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Request Cards Container -->
            <div id="requests-cards-container"></div>
          </div>

          <!-- BENEFICIARIES PANEL (sibling of the requests panel, not nested inside it) -->
          <div id="beneficiaries-tab-panel" class="${activeTab === 'beneficiaries' ? '' : 'hidden'}">
            <div id="beneficiaries-container"></div>
          </div>
        </div>
      </div>
    `;

    // ─── RENDER METRICS ──────────────────────────────────────────────────

    function renderMetrics() {
      const items = store.allocationRequests || [];
      const totalCount = items.length;
      const approvedCount = items.filter(i => i.status === 'APPROVED').length;
      const activeCount = items.filter(i => !['APPROVED', 'REJECTED', 'CANCELLED'].includes(i.status)).length;
      const totalBudget = items.reduce((sum, i) => sum + (i.budget || 0), 0);

      return `
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-[#714B67]/40 transition-all group">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Intake</span>
            <h3 class="text-2xl font-extrabold text-slate-900 group-hover:text-[#714B67] transition-colors">${totalCount}</h3>
            <p class="text-[10px] text-slate-500 font-medium">Registered transactions</p>
          </div>
          <div class="p-3 bg-[#714B67]/10 text-[#714B67] rounded-xl group-hover:bg-[#714B67]/20 transition-all">
            <i class="fa-regular fa-folder-open text-xl"></i>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-emerald-300 transition-all group">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval Rate</span>
            <h3 class="text-2xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">${totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(0) : 0}%</h3>
            <p class="text-[10px] text-slate-500 font-medium">${approvedCount} fully approved</p>
          </div>
          <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-all">
            <i class="fa-regular fa-circle-check text-xl"></i>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-amber-300 transition-all group">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Processing</span>
            <h3 class="text-2xl font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">${activeCount}</h3>
            <p class="text-[10px] text-slate-500 font-medium">In pipeline</p>
          </div>
          <div class="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-all">
            <i class="fa-regular fa-clock text-xl animate-pulse"></i>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-sky-300 transition-all group">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Budget</span>
            <h3 class="text-2xl font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors font-mono">$${(totalBudget / 1000).toFixed(1)}k</h3>
            <p class="text-[10px] text-slate-500 font-medium">Committed valuation</p>
          </div>
          <div class="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-100 transition-all">
            <i class="fa-regular fa-coin text-xl"></i>
          </div>
        </div>
      `;
    }

    // ─── FILTER DATA ──────────────────────────────────────────────────────

    const getFilteredData = () => {
      let list = [...(store.allocationRequests || [])];

      if (currentFilter === 'active') {
        list = list.filter(req => !['approved', 'rejected', 'cancelled'].includes((req.status || '').toLowerCase()));
      } else if (currentFilter !== 'all') {
        list = list.filter(req => (req.status || '').toLowerCase() === currentFilter.toLowerCase());
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(req => 
          (req.letterReferenceNumber || req.referenceNumber || '').toLowerCase().includes(q) ||
          (req.title || '').toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    };

    // ─── LOAD AND RENDER CARDS ──────────────────────────────────────────

    const loadAndRenderCards = () => {
      try {
        const data = getFilteredData();
        const container = document.getElementById('requests-cards-container');
        if (!container) return;

        if (data.length === 0) {
          container.innerHTML = getEmptyStateHTML(searchQuery);
          attachSearchListener();
          return;
        }

        container.innerHTML = `
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="relative flex-1 max-w-md">
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input type="text" id="search-requests" placeholder="Search by reference or title..." value="${searchQuery}" 
                  class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg focus:outline-none transition-colors">
              </div>
              <span class="text-xs text-slate-400 font-medium">${data.length} request${data.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              ${data.map(item => renderRequestCard(item)).join('')}
            </div>
          </div>
        `;

        attachCardEventListeners();
        attachSearchListener();

      } catch (error) {
        console.error('loadAndRenderCards error:', error);
        showError('Failed to load allocation requests: ' + error.message);
      }
    };

    // ─── ATTACH LISTENERS ────────────────────────────────────────────────

    const attachFilterListeners = () => {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          currentFilter = this.dataset.filter;
          
          document.querySelectorAll('.filter-btn').forEach(b => {
            b.className = 'px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-sm';
          });
          this.className = 'px-3 py-1.5 bg-[#714B67]/10 text-[#714B67] font-semibold text-xs rounded-lg transition-all border border-[#714B67]/20 shadow-sm';
          
          loadAndRenderCards();
        });
      });
    };

    const attachSearchListener = () => {
      const searchInput = document.getElementById('search-requests');
      if (searchInput) {
        searchInput.removeEventListener('input', handleSearch);
        searchInput.addEventListener('input', handleSearch);
      }
    };

    const handleSearch = (e) => {
      searchQuery = e.target.value;
      loadAndRenderCards();
    };

    const attachCardEventListeners = () => {
      const container = document.getElementById('requests-cards-container');
      if (!container) return;

      container.querySelectorAll('.request-card').forEach(card => {
        card.addEventListener('click', function(e) {
          if (e.target.closest('.action-btn')) return;
          const id = this.dataset.requestId;
          if (id) {
            window.viewRequestDetails(id);
          }
        });
      });

      container.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const action = this.dataset.action;
          const id = this.dataset.requestId;
          handleAction(action, id);
        });
      });
    };

  const handleAction = (action, id) => {
  const actions = {
    'view': () => window.viewRequestDetails(id),
    'edit': () => openRequestForm(id),
    'delete': () => confirmDeleteRequest(id),
    'submit-draft': () => window.submitDraft(id),
    'deputy-start': () => deputyCeoStartReview(id),
    'deputy-decision': () => openDecisionModal(id, 'deputy'),
    'director-decision': () => openDecisionModal(id, 'director'),
    'queue': () => teamLeaderQueue(id),
    'map': () => teamLeaderMap(id),
    'reject': () => teamLeaderReject(id),
    'cancel': () => cancelRequest(id)
  };
  
  if (actions[action]) actions[action]();
};

    // ─── INIT ─────────────────────────────────────────────────────────────

    attachFilterListeners();
    document.querySelectorAll('.tab-switch-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        switchAllocationTab(this.dataset.tab);
      });
    });

    if (activeTab === 'beneficiaries') {
      renderBeneficiariesSection();
      // Auto-fetch the first time the tab is shown (or after an explicit refresh cleared the data)
      if (!isLoadingBeneficiaries && beneficiaryData.length === 0) {
        fetchBeneficiaries();
      }
    }
    
    document.getElementById('btn-create-request')?.addEventListener('click', () => openRequestForm());
    
    loadAndRenderCards();
    console.log('renderAllocationRequests: Completed successfully');
    
    isRendering = false;

  } catch (error) {
    console.error('renderAllocationRequests error:', error);
    showError('Failed to initialize allocation requests: ' + error.message);
    isRendering = false;
  }
}

// ─── RETRY FUNCTION ──────────────────────────────────────

  function getEmptyStateHTML(searchQuery) {
  return `
    <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-[#F1F2F4]">
        <div class="relative max-w-md">
          <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input type="text" id="search-requests" placeholder="Search by reference or title..." value="${searchQuery}" 
            class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg focus:outline-none transition-colors">
        </div>
      </div>
      <div class="p-12 text-center">
        <i class="fa-regular fa-folder-open text-5xl text-slate-300 mb-4 block"></i>
        <p class="text-sm font-semibold text-slate-500">No allocation requests found</p>
        <p class="text-xs text-slate-400 mt-1">Click "File Allocation Request" to create one.</p>
      </div>
    </div>
  `;
 }

  function formatDecision(decision) {
  if (!decision) return 'Not Reviewed';
  
  const displayMap = {
    'allowed': '✅ Allowed',
    'legal_revision_required': '⚖️ Legal Revision Required',
    'unauthorized_by_directive': '❌ Unauthorized by Directive',
    'ALLOWED': '✅ Allowed',
    'LEGAL_REVISION_REQUIRED': '⚖️ Legal Revision Required',
    'UNAUTHORIZED_BY_DIRECTIVE': '❌ Unauthorized by Directive'
  };
  return displayMap[decision] || decision;
  }
  function calculateRequestStatus(beneficiaries) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return 'submitted';
  }

  // Check if ALL beneficiaries are allocated
  const allAllocated = beneficiaries.every(b => 
    (b.status || '').toLowerCase() === 'allocated'
  );
  if (allAllocated) {
    return 'allocated';
  }

  // Get authorized beneficiaries (not unauthorized)
  const authorizedBeneficiaries = beneficiaries.filter(b => 
    (b.status || '').toLowerCase() !== 'unauthorized_by_directive'
  );

  if (authorizedBeneficiaries.length === 0) {
    return 'submitted';
  }

  // Check if ALL authorized beneficiaries are in waiting list
  const allAuthorizedInWaitingList = authorizedBeneficiaries.every(b => 
    (b.status || '').toLowerCase() === 'waiting_list'
  );
  if (allAuthorizedInWaitingList) {
    return 'waiting_list';
  }

  // Check if ANY beneficiary is allocated (but not all)
  const anyAllocated = beneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'allocated'
  );
  if (anyAllocated && !allAllocated) {
    return 'partial_allocation';
  }

  // Check if ANY beneficiary is in waiting list (but not all authorized)
  const anyInWaitingList = authorizedBeneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'waiting_list'
  );
  if (anyInWaitingList && !allAuthorizedInWaitingList) {
    return 'partial_waiting_list';
  }

  // Check if ANY beneficiary is in review
  const anyInReview = beneficiaries.some(b => {
    const status = (b.status || '').toLowerCase();
    return status === 'pending_review' || 
           status === 'eligible' || 
           status === 'under_legal_revision';
  });
  if (anyInReview) {
    return 'under_team_officer_review';
  }

  return 'submitted';
  }


  function hasAnyBeneficiaryRejected(beneficiaries) {
  if (!beneficiaries) return false;
  return beneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'unauthorized_by_directive'
  );
 }

 
  function getPendingBeneficiaries(beneficiaries) {
  if (!beneficiaries) return [];
  return beneficiaries.filter(b => 
    !b.deputyCeoDecision && !b.directorDecision && !b.teamLeaderDecision && !b.teamOfficerDecision
  );
  }

  function getReviewerForStatus(status) {
  const reviewerMap = {
    'under_deputy_ceo_review': 'Deputy CEO',
    'under_director_review': 'Director',
    'pending_team_leader_decision': 'Team Leader',
    'under_team_officer_review': 'Team Officer'
  };
  return reviewerMap[status] || null;
  }
  function getReviewerDecisionField(status) {
  const fieldMap = {
    'under_deputy_ceo_review': 'deputyCeoDecision',
    'under_director_review': 'directorDecision',
    'pending_team_leader_decision': 'teamLeaderDecision',
    'under_team_officer_review': 'teamOfficerDecision'
  };
  return fieldMap[status] || null;
  }

  function areAllBeneficiariesReviewed(beneficiaries) {
  if (!beneficiaries || beneficiaries.length === 0) return false;
  
  const reviewerDecisions = ['deputyCeoDecision', 'directorDecision', 'teamLeaderDecision', 'teamOfficerDecision'];
  
  // Check which reviewer should have made decisions based on current request status
  // For now, check if any decision exists
  return beneficiaries.every(b => {
    // Check if any decision exists (deputyCeoDecision, directorDecision, etc.)
    return b.deputyCeoDecision || b.directorDecision || b.teamLeaderDecision || b.teamOfficerDecision;
  });
  }

  function getInstitutionName(inst) {
  if (!inst) return 'N/A';
  return inst.name?.en || inst.name?.am || inst.shortName || 'N/A';
  }

  function getUserFullName(user) {
  if (!user) return 'N/A';
  const firstName = user.firstName?.en || user.firstName?.am || '';
  let middleName = '';
  if (user.middleName) {
    if (Array.isArray(user.middleName.en)) middleName = user.middleName.en.join(' ');
    else if (Array.isArray(user.middleName.am)) middleName = user.middleName.am.join(' ');
    else middleName = user.middleName.en || user.middleName.am || '';
  }
  const lastName = user.lastName?.en || user.lastName?.am || '';
  const name = [firstName, middleName, lastName].filter(Boolean).join(' ');
  return name || user.user?.name?.en || user.user?.name?.am || user.user?.username || 'N/A';
  }
  function getStatusInfo(status) {
  if (!status) return STATUS_MAP['submitted'];
  const normalized = status.toLowerCase();
  return STATUS_MAP[normalized] || STATUS_MAP['submitted'];
  }

  function getBeneficiaryStatusColor(status) {
  const info = getBeneficiaryStatusInfo(status);
  return info.color || 'bg-slate-50 text-slate-700';
  }
  function getBeneficiaryStatusLabel(status) {
  const info = getBeneficiaryStatusInfo(status);
  return info.label || status || 'Pending Review';
   }

  function getBeneficiaryStatusInfo(status) {
  if (!status) return BENEFICIARY_STATUS_MAP['pending_review'];
  const normalized = status.toLowerCase();
  return BENEFICIARY_STATUS_MAP[normalized] || BENEFICIARY_STATUS_MAP['pending_review'];
 }
 // ─── RENDER REQUEST CARD ──────────────────────────────────────────────────

 function renderRequestCard(item) {
  const statusInfo = getStatusInfo(item.status);
  const instName = getInstitutionName(item.requestingInstitution || item.institution);
  const beneficiaries = item.beneficiaries || [];
  const ref = item.letterReferenceNumber || item.referenceNumber || 'N/A';
  const letterDate = item.letterDate ? new Date(item.letterDate).toLocaleDateString() : 'N/A';
  const queuePriority = item.queuePriority ? `Priority: ${item.queuePriority}` : '';
  
  const priorityColors = {
    'low': 'bg-slate-100 text-slate-600',
    'medium': 'bg-blue-50 text-blue-600 border border-blue-100',
    'high': 'bg-amber-50 text-amber-700 border border-amber-100',
    'critical': 'bg-red-50 text-red-700 border border-red-100 animate-pulse'
  };
  const priority = item.priority || 'medium';
  const priorityClass = priorityColors[priority] || priorityColors['medium'];

  return `
    <div class="request-card bg-white border border-[#E5E7EB] rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer p-4" data-request-id="${item.id}">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-[#714B67] text-sm">${ref}</span>
            <span class="text-[8px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded ${priorityClass}">
              ${priority}
            </span>
            ${queuePriority ? `<span class="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">${queuePriority}</span>` : ''}
          </div>
          <p class="text-xs text-slate-400 font-mono">📅 ${letterDate}</p>
          <div class="mt-1">
            <p class="text-sm font-semibold text-slate-800 truncate">${item.title || '🏛️ ' + instName}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span class="px-2.5 py-0.5 ${statusInfo.color} border text-[10px] font-extrabold rounded-full whitespace-nowrap">${statusInfo.label}</span>
          <span class="text-[10px] text-slate-400">${beneficiaries.length} beneficiaries</span>
        </div>
      </div>

      <!-- Beneficiary Summary -->
      <div class="mt-3 pt-3 border-t border-slate-100">
        <div class="flex flex-wrap gap-1.5">
          ${renderBeneficiarySummary(item)}
        </div>
      </div>

      <!-- Workflow Actions -->
      ${getWorkflowActions(item)}
    </div>
  `;
 }

 // ─── RENDER BENEFICIARY SUMMARY ────────────────────────────────────────── 

  function renderBeneficiarySummary(item) {
  const beneficiaries = item.beneficiaries || [];
  let html = '';

  for (let i = 0; i < Math.min(beneficiaries.length, 3); i++) {
    const ben = beneficiaries[i];
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    let name = 'N/A';
    let rank = 'N/A';
    const status = ben.status || 'WAITING';
    const statusColor = getBeneficiaryStatusColor(status);
    
    if (individual) {
      name = getUserFullName(individual);
      
      if (individual.currentRank) {
        rank = individual.currentRank.name?.en || individual.currentRank.name?.am || 'N/A';
      }
      
      html += `
        <div class="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
          <span class="text-[10px] font-medium text-slate-700">👤 ${name}</span>
          ${rank !== 'N/A' ? `<span class="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">🎖️${rank}</span>` : ''}
          <span class="px-1.5 py-0.5 ${statusColor} text-[8px] font-bold rounded">${status}</span>
        </div>
      `;
    } else if (institution) {
      name = getInstitutionName(institution);
      html += `
        <div class="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
          <span class="text-[10px] font-medium text-slate-700">🏛️ ${name}</span>
          <span class="px-1.5 py-0.5 ${statusColor} text-[8px] font-bold rounded">${status}</span>
        </div>
      `;
    }
  }
  
  if (beneficiaries.length > 3) {
    html += `
      <div class="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
        <span class="text-[10px] font-medium text-slate-500">+${beneficiaries.length - 3} more</span>
      </div>
    `;
  }
  
  return html || '<span class="text-xs text-slate-400">No beneficiaries</span>';
 }

 // ─── GET WORKFLOW ACTIONS ──────────────────────────────────────────────────

 function getWorkflowActions(item) {
  const status = (item.status || 'SUBMITTED').toUpperCase();
  const id = item.id;
  
  const actionSets = {
     'DRAFT': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="submit-draft" data-request-id="${id}">
        <i class="fa-regular fa-paper-plane mr-1"></i>Submit
      </button>
      <button class="action-btn px-2 py-1 bg-[#714B67] hover:bg-[#5f3e56] text-white text-[10px] font-bold rounded transition-colors" data-action="edit" data-request-id="${id}">
        <i class="fa-regular fa-pen mr-1"></i>Edit
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="delete" data-request-id="${id}">
        <i class="fa-regular fa-trash-can mr-1"></i>Delete
      </button>
    `,
    'SUBMITTED': `
      <button class="action-btn px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded transition-colors" data-action="deputy-start" data-request-id="${id}">
        <i class="fa-regular fa-play mr-1"></i>Start Deputy Review
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="cancel" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Cancel
      </button>
    `,
    'UNDER_DEPUTY_CEO_REVIEW': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="deputy-decision" data-request-id="${id}">
        <i class="fa-regular fa-check mr-1"></i>Submit Decision
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="cancel" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Cancel
      </button>
    `,
    'UNDER_DIRECTOR_REVIEW': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="director-decision" data-request-id="${id}">
        <i class="fa-regular fa-check mr-1"></i>Submit Decision
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="cancel" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Cancel
      </button>
    `,
    'READY_FOR_TEAM_LEADER': `
      <button class="action-btn px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded transition-colors" data-action="queue" data-request-id="${id}">
        <i class="fa-regular fa-clock mr-1"></i>Queue
      </button>
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="map" data-request-id="${id}">
        <i class="fa-regular fa-map mr-1"></i>Map
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="reject" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Reject
      </button>
    `,
    'QUEUED': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="map" data-request-id="${id}">
        <i class="fa-regular fa-map mr-1"></i>Map
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="reject" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Reject
      </button>
    `
  };

  const defaultActions = `
    <button class="action-btn px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white text-[10px] font-bold rounded transition-colors" data-action="view" data-request-id="${id}">
      <i class="fa-regular fa-eye mr-1"></i>View
    </button>
  `;

  const actions = actionSets[status] || defaultActions;
  
  return `
    <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
      ${actions}
    </div>
  `;
 }

 function renderInstitutionDetails(inst) {
  if (!inst) {
    return `<div class="col-span-full text-sm text-slate-400">No institution information available.</div>`;
  }

  const tier = inst.currentTier || null;
  const category = inst.category || null;
  const labels = inst.labels || [];

  return `
    <div class="space-y-3">
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Institution Name</label>
        <p class="text-sm font-semibold text-slate-800">${inst.name?.en || inst.name?.am || 'N/A'}</p>
        <p class="text-xs text-slate-500">${inst.shortName || ''}</p>
      </div>
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Code</label>
        <p class="text-sm font-mono text-slate-700">${inst.code || 'N/A'}</p>
      </div>
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Institution Type</label>
        <p class="text-sm text-slate-700">${inst.institutionType || 'N/A'}</p>
      </div>
    </div>

    <div class="space-y-3">
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Category</label>
        <p class="text-sm text-slate-700">${category?.name?.en || category?.name?.am || 'N/A'}</p>
        <p class="text-xs text-slate-500">${category?.type || ''}</p>
      </div>
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Request Capability</label>
        <span class="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded border border-indigo-200">
          ${inst.requestCapability || 'N/A'}
        </span>
      </div>
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Tier</label>
        ${tier ? `
          <p class="text-sm font-semibold text-slate-800">${tier.name?.en || tier.name?.am || 'N/A'}</p>
          <p class="text-xs text-slate-500">Priority: ${tier.allocationPriority || 'N/A'} | Code: ${tier.code || 'N/A'}</p>
        ` : `<p class="text-sm text-slate-400">No tier assigned</p>`}
      </div>
    </div>

    <div class="space-y-3">
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Contact Information</label>
        <p class="text-sm text-slate-700">${inst.contactPhone || inst.phone || 'N/A'}</p>
        <p class="text-sm text-slate-700">${inst.contactEmail || inst.email || 'N/A'}</p>
        <p class="text-xs text-slate-500">${inst.address || ''}</p>
      </div>
      <div>
        <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Registration Numbers</label>
        <p class="text-xs font-mono text-slate-600">TIN: ${inst.tinNumber || 'N/A'}</p>
        <p class="text-xs font-mono text-slate-600">Reg: ${inst.registrationNumber || 'N/A'}</p>
        <p class="text-xs font-mono text-slate-600">License: ${inst.licenseNumber || 'N/A'}</p>
      </div>
      ${labels.length > 0 ? `
        <div>
          <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Labels</label>
          <div class="flex flex-wrap gap-1 mt-1">
            ${labels.map(label => `
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border" 
                    style="background-color: ${label.color || '#E5E7EB'}20; border-color: ${label.color || '#E5E7EB'}; color: ${label.color || '#374151'}">
                ${label.name?.en || label.name?.am || label.code}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
 }

// ─── BENEFICIARIES TAB ──────────────────────────────────────────────────
// A clean, professional table like the queue module with position, beneficiary name,
// institution, rank, status, override, registered date, and 3-dot actions dropdown.

function applyClientSideBeneficiaryFilters(items) {
  if (!items || !Array.isArray(items)) return [];
  
  return items.filter(item => {
    const individual = item.beneficiaryIndividual || {};
    const rankCode = individual.currentRank?.code || '';
    
    if (beneficiaryFilters.rank && rankCode !== beneficiaryFilters.rank) return false;

    if (beneficiaryFilters.requestInstitutionId) {
      const reqInstId = item.requestingInstitution?.id;
      if (reqInstId !== beneficiaryFilters.requestInstitutionId) return false;
    }

    if (beneficiaryFilters.beneficiaryInstitutionId) {
      const benInstId = item.beneficiaryInstitution?.id;
      if (benInstId !== beneficiaryFilters.beneficiaryInstitutionId) return false;
    }

    if (beneficiaryFilters.override) {
      const isOverride = item.isOverrideQueue || false;
      if (beneficiaryFilters.override === 'yes' && !isOverride) return false;
      if (beneficiaryFilters.override === 'no' && isOverride) return false;
    }

    const status = (item.status || '').toLowerCase();
    if (beneficiaryFilters.status && status !== beneficiaryFilters.status.toLowerCase()) return false;

    const registeredAt = item.enteredWaitingListAt || item.createdAt;
    if (beneficiaryFilters.dateFrom && registeredAt) {
      if (new Date(registeredAt) < new Date(beneficiaryFilters.dateFrom)) return false;
    }
    if (beneficiaryFilters.dateTo && registeredAt) {
      if (new Date(registeredAt) > new Date(beneficiaryFilters.dateTo + 'T23:59:59')) return false;
    }

    return true;
  });
}

// ─── BENEFICIARIES UI RENDERING ─────────────────────────────────────────

// function renderBeneficiariesSection() {
//   const container = document.getElementById('beneficiaries-container');
//   if (!container) return;

//   container.innerHTML = `
//     <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
//       <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
//         <div class="flex items-center gap-2">
//           <i class="fa-regular fa-users text-[#714B67]"></i>
//           <h2 class="text-sm font-bold text-slate-800">Beneficiaries</h2>
//         </div>
//         <div class="flex items-center gap-3">
//           <span class="text-xs text-slate-400 font-medium">${beneficiaryTotalCount} total</span>
//           <button id="ben-refresh-btn" class="flex items-center gap-1 text-xs font-semibold text-[#714B67] hover:underline" ${isLoadingBeneficiaries ? 'disabled' : ''}>
//             <i class="fa-solid fa-rotate ${isLoadingBeneficiaries ? 'animate-spin' : ''}"></i> Refresh
//           </button>
//         </div>
//       </div>
//       <div id="beneficiaries-table-wrap">
//         ${isLoadingBeneficiaries ? renderBeneficiaryLoadingState() : renderBeneficiaryTable()}
//       </div>
//     </div>
//   `;

//   document.getElementById('ben-refresh-btn')?.addEventListener('click', () => {
//     fetchBeneficiaries();
//   });

//   document.getElementById('ben-page-prev')?.addEventListener('click', () => {
//     if (beneficiaryPage > 1) {
//       beneficiaryPage--;
//       fetchBeneficiaries();
//     }
//   });

//   document.getElementById('ben-page-next')?.addEventListener('click', () => {
//     const totalPages = Math.max(1, Math.ceil(beneficiaryTotalCount / BENEFICIARY_PAGE_SIZE));
//     if (beneficiaryPage < totalPages) {
//       beneficiaryPage++;
//       fetchBeneficiaries();
//     }
//   });
// }

// function renderBeneficiaryLoadingState() {
//   return `
//     <div class="p-12 flex items-center justify-center">
//       <div class="text-center">
//         <div class="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
//         <p class="mt-3 text-xs text-slate-500">Loading beneficiaries...</p>
//       </div>
//     </div>
//   `;
// }

// function renderBeneficiaryTable() {
// const totalPages = Math.max(
// 1,
// Math.ceil(beneficiaryTotalCount / BENEFICIARY_PAGE_SIZE)
// );

// // Table container is rendered here.
// // Table.render() will generate the actual table inside it.
// const tableContainer = ` <div id="beneficiaries-table-container" class="overflow-x-auto w-full"></div>
// <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
//   <span class="text-[10px] text-slate-400">
//     Page ${beneficiaryPage} of ${totalPages} · ${beneficiaryTotalCount} total
//   </span>

//   <div class="flex items-center gap-1">
//     <button
//       id="ben-page-prev"
//       class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors ${
//         beneficiaryPage <= 1
//           ? 'opacity-50 cursor-not-allowed'
//           : ''
//       }"
//       ${beneficiaryPage <= 1 ? 'disabled' : ''}
//     >
//       <i class="fa-solid fa-chevron-left"></i>
//     </button>

//     <button
//       id="ben-page-next"
//       class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors ${
//         beneficiaryPage >= totalPages
//           ? 'opacity-50 cursor-not-allowed'
//           : ''
//       }"
//       ${beneficiaryPage >= totalPages ? 'disabled' : ''}
//     >
//       <i class="fa-solid fa-chevron-right"></i>
//     </button>
//   </div>
//  </div>`



//   setTimeout(() => {
//   renderBeneficiaryTableData(beneficiaryData);
//   }, 0);

//   return tableContainer;
//  }

// ─────────────────────────────────────────────────────────────
// BENEFICIARY TABLE RENDER
// Same structure as the queue module's renderTable()
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// BENEFICIARY TABLE RENDER - FIXED FOR API RESPONSE
// ─────────────────────────────────────────────────────────────

function renderBeneficiaryTableData(data) {
  // Map the data to the format expected by the table
  const mappedData = data.map((item, index) => {
    const individual = item.beneficiaryIndividual || {};
    const beneficiaryInst = item.beneficiaryInstitution || {};
    const requestingInst = item.requestingInstitution || {};
    
    return {
      // Position
      position: item.waitingListPosition ?? ((beneficiaryPage - 1) * BENEFICIARY_PAGE_SIZE) + index + 1,
      
      // Beneficiary info
      beneficiaryId: item.id,
      beneficiaryName: item.beneficiaryName || getUserFullName(individual) || 'N/A',
      
      // Beneficiary Institution
      beneficiaryInstitutionName: beneficiaryInst.name?.en || beneficiaryInst.name?.am || beneficiaryInst.shortName || 'N/A',
      beneficiaryInstitutionCode: beneficiaryInst.code || 'N/A',
      beneficiaryInstitutionType: beneficiaryInst.institutionType || 'N/A',
      
      // Requesting Institution
      requestingInstitutionName: requestingInst.name?.en || requestingInst.name?.am || requestingInst.shortName || 'N/A',
      requestingInstitutionCode: requestingInst.code || 'N/A',
      requestingInstitutionTier: requestingInst.currentTier?.code || 'N/A',
      requestingInstitutionTierPriority: requestingInst.currentTier?.allocationPriority ?? 'N/A',
      requestingInstitutionTierName: requestingInst.currentTier?.name?.en || requestingInst.currentTier?.name?.am || 'N/A',
      
      // Rank
      beneficiaryRank: individual.currentRank?.code || 'N/A',
      beneficiaryRankPriority: individual.currentRank?.priorityLevel ?? 'N/A',
      
      // Status
      status: item.status || 'pending_review',
      
      // Override
      isOverrideQueue: item.isOverrideQueue || false,
      overrideQueueReason: item.overrideQueueReason || '',
      
      // Registered date
      registeredAt: item.enteredWaitingListAt || item.createdAt || null,
      
      // Letter reference
      referenceNumber: item.letterReferenceNumber || 'N/A',
      letterDate: item.letterDate || 'N/A',
      
      // Nationality
      beneficiaryNationality: individual.nationality || 'N/A',
      
      // Phone
      beneficiaryPhone: individual.phonePrimary || 'N/A',
      
      // Request status (workflow status)
      requestStatus: item.requestStatus || 'N/A',
      
      // Allocation history
      allocationHistoryCount: item.beneficiaryInstitution?.allocationHistoryCount ?? 0,
      
      // Priority breakdown (for the priority badges)
      priorityBreakdown: {
        isOverride: item.isOverrideQueue || false,
        institution: {
          tierPriority: requestingInst.currentTier?.allocationPriority ?? null,
          allocationHistoryCount: item.beneficiaryInstitution?.allocationHistoryCount ?? 0
        },
        beneficiary: {
          rankPriority: individual.currentRank?.priorityLevel ?? null
        }
      }
    };
  });

  Table.render<any>({
    containerId: 'beneficiaries-table-container',
    loading: isLoadingBeneficiaries,
    placeholderText: 'Search beneficiaries...',
    columns: [
      // ─── POSITION ──────────────────────────────────────────────────────
      {
        header: '#',
        key: 'position',
        sortable: true,
        render: (item, index) => {
          const position = item.position ?? ((beneficiaryPage - 1) * BENEFICIARY_PAGE_SIZE) + index + 1;
          return `
            <span class="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-800 font-black rounded-lg text-xs border border-slate-200">
              ${position}
            </span>
          `;
        }
      },

      // ─── BENEFICIARY ──────────────────────────────────────────────────
      {
        header: 'Beneficiary',
        key: 'beneficiaryName',
        sortable: true,
        render: (item) => {
          const name = item.beneficiaryName || 'N/A';
          const rank = item.beneficiaryRank || 'N/A';
          const isOverride = item.isOverrideQueue || false;
          const overrideReason = item.overrideQueueReason || 'This beneficiary has an override priority.';
          const institutionName = item.beneficiaryInstitutionName || 'N/A';

          return `
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-slate-800 text-sm">${name}</span>
                ${rank !== 'N/A' ? `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-medium rounded border border-blue-200">${rank}</span>` : ''}
                ${isOverride ? `<span title="${overrideReason}" class="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded border border-rose-300 flex items-center gap-1"><i class="fa-solid fa-flag"></i> OVERRIDE</span>` : ''}
              </div>
              <p class="text-[10px] text-slate-500 flex items-center gap-1">
                <i class="fa-solid fa-building text-slate-400 text-[9px]"></i>
                ${institutionName}
              </p>
            </div>
          `;
        }
      },

      // ─── REQUESTING INSTITUTION ──────────────────────────────────────
      {
        header: 'Requesting Institution',
        key: 'requestingInstitutionName',
        sortable: true,
        render: (item) => {
          const reqInstName = item.requestingInstitutionName || 'N/A';
          if (reqInstName === 'N/A') {
            return `<span class="text-xs text-slate-400">N/A</span>`;
          }
          return `
            <div class="space-y-0.5">
              <p class="font-semibold text-slate-800 text-xs">${reqInstName}</p>
              ${item.requestingInstitutionCode && item.requestingInstitutionCode !== 'N/A' ? `<p class="text-[9px] text-slate-400 font-mono">${item.requestingInstitutionCode}</p>` : ''}
            </div>
          `;
        }
      },

      // ─── INSTITUTION TIER ────────────────────────────────────────────
      {
        header: 'Inst. Tier',
        key: 'requestingInstitutionTier',
        sortable: true,
        render: (item) => {
          const hasTier = item.requestingInstitutionTier && item.requestingInstitutionTier !== 'N/A';
          if (!hasTier) {
            return `<span class="text-xs text-slate-400">No tier</span>`;
          }
          return `
            <div class="space-y-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-medium">
                <i class="fa-solid fa-building-columns text-[9px]"></i>
                ${item.requestingInstitutionTier}
              </span>
              ${item.requestingInstitutionTierPriority !== 'N/A' ? `<p class="text-[9px] text-slate-400">Priority: ${item.requestingInstitutionTierPriority}</p>` : ''}
            </div>
          `;
        }
      },

      // ─── BENEFICIARY INSTITUTION ──────────────────────────────────────
      {
        header: 'Beneficiary Institution',
        key: 'beneficiaryInstitutionName',
        sortable: true,
        render: (item) => {
          const institutionName = item.beneficiaryInstitutionName || 'N/A';
          const institutionCode = item.beneficiaryInstitutionCode || 'N/A';
          const institutionType = item.beneficiaryInstitutionType || 'N/A';

          if (institutionName === 'N/A') {
            return `<span class="text-xs text-slate-400">No institution</span>`;
          }

          return `
            <div class="space-y-0.5">
              <p class="font-semibold text-slate-800 text-xs">${institutionName}</p>
              ${institutionCode !== 'N/A' ? `<p class="text-[9px] text-slate-400 font-mono">${institutionCode}</p>` : ''}
              ${institutionType !== 'N/A' ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[9px]">${institutionType}</span>` : ''}
            </div>
          `;
        }
      },

      // ─── RANK ─────────────────────────────────────────────────────────
      {
        header: 'Rank',
        key: 'beneficiaryRank',
        sortable: true,
        render: (item) => {
          const rank = item.beneficiaryRank || 'N/A';
          const rankPriority = item.beneficiaryRankPriority ?? 'N/A';

          if (rank === 'N/A') {
            return `<span class="text-xs text-slate-400">No rank</span>`;
          }

          return `
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-medal text-blue-500 text-[10px]"></i>
                <span class="font-semibold text-slate-700 text-xs">${rank}</span>
              </div>
              ${rankPriority !== 'N/A' ? `<p class="text-[9px] text-slate-400">Priority: ${rankPriority}</p>` : ''}
            </div>
          `;
        }
      },

      // ─── STATUS ──────────────────────────────────────────────────────
      {
        header: 'Status',
        key: 'status',
        sortable: true,
        render: (item) => {
          const status = item.status || 'pending_review';
          const statusInfo = getBeneficiaryStatusInfo(status);
          return `
            <div class="space-y-1">
              <span class="px-2 py-0.5 ${statusInfo.color} border text-[10px] font-bold rounded-md block text-center cursor-help" title="${statusInfo.label}: ${BENEFICIARY_STATUS_LEGEND[status]?.description || ''}">
                ${statusInfo.label}
              </span>
            </div>
          `;
        }
      },

      // ─── REQUEST STATUS (Workflow) ──────────────────────────────────
      {
        header: 'Request Status',
        key: 'requestStatus',
        sortable: true,
        render: (item) => {
          const status = item.requestStatus || 'N/A';
          const statusInfo = getStatusInfo(status);
          return `
            <div class="space-y-1">
              <span class="px-2 py-0.5 ${statusInfo.color} border text-[10px] font-bold rounded-md block text-center">
                ${statusInfo.label}
              </span>
            </div>
          `;
        }
      },

      // ─── ALLOCATION HISTORY ──────────────────────────────────────────
      {
        header: 'History',
        key: 'allocationHistoryCount',
        sortable: true,
        render: (item) => {
          const count = item.allocationHistoryCount ?? 0;
          return `
            <div class="text-center">
              <span class="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs border border-slate-200">
                ${count}
              </span>
              <p class="text-[9px] text-slate-400">allocations</p>
            </div>
          `;
        }
      },

      // ─── OVERRIDE ────────────────────────────────────────────────────
      {
        header: 'Override',
        key: 'isOverrideQueue',
        sortable: true,
        render: (item) => {
          const isOverride = item.isOverrideQueue || false;
          if (!isOverride) {
            return `<span class="text-xs text-slate-400">—</span>`;
          }
          return `
            <span title="${item.overrideQueueReason || 'Override priority'}" class="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold cursor-help">
              <i class="fa-solid fa-flag text-[9px]"></i> Yes
            </span>
          `;
        }
      },

      // ─── REGISTERED ──────────────────────────────────────────────────
      {
        header: 'Registered',
        key: 'registeredAt',
        sortable: true,
        render: (item) => {
          const registeredAt = item.registeredAt || item.enteredWaitingListAt || item.createdAt;
          if (!registeredAt) {
            return `<span class="text-xs text-slate-400">N/A</span>`;
          }
          const date = new Date(registeredAt);
          if (isNaN(date.getTime())) {
            return `<span class="text-xs text-slate-400">N/A</span>`;
          }
          return `
            <div class="space-y-0.5">
              <p class="text-xs font-medium text-slate-700">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p class="text-[9px] text-slate-400">${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          `;
        }
      },

      // ─── LETTER REFERENCE ────────────────────────────────────────────
      {
        header: 'Reference',
        key: 'referenceNumber',
        sortable: true,
        render: (item) => `
          <div class="space-y-0.5">
            <p class="font-mono font-bold text-indigo-600 text-xs">${item.referenceNumber || 'N/A'}</p>
            <p class="text-[9px] text-slate-400">${item.letterDate || 'N/A'}</p>
          </div>
        `
      },

      // ─── PRIORITY FACTORS ────────────────────────────────────────────
      {
        header: 'Priority',
        key: 'priorityBreakdown',
        render: (item) => {
          const factors = [
            { key: 'override', active: item.isOverrideQueue || false, label: 'OV', color: 'amber' },
            { key: 'tier', active: item.requestingInstitutionTierPriority !== 'N/A' && item.requestingInstitutionTierPriority !== null, label: 'TI', color: 'purple' },
            { key: 'history', active: item.allocationHistoryCount > 0, label: 'HI', color: 'teal' },
            { key: 'rank', active: item.beneficiaryRankPriority !== 'N/A' && item.beneficiaryRankPriority !== null, label: 'RK', color: 'blue' },
          ];

          const activeCount = factors.filter(f => f.active).length;

          const badges = factors.map(f => {
            const isActive = f.active;
            const badgeClass = isActive
              ? `bg-${f.color}-50 text-${f.color}-700 border-${f.color}-200`
              : `bg-slate-50 text-gray-400 border-gray-200`;

            return `
              <span class="w-6 h-6 rounded-md text-[9px] font-bold border flex items-center justify-center ${badgeClass} cursor-help" title="${f.label}: ${isActive ? 'Active' : 'Inactive'}">
                ${f.label}
              </span>
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

      // ─── ACTIONS ─────────────────────────────────────────────────────
      {
        header: 'Actions',
        key: 'beneficiaryId',
        render: (item) => {
          const beneficiaryId = item.beneficiaryId || 'N/A';
          const beneficiaryName = item.beneficiaryName || 'This beneficiary';
          const position = item.position || 'N/A';
          const status = (item.status || '').toLowerCase();

          // Only show allocation actions for waiting_list beneficiaries
          if (status === 'allocated') {
            return `<span class="text-xs text-emerald-600 font-semibold block text-center"><i class="fa-solid fa-check-circle mr-1"></i>Allocated</span>`;
          }
          if (status === 'unauthorized_by_directive') {
            return `<span class="text-xs text-rose-600 font-semibold block text-center"><i class="fa-solid fa-ban mr-1"></i>Rejected</span>`;
          }
          if (status !== 'waiting_list') {
            return `<span class="text-xs text-slate-400 block text-center">Not in queue</span>`;
          }

          return `
            <details class="dropdown-container relative">
              <summary class="dropdown-trigger list-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors mx-auto">
                <i class="fa-solid fa-ellipsis-vertical text-slate-500 text-sm"></i>
              </summary>
              <div class="dropdown-menu absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                <button data-action="allocate-beneficiary" data-beneficiary-id="${beneficiaryId}" data-beneficiary-name="${beneficiaryName}" data-position="${position}" class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                  <i class="fa-solid fa-check-circle"></i> Allocate House
                </button>
                <button data-action="reject-beneficiary" data-beneficiary-id="${beneficiaryId}" data-beneficiary-name="${beneficiaryName}" class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                  <i class="fa-solid fa-ban"></i> Reject
                </button>
                <div class="border-t border-slate-100 my-1"></div>
                ${item.isOverrideQueue ? `
                  <button data-action="clear-override-beneficiary" data-beneficiary-id="${beneficiaryId}" data-beneficiary-name="${beneficiaryName}" class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                    <i class="fa-solid fa-flag"></i> Clear Override
                  </button>
                ` : `
                  <button data-action="set-override-beneficiary" data-beneficiary-id="${beneficiaryId}" data-beneficiary-name="${beneficiaryName}" data-position="${position}" class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                    <i class="fa-solid fa-flag"></i> Set Override
                  </button>
                `}
                <button data-action="explain-beneficiary" data-beneficiary-id="${beneficiaryId}" data-beneficiary-name="${beneficiaryName}" class="dropdown-item w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i class="fa-solid fa-circle-info"></i> View Priority Explanation
                </button>
              </div>
            </details>
          `;
        }
      }
    ],
    data: mappedData || [],
    emptyState: `
      <div class="text-center py-12">
        <i class="fa-regular fa-users text-4xl text-slate-300 mb-3 block"></i>
        <p class="text-sm font-semibold text-slate-500">No beneficiaries found</p>
        <p class="text-xs text-slate-400 mt-1">Beneficiaries will appear here once allocation requests are processed.</p>
      </div>
    `,
    rowClassName: (item) => {
      const status = (item.status || '').toLowerCase();
      const isOverride = item.isOverrideQueue || false;
      
      if (isOverride) return 'bg-rose-50/30';
      if (status === 'allocated') return 'bg-emerald-50/30';
      if (status === 'unauthorized_by_directive') return 'bg-slate-50/50';
      if (status === 'waiting_list') return 'bg-teal-50/30';
      if (status === 'eligible') return 'bg-blue-50/30';
      if (status === 'under_legal_revision') return 'bg-purple-50/30';
      if (status === 'pending_review') return 'bg-amber-50/30';
      return 'bg-slate-50/30';
    }
  });
}

// ─── BENEFICIARY ACTION HANDLERS ──────────────────────────────────────────

// Handle beneficiary dropdown actions
document.addEventListener('click', function(e) {
  const target = e.target as HTMLElement;
  
  // Close dropdowns when clicking outside
  if (!target.closest('.dropdown-container')) {
    document.querySelectorAll('.dropdown-container[open]').forEach((details) => {
      (details as HTMLDetailsElement).removeAttribute('open');
    });
  }
  
  // Handle dropdown item clicks
  const dropdownItem = target.closest('.dropdown-item') as HTMLElement | null;
  if (dropdownItem) {
    const details = dropdownItem.closest('details');
    details?.removeAttribute('open');
    
    const action = dropdownItem.getAttribute('data-action');
    const beneficiaryId = dropdownItem.getAttribute('data-beneficiary-id');
    const beneficiaryName = dropdownItem.getAttribute('data-beneficiary-name') || 'This beneficiary';
    const position = dropdownItem.getAttribute('data-position') || 'N/A';
    
    if (!beneficiaryId || beneficiaryId === 'N/A') return;
    
    switch (action) {
      case 'allocate-beneficiary':
        handleBeneficiaryAllocate(beneficiaryId);
        break;
      case 'reject-beneficiary':
        handleBeneficiaryRejectAction(beneficiaryId, beneficiaryName);
        break;
      case 'set-override-beneficiary':
        handleBeneficiarySetOverride(beneficiaryId, beneficiaryName, position);
        break;
      case 'clear-override-beneficiary':
        handleBeneficiaryClearOverride(beneficiaryId, beneficiaryName);
        break;
      case 'explain-beneficiary':
        handleBeneficiaryExplanation(beneficiaryId);
        break;
    }
  }
});

function handleBeneficiaryAllocate(beneficiaryId: string) {
  Modal.open({
    title: 'Confirm Housing Allocation',
    content: `
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Are you sure you want to approve and allocate state housing for this beneficiary?</p>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">House ID <span class="text-rose-500">*</span></label>
          <input
            id="ben-allocate-house-id"
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
      const houseId = (modalEl.querySelector('#ben-allocate-house-id') as HTMLInputElement)?.value;
      if (!houseId || !houseId.trim()) {
        Toast.error('House ID is required.');
        return;
      }
      try {
        await store.apiService.post(`/house-allocation-queue/${beneficiaryId}/allocate`, {
          houseId: houseId.trim()
        });
        Toast.success('Housing successfully allocated.');
        // Refresh the beneficiary list
        fetchBeneficiaries();
        // Also refresh queue data if needed
        if ((window as any).__reloadQueueTable) {
          await (window as any).__reloadQueueTable();
        }
      } catch (error: any) {
        Toast.error(error?.response?.message || error?.message || 'Failed to allocate housing. Please try again.');
      }
    }
  });
}

function handleBeneficiaryRejectAction(beneficiaryId: string, beneficiaryName: string) {
  Modal.open({
    title: `Reject Beneficiary: ${beneficiaryName}`,
    content: `
      <div class="space-y-4">
        <div class="p-3 bg-rose-50 border border-rose-150 rounded-lg text-rose-800 text-xs font-semibold">
          Rejecting ${beneficiaryName} from waiting list
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
          <textarea
            id="ben-reject-reason"
            rows="3"
            required
            placeholder="State the official reason for rejecting this beneficiary..."
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
          ></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Submit Rejection',
    onConfirm: async (modalEl) => {
      const reason = (modalEl.querySelector('#ben-reject-reason') as HTMLTextAreaElement)?.value;
      if (!reason || !reason.trim()) {
        Toast.error('A rejection reason must be specified.');
        return;
      }

      try {
        await store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, {
          status: 'unauthorized_by_directive',
          reason: reason.trim()
        });
        Toast.success(`Beneficiary ${beneficiaryName} rejected and removed from queue.`);
        fetchBeneficiaries();
        if ((window as any).__reloadQueueTable) {
          await (window as any).__reloadQueueTable();
        }
      } catch (error: any) {
        Toast.error(error?.response?.message || error?.message || 'Failed to reject beneficiary. Please try again.');
      }
    }
  });
}

function handleBeneficiarySetOverride(beneficiaryId: string, beneficiaryName: string, currentPosition: string) {
  Modal.open({
    title: 'Manual Queue Override',
    content: `
      <div class="space-y-4">
        <div class="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-800">
          <i class="fa-solid fa-circle-info mr-1"></i>
          This will move <strong>${beneficiaryName}</strong> to the front of the queue (position #1).
          The standard priority rules (tier / history / rank / FIFO) will be bypassed.
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">
            Override Reason <span class="text-rose-500">*</span>
          </label>
          <textarea
            id="ben-override-reason"
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
      const reason = (modalEl.querySelector('#ben-override-reason') as HTMLTextAreaElement)?.value;
      if (!reason || !reason.trim()) {
        Toast.error('A reason is required to set a queue override.');
        return;
      }

      try {
        const result: any = await store.apiService.patch(`/house-allocation-queue/${beneficiaryId}/override`, {
          reason: reason.trim(),
        });
        Toast.success(result?.message || `${beneficiaryName} moved to the front of the queue.`);
        fetchBeneficiaries();
        if ((window as any).__reloadQueueTable) {
          await (window as any).__reloadQueueTable();
        }
      } catch (error: any) {
        console.error('Override failed:', error);
        Toast.error(error?.response?.message || error?.message || 'Failed to set override. Please try again.');
      }
    }
  });
}

function handleBeneficiaryClearOverride(beneficiaryId: string, beneficiaryName: string) {
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
            id="ben-clear-reason"
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
      const reason = (modalEl.querySelector('#ben-clear-reason') as HTMLTextAreaElement)?.value;
      if (!reason || !reason.trim()) {
        Toast.error('A reason is required to clear a queue override.');
        return;
      }
      try {
        const result: any = await store.apiService.patch(`/house-allocation-queue/${beneficiaryId}/override/clear`, {
          reason: reason.trim(),
        });
        Toast.success(result?.message || `Override cleared for ${beneficiaryName}.`);
        fetchBeneficiaries();
        if ((window as any).__reloadQueueTable) {
          await (window as any).__reloadQueueTable();
        }
      } catch (error: any) {
        Toast.error(error?.response?.message || error?.message || 'Failed to clear override. Please try again.');
      }
    }
  });
}

function handleBeneficiaryExplanation(beneficiaryId: string) {
  // Reuse the existing explanation handler from the queue module
  handleShowExplanation(beneficiaryId);
}

 function viewRequestDetails(id) {
  console.log('viewRequestDetails called with id:', id);
  
  // ✅ First check if we already have the data in store
  const cachedItem = store.allocationRequests.find(r => r.id === id);
  
  if (cachedItem && cachedItem.beneficiaries && cachedItem.beneficiaries.length > 0) {
    console.log('Using cached data for request:', id);
    renderRequestDetailView(cachedItem);
    return;
  }

  // ✅ Show loading state
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) {
    console.error('main-content-area not found');
    return;
  }

  contentArea.innerHTML = `
    <div class="min-h-screen bg-[#F8F9FA] p-6">
      <div class="max-w-[1600px] mx-auto">
        <div class="flex items-center justify-center p-12">
          <div class="text-center">
            <div class="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="mt-3 text-sm text-slate-500">Loading request details...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // ✅ Fetch fresh data from API
  console.log('Fetching request details from API for ID:', id);
  
  store.apiService.get('/house-allocation-requests/' + id)
    .then(function(response) {
      console.log('API Response received:', response);
      
      // ✅ Handle response - it might be the direct object
      let item = response;
      
      // If response has a data property
      if (response && response.data) {
        item = response.data;
      }
      
      // If response has an item property
      if (response && response.item) {
        item = response.item;
      }
      
      console.log('Processed item:', item);
      
      if (!item || !item.id) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
      
      // Update store
      const index = store.allocationRequests.findIndex(r => r.id === id);
      if (index !== -1) {
        store.allocationRequests[index] = item;
      } else {
        store.allocationRequests.push(item);
      }
      
      // ✅ Render the details
      renderRequestDetailView(item);
    })
    .catch(function(error) {
      console.error('Error fetching request details:', error);
      
      // Try to use cached data if available
      if (cachedItem) {
        console.log('Using cached data after API failure');
        renderRequestDetailView(cachedItem);
        Toast.warning('Showing cached data. Some details may be incomplete.');
      } else {
        contentArea.innerHTML = `
          <div class="min-h-screen bg-[#F8F9FA] p-6">
            <div class="max-w-[1600px] mx-auto">
              <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-circle-exclamation text-lg"></i>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-rose-800">Error Loading Request</h3>
                    <p class="text-sm text-rose-600 mt-1">${error.message || 'Failed to load request details'}</p>
                    <div class="mt-3 flex gap-2">
                      <button onclick="renderAllocationRequests()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm">
                        <i class="fa-solid fa-arrow-left mr-2"></i>Back to Requests
                      </button>
                      <button onclick="viewRequestDetails('${id}')" class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm">
                        <i class="fa-solid fa-rotate mr-2"></i>Retry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    });
 }


  function renderRequestDetailView(item) {
  console.log('renderRequestDetailView called with item:', item);
  
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) {
    console.error('main-content-area not found');
    return;
  }

  try {
    const statusInfo = getStatusInfo(item.status);
    const inst = item.requestingInstitution || item.institution || null;
    const beneficiaries = item.beneficiaries || [];
    const ref = item.letterReferenceNumber || item.referenceNumber || 'N/A';

    console.log('Rendering with', beneficiaries.length, 'beneficiaries');

    contentArea.innerHTML = `
      <div class="min-h-screen bg-[#F8F9FA] p-6">
        <div class="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
          <!-- Back button -->
          <button onclick="renderAllocationRequests()" class="flex items-center gap-2 text-sm text-slate-600 hover:text-[#714B67] transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <i class="fa-solid fa-arrow-left"></i> Back to Requests
          </button>

          <!-- Status Bar -->
          ${renderOdooStatusBar(item)}

          <!-- Header -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">${ref}</h2>
                <div class="flex items-center gap-3 mt-1 flex-wrap">
                  <span class="text-sm text-slate-500">📅 Letter Date: ${item.letterDate ? new Date(item.letterDate).toLocaleDateString() : 'N/A'}</span>
                  ${item.registeredAt ? `<span class="text-sm text-slate-500">📋 Registered: ${new Date(item.registeredAt).toLocaleString()}</span>` : ''}
                  <span class="text-sm text-slate-500">🆔 ID: ${item.id}</span>
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                ${!['allocated', 'partial_allocation', 'waiting_list'].includes((item.status || '').toLowerCase()) ? `
                  <button onclick="openRequestForm('${item.id}')" class="px-3 py-1.5 bg-[#714B67] hover:bg-[#5f3e56] text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                    <i class="fa-regular fa-pen mr-1"></i>Edit
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Requesting Institution Details -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div class="bg-[#714B67]/5 border-b border-[#E5E7EB] px-6 py-3 flex items-center gap-2">
              <i class="fa-solid fa-building text-[#714B67]"></i>
              <h3 class="text-sm font-bold text-slate-800">Requesting Institution</h3>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${renderInstitutionDetails(inst)}
            </div>
          </div>

          <!-- Beneficiaries Section -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div class="bg-[#714B67]/5 border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="fa-regular fa-users text-[#714B67]"></i>
                <h3 class="text-sm font-bold text-slate-800">Beneficiaries (${beneficiaries.length})</h3>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-slate-500">Total: ${beneficiaries.length} beneficiary${beneficiaries.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="p-6">
              ${renderBeneficiaryDetails(beneficiaries, item.status, item.id)}
            </div>
          </div>

          <!-- Review Details -->
          ${renderReviewDetails(item)}

          <!-- Timestamps Footer -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4 flex justify-between text-xs text-slate-400">
            <span>Created: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</span>
            <span>Last Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
    
    console.log('renderRequestDetailView completed successfully');
  } catch (error) {
    console.error('Error in renderRequestDetailView:', error);
    contentArea.innerHTML = `
      <div class="min-h-screen bg-[#F8F9FA] p-6">
        <div class="max-w-[1600px] mx-auto">
          <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-circle-exclamation text-lg"></i>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-rose-800">Error Rendering Details</h3>
                <p class="text-sm text-rose-600 mt-1">${error.message}</p>
                <button onclick="renderAllocationRequests()" class="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm">
                  <i class="fa-solid fa-arrow-left mr-2"></i>Back to Requests
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  }

 function renderBeneficiaryDetails(beneficiaries, requestStatus, requestId) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return `<div class="text-center text-sm text-slate-400 py-8">No beneficiaries assigned to this request.</div>`;
  }

  // ─── ROLE CHECKS ──────────────────────────────────────────────────────────
  const currentUserRoles = getCurrentUserRoleKeys();
  const isDeputyCEO = currentUserRoles.includes('deputy_ceo');
  const isDirector = currentUserRoles.includes('director');
  const isTeamLeader = currentUserRoles.includes('team_leader');
  const isTeamOfficer = currentUserRoles.includes('team_officer');
  const isAdmin = isSuperAdmin();
  
  // Who can act on beneficiaries based on request status
  let canActOnBeneficiaries = false;
  let canActOnBeneficiariesStatus = '';
  let roleForActions = '';
  
  if (isAdmin || isDeputyCEO || isDirector) {
    // Deputy CEO and Director can act when request is under their review
    if (requestStatus === 'under_deputy_ceo_review' && isDeputyCEO) {
      canActOnBeneficiaries = true;
      canActOnBeneficiariesStatus = 'under_deputy_ceo_review';
      roleForActions = 'deputy';
    } else if (requestStatus === 'under_director_review' && isDirector) {
      canActOnBeneficiaries = true;
      canActOnBeneficiariesStatus = 'under_director_review';
      roleForActions = 'director';
    }
  }
  
  // Team Leader can act when in team leader review
  if (requestStatus === 'pending_team_leader_decision' && (isTeamLeader || isAdmin)) {
    canActOnBeneficiaries = true;
    canActOnBeneficiariesStatus = 'pending_team_leader_decision';
    roleForActions = 'team_leader';
  }
  
  // Team Officer can act when in team officer review
  if (requestStatus === 'under_team_officer_review' && (isTeamOfficer || isAdmin)) {
    canActOnBeneficiaries = true;
    canActOnBeneficiariesStatus = 'under_team_officer_review';
    roleForActions = 'team_officer';
  }

  // ─── BUILD HTML ──────────────────────────────────────────────────────────
  
  let html = `
    <div class="overflow-x-auto">
      <!-- ✅ SELECT ALL / BULK ACTIONS -->
      ${canActOnBeneficiaries ? `
      <div class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between flex-wrap gap-2" id="bulk-actions-container">
        <div class="flex items-center gap-3">
          <input type="checkbox" id="select-all-beneficiaries" class="w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67] cursor-pointer" />
          <label for="select-all-beneficiaries" class="text-xs font-medium text-slate-700 cursor-pointer">Select All</label>
          <span class="text-xs text-slate-400">|</span>
          <span class="text-xs text-slate-500" id="selected-count">0 selected</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button id="bulk-approve-btn" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" disabled>
            <i class="fa-regular fa-check-circle mr-1"></i> Approve Selected
          </button>
          <button id="bulk-legal-revision-btn" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" disabled>
            <i class="fa-regular fa-scale-balanced mr-1"></i> Legal Revision
          </button>
          <button id="bulk-reject-btn" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" disabled>
            <i class="fa-regular fa-circle-xmark mr-1"></i> Reject Selected
          </button>
        </div>
      </div>
      ` : `
      <div class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <span class="text-xs text-slate-500 italic">You don't have permission to modify beneficiaries at this stage.</span>
      </div>
      `}

      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50">
            ${canActOnBeneficiaries ? `<th class="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-8"><input type="checkbox" id="select-all-beneficiaries-header" class="w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67] cursor-pointer" /></th>` : ''}
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Beneficiary</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">🏛️ Institution</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">📌 Title</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">🎖️ Rank</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">📞 Contact</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">🆔 ID Numbers</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
            ${canActOnBeneficiaries ? `<th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Actions</th>` : ''}
          </tr>
        </thead>
        <tbody>
  `;

  let hasWaitingBeneficiary = false;

  for (let i = 0; i < beneficiaries.length; i++) {
    const ben = beneficiaries[i];
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    const benStatus = ben.status || 'PENDING_REVIEW';
    const statusColor = getBeneficiaryStatusColor(benStatus);
    const canActOnThisBeneficiary = canActOnBeneficiaries && (benStatus === 'pending_review' || benStatus === 'PENDING_REVIEW' || benStatus === 'WAITING');

    if (benStatus === 'WAITING') hasWaitingBeneficiary = true;

    let fullName = 'N/A';
    let title = 'N/A';
    let email = 'N/A';
    let phone = 'N/A';
    let gender = 'N/A';
    let dob = 'N/A';
    let nationality = 'N/A';
    let address = 'N/A';
    let nationalId = 'N/A';
    let passport = 'N/A';
    let tin = 'N/A';
    let userId = 'N/A';
    
    let rankName = 'N/A';
    let rankCode = 'N/A';
    let rankPriority = 'N/A';
    let rankBedrooms = 'N/A';
    let hasRank = false;

    if (individual) {
      userId = individual.userId || individual.id || 'N/A';
      fullName = individual.fullName || getUserFullName(individual) || 'N/A';
      
      if (individual.currentRank) {
        hasRank = true;
        const rank = individual.currentRank;
        rankName = rank.name?.en || rank.name?.am || rank.code || 'N/A';
        rankCode = rank.code || 'N/A';
        rankPriority = rank.priorityLevel || rank.allocationPriority || 'N/A';
        rankBedrooms = rank.bedroomEntitlement || 'N/A';
      }
      
      if (individual.currentTitle) {
        const titleNames = individual.currentTitle.names || {};
        const titleAbbr = individual.currentTitle.abbreviations || {};
        title = titleNames.en || titleNames.am || individual.currentTitle.code || 'N/A';
      }
      
      email = individual.email || 'N/A';
      phone = individual.phonePrimary || 'N/A';
      gender = individual.gender || 'N/A';
      dob = individual.dateOfBirth ? new Date(individual.dateOfBirth).toLocaleDateString() : 'N/A';
      nationality = individual.nationality || 'N/A';
      address = individual.currentAddress || 'N/A';
      nationalId = individual.nationalIdNumber || 'N/A';
      passport = individual.passportNumber || 'N/A';
      tin = individual.tinNumber || 'N/A';
    }

    let instName = 'N/A';
    let instShortName = '';
    let instType = 'N/A';
    let instTier = 'N/A';
    let instCategory = 'N/A';

    if (institution) {
      instName = institution.name?.en || institution.name?.am || 'N/A';
      instShortName = institution.shortName || '';
      instType = institution.institutionType || 'N/A';
      
      if (institution.currentTier) {
        const tier = institution.currentTier;
        instTier = tier.name?.en || tier.name?.am || 'N/A';
        if (tier.allocationPriority) {
          instTier += ` (Priority: ${tier.allocationPriority})`;
        }
      }
      
      if (institution.category) {
        instCategory = institution.category.name?.en || institution.category.name?.am || 'N/A';
      }
    }

    let rankDisplay = '';
    if (hasRank) {
      rankDisplay = `
        <div class="space-y-1">
          <span class="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 inline-block">
            🎖️ ${rankName}
          </span>
          ${rankCode !== 'N/A' ? `<div class="text-[9px] text-slate-400 font-mono">Code: ${rankCode}</div>` : ''}
          ${rankPriority !== 'N/A' ? `<div class="text-[10px] text-slate-500">⭐ Priority: ${rankPriority}/10</div>` : ''}
          ${rankBedrooms !== 'N/A' ? `<div class="text-[10px] text-slate-500">🛏️ ${rankBedrooms} bedrooms</div>` : ''}
        </div>
      `;
    } else {
      rankDisplay = `
        <div class="space-y-0.5">
          <span class="text-xs text-amber-600 font-medium">⚠️ No rank assigned</span>
        </div>
      `;
    }

    // ─── INDIVIDUAL STATUS CELL ───────────────────────────────────────────
    let statusCell = `
      <span class="px-2 py-0.5 ${statusColor} text-[10px] font-bold rounded">${benStatus}</span>
      ${ben.reason ? `<p class="text-[10px] text-slate-400 mt-1">${ben.reason}</p>` : ''}
    `;

    // ─── THREE DOTS ACTION DROPDOWN ──────────────────────────────────────
    let actionCell = '';
    if (canActOnThisBeneficiary) {
      const beneficiaryName = fullName.replace(/'/g, "\\'");
      actionCell = `
        <div class="relative">
          <button class="beneficiary-action-btn px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" 
                  data-beneficiary-id="${ben.id}" 
                  data-beneficiary-name="${beneficiaryName}"
                  data-beneficiary-index="${i}">
            <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
          <div class="beneficiary-dropdown hidden absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
            <button class="dropdown-approve w-full text-left px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2" data-beneficiary-id="${ben.id}">
              <i class="fa-regular fa-check-circle"></i> Approve
            </button>
            <button class="dropdown-legal-revision w-full text-left px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2" data-beneficiary-id="${ben.id}">
              <i class="fa-regular fa-scale-balanced"></i> Legal Revision
            </button>
            <button class="dropdown-reject w-full text-left px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2" data-beneficiary-id="${ben.id}" data-beneficiary-name="${beneficiaryName}">
              <i class="fa-regular fa-circle-xmark"></i> Reject
            </button>
          </div>
        </div>
      `;
    } else if (canActOnBeneficiaries && benStatus !== 'WAITING' && benStatus !== 'pending_review') {
      actionCell = `
        <span class="text-[10px] text-slate-400 italic">Processed</span>
      `;
    }

    html += `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        ${canActOnBeneficiaries ? `
        <td class="px-3 py-3">
          <input type="checkbox" class="beneficiary-select w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67] cursor-pointer" 
                 data-beneficiary-id="${ben.id}" 
                 data-beneficiary-status="${benStatus}"
                 ${!canActOnThisBeneficiary ? 'disabled' : ''} />
        </td>` : ''}
        <td class="px-3 py-3 text-xs text-slate-400 font-medium">${i + 1}</td>
        <td class="px-3 py-3">
          <div class="space-y-0.5">
            <p class="text-sm font-bold text-slate-800">👤 ${fullName}</p>
            <p class="text-[10px] text-slate-400">${gender} • ${dob}</p>
            <p class="text-[10px] text-slate-400">${nationality}</p>
            <p class="text-[10px] text-slate-400 font-mono">ID: ${userId}</p>
          </div>
        </td>
        <td class="px-3 py-3">
          <div class="space-y-0.5">
            <p class="text-sm font-bold text-slate-800">🏛️ ${instName}</p>
            ${instShortName ? `<p class="text-[10px] text-slate-500">${instShortName}</p>` : ''}
            <p class="text-[10px] text-slate-400">${instType}</p>
            ${instTier !== 'N/A' ? `<p class="text-[10px] text-slate-400">Tier: ${instTier}</p>` : ''}
            ${instCategory !== 'N/A' ? `<p class="text-[10px] text-slate-400">Category: ${instCategory}</p>` : ''}
          </div>
        </td>
        <td class="px-3 py-3">
          <div class="space-y-0.5">
            <p class="text-sm font-semibold text-purple-700">📌 ${title}</p>
          </div>
        </td>
        <td class="px-3 py-3">
          ${rankDisplay}
        </td>
        <td class="px-3 py-3">
          <div class="space-y-0.5 text-xs">
            ${email !== 'N/A' ? `<p class="text-slate-700">📧 ${email}</p>` : ''}
            ${phone !== 'N/A' ? `<p class="text-slate-700">📱 ${phone}</p>` : ''}
            ${address !== 'N/A' ? `<p class="text-[10px] text-slate-400">📍 ${address}</p>` : ''}
            ${email === 'N/A' && phone === 'N/A' ? `<span class="text-slate-400 italic">No contact info</span>` : ''}
          </div>
        </td>
        <td class="px-3 py-3">
          <div class="space-y-0.5 text-[10px] font-mono">
            ${nationalId !== 'N/A' ? `<p class="text-slate-600">National ID: ${nationalId}</p>` : ''}
            ${passport !== 'N/A' ? `<p class="text-slate-600">Passport: ${passport}</p>` : ''}
            ${tin !== 'N/A' ? `<p class="text-slate-600">TIN: ${tin}</p>` : ''}
            ${nationalId === 'N/A' && passport === 'N/A' && tin === 'N/A' ? 
              `<span class="text-slate-400 italic">No ID numbers</span>` : ''}
          </div>
        </td>
        <td class="px-3 py-3">
          ${statusCell}
        </td>
        ${canActOnBeneficiaries ? `<td class="px-3 py-3">${actionCell}</td>` : ''}
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;
  
  // ─── ATTACH EVENT LISTENERS ────────────────────────────────────────────
  setTimeout(function() {
    attachBeneficiaryDropdownListeners(requestId, roleForActions);
    attachSelectAllListeners(requestId);
    attachBulkActionListeners(requestId, roleForActions);
  }, 100);
  
  return html;
 }
 function attachBulkActionListeners(requestId, role) {
  const bulkApproveBtn = document.getElementById('bulk-approve-btn');
  const bulkRejectBtn = document.getElementById('bulk-reject-btn');
  const bulkLegalRevisionBtn = document.getElementById('bulk-legal-revision-btn');

  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', function() {
      const selected = document.querySelectorAll('.beneficiary-select:checked');
      if (selected.length === 0) return;
      
      Modal.open({
        title: `Bulk Approve Beneficiaries`,
        content: `
          <div class="space-y-4">
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p class="text-xs text-emerald-700 flex items-center gap-2">
                <i class="fa-regular fa-circle-check"></i>
                <span>You are about to approve <strong>${selected.length}</strong> beneficiary(ies).</span>
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Comment (Optional)</label>
              <textarea id="bulk-comment" rows="2" placeholder="Add any remarks..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500"></textarea>
            </div>
          </div>
        `,
        isForm: true,
        confirmText: 'Approve All',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
        onConfirm: function(modalEl) {
          const comment = document.getElementById('bulk-comment')?.value || '';
          const promises = [];
          
          selected.forEach(function(cb) {
            const beneficiaryId = cb.dataset.beneficiaryId;
            const payload = { 
              status: 'eligible',
              reason: comment || 'Approved via bulk action'
            };
            promises.push(
              store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
            );
          });
          
          Promise.all(promises)
            .then(function() {
              Toast.success(`${selected.length} beneficiary(ies) approved successfully.`);
              store.syncWithBackend(true).then(function() {
                viewRequestDetails(requestId);
              });
            })
            .catch(function(error) {
              console.error('Error in bulk approve:', error);
              Toast.error('Failed to approve some beneficiaries. Please try again.');
            });
        }
      });
    });
  }

  if (bulkRejectBtn) {
    bulkRejectBtn.addEventListener('click', function() {
      const selected = document.querySelectorAll('.beneficiary-select:checked');
      if (selected.length === 0) return;
      
      Modal.open({
        title: `Bulk Reject Beneficiaries`,
        content: `
          <div class="space-y-4">
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p class="text-xs text-rose-700 flex items-center gap-2">
                <i class="fa-regular fa-circle-exclamation"></i>
                <span>You are about to reject <strong>${selected.length}</strong> beneficiary(ies).</span>
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
              <textarea id="bulk-reject-reason" rows="3" placeholder="Enter rejection reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-rose-500"></textarea>
            </div>
          </div>
        `,
        isForm: true,
        confirmText: 'Reject All',
        confirmClass: 'bg-rose-600 hover:bg-rose-700',
        onConfirm: function(modalEl) {
          const reason = document.getElementById('bulk-reject-reason')?.value || '';
          if (!reason.trim()) {
            Toast.error('Rejection reason is required.');
            return;
          }
          
          const promises = [];
          selected.forEach(function(cb) {
            const beneficiaryId = cb.dataset.beneficiaryId;
            const payload = { 
              status: 'unauthorized_by_directive',
              reason: reason.trim()
            };
            promises.push(
              store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
            );
          });
          
          Promise.all(promises)
            .then(function() {
              Toast.success(`${selected.length} beneficiary(ies) rejected successfully.`);
              store.syncWithBackend(true).then(function() {
                viewRequestDetails(requestId);
              });
            })
            .catch(function(error) {
              console.error('Error in bulk reject:', error);
              Toast.error('Failed to reject some beneficiaries. Please try again.');
            });
        }
      });
    });
  }

  if (bulkLegalRevisionBtn) {
    bulkLegalRevisionBtn.addEventListener('click', function() {
      const selected = document.querySelectorAll('.beneficiary-select:checked');
      if (selected.length === 0) return;
      
      Modal.open({
        title: `Bulk Legal Revision`,
        content: `
          <div class="space-y-4">
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p class="text-xs text-amber-700 flex items-center gap-2">
                <i class="fa-regular fa-scale-balanced"></i>
                <span>You are about to mark <strong>${selected.length}</strong> beneficiary(ies) for legal revision.</span>
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Legal Revision Reason <span class="text-rose-500">*</span></label>
              <textarea id="bulk-legal-reason" rows="3" placeholder="Enter legal revision reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"></textarea>
            </div>
          </div>
        `,
        isForm: true,
        confirmText: 'Submit All',
        confirmClass: 'bg-amber-600 hover:bg-amber-700',
        onConfirm: function(modalEl) {
          const reason = document.getElementById('bulk-legal-reason')?.value || '';
          if (!reason.trim()) {
            Toast.error('Legal revision reason is required.');
            return;
          }
          
          const promises = [];
          selected.forEach(function(cb) {
            const beneficiaryId = cb.dataset.beneficiaryId;
            const payload = { 
              status: 'under_legal_revision',
              reason: reason.trim()
            };
            promises.push(
              store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
            );
          });
          
          Promise.all(promises)
            .then(function() {
              Toast.success(`${selected.length} beneficiary(ies) marked for legal revision.`);
              store.syncWithBackend(true).then(function() {
                viewRequestDetails(requestId);
              });
            })
            .catch(function(error) {
              console.error('Error in bulk legal revision:', error);
              Toast.error('Failed to mark for legal revision. Please try again.');
            });
        }
      });
    });
  }
 }
 function attachSelectAllListeners(requestId) {
  const selectAllHeader = document.getElementById('select-all-beneficiaries-header');
  const selectAll = document.getElementById('select-all-beneficiaries');
  const checkboxes = document.querySelectorAll('.beneficiary-select');
  const selectedCount = document.getElementById('selected-count');
  const bulkApproveBtn = document.getElementById('bulk-approve-btn');
  const bulkRejectBtn = document.getElementById('bulk-reject-btn');
  const bulkLegalRevisionBtn = document.getElementById('bulk-legal-revision-btn');

  function updateSelectedCount() {
    const checked = document.querySelectorAll('.beneficiary-select:checked');
    const total = document.querySelectorAll('.beneficiary-select:not(:disabled)');
    const count = checked.length;
    
    if (selectedCount) {
      selectedCount.textContent = `${count} selected`;
    }
    
    if (bulkApproveBtn) {
      bulkApproveBtn.disabled = count === 0;
    }
    if (bulkRejectBtn) {
      bulkRejectBtn.disabled = count === 0;
    }
    if (bulkLegalRevisionBtn) {
      bulkLegalRevisionBtn.disabled = count === 0;
    }
    
    // Update select all state
    if (selectAll) {
      const totalEnabled = total.length;
      selectAll.checked = count > 0 && count === totalEnabled;
      selectAll.indeterminate = count > 0 && count < totalEnabled;
    }
    if (selectAllHeader) {
      const totalEnabled = total.length;
      selectAllHeader.checked = count > 0 && count === totalEnabled;
      selectAllHeader.indeterminate = count > 0 && count < totalEnabled;
    }
  }

  // Select All (main)
  if (selectAll) {
    selectAll.addEventListener('change', function() {
      const isChecked = this.checked;
      document.querySelectorAll('.beneficiary-select:not(:disabled)').forEach(function(cb) {
        cb.checked = isChecked;
      });
      updateSelectedCount();
    });
  }

  // Select All (header)
  if (selectAllHeader) {
    selectAllHeader.addEventListener('change', function() {
      const isChecked = this.checked;
      document.querySelectorAll('.beneficiary-select:not(:disabled)').forEach(function(cb) {
        cb.checked = isChecked;
      });
      if (selectAll) selectAll.checked = isChecked;
      updateSelectedCount();
    });
  }

  // Individual checkboxes
  checkboxes.forEach(function(cb) {
    cb.addEventListener('change', updateSelectedCount);
  });

  // Initial update
  updateSelectedCount();
 }
// ─── ATTACH BENEFICIARY DROPDOWN LISTENERS ─────────────────────────────

 function attachBeneficiaryDropdownListeners(requestId, role) {
  // Toggle dropdown on button click
  document.querySelectorAll('.beneficiary-action-btn').forEach(function(btn) {
    btn.removeEventListener('click', toggleBeneficiaryDropdown);
    btn.addEventListener('click', toggleBeneficiaryDropdown);
  });

  // Approve action
  document.querySelectorAll('.dropdown-approve').forEach(function(btn) {
    btn.removeEventListener('click', handleBeneficiaryApprove);
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const beneficiaryId = this.dataset.beneficiaryId;
      if (beneficiaryId) {
        closeAllBeneficiaryDropdowns();
        handleBeneficiaryApprove(requestId, beneficiaryId, role);
      }
    });
  });

  // Legal Revision action
  document.querySelectorAll('.dropdown-legal-revision').forEach(function(btn) {
    btn.removeEventListener('click', handleBeneficiaryLegalRevision);
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const beneficiaryId = this.dataset.beneficiaryId;
      if (beneficiaryId) {
        closeAllBeneficiaryDropdowns();
        handleBeneficiaryLegalRevision(requestId, beneficiaryId, role);
      }
    });
  });

  // Reject action - opens modal
  document.querySelectorAll('.dropdown-reject').forEach(function(btn) {
    btn.removeEventListener('click', handleBeneficiaryReject);
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const beneficiaryId = this.dataset.beneficiaryId;
      const beneficiaryName = this.dataset.beneficiaryName || 'this beneficiary';
      if (beneficiaryId) {
        closeAllBeneficiaryDropdowns();
        openBeneficiaryRejectModal(requestId, beneficiaryId, beneficiaryName, role);
      }
    });
  });

  // Close dropdowns when clicking outside
  document.removeEventListener('click', closeAllBeneficiaryDropdowns);
  document.addEventListener('click', closeAllBeneficiaryDropdowns);
 }

function handleBeneficiaryLegalRevision(requestId, beneficiaryId, role) {
  const roleLabel = role === 'deputy' ? 'Deputy CEO' : 
                     role === 'director' ? 'Director' : 
                     role === 'team_leader' ? 'Team Leader' : 'Reviewer';
  
  Modal.open({
    title: 'Legal Revision Required',
    content: `
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p class="text-xs text-amber-700 flex items-center gap-2">
            <i class="fa-regular fa-scale-balanced"></i>
            <span>Mark this beneficiary for legal revision. They will need to go through legal review.</span>
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Legal Revision Reason <span class="text-rose-500">*</span></label>
          <textarea id="legal-revision-reason" rows="3" placeholder="Enter legal revision reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-amber-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Submit Legal Revision',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
    onConfirm: function(modalEl) {
      const reason = document.getElementById('legal-revision-reason')?.value || '';
      
      const payload = { 
        status: 'under_legal_revision',
        reason: reason || 'Legal revision required'
      };
      
      // ✅ FIX: Use the correct URL path
      store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
        .then(() => {
          Toast.success('Beneficiary marked for legal revision.');
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(requestId);
          });
        })
        .catch(error => {
          console.error('Error marking for legal revision:', error);
          Toast.error('Failed to mark for legal revision. Please try again.');
        });
    }
  });
}
 function toggleBeneficiaryDropdown(e) {
  e.stopPropagation();
  const dropdown = this.parentElement.querySelector('.beneficiary-dropdown');
  if (dropdown) {
    // Close all other dropdowns
    document.querySelectorAll('.beneficiary-dropdown').forEach(function(d) {
      if (d !== dropdown) d.classList.add('hidden');
    });
    dropdown.classList.toggle('hidden');
  }
 }

 function closeAllBeneficiaryDropdowns() {
  document.querySelectorAll('.beneficiary-dropdown').forEach(function(d) {
    d.classList.add('hidden');
  });
 }

function handleBeneficiaryApprove(requestId, beneficiaryId) {
  Modal.open({
    title: 'Approve Beneficiary',
    content: `
      <div class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p class="text-xs text-emerald-700 flex items-center gap-2">
            <i class="fa-regular fa-circle-check"></i>
            <span>Are you sure you want to approve this beneficiary?</span>
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Comment (Optional)</label>
          <textarea id="beneficiary-approve-comment" rows="3" placeholder="Add any remarks..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Approve Beneficiary',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
    onConfirm: function(modalEl) {
      const comment = document.getElementById('beneficiary-approve-comment')?.value || '';
      
      const payload = { 
        status: 'eligible',
        reason: comment || 'Approved by reviewer'
      };
      
      // ✅ FIX: Use the correct URL path
      store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
        .then(() => {
          Toast.success('Beneficiary approved successfully.');
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(requestId);
          });
        })
        .catch(error => {
          console.error('Error approving beneficiary:', error);
          Toast.error('Failed to approve beneficiary. Please try again.');
        });
    }
  });
}

 function handleBeneficiaryReject(requestId, beneficiaryId, beneficiaryName) {
  // This is handled by openBeneficiaryRejectModal
  // The function already exists, just call it
  if (typeof openBeneficiaryRejectModal === 'function') {
    openBeneficiaryRejectModal(requestId, beneficiaryId, beneficiaryName);
  }
 }

 function getCurrentUserRoleKeys() {
  return store.getCurrentUserRoleKeys();
 }

 function hasRole(roleKey) {
  return store.hasRole(roleKey);
 }

 function isSuperAdmin() {
  return store.isSuperAdmin();
 }
// ─── ROLE CHECKS ──────────────────────────────────────────────────────────
 const currentUserRoles = getCurrentUserRoleKeys();
 const isDeputyCEO = currentUserRoles.includes('deputy_ceo');
 const isDirector = currentUserRoles.includes('director');
 const isTeamLeader = currentUserRoles.includes('team_leader');
 const isTeamOfficer = currentUserRoles.includes('team_officer');
 const isAdmin = isSuperAdmin();

 console.log('=== PERMISSION DEBUG ===');
 console.log('currentUserRoles:', currentUserRoles);
 console.log('isDeputyCEO:', isDeputyCEO);
 console.log('isDirector:', isDirector);
 console.log('isTeamLeader:', isTeamLeader);
 console.log('isTeamOfficer:', isTeamOfficer);
 console.log('isAdmin:', isAdmin);
 // console.log('requestStatus:', requestStatus);
 console.log('========================');

function getRoleDisplay(roleKey) {
  const displayMap = {
    'super_admin': 'Super Admin',
    'deputy_ceo': 'Deputy CEO',
    'director': 'Director',
    'team_leader': 'Team Leader',
    'data_encoder': 'Data Encoder'
  };
  return displayMap[roleKey.toLowerCase()] || roleKey;
}

function renderOdooStatusBar(item) {
  const currentStatus = (item.status || 'draft').toLowerCase();
  const beneficiaries = item.beneficiaries || [];
  
  // Calculate conditional status based on beneficiaries
  const calculatedStatus = calculateRequestStatus(beneficiaries);
  
  // Use calculated status if it's a terminal/conditional state
  const displayStatus = ['partial_waiting_list', 'partial_allocation', 'waiting_list', 'allocated'].includes(calculatedStatus) 
    ? calculatedStatus 
    : currentStatus;
  
  const currentIndex = WORKFLOW_STEPS.findIndex(step => step.key === displayStatus);
  
  if (currentIndex === -1) {
    // Fallback: find the closest match
    const fallbackIndex = WORKFLOW_STEPS.findIndex(step => step.key === currentStatus);
    if (fallbackIndex !== -1) {
      return renderWorkflowSteps(item, fallbackIndex, displayStatus);
    }
    return renderTerminalStatus('UNKNOWN', 'Unknown', 'bg-gray-600 text-white border-gray-700', item);
  }

  // Check if terminal statuses
  if (displayStatus === 'allocated') {
    return renderTerminalStatus('ALLOCATED', 'Allocated', 'bg-emerald-600 text-white border-emerald-700', item);
  }

  return renderWorkflowSteps(item, currentIndex, displayStatus);
}

function renderWorkflowSteps(item, currentIndex, displayStatus) {
  const progressPercent = ((currentIndex + 1) / WORKFLOW_STEPS.length) * 100;
  const userIsAdmin = isSuperAdmin();
  const beneficiaries = item.beneficiaries || [];
  
  // Check if all beneficiaries are reviewed
  const allReviewed = areAllBeneficiariesReviewed(beneficiaries);
  const pendingBeneficiaries = getPendingBeneficiaries(beneficiaries);
  const hasRejected = hasAnyBeneficiaryRejected(beneficiaries);
  
  // ✅ Get the current status from the item
  const currentStatus = (item.status || 'draft').toLowerCase();
  
  // Determine if user can act
  let userCanAct = userIsAdmin;
  let actionButtons = '';
  
  // ─── REVISION BANNER ──────────────────────────────────────────────────────
  let revisionBanner = '';
  if (currentStatus === 'submitted' || currentStatus === 'pending_team_leader_decision') {
    // Check for revision decisions from reviewers
    const hasRevision = beneficiaries.some(b => 
      b.deputyCeoDecision === 'legal_revision_required' ||
      b.directorDecision === 'legal_revision_required' ||
      b.teamLeaderDecision === 'legal_revision_required'
    );
    
    if (hasRevision) {
      revisionBanner = `
        <div class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div class="flex items-start gap-3">
            <i class="fa-regular fa-circle-exclamation text-amber-600 mt-0.5"></i>
            <div>
              <p class="text-xs font-bold text-amber-800">🔄 Revision Required</p>
              <p class="text-xs text-amber-700 mt-0.5">One or more beneficiaries need revision. Please review the feedback below.</p>
              <p class="text-xs text-amber-600 mt-2">${pendingBeneficiaries.length} beneficiary(ies) pending review.</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  // ─── ACTION BUTTONS ──────────────────────────────────────────────────────
  
  // DRAFT status
  if (currentStatus === 'draft' && userCanAct) {
    actionButtons = `
      <button onclick="window.submitDraft('${item.id}')" 
        class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg shadow-sm">
        <i class="fa-regular fa-paper-plane"></i> Submit Draft
      </button>
      <button onclick="window.openRequestForm('${item.id}')" 
        class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
        <i class="fa-regular fa-pen"></i> Edit Draft
      </button>
    `;
    
  // SUBMITTED status - Show "Start Deputy CEO Review" button
  } else if (currentStatus === 'submitted' && userCanAct) {
    actionButtons = `
      <button onclick="window.advanceWorkflow('${item.id}')" 
        class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg shadow-sm">
        <i class="fa-regular fa-play"></i> Start Deputy CEO Review
      </button>
      <button onclick="window.cancelWorkflow('${item.id}')" 
        class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors rounded-lg shadow-sm">
        <i class="fa-regular fa-xmark"></i> Cancel
      </button>
    `;
    
  // UNDER_DEPUTY_CEO_REVIEW status - Show "Submit Deputy CEO Decision"
  } else if (currentStatus === 'under_deputy_ceo_review' && userCanAct) {
    const allHaveDecisions = beneficiaries.every(b => b.deputyCeoDecision !== null && b.deputyCeoDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-forward-step"></i> Advance to Director Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'deputy')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Submit Deputy CEO Decision (${pendingBeneficiaries.length} pending)
        </button>
        <span class="text-[10px] text-amber-600 font-medium">${pendingBeneficiaries.length} beneficiary(ies) pending review</span>
      `;
    }
    
  // UNDER_DIRECTOR_REVIEW status - Show "Submit Director Decision"
  } else if (currentStatus === 'under_director_review' && userCanAct) {
    const allHaveDecisions = beneficiaries.every(b => b.directorDecision !== null && b.directorDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-forward-step"></i> Advance to Team Leader Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'director')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Submit Director Decision (${pendingBeneficiaries.length} pending)
        </button>
        <span class="text-[10px] text-amber-600 font-medium">${pendingBeneficiaries.length} beneficiary(ies) pending review</span>
      `;
    }
    
  // PENDING_TEAM_LEADER_DECISION status - Show "Submit Team Leader Decision"
  } else if (currentStatus === 'pending_team_leader_decision' && userCanAct) {
    const allHaveDecisions = beneficiaries.every(b => b.teamLeaderDecision !== null && b.teamLeaderDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-forward-step"></i> Advance to Team Officer Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'team_leader')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Submit Team Leader Decision (${pendingBeneficiaries.length} pending)
        </button>
        <span class="text-[10px] text-amber-600 font-medium">${pendingBeneficiaries.length} beneficiary(ies) pending review</span>
      `;
    }
    
  // UNDER_TEAM_OFFICER_REVIEW status
  } else if (currentStatus === 'under_team_officer_review' && userCanAct) {
    const allEligible = beneficiaries.every(b => 
      (b.status || '').toLowerCase() === 'waiting_list' || 
      (b.status || '').toLowerCase() === 'allocated'
    );
    
    if (allEligible) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-forward-step"></i> Process to Waiting List
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryProcessingModal('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-gear"></i> Process Beneficiaries
        </button>
        <span class="text-[10px] text-amber-600 font-medium">Process eligible beneficiaries</span>
      `;
    }
  }

  // ─── AWAITING BADGE ──────────────────────────────────────────────────────
  let awaitingBadge = '';
  const reviewer = getReviewerForStatus(currentStatus);
  if (reviewer && !userCanAct && !['allocated'].includes(displayStatus)) {
    awaitingBadge = `
      <span class="px-3 py-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold rounded-lg">
        ⏳ Awaiting: ${reviewer}
      </span>
    `;
  }

  // ─── PENDING BENEFICIARIES BADGE ────────────────────────────────────────
  let pendingBadge = '';
  if (pendingBeneficiaries.length > 0) {
    pendingBadge = `
      <span class="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-lg">
        ⚠️ ${pendingBeneficiaries.length} beneficiary(ies) pending review
      </span>
    `;
  }

  // ─── CANCEL BUTTON ──────────────────────────────────────────────────────
  let cancelButton = '';
  if (userIsAdmin && !['allocated'].includes(displayStatus)) {
    cancelButton = `
      <button onclick="window.cancelWorkflow('${item.id}')" 
        class="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors rounded-lg">
        Cancel Request
      </button>
    `;
  }

  return `
    <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
      ${revisionBanner}

      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div class="flex items-center gap-2 flex-wrap">
          ${actionButtons}
          ${cancelButton}
          ${awaitingBadge}
          ${pendingBadge}
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          ${item.queuePriority ? `
            <span class="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded">
              Priority: Level ${item.queuePriority}
            </span>
          ` : ''}
          <span class="px-3 py-1 bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20 text-xs font-extrabold rounded-full">
            ${WORKFLOW_STEPS[currentIndex]?.label || displayStatus}
          </span>
          <span class="px-3 py-1 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium rounded-full">
            ${beneficiaries.length} beneficiaries
          </span>
        </div>
      </div>

      <!-- Beneficiary Status Summary -->
      <div class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div class="flex flex-wrap items-center gap-4 text-xs">
          <span class="font-semibold text-slate-600">Beneficiary Status:</span>
          ${getBeneficiarySummaryBadges(beneficiaries)}
        </div>
      </div>

      <div class="bg-white py-1 shadow-sm overflow-hidden rounded-lg border border-slate-200">
        <div class="flex items-center w-full min-w-[700px] h-10 gap-[2px]">
          ${WORKFLOW_STEPS.map((step, index) => {
            // Only show conditional steps if they apply
            if (step.conditional && !['partial_waiting_list', 'partial_allocation', 'waiting_list', 'allocated'].includes(displayStatus)) {
              // Hide conditional steps if we're not in that state
              if (index > currentIndex + 1) return '';
            }
            
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const isFirst = index === 0;
            const isLast = index === WORKFLOW_STEPS.length - 1;

            let clipPathStyle = 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)';
            if (isFirst) {
              clipPathStyle = 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)';
            } else if (isLast) {
              clipPathStyle = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)';
            }

            let segmentClass = '';
            if (isActive) {
              segmentClass = 'bg-[#714B67] text-white font-extrabold shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] scale-[1.01] z-10';
            } else if (isCompleted) {
              segmentClass = 'bg-emerald-500 text-white font-bold cursor-pointer hover:bg-emerald-600 transition-all';
            } else {
              segmentClass = 'bg-gray-200 text-gray-500 font-medium cursor-pointer hover:bg-gray-300 transition-all';
            }

            // Add conditional status indicator
            let indicator = '';
            if (step.conditional && isActive) {
              indicator = ' ⚡';
            }

            return `
              <div class="flex-1 h-full flex items-center justify-center text-[10px] uppercase relative px-4 text-center select-none ${segmentClass}"
                   style="clip-path: ${clipPathStyle}"
                   onclick="window.navigateToStatus('${step.key}')"
                   title="${step.label}${isCompleted ? ' (Click to view)' : ''}">
                <div class="flex items-center gap-1 truncate">
                  ${isCompleted ? '<span class="font-bold">✓</span>' : ''}
                  ${isActive ? '<span class="animate-pulse">⏳</span>' : ''}
                  <span>${step.label}${indicator}</span>
                </div>
              </div>
            `;
          }).filter(Boolean).join('')}
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Completed (${currentIndex} of ${WORKFLOW_STEPS.length - 1})</span>
        </div>
        <div>
          <span class="font-semibold text-slate-700">${progressPercent.toFixed(0)}% Overall Progress</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-[#714B67]"></span>
          <span>Active Step: <strong class="text-slate-600 font-medium">${WORKFLOW_STEPS[currentIndex]?.label || displayStatus}</strong></span>
        </div>
      </div>
    </div>
  `;
}
function getBeneficiarySummaryBadges(beneficiaries) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return '<span class="text-slate-400">No beneficiaries</span>';
  }
  
  const statusCounts = {};
  beneficiaries.forEach(b => {
    const status = (b.status || 'pending_review').toLowerCase();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return Object.entries(statusCounts).map(([status, count]) => {
    const info = getBeneficiaryStatusInfo(status);
    return `
      <span class="px-2 py-0.5 ${info.color} border text-[10px] font-medium rounded-md">
        ${count} × ${info.label}
      </span>
    `;
  }).join('');
}
function renderTerminalStatus(status, label, bgClass, item) {
  const beneficiaries = item?.beneficiaries || [];
  
  return `
    <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center text-2xl shadow-lg">
            ${status === 'ALLOCATED' ? '✅' : '📌'}
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-900">${label}</h3>
            <p class="text-sm text-slate-500">This request has been ${status.toLowerCase()}.</p>
          </div>
        </div>
        <span class="px-4 py-1.5 ${getStatusInfo(status).color} border text-xs font-extrabold rounded-lg shadow-sm">
          ${getStatusInfo(status).label}
        </span>
      </div>
      
      <div class="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div class="flex flex-wrap items-center gap-4 text-xs">
          <span class="font-semibold text-slate-600">Beneficiary Status:</span>
          ${getBeneficiarySummaryBadges(beneficiaries)}
        </div>
      </div>
      
      ${item?.rejectionReason ? `
        <div class="mt-4 p-4 bg-rose-50/80 border border-rose-200/60 rounded-xl">
          <div class="flex items-start gap-3">
            <i class="fa-regular fa-circle-exclamation text-rose-500 mt-0.5"></i>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-rose-600">Rejection Reason</p>
              <p class="text-sm text-rose-700 mt-0.5">${item.rejectionReason}</p>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── RENDER REVIEW DETAILS ───────────────────────────────────────────────
function renderReviewDetails(item) {
  const reviewSections = [
    {
      title: 'Deputy CEO Review',
      decision: item.deputyCeoReviewDecision,
      comment: item.deputyCeoReviewComment,
      reviewedAt: item.deputyCeoReviewedAt,
      reviewedBy: item.deputyCeoReviewedBy,
      status: item.status === 'under_deputy_ceo_review' ? 'in-progress' : 
              item.deputyCeoReviewDecision ? 'completed' : 'pending'
    },
    {
      title: 'Director Review',
      decision: item.directorReviewDecision,
      comment: item.directorReviewComment,
      reviewedAt: item.directorReviewedAt,
      reviewedBy: item.directorReviewedBy,
      status: item.status === 'under_director_review' ? 'in-progress' : 
              item.directorReviewDecision ? 'completed' : 'pending'
    }
  ];

  const statusConfig = {
    'pending': { icon: '⏳', color: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Pending' },
    'in-progress': { icon: '🔄', color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'In Progress' },
    'completed': { icon: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Completed' }
  };

  let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
  
  reviewSections.forEach(section => {
    const info = statusConfig[section.status] || statusConfig['pending'];
    const decisionDisplay = formatDecision(section.decision);
    const isApproved = section.decision === 'approved' || section.decision === 'APPROVED';
    const isRevision = section.decision === 'verification_required' || 
                       section.decision === 'VERIFICATION_REQUIRED' ||
                       section.decision === 'legal_revision_required' ||
                       section.decision === 'LEGAL_REVISION_REQUIRED';
    const decisionColor = isApproved ? 'text-emerald-600' : 
                          isRevision ? 'text-amber-600' : 'text-slate-400';

    // Show revision warning if this is a revision decision
    let revisionWarning = '';
    if (isRevision && section.comment) {
      revisionWarning = `
        <div class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div class="flex items-start gap-2">
            <i class="fa-regular fa-circle-exclamation text-amber-600 mt-0.5"></i>
            <div>
              <p class="text-xs font-bold text-amber-800">📝 Revision Required</p>
              <p class="text-xs text-amber-700 mt-0.5"><strong>Reason:</strong> ${section.comment}</p>
            </div>
          </div>
        </div>
      `;
    }

    html += `
      <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-xs font-semibold uppercase text-slate-400 tracking-wider">${section.title}</h4>
          <span class="px-2 py-0.5 ${info.color} border text-[10px] font-bold rounded-full">
            ${info.icon} ${info.label}
          </span>
        </div>
        <div class="mt-2 space-y-1">
          <p class="text-sm text-slate-800">
            <span class="text-slate-500">Decision:</span> 
            <span class="font-semibold ${decisionColor}">${decisionDisplay}</span>
          </p>
          ${section.comment && !isRevision ? `<p class="text-xs text-slate-500"><span class="text-slate-400">Comment:</span> ${section.comment}</p>` : ''}
          ${section.reviewedAt ? `<p class="text-xs text-slate-400">Reviewed: ${new Date(section.reviewedAt).toLocaleString()}</p>` : ''}
          ${section.reviewedBy ? `<p class="text-xs text-slate-400">By: ${getUserFullName(section.reviewedBy)}</p>` : ''}
          ${revisionWarning}
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}
// ─── NAVIGATE TO STATUS ────────────────────────────────────────────────────

function navigateToStatus(statusKey) {
  Toast.info(`Showing ${statusKey.replace(/_/g, ' ')} requests...`);
  sessionStorage.setItem('requestFilter', statusKey.toLowerCase());
  
  const contentArea = document.getElementById('main-content-area');
  if (contentArea) {
    renderAllocationRequests();
    setTimeout(() => {
      const filterBtn = document.querySelector(`.filter-btn[data-filter="${statusKey.toLowerCase()}"]`);
      if (filterBtn) filterBtn.click();
    }, 100);
  }
}

// ─── WORKFLOW ACTION FUNCTIONS ───────────────────────────────────────────

const workflowActions = {
 // ✅ CREATE DRAFT - POST /house-allocation-requests/draft
  createDraft: function(data) {
    const payload = {
      ...data,
      isDraft: true,
       directiveCompliance: data.directiveCompliance || {
        isCompliant: true,
        note: 'Directive compliance verified - all beneficiaries are eligible',
        notedBy: store.currentUser?.id || '00000000-0000-0000-0000-000000000001'
      }
    };
    
    return store.apiService.post('/house-allocation-requests/draft', payload)
      .then(response => {
        Toast.success('✅ Draft saved successfully.');
        return response;
      })
      .catch(error => {
        console.error('Error saving draft:', error);
        const message = error.response?.data?.message || 'Failed to save draft.';
        Toast.error(Array.isArray(message) ? message.join(', ') : message);
        throw error;
      });
  },

  // ✅ SUBMIT DRAFT - PATCH /house-allocation-requests/:id/submit-draft
  submitDraft: function(id) {
    return store.apiService.patch(`/house-allocation-requests/${id}/submit-draft`)
      .then(response => {
        Toast.success('📤 Draft submitted for review successfully!');
        return response;
      })
      .catch(error => {
        console.error('Error submitting draft:', error);
        const message = error.response?.data?.message || 'Failed to submit draft.';
        Toast.error(Array.isArray(message) ? message.join(', ') : message);
        throw error;
      });
  },


  // ✅ DEPUTY CEO START REVIEW - PATCH /:id/deputy-ceo/start-review
  deputyCeoStartReview: function(id) {
    return store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/start-review`)
      .then(() => {
        Toast.success('👀 Request is now under Deputy CEO review.');
        return true;
      })
      .catch(error => {
        console.error('Error starting review:', error);
        Toast.error('Failed to start review. Please try again.');
        throw error;
      });
  },

   // ✅ DEPUTY CEO DECISION - PATCH /:id/deputy-ceo/decision
  deputyCeoDecision: function(id, decision, comment) {
    return store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/decision`, { 
      decision: decision.toUpperCase(), 
      comment 
    })
      .then(() => {
        Toast.success('✅ Deputy CEO decision submitted successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error submitting decision:', error);
        Toast.error('Failed to submit decision. Please try again.');
        throw error;
      });
  },
    // ✅ DIRECTOR DECISION - PATCH /:id/director/decision
  directorDecision: function(id, decision, comment) {
    return store.apiService.patch(`/house-allocation-requests/${id}/director/decision`, { 
      decision: decision.toUpperCase(), 
      comment 
    })
      .then(() => {
        Toast.success('✅ Director decision submitted successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error submitting decision:', error);
        Toast.error('Failed to submit decision. Please try again.');
        throw error;
      });
  },

    teamOfficerMoveToWaitingList: function(id, beneficiaryIds) {
    return store.apiService.patch(`/house-allocation-requests/${id}/team-officer/move-to-waiting-list`, { 
      beneficiaryIds 
    })
      .then(() => {
        Toast.success('📋 Beneficiaries moved to waiting list.');
        return true;
      })
      .catch(error => {
        console.error('Error moving to waiting list:', error);
        Toast.error('Failed to move beneficiaries. Please try again.');
        throw error;
      });
  },
   teamOfficerAllocateHouse: function(id, beneficiaryId, houseId) {
    return store.apiService.patch(`/house-allocation-requests/${id}/team-officer/allocate`, { 
      beneficiaryId, 
      houseId 
    })
      .then(() => {
        Toast.success('🏠 House allocated successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error allocating house:', error);
        Toast.error('Failed to allocate house. Please try again.');
        throw error;
      });
  },
    // ✅ TEAM LEADER DECISION - PATCH /:id/team-leader/decision
  teamLeaderDecision: function(id, decision, comment) {
    return store.apiService.patch(`/house-allocation-requests/${id}/team-leader/decision`, { 
      decision: decision.toUpperCase(), 
      comment 
    })
      .then(() => {
        Toast.success('✅ Team Leader decision submitted successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error submitting decision:', error);
        Toast.error('Failed to submit decision. Please try again.');
        throw error;
      });
  },

   // ✅ TEAM LEADER QUEUE - PATCH /:id/team-leader/queue
  teamLeaderQueue: function(id) {
    return store.apiService.patch(`/house-allocation-requests/${id}/team-leader/queue`)
      .then(() => {
        Toast.success('📋 Request queued for processing.');
        return true;
      })
      .catch(error => {
        console.error('Error queueing request:', error);
        Toast.error('Failed to queue request. Please try again.');
        throw error;
      });
  },

   // ✅ TEAM LEADER MAP - PATCH /:id/team-leader/map
  teamLeaderMap: function(id, remarks) {
    return store.apiService.patch(`/house-allocation-requests/${id}/team-leader/map`, { remarks })
      .then(() => {
        Toast.success('🗺️ Houses mapped successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error mapping houses:', error);
        Toast.error('Failed to map houses. Please try again.');
        throw error;
      });
  },
   // ✅ TEAM LEADER REJECT - PATCH /:id/team-leader/reject
  teamLeaderReject: function(id, rejectionReason) {
    return store.apiService.patch(`/house-allocation-requests/${id}/team-leader/reject`, { rejectionReason })
      .then(() => {
        Toast.success('❌ Request rejected successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error rejecting request:', error);
        Toast.error('Failed to reject request. Please try again.');
        throw error;
      });
  },
    // ✅ CANCEL REQUEST - PATCH /:id/cancel
  cancelRequest: function(id, reason) {
    return store.apiService.patch(`/house-allocation-requests/${id}/cancel`, { reason })
      .then(() => {
        Toast.success('🚫 Request cancelled successfully.');
        return true;
      })
      .catch(error => {
        console.error('Error cancelling request:', error);
        Toast.error('Failed to cancel request. Please try again.');
        throw error;
      });
  },
     // ✅ UPDATE BENEFICIARY STATUS - PATCH /beneficiaries/:beneficiaryId/status
  updateBeneficiaryStatus: function(beneficiaryId, status, reason) {
    return store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, { 
      status, 
      reason 
    })
      .then(() => {
        Toast.success(`✅ Beneficiary ${status.toLowerCase()} successfully.`);
        return true;
      })
      .catch(error => {
        console.error('Error updating beneficiary status:', error);
        Toast.error('Failed to update beneficiary status. Please try again.');
        throw error;
      });
  },
  
};

// ─── EXPOSE WORKFLOW FUNCTIONS ──────────────────────────────────────────


function deputyCeoStartReview(id) { 
  workflowActions.deputyCeoStartReview(id); 
}

function deputyCeoDecision(id, decision, comment) {
  workflowActions.deputyCeoDecision(id, decision, comment);
}

function directorDecision(id, decision, comment) {
  workflowActions.directorDecision(id, decision, comment);
}

function teamLeaderQueue(id) { 
  workflowActions.teamLeaderQueue(id); 
}

function teamLeaderMap(id) { 
  workflowActions.teamLeaderMap(id); 
}

function teamLeaderReject(id) { 
  workflowActions.teamLeaderReject(id); 
}

function cancelRequest(id) { 
  workflowActions.cancelRequest(id); 
}

// ─── OPEN DECISION MODAL ──────────────────────────────────────────────────

function openDecisionModal(id, role) {
  const item = store.allocationRequests.find(r => r.id === id);
  if (!item) {
    Toast.error('Request not found');
    return;
  }

  const roleLabel = role === 'deputy' ? 'Deputy CEO' : 'Director';
  const endpoint = role === 'deputy' 
    ? `/house-allocation-requests/${id}/deputy-ceo/decision`
    : `/house-allocation-requests/${id}/director/decision`;

const decisionMap = {
  'allowed': 'allowed', // ✅ Keep lowercase
  'legal_revision_required': 'legal_revision_required', // ✅ Keep lowercase
  'unauthorized_by_directive': 'unauthorized_by_directive' // ✅ Keep lowercase
};

  let selectedDecision = 'approved';

  Modal.open({
    title: `${roleLabel} Review Decision`,
    content: `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Decision <span class="text-rose-500">*</span></label>
          <select id="decision-select" name="decision" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
            <option value="approved">✅ Approved</option>
            <option value="verification_required">🔍 Verification Required</option>
            <option value="legal_revision_required">⚖️ Legal Revision Required</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Comment</label>
          <textarea id="decision-comment" name="comment" rows="3" placeholder="Add your review comment..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
          <p id="comment-required-warning" class="text-xs text-rose-500 mt-1 hidden">⚠️ Comment is required for non-approval decisions</p>
        </div>
        <p class="text-xs text-slate-400">Request: ${item.letterReferenceNumber || item.referenceNumber || 'N/A'}</p>
      </div>
    `,
    isForm: true,
    confirmText: 'Submit Decision',
    onConfirm: function(modalEl) {
      const decision = document.getElementById('decision-select')?.value || 'approved';
      const comment = document.getElementById('decision-comment')?.value || '';

      if (decision !== 'approved' && (!comment || comment.trim() === '')) {
        Toast.error('Comment is required for non-approval decisions.');
        return;
      }

      // ✅ Use the correct endpoint
      store.apiService.patch(endpoint, { 
        decision: decisionMap[decision] || decision, 
        comment 
      })
        .then(() => {
          Toast.success(`${roleLabel} decision submitted successfully.`);
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch(error => {
          console.error('Error submitting decision:', error);
          Toast.error('Failed to submit decision. Please try again.');
        });
    }
  });
}
// ─── OPEN ADD BENEFICIARY MODAL ──────────────────────────────────────────

function openAddBeneficiaryModal(requestId) {
  const request = store.allocationRequests.find(r => r.id === requestId);
  if (!request) {
    Toast.error('Request not found');
    return;
  }

   let formState = {
    beneficiaryIndividualId: '',
    beneficiaryInstitutionId: '',
    userSearch: '',
    filteredUsers: [],
    totalUsers: 0
  };

  let modalInstance = null;

   function buildInstitutionOptions(selectedId) {
    let html = '<option value="">-- Select Institution --</option>';
    if (store.institutions && Array.isArray(store.institutions)) {
      store.institutions.forEach(inst => {
        const selected = inst.id === selectedId ? 'selected' : '';
        html += `<option value="${inst.id}" ${selected}>${inst.name?.en || inst.shortName || '-'}</option>`;
      });
    }
    return html;
  }

  function getFilteredUsers() {
    let users = store.userExtensions || [];
    const search = formState.userSearch.toLowerCase().trim();
    
    let filtered = users.filter(user => {
      if (!user || !search) return true;
      const fullName = getUserFullName(user).toLowerCase();
      const email = (user.user?.email || '').toLowerCase();
      const phone = (user.user?.phoneNumber || '').toLowerCase();
      const nationalId = (user.nationalIdNumber || '').toLowerCase();
      return [fullName, email, phone, nationalId].some(f => f.includes(search));
    });

    filtered.sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
    formState.totalUsers = filtered.length;
    formState.filteredUsers = filtered;
    return filtered;
  }

  function buildUserOptions(users) {
    if (!users || users.length === 0) {
      return '<option value="">-- No users found --</option>';
    }
    return users.map(user => {
      const name = getUserFullName(user);
      const userId = user.id || user.userId || '';
      const details = [user.user?.email, user.nationalIdNumber].filter(Boolean).join(' | ');
      return `<option value="${userId}">${name}${details ? ' (' + details + ')' : ''}</option>`;
    }).join('');
  }

  function renderModalContent() {
    const filteredUsers = getFilteredUsers();
    const totalPages = Math.ceil(formState.totalUsers / formState.userPageSize);
    const benInstOptions = buildInstitutionOptions();
    const currentBeneficiaries = request.beneficiaries || [];

    function getBeneficiaryDisplayName(ben) {
      if (ben.beneficiaryIndividual) {
        const individual = ben.beneficiaryIndividual;
        if (individual.fullName && individual.fullName !== 'N/A') return individual.fullName;
        const firstName = individual.firstName?.en || individual.firstName?.am || '';
        const lastName = individual.lastName?.en || individual.lastName?.am || '';
        if (firstName || lastName) return `${firstName} ${lastName}`.trim();
        if (individual.user?.name?.en || individual.user?.name?.am) return individual.user.name.en || individual.user.name.am;
        if (individual.userId) return `User: ${individual.userId.substring(0, 8)}...`;
      }
      if (ben.individual) {
        const individual = ben.individual;
        if (individual.fullName && individual.fullName !== 'N/A') return individual.fullName;
        const firstName = individual.firstName?.en || individual.firstName?.am || '';
        const lastName = individual.lastName?.en || individual.lastName?.am || '';
        if (firstName || lastName) return `${firstName} ${lastName}`.trim();
        if (individual.userId) return `User: ${individual.userId.substring(0, 8)}...`;
      }
      if (ben.beneficiaryIndividualId) return `Beneficiary ID: ${ben.beneficiaryIndividualId.substring(0, 8)}...`;
      return 'Unknown Beneficiary';
    }

    function getBeneficiaryInstitutionName(ben) {
      if (ben.beneficiaryInstitution) {
        const inst = ben.beneficiaryInstitution;
        if (inst.name?.en) return inst.name.en;
        if (inst.name?.am) return inst.name.am;
        if (inst.shortName) return inst.shortName;
        if (inst.code) return inst.code;
        return 'Institution';
      }
      if (ben.institution) {
        const inst = ben.institution;
        if (inst.name?.en) return inst.name.en;
        if (inst.name?.am) return inst.name.am;
        if (inst.shortName) return inst.shortName;
        if (inst.code) return inst.code;
        return 'Institution';
      }
      if (ben.beneficiaryInstitutionId) return `Institution ID: ${ben.beneficiaryInstitutionId.substring(0, 8)}...`;
      return 'Unknown Institution';
    }

    return `
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-700 flex items-center gap-2">
            <i class="fa-regular fa-circle-info"></i>
            <span>Add a new beneficiary to this allocation request. The beneficiary will be added with "WAITING" status.</span>
          </p>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div class="relative">
            <i class="fa-solid fa-search absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="add-beneficiary-search" placeholder="Search by name, national ID, email, or phone..." 
              value="${formState.userSearch}"
              class="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Beneficiary Individual <span class="text-rose-500">*</span></label>
              <div class="flex items-center gap-2">
                <select id="add-beneficiary-user" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]">
                  <option value="">-- Select User --</option>
                  ${buildUserOptions(filteredUsers)}
                </select>
                <button type="button" id="btn-create-beneficiary-from-detail" 
                  class="px-3 py-2 text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 border border-[#714B67]/20 rounded-lg hover:bg-[#714B67]/20 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus mr-1"></i> Create
                </button>
              </div>
              ${totalPages > 1 ? `
                <div class="flex items-center justify-between mt-2 gap-2">
                  <div class="text-[10px] text-slate-400">
                    Showing ${(formState.userPage - 1) * formState.userPageSize + 1} - ${Math.min(formState.userPage * formState.userPageSize, formState.totalUsers)} of ${formState.totalUsers}
                  </div>
                  <div class="flex gap-1">
                    <button id="add-user-page-prev" class="px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors ${formState.userPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="text-[10px] text-slate-500 px-2 py-0.5">${formState.userPage}/${totalPages}</span>
                    <button id="add-user-page-next" class="px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors ${formState.userPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Beneficiary Institution <span class="text-rose-500">*</span></label>
              <div class="flex items-center gap-2">
                <select id="add-beneficiary-institution" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]">
                  <option value="">-- Select Institution --</option>
                  ${benInstOptions}
                </select>
                <button type="button" id="btn-create-inst-from-detail" 
                  class="px-3 py-2 text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 border border-[#714B67]/20 rounded-lg hover:bg-[#714B67]/20 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus mr-1"></i> Create
                </button>
              </div>
            </div>
          </div>
        </div>

        ${currentBeneficiaries.length > 0 ? `
          <div class="border border-slate-200 rounded-lg divide-y divide-slate-100">
            <div class="px-4 py-2 bg-slate-50 rounded-t-lg">
              <span class="text-xs font-semibold text-slate-600">Current Beneficiaries (${currentBeneficiaries.length})</span>
            </div>
            <div class="p-3 max-h-[150px] overflow-y-auto">
              ${currentBeneficiaries.map((b, idx) => {
                const name = getBeneficiaryDisplayName(b);
                const instName = getBeneficiaryInstitutionName(b);
                const status = b.status || 'WAITING';
                const statusColor = getBeneficiaryStatusColor(status);
                
                return `
                  <div class="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-50 last:border-0">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <span class="text-slate-400 flex-shrink-0">${idx + 1}.</span>
                      <span class="font-medium text-slate-700 truncate">👤 ${name}</span>
                      <span class="text-slate-400 flex-shrink-0">→</span>
                      <span class="font-medium text-slate-700 truncate">🏛️ ${instName}</span>
                    </div>
                    <span class="px-1.5 py-0.5 ${statusColor} text-[8px] font-bold rounded flex-shrink-0">${status}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="border border-slate-200 rounded-lg p-4 text-center">
            <p class="text-xs text-slate-400">No beneficiaries added yet. Use the form above to add one.</p>
          </div>
        `}
      </div>
    `;
  }

  modalInstance = Modal.open({
    title: 'Add Beneficiary to Request',
    content: renderModalContent(),
    isForm: true,
    confirmText: 'Add Beneficiary',
    onConfirm: function(modalEl) {
      const userId = document.getElementById('add-beneficiary-user')?.value || '';
      const institutionId = document.getElementById('add-beneficiary-institution')?.value || '';
      
      if (!userId || !institutionId) {
        Toast.error('Please select both a user and an institution.');
        return;
      }

      const currentBeneficiaries = request.beneficiaries || [];
      const exists = currentBeneficiaries.some(b => 
        (b.beneficiaryIndividual?.id || b.individual?.id || '') === userId &&
        (b.beneficiaryInstitution?.id || b.institution?.id || '') === institutionId
      );

      if (exists) {
        Toast.warning('This beneficiary is already added to this request.');
        return;
      }

      const payload = {
        beneficiaryIndividualId: userId,
        beneficiaryInstitutionId: institutionId
      };

      store.apiService.post(`/house-allocation-requests/${requestId}/beneficiaries`, payload)
        .then(() => {
          Toast.success('Beneficiary added successfully.');
          if (modalInstance && typeof modalInstance.close === 'function') {
            modalInstance.close();
          }
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(requestId);
          });
        })
        .catch(error => {
          console.error('Error adding beneficiary:', error);
          const message = error.response?.data?.message || 'Failed to add beneficiary.';
          Toast.error(Array.isArray(message) ? message.join(', ') : message);
        });
    }
  });

  function attachModalListeners() {
    const searchInput = document.getElementById('add-beneficiary-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        formState.userSearch = this.value;
        formState.userPage = 1;
        const content = renderModalContent();
        const bodyEl = document.querySelector('.modal-body');
        if (bodyEl) {
          bodyEl.innerHTML = content;
          attachModalListeners();
        }
      });
    }

    const pagePrev = document.getElementById('add-user-page-prev');
    if (pagePrev) {
      pagePrev.addEventListener('click', function() {
        if (formState.userPage > 1) {
          formState.userPage--;
          const content = renderModalContent();
          const bodyEl = document.querySelector('.modal-body');
          if (bodyEl) {
            bodyEl.innerHTML = content;
            attachModalListeners();
          }
        }
      });
    }

    const pageNext = document.getElementById('add-user-page-next');
    if (pageNext) {
      pageNext.addEventListener('click', function() {
        const totalPages = Math.ceil(formState.totalUsers / formState.userPageSize);
        if (formState.userPage < totalPages) {
          formState.userPage++;
          const content = renderModalContent();
          const bodyEl = document.querySelector('.modal-body');
          if (bodyEl) {
            bodyEl.innerHTML = content;
            attachModalListeners();
          }
        }
      });
    }

    const createUserBtn = document.getElementById('btn-create-beneficiary-from-detail');
    if (createUserBtn) {
      createUserBtn.addEventListener('click', function() {
        if (typeof openExtensionForm === 'function') {
          const currentModal = modalInstance;
          
          openExtensionForm(null, function(newUserId) {
            if (newUserId) {
              store.syncWithBackend(true).then(function() {
                if (currentModal && typeof currentModal.close === 'function') {
                  currentModal.close();
                }
                openAddBeneficiaryModal(requestId);
                Toast.success('User created! You can now select them as a beneficiary.');
              });
            }
          });
        } else {
          window.location.hash = 'user-extensions';
          Toast.info('Please create a user in the User Extensions page, then return.');
        }
      });
    }

    const createInstBtn = document.getElementById('btn-create-inst-from-detail');
    if (createInstBtn) {
      createInstBtn.addEventListener('click', function() {
        if (typeof openInstitutionForm === 'function') {
          const currentModal = modalInstance;
          
          openInstitutionForm(null, function(newInstitutionId) {
            if (newInstitutionId) {
              store.syncWithBackend(true).then(function() {
                if (currentModal && typeof currentModal.close === 'function') {
                  currentModal.close();
                }
                openAddBeneficiaryModal(requestId);
                Toast.success('Institution created! You can now select it as a beneficiary institution.');
              });
            }
          });
        } else {
          window.location.hash = 'institutions';
          Toast.info('Please create an institution in the Institutions page, then return.');
        }
      });
    }
  }

  setTimeout(attachModalListeners, 100);
}

// ─── OPEN REQUEST FORM ──────────────────────────────────────────────────


function openRequestForm(id) {
  const isEdit = !!id;
  const item = isEdit ? store.allocationRequests.find(r => r.id === id) : null;
  
  function generateReferenceNumber() {
    const year = new Date().getFullYear();
    const randomDigits = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return `HAR-${year}-${randomDigits}`;
  }
  
  const formState = {
    step: 1,
    totalSteps: 3,
    data: {
      letterReferenceNumber: !isEdit 
        ? generateReferenceNumber() 
        : item?.letterReferenceNumber || '',
      letterDate: item?.letterDate || new Date().toISOString().split('T')[0],
      requestingInstitutionId: item?.requestingInstitution?.id || '',
      registeredAt: item?.registeredAt ? item.registeredAt.replace('Z', '') : ''
    },
    selectedBeneficiaries: item?.beneficiaries?.map(b => ({
      beneficiaryIndividualId: b.beneficiaryIndividual?.id || b.individual?.id || '',
      beneficiaryInstitutionId: b.beneficiaryInstitution?.id || b.institution?.id || ''
    })) || [],
    userSearch: '',
    filteredUsers: [],
    totalUsers: 0
  };

  let modalInstance = null;

  function buildInstitutionOptions(selectedId) {
    let html = '<option value="">-- Select Institution --</option>';
    if (store.institutions && Array.isArray(store.institutions)) {
      store.institutions.forEach(inst => {
        const selected = inst.id === selectedId ? 'selected' : '';
        html += `<option value="${inst.id}" ${selected}>${inst.name?.en || inst.shortName || '-'}</option>`;
      });
    }
    return html;
  }

  // ✅ FIXED: Returns ALL users filtered by search (no pagination)
  function getFilteredUsers() {
    let users = store.userExtensions || [];
    const search = formState.userSearch.toLowerCase().trim();
    
    let filtered = users.filter(user => {
      if (!user || !search) return true;
      const fullName = getUserFullName(user).toLowerCase();
      const email = (user.user?.email || '').toLowerCase();
      const phone = (user.user?.phoneNumber || '').toLowerCase();
      const nationalId = (user.nationalIdNumber || '').toLowerCase();
      return [fullName, email, phone, nationalId].some(f => f.includes(search));
    });

    filtered.sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
    formState.totalUsers = filtered.length;
    formState.filteredUsers = filtered;
    return filtered;
  }

  // ✅ Build user options from ALL users
  function buildUserOptions(users) {
    if (!users || users.length === 0) {
      return '<option value="">-- No users found --</option>';
    }
    return users.map(user => {
      const name = getUserFullName(user);
      const userId = user.id || user.userId || '';
      const details = [user.user?.email, user.nationalIdNumber].filter(Boolean).join(' | ');
      return `<option value="${userId}">${name}${details ? ' (' + details + ')' : ''}</option>`;
    }).join('');
  }

  function renderStepperProgress() {
    const steps = ['Request Info', 'Add Beneficiaries', 'Review & Submit'];
    return steps.map((label, i) => {
      const num = i + 1;
      const isActive = num === formState.step;
      const isCompleted = num < formState.step;
      const circleClass = `w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        isActive ? 'bg-[#714B67] text-white ring-2 ring-[#714B67]/30' :
        isCompleted ? 'bg-emerald-500 text-white' :
        'bg-slate-200 text-slate-400'
      }`;
      
      return `
        <div class="flex items-center gap-2">
          <div class="${circleClass}">${isCompleted ? '<i class="fa-solid fa-check text-[10px]"></i>' : num}</div>
          <span class="text-xs font-medium ${isActive ? 'text-[#714B67]' : 'text-slate-500'}">${label}</span>
          ${i < steps.length - 1 ? '<div class="w-6 h-0.5 bg-slate-200 mx-1"></div>' : ''}
        </div>
      `;
    }).join('');
  }

  function renderSelectedBeneficiaries() {
    if (formState.selectedBeneficiaries.length === 0) {
      return '<p class="text-sm text-slate-400 py-4">No beneficiaries added yet.</p>';
    }

    return `<div class="space-y-2">${formState.selectedBeneficiaries.map((ben, i) => {
      const user = store.userExtensions.find(u => (u.id || u.userId) === ben.beneficiaryIndividualId);
      const inst = store.institutions.find(inst => inst.id === ben.beneficiaryInstitutionId);
      const userName = user ? getUserFullName(user) : 'Unknown User';
      const userDetail = user?.user?.email || user?.nationalIdNumber || '';
      const instName = inst ? getInstitutionName(inst) : 'Unknown Institution';
      
      return `
        <div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-slate-700">👤 ${userName}</span>
            ${userDetail ? `<span class="text-[10px] text-slate-400">${userDetail}</span>` : ''}
            <span class="text-xs text-slate-400">→</span>
            <span class="text-xs font-medium text-slate-700">🏛️ ${instName}</span>
          </div>
          <button class="remove-beneficiary text-rose-500 hover:text-rose-700 transition-colors" data-index="${i}">
            <i class="fa-regular fa-trash-can text-sm"></i>
          </button>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderStep1() {
    const d = formState.data;
    const instOptions = buildInstitutionOptions(d.requestingInstitutionId);
    
    return `
      <div class="space-y-4">
        <h3 class="text-base font-bold text-slate-800">📋 Request Information</h3>
        <p class="text-xs text-slate-500">Enter the basic information for this allocation request.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Letter Reference Number</label>
            <input type="text" id="step-ref-number" value="${d.letterReferenceNumber}" readonly 
              class="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-[#714B67] font-mono" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Letter Date <span class="text-rose-500">*</span></label>
            <input type="date" id="step-letter-date" value="${d.letterDate}" required
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Requesting Institution <span class="text-rose-500">*</span></label>
            <div class="flex items-center gap-2">
              <select id="step-institution" required
                class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]">
                <option value="">-- Select Institution --</option>
                ${instOptions}
              </select>
              <button type="button" id="btn-create-requesting-institution" 
                class="px-3 py-2 text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 border border-[#714B67]/20 rounded-lg hover:bg-[#714B67]/20 transition-colors whitespace-nowrap">
                <i class="fa-solid fa-plus mr-1"></i> Create
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Registered At</label>
            <input type="datetime-local" id="step-registered-at" value="${d.registeredAt}"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" />
          </div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p class="text-xs text-amber-700"><i class="fa-regular fa-circle-info mr-1.5"></i>Required fields are marked with <span class="text-rose-500">*</span></p>
        </div>
      </div>
    `;
  }

  // ✅ FIXED: Step 2 - Shows ALL users with search (no pagination)
  function renderStep2() {
    const filteredUsers = getFilteredUsers();
    const benInstOptions = buildInstitutionOptions();
    
    return `
      <div class="space-y-4">
        <h3 class="text-base font-bold text-slate-800">👥 Add Beneficiaries</h3>
        <p class="text-xs text-slate-500">Search and add beneficiaries to this allocation request.</p>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div class="relative">
            <i class="fa-solid fa-search absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="beneficiary-search" placeholder="Search by name, national ID, email, or phone..." 
              value="${formState.userSearch}"
              class="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Beneficiary Individual <span class="text-rose-500">*</span></label>
              <div class="flex items-center gap-2">
                <select id="beneficiary-user" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]">
                  <option value="">-- Select User --</option>
                  ${buildUserOptions(filteredUsers)}
                </select>
                <button type="button" id="btn-create-beneficiary-individual" 
                  class="px-3 py-2 text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 border border-[#714B67]/20 rounded-lg hover:bg-[#714B67]/20 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus mr-1"></i> Create
                </button>
              </div>
              ${formState.totalUsers > 0 ? `
                <div class="text-[10px] text-slate-400 mt-1">
                  Showing ${formState.totalUsers} user${formState.totalUsers > 1 ? 's' : ''} 
                  ${formState.userSearch ? `matching "${formState.userSearch}"` : ''}
                </div>
              ` : ''}
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Beneficiary Institution <span class="text-rose-500">*</span></label>
              <div class="flex items-center gap-2">
                <select id="beneficiary-institution" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]">
                  <option value="">-- Select Institution --</option>
                  ${benInstOptions}
                </select>
                <button type="button" id="btn-create-beneficiary-institution" 
                  class="px-3 py-2 text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 border border-[#714B67]/20 rounded-lg hover:bg-[#714B67]/20 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus mr-1"></i> Create
                </button>
              </div>
            </div>
          </div>
          <button id="add-beneficiary-btn" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
            <i class="fa-solid fa-plus mr-1.5"></i> Add Beneficiary
          </button>
        </div>

        <div class="border border-slate-200 rounded-lg divide-y divide-slate-100">
          <div class="px-4 py-2 bg-slate-50 rounded-t-lg">
            <span class="text-xs font-semibold text-slate-600">Selected Beneficiaries (${formState.selectedBeneficiaries.length})</span>
          </div>
          <div class="p-3 max-h-[200px] overflow-y-auto" id="beneficiaries-list">
            ${renderSelectedBeneficiaries()}
          </div>
        </div>
      </div>
    `;
  }

  function renderStep3() {
    const d = formState.data;
    const inst = store.institutions.find(i => i.id === d.requestingInstitutionId);
    const instName = inst ? getInstitutionName(inst) : 'Not selected';
    
    const beneficiariesHtml = formState.selectedBeneficiaries.length > 0 
      ? formState.selectedBeneficiaries.map((ben, index) => {
          const user = store.userExtensions.find(u => (u.id || u.userId) === ben.beneficiaryIndividualId);
          const inst = store.institutions.find(i => i.id === ben.beneficiaryInstitutionId);
          const userName = user ? getUserFullName(user) : 'Unknown';
          const userDetail = user?.user?.email || user?.nationalIdNumber || '';
          const instName = inst ? getInstitutionName(inst) : 'Unknown';
          return `
            <div class="flex items-center gap-2 text-sm">
              <span class="text-slate-400">${index + 1}.</span>
              <span class="font-medium text-slate-700">👤 ${userName}</span>
              ${userDetail ? `<span class="text-[10px] text-slate-400">${userDetail}</span>` : ''}
              <span class="text-slate-400">→</span>
              <span class="font-medium text-slate-700">🏛️ ${instName}</span>
            </div>
          `;
        }).join('')
      : '<p class="text-sm text-rose-600 font-medium">⚠️ No beneficiaries added. Please add at least one beneficiary.</p>';

    const isValid = formState.selectedBeneficiaries.length > 0 && d.requestingInstitutionId && d.letterDate;

    return `
      <div class="space-y-4">
        <h3 class="text-base font-bold text-slate-800">📝 Review & Submit</h3>
        <p class="text-xs text-slate-500">Please review all information before submitting.</p>

        <div class="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          <div class="p-4 space-y-2">
            <h4 class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Request Information</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-slate-500">Reference:</span> <span class="font-mono font-semibold text-[#714B67]">${d.letterReferenceNumber}</span></div>
              <div><span class="text-slate-500">Letter Date:</span> <span class="font-medium text-slate-700">${d.letterDate}</span></div>
              <div class="col-span-2"><span class="text-slate-500">Requesting Institution:</span> <span class="font-medium text-slate-700">${instName}</span></div>
              ${d.registeredAt ? `<div class="col-span-2"><span class="text-slate-500">Registered At:</span> <span class="font-medium text-slate-700">${new Date(d.registeredAt).toLocaleString()}</span></div>` : ''}
            </div>
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Beneficiaries (${formState.selectedBeneficiaries.length})</h4>
              <button onclick="openRequestForm()" class="text-xs text-[#714B67] hover:text-[#5f3e56] font-medium">
                <i class="fa-regular fa-pen mr-1"></i> Edit
              </button>
            </div>
            <div class="space-y-1">${beneficiariesHtml}</div>
          </div>
        </div>

        ${!isValid ? `
          <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <p class="text-xs text-rose-700">
              <i class="fa-regular fa-circle-exclamation mr-1.5"></i>
              ${!d.requestingInstitutionId ? 'Please select a requesting institution. ' : ''}
              ${formState.selectedBeneficiaries.length === 0 ? 'Please add at least one beneficiary.' : ''}
            </p>
          </div>
        ` : `
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p class="text-xs text-emerald-700"><i class="fa-regular fa-circle-check mr-1.5"></i>All required fields are filled. Ready to submit!</p>
          </div>
        `}
      </div>
    `;
  }

  function renderStep() {
    const steps = [renderStep1, renderStep2, renderStep3];
    const stepHtml = steps[formState.step - 1]();

    const modalContent = `
      <div class="space-y-6">
        <div class="flex items-center gap-2">${renderStepperProgress()}</div>
        <div class="min-h-[300px]">${stepHtml}</div>
        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <button id="step-prev" class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors ${formState.step === 1 ? 'invisible' : ''}">
            <i class="fa-solid fa-arrow-left mr-1.5"></i> Back
          </button>
          <div class="flex items-center gap-2">
            ${formState.step === formState.totalSteps ? 
              `<button id="step-submit" class="px-5 py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                <i class="fa-regular fa-check mr-1.5"></i> Save & Submit
              </button>` :
              `<button id="step-next" class="px-5 py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                Next <i class="fa-solid fa-arrow-right ml-1.5"></i>
              </button>`
            }
          </div>
        </div>
      </div>
    `;

    if (modalInstance) {
      const contentEl = document.querySelector('.modal-body');
      if (contentEl) {
        contentEl.innerHTML = modalContent;
        attachStepListeners();
      }
      return;
    }

    modalInstance = Modal.open({
      title: isEdit ? 'Edit Allocation Request' : 'File Allocation Request',
      content: modalContent,
      isForm: false,
      confirmText: null,
      onConfirm: null,
      onClose: () => { modalInstance = null; }
    });

    attachStepListeners();
  }

  function attachStepListeners() {
    document.getElementById('step-prev')?.addEventListener('click', () => {
      if (formState.step > 1) {
        saveStepData();
        formState.step--;
        renderStep();
      }
    });

    document.getElementById('step-next')?.addEventListener('click', () => {
      if (!validateStep(formState.step)) return;
      saveStepData();
      if (formState.step < formState.totalSteps) {
        formState.step++;
        renderStep();
      }
    });

    document.getElementById('step-submit')?.addEventListener('click', () => {
      if (!validateStep(formState.step)) return;
      saveStepData();
      submitRequest();
    });

    // ✅ FIXED: Search listener - updates the dropdown in real-time
    const searchInput = document.getElementById('beneficiary-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        formState.userSearch = this.value;
        // Re-render only step 2
        const stepHtml = renderStep2();
        const contentEl = document.querySelector('.tab-content.block');
        if (contentEl) {
          contentEl.innerHTML = stepHtml;
          attachStep2Listeners();
        }
      });
    }

    document.getElementById('btn-create-requesting-institution')?.addEventListener('click', function() {
      saveStepData();
      if (typeof openInstitutionForm === 'function') {
        const currentModal = modalInstance;
        
        openInstitutionForm(null, function(newInstitutionId) {
          if (newInstitutionId) {
            store.syncWithBackend(true).then(function() {
              formState.data.requestingInstitutionId = newInstitutionId;
              if (currentModal && typeof currentModal.close === 'function') {
                currentModal.close();
              }
              renderStep();
              Toast.success('Institution created and selected!');
            });
          }
        });
      } else {
        window.location.hash = 'institutions';
        Toast.info('Please create an institution in the Institutions page, then return.');
      }
    });

    document.getElementById('btn-create-beneficiary-individual')?.addEventListener('click', function() {
      saveStepData();
      if (typeof openExtensionForm === 'function') {
        const currentModal = modalInstance;
        
        openExtensionForm(null, function(newUserId) {
          if (newUserId) {
            store.syncWithBackend(true).then(function() {
              if (currentModal && typeof currentModal.close === 'function') {
                currentModal.close();
              }
              renderStep();
              Toast.success('User created! You can now select them as a beneficiary.');
            });
          }
        });
      } else {
        window.location.hash = 'user-extensions';
        Toast.info('Please create a user in the User Extensions page, then return.');
      }
    });

    document.getElementById('btn-create-beneficiary-institution')?.addEventListener('click', function() {
      saveStepData();
      if (typeof openInstitutionForm === 'function') {
        const currentModal = modalInstance;
        
        openInstitutionForm(null, function(newInstitutionId) {
          if (newInstitutionId) {
            store.syncWithBackend(true).then(function() {
              if (currentModal && typeof currentModal.close === 'function') {
                currentModal.close();
              }
              renderStep();
              Toast.success('Institution created! You can now select it as a beneficiary institution.');
            });
          }
        });
      } else {
        window.location.hash = 'institutions';
        Toast.info('Please create an institution in the Institutions page, then return.');
      }
    });

    document.getElementById('add-beneficiary-btn')?.addEventListener('click', () => {
      const userId = document.getElementById('beneficiary-user')?.value || '';
      const institutionId = document.getElementById('beneficiary-institution')?.value || '';
      
      if (!userId || !institutionId) {
        Toast.error('Please select both a user and an institution.');
        return;
      }

      const exists = formState.selectedBeneficiaries.some(b => 
        b.beneficiaryIndividualId === userId && b.beneficiaryInstitutionId === institutionId
      );

      if (exists) {
        Toast.warning('This beneficiary is already added.');
        return;
      }

      formState.selectedBeneficiaries.push({
        beneficiaryIndividualId: userId,
        beneficiaryInstitutionId: institutionId
      });

      document.getElementById('beneficiary-user').value = '';
      document.getElementById('beneficiary-institution').value = '';
      Toast.success('Beneficiary added successfully.');
      renderStep();
    });

    document.querySelectorAll('.remove-beneficiary').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        if (!isNaN(index)) {
          formState.selectedBeneficiaries.splice(index, 1);
          Toast.info('Beneficiary removed.');
          renderStep();
        }
      });
    });
  }

  // ✅ FIXED: Step 2 listeners (no pagination)
  function attachStep2Listeners() {
    const searchInput = document.getElementById('beneficiary-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        formState.userSearch = this.value;
        const stepHtml = renderStep2();
        const contentEl = document.querySelector('.tab-content.block');
        if (contentEl) {
          contentEl.innerHTML = stepHtml;
          attachStep2Listeners();
        }
      });
    }

    document.getElementById('add-beneficiary-btn')?.addEventListener('click', () => {
      const userId = document.getElementById('beneficiary-user')?.value || '';
      const institutionId = document.getElementById('beneficiary-institution')?.value || '';
      
      if (!userId || !institutionId) {
        Toast.error('Please select both a user and an institution.');
        return;
      }

      const exists = formState.selectedBeneficiaries.some(b => 
        b.beneficiaryIndividualId === userId && b.beneficiaryInstitutionId === institutionId
      );

      if (exists) {
        Toast.warning('This beneficiary is already added.');
        return;
      }

      formState.selectedBeneficiaries.push({
        beneficiaryIndividualId: userId,
        beneficiaryInstitutionId: institutionId
      });

      document.getElementById('beneficiary-user').value = '';
      document.getElementById('beneficiary-institution').value = '';
      Toast.success('Beneficiary added successfully.');
      renderStep();
    });

    document.querySelectorAll('.remove-beneficiary').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        if (!isNaN(index)) {
          formState.selectedBeneficiaries.splice(index, 1);
          Toast.info('Beneficiary removed.');
          renderStep();
        }
      });
    });

    // ✅ FIXED: Add Create User button listener
    document.getElementById('btn-create-beneficiary-individual')?.addEventListener('click', function() {
      saveStepData();
      if (typeof openExtensionForm === 'function') {
        const currentModal = modalInstance;
        
        openExtensionForm(null, function(newUserId) {
          if (newUserId) {
            store.syncWithBackend(true).then(function() {
              if (currentModal && typeof currentModal.close === 'function') {
                currentModal.close();
              }
              renderStep();
              Toast.success('User created! You can now select them as a beneficiary.');
            });
          }
        });
      } else {
        window.location.hash = 'user-extensions';
        Toast.info('Please create a user in the User Extensions page, then return.');
      }
    });

    document.getElementById('btn-create-beneficiary-institution')?.addEventListener('click', function() {
      saveStepData();
      if (typeof openInstitutionForm === 'function') {
        const currentModal = modalInstance;
        
        openInstitutionForm(null, function(newInstitutionId) {
          if (newInstitutionId) {
            store.syncWithBackend(true).then(function() {
              if (currentModal && typeof currentModal.close === 'function') {
                currentModal.close();
              }
              renderStep();
              Toast.success('Institution created! You can now select it as a beneficiary institution.');
            });
          }
        });
      } else {
        window.location.hash = 'institutions';
        Toast.info('Please create an institution in the Institutions page, then return.');
      }
    });
  }

  function validateStep(step) {
    if (step === 1) {
      const institution = document.getElementById('step-institution')?.value || formState.data.requestingInstitutionId;
      const letterDate = document.getElementById('step-letter-date')?.value || formState.data.letterDate;
      if (!institution) { Toast.error('Please select a requesting institution.'); return false; }
      if (!letterDate) { Toast.error('Please select a letter date.'); return false; }
      return true;
    }
    if (step === 3) {
      if (formState.selectedBeneficiaries.length === 0) { Toast.error('Please add at least one beneficiary.'); return false; }
      if (!formState.data.requestingInstitutionId) { Toast.error('Requesting institution is required.'); return false; }
      return true;
    }
    return true;
  }

  function saveStepData() {
    const d = formState.data;
    const institutionEl = document.getElementById('step-institution');
    const letterDateEl = document.getElementById('step-letter-date');
    const registeredAtEl = document.getElementById('step-registered-at');
    
    if (institutionEl) d.requestingInstitutionId = institutionEl.value;
    if (letterDateEl) d.letterDate = letterDateEl.value;
    if (registeredAtEl) d.registeredAt = registeredAtEl.value;
  }

  function submitRequest() {
    const d = formState.data;
    if (modalInstance) modalInstance.close(); 

    const payload = {
      letterReferenceNumber: d.letterReferenceNumber,
      letterDate: d.letterDate,
      requestingInstitutionId: d.requestingInstitutionId,
      registeredAt: d.registeredAt ? new Date(d.registeredAt).toISOString() : null,
      beneficiaries: formState.selectedBeneficiaries,
      isDraft: true,
      directiveCompliance: {
        isCompliant: true,
        note: 'Directive compliance verified - all beneficiaries are eligible',
        notedBy: store.currentUser?.id || '00000000-0000-0000-0000-000000000001'
      }
    };

    workflowActions.createDraft(payload)
      .then((response) => {
        const draftId = response.id || response.data?.id;
        
        if (draftId) {
          Toast.success('Draft saved successfully.');
          if (modalInstance) modalInstance.close();
          store.syncWithBackend(true).then(renderAllocationRequests);
          
          Modal.open({
            title: 'Draft Saved',
            content: `
              <div class="space-y-4">
                <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p class="text-xs text-emerald-700 flex items-center gap-2">
                    <i class="fa-regular fa-circle-check"></i>
                    <span>Your draft has been saved successfully!</span>
                  </p>
                  <p class="text-xs text-emerald-600 mt-1">Reference: <strong>${d.letterReferenceNumber}</strong></p>
                </div>
                <p class="text-sm text-slate-600">Would you like to submit this draft for review now?</p>
              </div>
            `,
            confirmText: 'Submit for Review',
            cancelText: 'Continue Editing',
            onConfirm: function() {
              workflowActions.submitDraft(draftId)
                .then(() => {
                  Toast.success('Draft submitted for review!');
                  store.syncWithBackend(true).then(renderAllocationRequests);
                })
                .catch(error => {
                  console.error('Error submitting draft:', error);
                  Toast.error('Failed to submit draft. You can submit it later from the list.');
                });
            }
          });
        } else {
          Toast.warning('Draft created but no ID returned. Please check the request list.');
          if (modalInstance) modalInstance.close();
          store.syncWithBackend(true).then(renderAllocationRequests);
        }
      })
      .catch(error => {
        console.error('Error creating draft:', error);
        const message = error.response?.data?.message || 'Failed to create draft.';
        Toast.error(Array.isArray(message) ? message.join(', ') : message);
      });
  }

  if (isEdit && item?.beneficiaries) {
    formState.selectedBeneficiaries = item.beneficiaries.map(b => ({
      beneficiaryIndividualId: b.beneficiaryIndividual?.id || b.individual?.id || '',
      beneficiaryInstitutionId: b.beneficiaryInstitution?.id || b.institution?.id || ''
    }));
  }

  renderStep();
}

function rejectWorkflow(id) {
  console.log('rejectWorkflow called with id:', id);
  workflowActions.teamLeaderReject(id);
}

function cancelWorkflow(id) {
  console.log('cancelWorkflow called with id:', id);
  workflowActions.cancelRequest(id);
}
function updateBeneficiaryStatus(requestId, beneficiaryId, status, reason) {
  const payload = { 
    status: status,
    reason: reason || ''
  };
  
  // ✅ FIX: Use the correct URL path (without requestId in the path)
  store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
    .then(() => {
      Toast.success(`Beneficiary ${status.toLowerCase()} successfully.`);
      
      // Auto-resolve: check if all beneficiaries are processed
      return store.syncWithBackend(true).then(() => {
        // Get the updated request
        const request = store.allocationRequests.find(r => r.id === requestId);
        if (!request) return;
        
        const beneficiaries = request.beneficiaries || [];
        const waiting = beneficiaries.filter(b => b.status === 'waiting_list');
        const mapped = beneficiaries.filter(b => b.status === 'mapped');
        const rejected = beneficiaries.filter(b => b.status === 'rejected');
        
        // If no more waiting beneficiaries
        if (waiting.length === 0) {
          if (mapped.length > 0) {
            // Auto-map the request
            store.apiService.patch(`/house-allocation-requests/${requestId}/team-leader/map`, { 
              remarks: `Auto-mapped after all beneficiaries processed. ${mapped.length} mapped, ${rejected.length} rejected.`
            }).then(() => {
              Toast.success('All beneficiaries processed. Request auto-mapped.');
              store.syncWithBackend(true).then(() => {
                viewRequestDetails(requestId);
              });
            }).catch(error => {
              console.error('Error auto-mapping request:', error);
              viewRequestDetails(requestId);
            });
          } else if (rejected.length > 0 && mapped.length === 0) {
            const allRejectedReason = rejected.map(b => b.reason || 'No reason provided').join('; ');
            store.apiService.patch(`/house-allocation-requests/${requestId}/team-leader/reject`, { 
              rejectionReason: `All beneficiaries rejected. Reasons: ${allRejectedReason}`
            }).then(() => {
              Toast.success('All beneficiaries rejected. Request auto-rejected.');
              store.syncWithBackend(true).then(() => {
                viewRequestDetails(requestId);
              });
            }).catch(error => {
              console.error('Error auto-rejecting request:', error);
              viewRequestDetails(requestId);
            });
          } else {
            viewRequestDetails(requestId);
          }
        } else {
          viewRequestDetails(requestId);
        }
      });
    })
    .catch(error => {
      console.error('Error updating beneficiary status:', error);
      Toast.error('Failed to update beneficiary status. Please try again.');
    });
}

function openBeneficiaryRejectModal(requestId, beneficiaryId, beneficiaryName, role) {
  Modal.open({
    title: `Reject Beneficiary: ${beneficiaryName}`,
    content: `
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
          <p class="text-xs text-rose-700 flex items-center gap-2">
            <i class="fa-regular fa-circle-exclamation"></i>
            <span>⚠️ This action will reject <strong>${beneficiaryName}</strong> from this allocation request.</span>
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
          <textarea id="beneficiary-reject-reason" rows="4" placeholder="Enter detailed rejection reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-rose-500"></textarea>
          <p class="text-[10px] text-slate-400 mt-1">Please provide a clear reason for rejecting this beneficiary.</p>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Reject Beneficiary',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: function(modalEl) {
      const reason = document.getElementById('beneficiary-reject-reason')?.value || '';
      if (!reason.trim()) {
        Toast.error('Rejection reason is required.');
        return;
      }
      
      const payload = { 
        status: 'unauthorized_by_directive',
        reason: reason.trim()
      };
      
      store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
        .then(() => {
          Toast.success(`Beneficiary "${beneficiaryName}" rejected successfully.`);
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(requestId);
          });
        })
        .catch(error => {
          console.error('Error rejecting beneficiary:', error);
          Toast.error('Failed to reject beneficiary. Please try again.');
        });
    }
  });
}

function confirmDeleteRequest(id) {
  const item = store.allocationRequests.find(r => r.id === id);
  if (!item) return;

  const ref = item.letterReferenceNumber || item.referenceNumber || 'this request';

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this allocation request?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. Request <strong class="text-slate-800">${ref}</strong> will be permanently deleted.</p>
        </div>
      </div>
    `,
    confirmText: 'Delete Request',
    cancelText: 'Cancel',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: () => {
      store.apiService.delete(`/house-allocation-requests/${id}`)
        .then(() => {
          Toast.success('Allocation request deleted successfully.');
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch(error => {
          console.error('Error deleting request:', error);
          Toast.error('Failed to delete request. Please try again.');
        });
    }
  });
}


function showError(message) {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="min-h-screen bg-[#F8F9FA] p-6">
      <div class="max-w-[1600px] mx-auto">
        <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
              <i class="fa-solid fa-circle-exclamation text-lg"></i>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-rose-800">Error</h3>
              <p class="text-sm text-rose-600 mt-1">${message}</p>
              <button onclick="location.reload()" class="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm">
                <i class="fa-solid fa-rotate mr-2"></i>Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}



window.advanceWorkflow = function(id) {
  console.log('advanceWorkflow called with id:', id);
  const item = store.allocationRequests.find(r => r.id === id);
  if (!item) {
    console.error('Item not found:', id);
    Toast.error('Request not found');
    return;
  }
  
  const beneficiaries = item.beneficiaries || [];
  const currentStatus = (item.status || 'draft').toLowerCase();
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.key === currentStatus);
  
  if (currentIndex < 0) {
    console.error('Status not found in workflow steps:', currentStatus);
    Toast.error('Invalid status: ' + currentStatus);
    return;
  }
  
  // ─── VALIDATE BENEFICIARIES BEFORE ADVANCING ──────────────────────────
  
  // Check if all beneficiaries have Deputy CEO decisions
  const allHaveDeputyDecisions = beneficiaries.every(b => 
    b.deputyCeoDecision !== null && b.deputyCeoDecision !== undefined
  );
  
  // Check if all beneficiaries have Director decisions
  const allHaveDirectorDecisions = beneficiaries.every(b => 
    b.directorDecision !== null && b.directorDecision !== undefined
  );
  
  // Check if all beneficiaries have Team Leader decisions
  const allHaveTeamLeaderDecisions = beneficiaries.every(b => 
    b.teamLeaderDecision !== null && b.teamLeaderDecision !== undefined
  );
  
  // Check if any beneficiary is unauthorized/rejected
  const hasRejected = beneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'unauthorized_by_directive'
  );
  
  // Check if all eligible beneficiaries are processed
  const eligibleBeneficiaries = beneficiaries.filter(b => 
    (b.status || '').toLowerCase() === 'eligible'
  );
  const allEligibleProcessed = eligibleBeneficiaries.every(b => 
    (b.status || '').toLowerCase() === 'waiting_list' || 
    (b.status || '').toLowerCase() === 'allocated'
  );
  
  // ─── DETERMINE NEXT ACTION ─────────────────────────────────────────────
  
  // Calculate the conditional status based on beneficiaries
  const calculatedStatus = calculateRequestStatus(beneficiaries);
  
  // ─── EXECUTE THE APPROPRIATE ACTION ──────────────────────────────────
  
  if (currentStatus === 'draft') {
    Toast.info('Please submit the draft first using the Submit Draft button.');
    return;
    
  } else if (currentStatus === 'submitted') {
    // ✅ PATCH /:id/deputy-ceo/start-review
    store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/start-review`)
      .then(() => {
        Toast.success('✅ Request advanced to Deputy CEO review.');
        store.syncWithBackend(true).then(renderAllocationRequests);
      })
      .catch(error => {
        console.error('Error starting Deputy CEO review:', error);
        Toast.error('Failed to start review. Please try again.');
      });
      
  } else if (currentStatus === 'under_deputy_ceo_review') {
    // ✅ Open Deputy CEO decision modal
    if (!allHaveDeputyDecisions) {
      Toast.warning('Please review all beneficiaries before advancing.');
      window.openBeneficiaryDecisionModal(id, 'deputy');
      return;
    }
    if (hasRejected) {
      Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
      return;
    }
    // ✅ The decision modal handles the PATCH /:id/deputy-ceo/decision
    window.openBeneficiaryDecisionModal(id, 'deputy');
    
  } else if (currentStatus === 'under_director_review') {
    // ✅ Open Director decision modal
    if (!allHaveDirectorDecisions) {
      Toast.warning('Please review all beneficiaries before advancing.');
      window.openBeneficiaryDecisionModal(id, 'director');
      return;
    }
    if (hasRejected) {
      Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
      return;
    }
    window.openBeneficiaryDecisionModal(id, 'director');
    
  } else if (currentStatus === 'pending_team_leader_decision') {
    // ✅ Open Team Leader decision modal
    if (!allHaveTeamLeaderDecisions) {
      Toast.warning('Please review all beneficiaries before advancing.');
      window.openBeneficiaryDecisionModal(id, 'team_leader');
      return;
    }
    if (hasRejected) {
      Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
      return;
    }
    window.openBeneficiaryDecisionModal(id, 'team_leader');
    
  } else if (currentStatus === 'under_team_officer_review') {
    // ✅ Open Team Officer processing modal
    if (!allEligibleProcessed) {
      Toast.warning('Please process all eligible beneficiaries before advancing.');
      window.openBeneficiaryProcessingModal(id);
      return;
    }
    // Use calculated status
    Toast.info(`Request will be processed to ${calculatedStatus.replace(/_/g, ' ')}.`);
    window.openBeneficiaryProcessingModal(id);
    
  } else if (['waiting_list', 'partial_waiting_list', 'partial_allocation', 'allocated'].includes(currentStatus)) {
    Toast.info(`Request is already in ${currentStatus.replace(/_/g, ' ')} status.`);
    
  } else {
    Toast.info('No further action available for current status');
  }
};
 window.deputyCeoStartReview = function(id) {
  console.log('deputyCeoStartReview called with id:', id);
  if (typeof deputyCeoStartReview === 'function') {
    deputyCeoStartReview(id);
  } else {
    console.error('deputyCeoStartReview function not found');
    Toast.error('Function not available');
  }
 };
 window.rollbackWorkflow = (id) => {
  const item = store.allocationRequests.find(r => r.id === id);
  if (!item) return;
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.key === item.status);
  if (currentIndex > 0) {
    const prevStep = WORKFLOW_STEPS[currentIndex - 1];
    const updatedItems = store.allocationRequests.map(r => {
      if (r.id === id) {
        return { ...r, status: prevStep.key };
      }
      return r;
    });
    store.allocationRequests = updatedItems;
    Toast.info(`Rolled back to ${prevStep.label}`);
    renderAllocationRequests();
  }
};
window.submitDraft = function(id) {
  workflowActions.submitDraft(id)
    .then(() => {
      store.syncWithBackend(true).then(renderAllocationRequests);
    });
};

window.deputyCeoStartReview = function(id) {
  workflowActions.deputyCeoStartReview(id)
    .then(() => {
      store.syncWithBackend(true).then(renderAllocationRequests);
      Toast.success('Request is now under Deputy CEO review.');
    });
};
window.deputyCeoDecision = function(id, decision, comment) {
  workflowActions.deputyCeoDecision(id, decision, comment)
    .then(() => {
      store.syncWithBackend(true).then(renderAllocationRequests);
      Toast.success('Deputy CEO decision submitted.');
    });
};

window.teamLeaderQueue = function(id) {
  workflowActions.teamLeaderQueue(id)
    .then(() => {
      store.syncWithBackend(true).then(renderAllocationRequests);
    });
};

function openBeneficiaryDecisionModal(requestId, role) {
  const item = store.allocationRequests.find(r => r.id === requestId);
  if (!item) {
    Toast.error('Request not found');
    return;
  }
  
  // ✅ Check if the request is in the correct status
  const statusMap = {
    'deputy': 'under_deputy_ceo_review',
    'director': 'under_director_review',
    'team_leader': 'pending_team_leader_decision'
  };
  
  const expectedStatus = statusMap[role];
  const currentStatus = (item.status || '').toLowerCase();
  
  // ✅ If it's SUBMITTED and role is deputy, auto-start the review
  if (currentStatus === 'submitted' && role === 'deputy') {
    Toast.info('Starting Deputy CEO review first...');
    store.apiService.patch(`/house-allocation-requests/${requestId}/deputy-ceo/start-review`)
      .then(() => {
        Toast.success('Request is now under Deputy CEO review. Opening decision modal...');
        store.syncWithBackend(true).then(() => {
          setTimeout(() => {
            openBeneficiaryDecisionModal(requestId, role);
          }, 300);
        });
      })
      .catch(error => {
        console.error('Error starting review:', error);
        Toast.error('Failed to start review. Please try again.');
      });
    return;
  }
  
  // ✅ Check if status matches expected
  if (currentStatus !== expectedStatus) {
    if (currentStatus === 'submitted') {
      Toast.info('Please start Deputy CEO review first using the "Advance Workflow" button.');
    } else {
      Toast.error(`Request is ${currentStatus}. Only ${expectedStatus} requests can be reviewed by ${role}.`);
    }
    return;
  }
  
  const beneficiaries = item.beneficiaries || [];
  const roleLabel = role === 'deputy' ? 'Deputy CEO' : 
                     role === 'director' ? 'Director' : 
                     role === 'team_leader' ? 'Team Leader' : 'Reviewer';
  
  // ✅ Map role to the correct request-level endpoint
  const endpointMap = {
    'deputy': `/house-allocation-requests/${requestId}/deputy-ceo/decision`,
    'director': `/house-allocation-requests/${requestId}/director/decision`,
    'team_leader': `/house-allocation-requests/${requestId}/team-leader/decision`
  };
  
  const endpoint = endpointMap[role];
  if (!endpoint) {
    Toast.error('Invalid role');
    return;
  }
  
  // ✅ Get the decision field for this role
  const decisionField = role === 'deputy' ? 'deputyCeoDecision' :
                        role === 'director' ? 'directorDecision' :
                        role === 'team_leader' ? 'teamLeaderDecision' : '';
  
  // ✅ Decision options with lowercase values
  const decisionOptions = [
    { value: 'allowed', label: '✅ Allowed', requiresComment: false },
    { value: 'legal_revision_required', label: '⚖️ Legal Revision Required', requiresComment: true },
    { value: 'unauthorized_by_directive', label: '❌ Unauthorized by Directive', requiresComment: true }
  ];
  
  let modalContent = `
    <div class="space-y-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p class="text-xs text-blue-700 flex items-center gap-2">
          <i class="fa-regular fa-circle-info"></i>
          <span>Review each beneficiary and make a decision. <strong>All ${beneficiaries.length} beneficiaries</strong> must be reviewed before proceeding.</span>
        </p>
      </div>
      
      <div class="max-h-[400px] overflow-y-auto space-y-3">
  `;
  
  // ✅ Show ALL beneficiaries in the modal (including already reviewed)
  for (let index = 0; index < beneficiaries.length; index++) {
    const ben = beneficiaries[index];
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const name = individual ? getUserFullName(individual) : 'Unknown Beneficiary';
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    const instName = institution ? getInstitutionName(institution) : 'N/A';
    const benStatus = ben.status || 'pending_review';
    const statusInfo = getBeneficiaryStatusInfo(benStatus);
    
    const currentDecision = ben[decisionField] || '';
    const isAlreadyReviewed = currentDecision !== '' && currentDecision !== null && currentDecision !== undefined;
    
    modalContent += `
      <div class="border border-slate-200 rounded-lg p-3 bg-white">
        <div class="flex items-center justify-between mb-2">
          <div>
            <span class="text-sm font-bold text-slate-800">${index + 1}. ${name}</span>
            <span class="text-xs text-slate-500 ml-2">🏛️ ${instName}</span>
          </div>
          <span class="px-2 py-0.5 ${statusInfo.color} border text-[10px] font-bold rounded-md">
            ${statusInfo.label}
          </span>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Decision for ${name}</label>
          ${isAlreadyReviewed ? `
            <div class="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span class="text-xs font-semibold text-slate-700">Already reviewed:</span>
              <span class="text-xs font-bold ${currentDecision === 'allowed' ? 'text-emerald-600' : currentDecision === 'legal_revision_required' ? 'text-amber-600' : 'text-rose-600'}">
                ${decisionOptions.find(opt => opt.value === currentDecision)?.label || currentDecision}
              </span>
              ${ben[decisionField + 'Comment'] ? `<span class="text-xs text-slate-500">- ${ben[decisionField + 'Comment']}</span>` : ''}
            </div>
          ` : `
            <select id="ben-decision-${ben.id}" class="ben-decision-select w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" data-beneficiary-id="${ben.id}" data-index="${index}">
              <option value="">-- Select Decision --</option>
              ${decisionOptions.map(opt => `
                <option value="${opt.value}" ${currentDecision === opt.value ? 'selected' : ''}>
                  ${opt.label}
                </option>
              `).join('')}
            </select>
            <div class="mt-2 comment-container" id="comment-container-${ben.id}" style="display: ${currentDecision !== 'allowed' && currentDecision !== '' ? 'block' : 'none'}">
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">
                Comment <span class="text-rose-500">*</span>
              </label>
              <textarea id="ben-comment-${ben.id}" class="ben-comment-textarea w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" rows="2" placeholder="Please provide a reason for this decision..." data-beneficiary-id="${ben.id}">${ben[decisionField + 'Comment'] || ''}</textarea>
              <p class="text-[10px] text-rose-500 mt-1 hidden" id="comment-warning-${ben.id}">⚠️ Comment is required for this decision</p>
            </div>
          `}
        </div>
      </div>
    `;
  }
  
  modalContent += `
      </div>
    </div>
  `;
  
  Modal.open({
    title: `${roleLabel} Review - Beneficiary Decisions (${beneficiaries.length} beneficiaries)`,
    content: modalContent,
    isForm: true,
    confirmText: `Submit All ${beneficiaries.length} Decisions`,
    onConfirm: function(modalEl) {
      let allReviewed = true;
      let allValid = true;
      const decisions = [];
      let firstError = '';
      
      // ─── COLLECT ALL DECISIONS ──────────────────────────────────────────
      for (const ben of beneficiaries) {
        const decisionEl = document.getElementById(`ben-decision-${ben.id}`);
        const commentEl = document.getElementById(`ben-comment-${ben.id}`);
        const warningEl = document.getElementById(`comment-warning-${ben.id}`);
        
        // ✅ Check if already reviewed - use existing decision
        const existingDecision = ben[decisionField];
        
        // ✅ If already reviewed, use existing decision
        if (existingDecision !== null && existingDecision !== undefined && existingDecision !== '') {
          decisions.push({
            beneficiaryId: ben.id,
            decision: existingDecision,
            comment: ben[decisionField + 'Comment'] || ''
          });
          continue;
        }
        
        // ✅ If pending, get from form
        const decision = decisionEl ? decisionEl.value : '';
        const comment = commentEl ? commentEl.value : '';
        
        if (!decision) {
          allReviewed = false;
          firstError = `Please make a decision for all pending beneficiaries.`;
          break;
        }
        
        // ✅ Check if comment is required for non-approval decisions
        if (decision !== 'allowed' && (!comment || comment.trim() === '')) {
          allValid = false;
          const individual = ben.beneficiaryIndividual || ben.individual || null;
          const name = individual ? getUserFullName(individual) : 'Unknown Beneficiary';
          firstError = `Comment is required for "${decision}" decision for beneficiary: ${name}`;
          if (warningEl) {
            warningEl.classList.remove('hidden');
          }
          if (commentEl) {
            commentEl.classList.add('border-rose-500', 'bg-rose-50');
          }
          break;
        } else {
          if (warningEl) {
            warningEl.classList.add('hidden');
          }
          if (commentEl) {
            commentEl.classList.remove('border-rose-500', 'bg-rose-50');
          }
        }
        
        decisions.push({
          beneficiaryId: ben.id,
          decision: decision,
          comment: comment || ''
        });
      }
      
      // ─── VALIDATION ──────────────────────────────────────────────────────
      if (!allReviewed) {
        Toast.warning(firstError || 'Please make a decision for all pending beneficiaries.');
        return;
      }
      
      if (!allValid) {
        Toast.error(firstError);
        return;
      }
      
      // ─── ✅ REMOVE DUPLICATES ───────────────────────────────────────────
      const uniqueDecisions = decisions.filter((d, index, self) => 
        index === self.findIndex(t => t.beneficiaryId === d.beneficiaryId)
      );
      
      // ─── ✅ BUILD PAYLOAD WITH ALL BENEFICIARIES ──────────────────────
      // ✅ Send ALL beneficiaries (including already reviewed)
      const payload = {
        decisions: uniqueDecisions.map(d => ({
          beneficiaryId: d.beneficiaryId,
          decision: d.decision,
          comment: d.comment || ''
        }))
      };
      
      console.log('✅ Sending payload with ALL beneficiaries:', payload);
      
      // ─── ✅ SEND TO API ──────────────────────────────────────────────────
      store.apiService.patch(endpoint, payload)
        .then(() => {
          Toast.success(`✅ All ${uniqueDecisions.length} beneficiary decisions submitted by ${roleLabel}.`);
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(requestId);
          });
        })
        .catch(error => {
          console.error('Error submitting decisions:', error);
          const message = error.response?.data?.message || 'Failed to submit decisions. Please try again.';
          Toast.error(Array.isArray(message) ? message.join(', ') : message);
        });
    }
  });
  
  // ─── ATTACH EVENT LISTENERS FOR CONDITIONAL COMMENT ───────────────────
  setTimeout(function() {
    document.querySelectorAll('.ben-decision-select').forEach(select => {
      select.addEventListener('change', function() {
        const beneficiaryId = this.dataset.beneficiaryId;
        const commentContainer = document.getElementById(`comment-container-${beneficiaryId}`);
        const commentTextarea = document.getElementById(`ben-comment-${beneficiaryId}`);
        const warningEl = document.getElementById(`comment-warning-${beneficiaryId}`);
        
        if (this.value !== 'allowed' && this.value !== '') {
          // Show comment container
          if (commentContainer) {
            commentContainer.style.display = 'block';
          }
          // Highlight if empty
          if (commentTextarea && (!commentTextarea.value || commentTextarea.value.trim() === '')) {
            if (warningEl) {
              warningEl.classList.remove('hidden');
            }
            if (commentTextarea) {
              commentTextarea.classList.add('border-rose-500', 'bg-rose-50');
            }
          }
        } else {
          // Hide comment container
          if (commentContainer) {
            commentContainer.style.display = 'none';
          }
          if (warningEl) {
            warningEl.classList.add('hidden');
          }
          if (commentTextarea) {
            commentTextarea.classList.remove('border-rose-500', 'bg-rose-50');
          }
        }
      });
    });
    
    // Real-time validation on comment input
    document.querySelectorAll('.ben-comment-textarea').forEach(textarea => {
      textarea.addEventListener('input', function() {
        const beneficiaryId = this.dataset.beneficiaryId;
        const select = document.getElementById(`ben-decision-${beneficiaryId}`);
        const warningEl = document.getElementById(`comment-warning-${beneficiaryId}`);
        
        if (select && select.value !== 'allowed') {
          if (this.value && this.value.trim() !== '') {
            if (warningEl) {
              warningEl.classList.add('hidden');
            }
            this.classList.remove('border-rose-500', 'bg-rose-50');
          } else {
            if (warningEl) {
              warningEl.classList.remove('hidden');
            }
            this.classList.add('border-rose-500', 'bg-rose-50');
          }
        }
      });
    });
  }, 200);
}
 function openBeneficiaryProcessingModal(requestId) {
  const item = store.allocationRequests.find(r => r.id === requestId);
  if (!item) {
    Toast.error('Request not found');
    return;
  }
  
  const beneficiaries = item.beneficiaries || [];
  const eligibleBeneficiaries = beneficiaries.filter(b => 
    (b.status || '').toLowerCase() === 'eligible'
  );
  
  if (eligibleBeneficiaries.length === 0) {
    Toast.info('No eligible beneficiaries to process.');
    return;
  }
  
  let modalContent = `
    <div class="space-y-4">
      <div class="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
        <p class="text-xs text-cyan-700 flex items-center gap-2">
          <i class="fa-regular fa-circle-info"></i>
          <span>Process eligible beneficiaries by moving them to waiting list or marking as unauthorized.</span>
        </p>
        <p class="text-xs text-cyan-600 mt-1">
          <i class="fa-regular fa-arrow-right"></i>
          <strong>Waiting List:</strong> Beneficiary will be added to waiting list<br>
          <strong>Unauthorized:</strong> Beneficiary will be rejected
        </p>
      </div>
      
      <div class="max-h-[400px] overflow-y-auto space-y-3">
  `;
  
  eligibleBeneficiaries.forEach((ben, index) => {
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const name = individual ? getUserFullName(individual) : 'Unknown Beneficiary';
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    const instName = institution ? getInstitutionName(institution) : 'N/A';
    
    modalContent += `
      <div class="border border-slate-200 rounded-lg p-3 bg-white">
        <div class="flex items-center justify-between mb-2">
          <div>
            <span class="text-sm font-bold text-slate-800">${index + 1}. ${name}</span>
            <span class="text-xs text-slate-500 ml-2">🏛️ ${instName}</span>
          </div>
          <span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md">
            ✅ Eligible
          </span>
        </div>
        <div>
          <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Action for ${name}</label>
          <select id="ben-action-${ben.id}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]">
            <option value="">-- Select Action --</option>
            <option value="waiting_list">📋 Move to Waiting List</option>
            <option value="unauthorized_by_directive">❌ Unauthorized by Directive</option>
          </select>
        </div>
        <div class="mt-2" id="process-comment-container-${ben.id}" style="display: none;">
          <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">
            Comment <span class="text-rose-500">*</span>
          </label>
          <textarea id="ben-process-remark-${ben.id}" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" rows="2" placeholder="Please provide a reason..." data-beneficiary-id="${ben.id}"></textarea>
        </div>
      </div>
    `;
  });
  
  modalContent += `
      </div>
    </div>
  `;
  
  Modal.open({
    title: 'Process Eligible Beneficiaries',
    content: modalContent,
    isForm: true,
    confirmText: 'Process Selected',
    confirmClass: 'bg-cyan-600 hover:bg-cyan-700',
    onConfirm: function(modalEl) {
      let allProcessed = true;
      const waitingListIds = [];
      const unauthorizedItems = [];
      
      eligibleBeneficiaries.forEach(ben => {
        const actionEl = document.getElementById(`ben-action-${ben.id}`);
        const remarkEl = document.getElementById(`ben-process-remark-${ben.id}`);
        
        const action = actionEl ? actionEl.value : '';
        const remark = remarkEl ? remarkEl.value : '';
        
        if (!action) {
          allProcessed = false;
          return;
        }
        
        // Check if comment is required for unauthorized_by_directive
        if (action === 'unauthorized_by_directive' && (!remark || remark.trim() === '')) {
          Toast.error(`Comment is required for "Unauthorized by Directive" action.`);
          allProcessed = false;
          return;
        }
        
        if (action === 'waiting_list') {
          waitingListIds.push(ben.id);
        } else if (action === 'unauthorized_by_directive') {
          unauthorizedItems.push({ 
            beneficiaryId: ben.id, 
            remark: remark || '' 
          });
        }
      });
      
      if (!allProcessed) {
        Toast.warning('Please select an action for all eligible beneficiaries.');
        return;
      }
      
      const promises = [];
      
      // ✅ Move to waiting list using the correct endpoint
      if (waitingListIds.length > 0) {
        promises.push(
          store.apiService.patch(`/house-allocation-requests/${requestId}/team-officer/move-to-waiting-list`, {
            beneficiaryIds: waitingListIds
          })
          .then(() => {
            Toast.success(`✅ ${waitingListIds.length} beneficiary(ies) moved to waiting list.`);
          })
        );
      }
      
      // ✅ Mark as unauthorized by directive using the status endpoint
      for (const item of unauthorizedItems) {
        promises.push(
          store.apiService.patch(`/house-allocation-requests/beneficiaries/${item.beneficiaryId}/status`, {
            status: 'unauthorized_by_directive',
            reason: item.remark || 'Unauthorized by directive'
          })
          .then(() => {
            Toast.success(`❌ Beneficiary marked as unauthorized.`);
          })
        );
      }
      
      Promise.all(promises)
        .then(() => {
          Toast.success('All beneficiaries processed successfully.');
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(requestId);
          });
        })
        .catch(error => {
          console.error('Error processing beneficiaries:', error);
          const message = error.response?.data?.message || 'Failed to process some beneficiaries.';
          Toast.error(Array.isArray(message) ? message.join(', ') : message);
        });
    }
  });
  
  // ─── ATTACH EVENT LISTENERS FOR CONDITIONAL COMMENT ───────────────────
  setTimeout(function() {
    eligibleBeneficiaries.forEach(ben => {
      const select = document.getElementById(`ben-action-${ben.id}`);
      const commentContainer = document.getElementById(`process-comment-container-${ben.id}`);
      
      if (select) {
        select.addEventListener('change', function() {
          if (this.value === 'unauthorized_by_directive') {
            if (commentContainer) {
              commentContainer.style.display = 'block';
            }
          } else {
            if (commentContainer) {
              commentContainer.style.display = 'none';
            }
          }
        });
      }
    });
  }, 200);
}

function fetchBeneficiaries() {
  isLoadingBeneficiaries = true;
  renderBeneficiariesSection();

  const skip = (beneficiaryPage - 1) * BENEFICIARY_PAGE_SIZE;
  const params = new URLSearchParams();
  params.set('skip', String(skip));
  params.set('take', String(BENEFICIARY_PAGE_SIZE));
  if (beneficiaryFilters.status) params.set('status', beneficiaryFilters.status);
  if (beneficiaryFilters.search.trim()) params.set('beneficiaryName', beneficiaryFilters.search.trim());
  if (beneficiaryFilters.beneficiaryInstitutionId) params.set('institutionId', beneficiaryFilters.beneficiaryInstitutionId);

  const basePath = (beneficiaryViewMode === 'per-request' && beneficiarySelectedRequestId)
    ? `/house-allocation-requests/${beneficiarySelectedRequestId}/beneficiaries`
    : `/house-allocation-requests/beneficiaries`;

  return store.apiService.get(`${basePath}?${params.toString()}`)
    .then(response => {
      // Handle the response structure: { count, items: [...] }
      const items = response.items || response.data?.items || response || [];
      const count = response.count ?? response.data?.count ?? items.length;

      // Store the raw data for filtering
      beneficiaryData = items;
      beneficiaryTotalCount = count;

      isLoadingBeneficiaries = false;
      renderBeneficiariesSection();
      
      // Render the table data using the mapped data
      setTimeout(() => {
        renderBeneficiaryTableData(items);
      }, 50);
    })
    .catch(error => {
      console.error('Error fetching beneficiaries:', error);
      Toast.error(error?.response?.data?.message || 'Failed to load beneficiaries. Please try again.');
      
      beneficiaryData = [];
      beneficiaryTotalCount = 0;
      isLoadingBeneficiaries = false;
      renderBeneficiariesSection();
    });
}

// ─── GLOBAL EXPORTS ─────────────────────────────────────────────────────

window.advanceWorkflow = advanceWorkflow;
window.deputyCeoStartReview = deputyCeoStartReview;
window.deputyCeoDecision = deputyCeoDecision;
window.directorDecision = directorDecision;
window.teamLeaderQueue = teamLeaderQueue;
window.teamLeaderMap = teamLeaderMap;
window.teamLeaderReject = teamLeaderReject;
window.cancelRequest = cancelRequest;
window.openBeneficiaryDecisionModal = openBeneficiaryDecisionModal;
window.openBeneficiaryProcessingModal = openBeneficiaryProcessingModal;
window.openRequestForm = openRequestForm;
window.openAddBeneficiaryModal = openAddBeneficiaryModal;
window.updateBeneficiaryStatus = updateBeneficiaryStatus;
window.openBeneficiaryRejectModal = openBeneficiaryRejectModal;
window.calculateRequestStatus = calculateRequestStatus;
window.renderAllocationRequests = renderAllocationRequests;
window.viewRequestDetails = viewRequestDetails;
window.fetchBeneficiaries = fetchBeneficiaries;
window.retryRenderAllocationRequests = renderAllocationRequests;
window.rejectWorkflow = rejectWorkflow;
window.cancelWorkflow = cancelWorkflow;

window.navigateToStatus = navigateToStatus;
// Add any other missing window. assignments here

console.log('✅ House Allocation Requests Module Loaded Successfully');