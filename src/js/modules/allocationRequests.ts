// House Allocation Requests Module
import { store } from '../store';
import { Modal, Toast } from '../components';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

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
  { key: 'partial_waiting_list', label: 'Partial Waiting List', icon: 'fa-regular fa-clock', conditional: true },
  { key: 'partial_allocation', label: 'Partial Allocation', icon: 'fa-regular fa-building', conditional: true },
  { key: 'waiting_list', label: 'Waiting List', icon: 'fa-regular fa-list', conditional: true },
  { key: 'allocated', label: 'Allocated', icon: 'fa-regular fa-circle-check', conditional: true }
];

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

// ─── MODULE STATE ──────────────────────────────────────────────────────────

let isRendering = false;
let isFetchingUser = false;
let renderTimeout = null;
let storeUnsubscribe = null;
let currentFilter = 'all';
let searchQuery = '';

// ─── INITIALIZE MODULE ─────────────────────────────────────────────────────
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

export function cleanupAllocationRequests() {
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

// ─── RENDER ALLOCATION REQUESTS ──────────────────────────────────────────

export function renderAllocationRequests() {
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

// ─── RETRY FUNCTION ──────────────────────────────────────────────────────

window.retryRenderAllocationRequests = function() {
  isFetchingUser = false;
  isRendering = false;
  if (renderTimeout) {
    clearTimeout(renderTimeout);
    renderTimeout = null;
  }
  initAllocationRequests(); // ✅ Call init, not render directly
};

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
  if (currentStatus === 'draft' && userCanAct) {
    actionButtons = `
      <button onclick="window.submitDraft('${item.id}')" 
        class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg shadow-sm">
        <i class="fa-regular fa-paper-plane"></i> Submit Draft
      </button>
    `;
  } else if (currentStatus === 'submitted' && userCanAct) {
    // Check if all beneficiaries have Deputy CEO decisions
    const allHaveDecisions = beneficiaries.every(b => b.deputyCeoDecision !== null && b.deputyCeoDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-play"></i> Advance to Director Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'deputy')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Review Beneficiaries (${pendingBeneficiaries.length} pending)
        </button>
        <span class="text-[10px] text-amber-600 font-medium">${pendingBeneficiaries.length} beneficiary(ies) need review</span>
      `;
    }
  } else if (currentStatus === 'under_deputy_ceo_review' && userCanAct) {
    const allHaveDecisions = beneficiaries.every(b => b.deputyCeoDecision !== null && b.deputyCeoDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-play"></i> Advance to Director Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'deputy')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Review Beneficiaries (${pendingBeneficiaries.length} pending)
        </button>
        <span class="text-[10px] text-amber-600 font-medium">${pendingBeneficiaries.length} beneficiary(ies) need review</span>
      `;
    }
  } else if (currentStatus === 'under_director_review' && userCanAct) {
    const allHaveDecisions = beneficiaries.every(b => b.directorDecision !== null && b.directorDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-play"></i> Advance to Team Leader Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'director')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Review Beneficiaries (${pendingBeneficiaries.length} pending)
        </button>
      `;
    }
  } else if (currentStatus === 'pending_team_leader_decision' && userCanAct) {
    const allHaveDecisions = beneficiaries.every(b => b.teamLeaderDecision !== null && b.teamLeaderDecision !== undefined);
    
    if (allHaveDecisions) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-play"></i> Advance to Team Officer Review
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.openBeneficiaryDecisionModal('${item.id}', 'team_leader')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-check"></i> Review Beneficiaries (${pendingBeneficiaries.length} pending)
        </button>
      `;
    }
  } else if (currentStatus === 'under_team_officer_review' && userCanAct) {
    const allEligible = beneficiaries.every(b => 
      (b.status || '').toLowerCase() === 'waiting_list' || 
      (b.status || '').toLowerCase() === 'allocated'
    );
    
    if (allEligible) {
      actionButtons = `
        <button onclick="window.advanceWorkflow('${item.id}')" 
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5f3e56] transition-colors rounded-lg shadow-sm">
          <i class="fa-regular fa-play"></i> Process to Waiting List
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
  deputyCeoStartReview(id) {
    // ✅ PATCH /:id/deputy-ceo/start-review - sends lowercase status
    store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/start-review`)
      .then(() => {
        Toast.success('Request is now under Deputy CEO review.');
        store.syncWithBackend(true).then(renderAllocationRequests);
      })
      .catch(error => {
        console.error('Error starting review:', error);
        Toast.error('Failed to start review. Please try again.');
      });
  },

  deputyCeoDecision(id, decision, comment) {
    // ✅ PATCH /:id/deputy-ceo/decision - sends lowercase decision
    store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/decision`, { decision, comment })
      .then(() => {
        Toast.success('Deputy CEO decision submitted successfully.');
        store.syncWithBackend(true).then(renderAllocationRequests);
      })
      .catch(error => {
        console.error('Error submitting decision:', error);
        Toast.error('Failed to submit decision. Please try again.');
      });
  },

  directorDecision(id, decision, comment) {
    // ✅ PATCH /:id/director/decision - sends lowercase decision
    store.apiService.patch(`/house-allocation-requests/${id}/director/decision`, { decision, comment })
      .then(() => {
        Toast.success('Director decision submitted successfully.');
        store.syncWithBackend(true).then(renderAllocationRequests);
      })
      .catch(error => {
        console.error('Error submitting decision:', error);
        Toast.error('Failed to submit decision. Please try again.');
      });
  },

  teamLeaderQueue(id) {
    // ✅ PATCH /:id/team-leader/queue
    store.apiService.patch(`/house-allocation-requests/${id}/team-leader/queue`)
      .then(() => {
        Toast.success('Request queued for processing.');
        store.syncWithBackend(true).then(renderAllocationRequests);
      })
      .catch(error => {
        console.error('Error queueing request:', error);
        Toast.error('Failed to queue request. Please try again.');
      });
  },

  teamLeaderMap(id) {
    Modal.open({
      title: 'Map Houses for Request',
      content: `
        <div class="space-y-4">
          <p class="text-sm text-slate-600">Enter any remarks for this mapping:</p>
          <textarea id="map-remarks" rows="3" placeholder="e.g., Houses assigned to beneficiaries..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
        </div>
      `,
      isForm: true,
      confirmText: 'Map Houses',
      onConfirm: function(modalEl) {
        const remarks = modalEl.querySelector('#map-remarks')?.value || '';
        store.apiService.patch(`/house-allocation-requests/${id}/team-leader/map`, { remarks })
          .then(() => {
            Toast.success('Houses mapped successfully.');
            store.syncWithBackend(true).then(renderAllocationRequests);
          })
          .catch(error => {
            console.error('Error mapping houses:', error);
            Toast.error('Failed to map houses. Please try again.');
          });
      }
    });
  },

  teamLeaderReject(id) {
    Modal.open({
      title: 'Reject Request',
      content: `
        <div class="space-y-4">
          <p class="text-sm text-rose-600 font-medium">⚠️ This will permanently reject this request.</p>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
            <textarea id="reject-reason" rows="3" placeholder="Enter rejection reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
          </div>
        </div>
      `,
      isForm: true,
      confirmText: 'Reject Request',
      confirmClass: 'bg-rose-600 hover:bg-rose-700',
      onConfirm: function(modalEl) {
        const reason = modalEl.querySelector('#reject-reason')?.value || '';
        if (!reason.trim()) {
          Toast.error('Rejection reason is required.');
          return;
        }
        store.apiService.patch(`/house-allocation-requests/${id}/team-leader/reject`, { rejectionReason: reason })
          .then(() => {
            Toast.success('Request rejected successfully.');
            store.syncWithBackend(true).then(renderAllocationRequests);
          })
          .catch(error => {
            console.error('Error rejecting request:', error);
            Toast.error('Failed to reject request. Please try again.');
          });
      }
    });
  },

  cancelRequest(id) {
    Modal.open({
      title: 'Cancel Request',
      content: `
        <div class="space-y-4">
          <p class="text-sm text-amber-600 font-medium">⚠️ Are you sure you want to cancel this request?</p>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Cancellation Reason (Optional)</label>
            <textarea id="cancel-reason" rows="3" placeholder="Enter cancellation reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
          </div>
        </div>
      `,
      isForm: true,
      confirmText: 'Cancel Request',
      confirmClass: 'bg-amber-600 hover:bg-amber-700',
      onConfirm: function(modalEl) {
        const reason = modalEl.querySelector('#cancel-reason')?.value || '';
        store.apiService.patch(`/house-allocation-requests/${id}/cancel`, { reason })
          .then(() => {
            Toast.success('Request cancelled successfully.');
            store.syncWithBackend(true).then(renderAllocationRequests);
          })
          .catch(error => {
            console.error('Error cancelling request:', error);
            Toast.error('Failed to cancel request. Please try again.');
          });
      }
    });
  }
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
    'approved': 'ALLOWED',
    'verification_required': 'VERIFICATION_REQUIRED',
    'legal_revision_required': 'LEGAL_REVISION_REQUIRED'
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
    userPage: 1,
    userPageSize: 10,
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
    
    const start = (formState.userPage - 1) * formState.userPageSize;
    const paginated = filtered.slice(start, start + formState.userPageSize);
    formState.filteredUsers = paginated;
    return paginated;
  }

  function buildUserOptions(users) {
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
  
  const formState = {
    step: 1,
    totalSteps: 3,
    data: {
      letterReferenceNumber: !isEdit 
        ? 'HAR-' + new Date().getFullYear() + '-' + String((store.allocationRequests?.length || 0) + 1).padStart(6, '0')
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
    userPage: 1,
    userPageSize: 10,
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
    
    const start = (formState.userPage - 1) * formState.userPageSize;
    const paginated = filtered.slice(start, start + formState.userPageSize);
    formState.filteredUsers = paginated;
    return paginated;
  }

  function buildUserOptions(users) {
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

  function renderStep2() {
    const filteredUsers = getFilteredUsers();
    const totalPages = Math.ceil(formState.totalUsers / formState.userPageSize);
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
              ${totalPages > 1 ? `
                <div class="flex items-center justify-between mt-2 gap-2">
                  <div class="text-[10px] text-slate-400">
                    Showing ${(formState.userPage - 1) * formState.userPageSize + 1} - ${Math.min(formState.userPage * formState.userPageSize, formState.totalUsers)} of ${formState.totalUsers}
                  </div>
                  <div class="flex gap-1">
                    <button id="user-page-prev" class="px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors ${formState.userPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="text-[10px] text-slate-500 px-2 py-0.5">${formState.userPage}/${totalPages}</span>
                    <button id="user-page-next" class="px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors ${formState.userPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
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
                <i class="fa-regular fa-check mr-1.5"></i> Submit Request
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

    document.getElementById('beneficiary-search')?.addEventListener('input', function() {
      formState.userSearch = this.value;
      formState.userPage = 1;
      const stepHtml = renderStep2();
      const contentEl = document.querySelector('.tab-content.block');
      if (contentEl) {
        contentEl.innerHTML = stepHtml;
        attachStep2Listeners();
      }
    });

    document.getElementById('user-page-prev')?.addEventListener('click', () => {
      if (formState.userPage > 1) {
        formState.userPage--;
        const stepHtml = renderStep2();
        const contentEl = document.querySelector('.tab-content.block');
        if (contentEl) {
          contentEl.innerHTML = stepHtml;
          attachStep2Listeners();
        }
      }
    });

    document.getElementById('user-page-next')?.addEventListener('click', () => {
      const totalPages = Math.ceil(formState.totalUsers / formState.userPageSize);
      if (formState.userPage < totalPages) {
        formState.userPage++;
        const stepHtml = renderStep2();
        const contentEl = document.querySelector('.tab-content.block');
        if (contentEl) {
          contentEl.innerHTML = stepHtml;
          attachStep2Listeners();
        }
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

  function attachStep2Listeners() {
    document.getElementById('beneficiary-search')?.addEventListener('input', function() {
      formState.userSearch = this.value;
      formState.userPage = 1;
      const stepHtml = renderStep2();
      const contentEl = document.querySelector('.tab-content.block');
      if (contentEl) {
        contentEl.innerHTML = stepHtml;
        attachStep2Listeners();
      }
    });

    document.getElementById('user-page-prev')?.addEventListener('click', () => {
      if (formState.userPage > 1) {
        formState.userPage--;
        const stepHtml = renderStep2();
        const contentEl = document.querySelector('.tab-content.block');
        if (contentEl) {
          contentEl.innerHTML = stepHtml;
          attachStep2Listeners();
        }
      }
    });

    document.getElementById('user-page-next')?.addEventListener('click', () => {
      const totalPages = Math.ceil(formState.totalUsers / formState.userPageSize);
      if (formState.userPage < totalPages) {
        formState.userPage++;
        const stepHtml = renderStep2();
        const contentEl = document.querySelector('.tab-content.block');
        if (contentEl) {
          contentEl.innerHTML = stepHtml;
          attachStep2Listeners();
        }
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
    const payload = {
      letterReferenceNumber: d.letterReferenceNumber,
      letterDate: d.letterDate,
      requestingInstitutionId: d.requestingInstitutionId,
      registeredAt: d.registeredAt ? new Date(d.registeredAt).toISOString() : null,
      beneficiaries: formState.selectedBeneficiaries
    };

    const requestPromise = isEdit 
      ? store.apiService.put(`/house-allocation-requests/${id}`, payload)
      : store.apiService.post('/house-allocation-requests', payload);

    requestPromise
      .then(() => {
        Toast.success(isEdit ? 'Request updated successfully.' : 'Request created successfully.');
        if (modalInstance) modalInstance.close();
        store.syncWithBackend(true).then(renderAllocationRequests);
      })
      .catch(error => {
        console.error('Error saving request:', error);
        const message = error.response?.data?.message || 'Failed to save request.';
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
  
  // ✅ FIX: Use the correct URL path
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
  
  // Check if all beneficiaries have decisions
  const allHaveDecisions = beneficiaries.every(b => 
    b.deputyCeoDecision !== null && b.deputyCeoDecision !== undefined
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
  
  // ─── DETERMINE NEXT STATUS ─────────────────────────────────────────────
  
  let nextStatus = null;
  let action = '';
  
  // Calculate the conditional status based on beneficiaries
  const calculatedStatus = calculateRequestStatus(beneficiaries);
  
  // Use the calculated status if it's a conditional state
  if (['partial_waiting_list', 'partial_allocation', 'waiting_list', 'allocated'].includes(calculatedStatus)) {
    nextStatus = calculatedStatus;
  } else {
    // Normal workflow progression
    if (currentStatus === 'submitted') {
      if (!allHaveDecisions) {
        Toast.warning('Please review all beneficiaries before advancing.');
        window.openBeneficiaryDecisionModal(id, 'deputy');
        return;
      }
      if (hasRejected) {
        Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
        return;
      }
      nextStatus = 'under_deputy_ceo_review';
      action = 'deputy_ceo_start_review';
    } else if (currentStatus === 'under_deputy_ceo_review') {
      if (!allHaveDecisions) {
        Toast.warning('Please review all beneficiaries before advancing.');
        window.openBeneficiaryDecisionModal(id, 'deputy');
        return;
      }
      if (hasRejected) {
        Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
        return;
      }
      nextStatus = 'under_director_review';
      action = 'advance_to_director';
    } else if (currentStatus === 'under_director_review') {
      const allHaveDirectorDecisions = beneficiaries.every(b => 
        b.directorDecision !== null && b.directorDecision !== undefined
      );
      if (!allHaveDirectorDecisions) {
        Toast.warning('Please review all beneficiaries before advancing.');
        window.openBeneficiaryDecisionModal(id, 'director');
        return;
      }
      if (hasRejected) {
        Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
        return;
      }
      nextStatus = 'pending_team_leader_decision';
      action = 'advance_to_team_leader';
    } else if (currentStatus === 'pending_team_leader_decision') {
      const allHaveTeamLeaderDecisions = beneficiaries.every(b => 
        b.teamLeaderDecision !== null && b.teamLeaderDecision !== undefined
      );
      if (!allHaveTeamLeaderDecisions) {
        Toast.warning('Please review all beneficiaries before advancing.');
        window.openBeneficiaryDecisionModal(id, 'team_leader');
        return;
      }
      if (hasRejected) {
        Toast.warning('Some beneficiaries are unauthorized. Please handle them before advancing.');
        return;
      }
      nextStatus = 'under_team_officer_review';
      action = 'advance_to_team_officer';
    } else if (currentStatus === 'under_team_officer_review') {
      if (!allEligibleProcessed) {
        Toast.warning('Please process all eligible beneficiaries before advancing.');
        window.openBeneficiaryProcessingModal(id);
        return;
      }
      // Use calculated status (waiting_list, partial_waiting_list, partial_allocation, or allocated)
      nextStatus = calculatedStatus;
      action = 'process_to_waiting_list';
    } else {
      Toast.info('No further action available for current status');
      return;
    }
  }
  
  // ─── EXECUTE ADVANCE ────────────────────────────────────────────────────
  
  if (nextStatus) {
    console.log('Advancing from', currentStatus, 'to', nextStatus);
    
    // Call the appropriate API endpoint based on the action
    if (action === 'deputy_ceo_start_review') {
      store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/start-review`)
        .then(() => {
          Toast.success('Request advanced to Deputy CEO review.');
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch(error => {
          console.error('Error advancing workflow:', error);
          Toast.error('Failed to advance workflow. Please try again.');
        });
    } else {
      // For other actions, just update the status
      store.apiService.patch(`/house-allocation-requests/${id}/status`, { status: nextStatus })
        .then(() => {
          Toast.success(`Request advanced to ${nextStatus.replace(/_/g, ' ')}.`);
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch(error => {
          console.error('Error advancing workflow:', error);
          Toast.error('Failed to advance workflow. Please try again.');
        });
    }
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


function openBeneficiaryDecisionModal(requestId, role) {
  const item = store.allocationRequests.find(r => r.id === requestId);
  if (!item) {
    Toast.error('Request not found');
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
  
  // ✅ Map decision values to what backend expects (uppercase)
  const decisionMap = {
    'allowed': 'ALLOWED',
    'legal_revision_required': 'LEGAL_REVISION_REQUIRED',
    'unauthorized_by_directive': 'UNAUTHORIZED_BY_DIRECTIVE'
  };
  
  const decisionOptions = [
    { value: 'allowed', label: '✅ Allowed' },
    { value: 'legal_revision_required', label: '⚖️ Legal Revision Required' },
    { value: 'unauthorized_by_directive', label: '❌ Unauthorized by Directive' }
  ];
  
  let modalContent = `
    <div class="space-y-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p class="text-xs text-blue-700 flex items-center gap-2">
          <i class="fa-regular fa-circle-info"></i>
          <span>Review each beneficiary and make a decision. All beneficiaries must be reviewed before proceeding.</span>
        </p>
      </div>
      
      <div class="max-h-[400px] overflow-y-auto space-y-3">
  `;
  
  beneficiaries.forEach((ben, index) => {
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const name = individual ? getUserFullName(individual) : 'Unknown Beneficiary';
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    const instName = institution ? getInstitutionName(institution) : 'N/A';
    const currentStatus = ben.status || 'pending_review';
    const statusInfo = getBeneficiaryStatusInfo(currentStatus);
    
    // Get the appropriate decision field for this role
    const decisionField = role === 'deputy' ? 'deputyCeoDecision' :
                          role === 'director' ? 'directorDecision' :
                          role === 'team_leader' ? 'teamLeaderDecision' : '';
    const currentDecision = ben[decisionField] || '';
    
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
          <select id="ben-decision-${ben.id}" class="ben-decision-select w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" data-beneficiary-id="${ben.id}">
            <option value="">-- Select Decision --</option>
            ${decisionOptions.map(opt => `
              <option value="${opt.value}" ${currentDecision === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="mt-2">
          <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Comment</label>
          <textarea id="ben-comment-${ben.id}" class="ben-comment-textarea w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]" rows="1" placeholder="Add comment..." data-beneficiary-id="${ben.id}"></textarea>
        </div>
      </div>
    `;
  });
  
  modalContent += `
      </div>
    </div>
  `;
  
  Modal.open({
    title: `${roleLabel} Review - Beneficiary Decisions`,
    content: modalContent,
    isForm: true,
    confirmText: 'Submit All Decisions',
    onConfirm: function(modalEl) {
      let allReviewed = true;
      let selectedDecision = '';
      let selectedComment = '';
      
      // ✅ Since the backend applies the same decision to ALL beneficiaries,
      // we need to check if all beneficiaries have the SAME decision
      // or we need to collect individual decisions
      
      // For simplicity, we'll use the first beneficiary's decision
      // (The backend applies the same decision to all beneficiaries)
      let firstDecision = '';
      let firstComment = '';
      
      for (const ben of beneficiaries) {
        const decisionEl = document.getElementById(`ben-decision-${ben.id}`);
        const commentEl = document.getElementById(`ben-comment-${ben.id}`);
        
        const decision = decisionEl ? decisionEl.value : '';
        const comment = commentEl ? commentEl.value : '';
        
        if (!decision) {
          allReviewed = false;
          break;
        }
        
        if (!firstDecision) {
          firstDecision = decision;
          firstComment = comment;
        }
      }
      
      if (!allReviewed) {
        Toast.warning('Please make a decision for all beneficiaries.');
        return;
      }
      
      // ✅ Send the decision to the request-level endpoint
      const payload = {
        decision: decisionMap[firstDecision] || firstDecision,
        comment: firstComment || ''
      };
      
      store.apiService.patch(endpoint, payload)
        .then(() => {
          Toast.success(`All beneficiary decisions submitted by ${roleLabel}. Request advanced.`);
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
          <span>Process eligible beneficiaries by moving them to waiting list or allocating houses.</span>
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
            <option value="allocated">🏠 Allocate House</option>
          </select>
        </div>
        <div class="mt-2">
          <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Remarks</label>
          <textarea id="ben-remark-${ben.id}" rows="1" placeholder="Add remarks..." class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-[#714B67]"></textarea>
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
    confirmText: 'Process All',
    onConfirm: function(modalEl) {
      let allProcessed = true;
      const promises = [];
      
      eligibleBeneficiaries.forEach(ben => {
        const actionEl = document.getElementById(`ben-action-${ben.id}`);
        const remarkEl = document.getElementById(`ben-remark-${ben.id}`);
        
        const action = actionEl ? actionEl.value : '';
        const remark = remarkEl ? remarkEl.value : '';
        
        if (!action) {
          allProcessed = false;
          return;
        }
        
        // Update beneficiary status
        const payload = {
          status: action,
          reason: remark || `Processed by Team Officer`
        };
        
        promises.push(
          store.apiService.patch(`/house-allocation-requests/${requestId}/beneficiaries/${ben.id}/status`, payload)
        );
      });
      
      if (!allProcessed) {
        Toast.warning('Please select an action for all eligible beneficiaries.');
        return;
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
          Toast.error('Failed to process beneficiaries. Please try again.');
        });
    }
  });
}
// Alternative: Individual beneficiary decisions
// You would need a backend endpoint that supports per-beneficiary decisions

function submitIndividualDecisions(requestId, decisions, roleLabel) {
  const promises = [];
  
  decisions.forEach(item => {
    const payload = {
      decision: decisionMap[item.decision] || item.decision,
      comment: item.comment || ''
    };
    
    // This would require a different backend endpoint
    promises.push(
      store.apiService.patch(`/house-allocation-requests/${requestId}/beneficiaries/${item.beneficiaryId}/decision`, payload)
    );
  });
  
  return Promise.all(promises);
}


window.openBeneficiaryDecisionModal = openBeneficiaryDecisionModal;
window.openBeneficiaryProcessingModal = openBeneficiaryProcessingModal;
window.calculateRequestStatus = calculateRequestStatus;
window.areAllBeneficiariesReviewed = areAllBeneficiariesReviewed;
window.hasAnyBeneficiaryRejected = hasAnyBeneficiaryRejected;
window.getPendingBeneficiaries = getPendingBeneficiaries;

window.navigateToStatus = navigateToStatus;
window.renderAllocationRequests = renderAllocationRequests;
window.viewRequestDetails = viewRequestDetails;
window.openRequestForm = openRequestForm;
window.openAddBeneficiaryModal = openAddBeneficiaryModal;
window.openDecisionModal = openDecisionModal;
window.updateBeneficiaryStatus = updateBeneficiaryStatus;
window.openBeneficiaryRejectModal = openBeneficiaryRejectModal;
window.cancelRequest = cancelRequest;

// ✅ Add these if they're not already there:
window.deputyCeoStartReview = deputyCeoStartReview;
window.advanceWorkflow = window.advanceWorkflow; // already defined above
window.rollbackWorkflow = window.rollbackWorkflow; // already defined above
window.rejectWorkflow = rejectWorkflow;
window.cancelWorkflow = cancelWorkflow;
window.teamLeaderQueue = teamLeaderQueue;
window.teamLeaderMap = teamLeaderMap;
window.teamLeaderReject = teamLeaderReject;
window.retryRenderAllocationRequests = retryRenderAllocationRequests;