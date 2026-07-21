import { store } from '../../store';
import { Modal, Toast } from '../../components';
import { STATUS_MAP, WORKFLOW_STEPS, BENEFICIARY_STATUS_MAP, WORKFLOW_ROLE_MAP } from './constants';

import {
  isRendering,
  isFetchingUser,
  renderTimeout,
  storeUnsubscribe,
  currentFilter,
  searchQuery,
  setIsRendering,
  setIsFetchingUser,
  setRenderTimeout,
  setStoreUnsubscribe,
  setCurrentFilter,
  setSearchQuery
} from './state';
import {
  viewRequestDetails,
  openRequestForm,
  deputyCeoStartReview,
  openDecisionModal,
  teamLeaderQueue,
  teamLeaderMap,
  teamLeaderReject,
  cancelRequest,
  submitDraft,
  advanceWorkflow,
  submitDeputyCeoDecision,
  submitDirectorDecision,
   submitTeamLeaderDecision,   
    teamOfficerMoveToWaitingList,  // ✅ ADD THIS
  teamOfficerAllocateHouse    // ✅ ADD THIS

} from './actions';
import {
  attachFilterListeners,
  attachSearchListener,
  handleSearch,
  attachCardEventListeners,
  handleAction,
  confirmDeleteRequest,
  loadAndRenderCards
} from './listeners';
import {
  showError,
  getEmptyStateHTML,
  renderMetrics,
  getFilteredData,
  renderBeneficiarySummary,
  getWorkflowActions,
  renderRequestCard,
  renderInstitutionDetails,
  renderOdooStatusBar,
  renderWorkflowSteps,
  getBeneficiarySummaryBadges,
  renderTerminalStatus,
  renderReviewDetails,
  renderRequestDetailView,
  renderBeneficiaryDetails
} from './renderers';

export {
  STATUS_MAP,
  WORKFLOW_STEPS,
  BENEFICIARY_STATUS_MAP,
  WORKFLOW_ROLE_MAP
};

export function initAllocationRequests() {
  console.log('initAllocationRequests: Starting...');
  
  cleanupAllocationRequests();
  
  setStoreUnsubscribe(store.subscribe(() => {
    if (renderTimeout()) {
      clearTimeout(renderTimeout()!);
    }
    setRenderTimeout(window.setTimeout(() => {
      console.log('Store changed, re-rendering...');
      if (!isRendering()) {
        renderAllocationRequests();
      }
    }, 50));
  }));
  
  if (store.currentUser) {
    console.log('initAllocationRequests: User already loaded, rendering...');
    renderAllocationRequests();
    return;
  }
  
  console.log('initAllocationRequests: No user found, fetching...');
  
  store.initializeUser()
    .then(() => {
      console.log('initAllocationRequests: User initialized successfully');
      setTimeout(() => {
        if (!isRendering()) {
          console.log('initAllocationRequests: Forcing re-render after user load');
          renderAllocationRequests();
        }
      }, 50);
    })
    .catch((error) => {
      console.error('initAllocationRequests: Failed to initialize user:', error);
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
  
  renderAllocationRequests();
}

export function cleanupAllocationRequests() {
  console.log('cleanupAllocationRequests: Cleaning up...');
  
  if (storeUnsubscribe()) {
    storeUnsubscribe()!();
    setStoreUnsubscribe(null);
  }
  
  if (renderTimeout()) {
    clearTimeout(renderTimeout()!);
    setRenderTimeout(null);
  }
  
  setIsRendering(false);
  setIsFetchingUser(false);
}

export function renderAllocationRequests() {
  try {
    console.log('renderAllocationRequests: Starting...');
    
    if (isRendering()) {
      console.log('renderAllocationRequests: Already rendering, skipping...');
      return;
    }
    setIsRendering(true);

    store.allocationRequests = store.allocationRequests || [];

    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) {
      console.error('renderAllocationRequests: main-content-area not found!');
      setIsRendering(false);
      return;
    }

    contentArea.innerHTML = `
      <div class="min-h-screen bg-[#F8F9FA] p-6">
        <div class="max-w-[1600px] mx-auto">
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

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="metrics-grid">
            ${renderMetrics()}
          </div>

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

          <div id="requests-cards-container"></div>
        </div>
      </div>
    `;

    attachFilterListeners();
    
    document.getElementById('btn-create-request')?.addEventListener('click', () => openRequestForm());
    
    loadAndRenderCards();
    console.log('renderAllocationRequests: Completed successfully');
    
    setIsRendering(false);

  } catch (error) {
    console.error('renderAllocationRequests error:', error);
    showError('Failed to initialize allocation requests: ' + (error as Error).message);
    setIsRendering(false);
  }
}

window.retryRenderAllocationRequests = function() {
  setIsFetchingUser(false);
  setIsRendering(false);
  if (renderTimeout()) {
    clearTimeout(renderTimeout()!);
    setRenderTimeout(null);
  }
  initAllocationRequests();
};

// At the bottom of index.ts

// Expose functions to window for inline onclick handlers
// At the bottom of index.ts - after renderAllocationRequests()

// Expose functions to window for inline onclick handlers
window.submitDraft = submitDraft;
window.deputyCeoStartReview = deputyCeoStartReview;
window.submitDeputyCeoDecision = submitDeputyCeoDecision;
window.submitDirectorDecision = submitDirectorDecision;
window.submitTeamLeaderDecision = submitTeamLeaderDecision;  // ✅ ADDED
window.teamOfficerMoveToWaitingList = teamOfficerMoveToWaitingList;  // ✅ ADDED
window.teamOfficerAllocateHouse = teamOfficerAllocateHouse;  // ✅ ADDED
window.openDecisionModal = openDecisionModal;
window.cancelRequest = cancelRequest;
window.teamLeaderQueue = teamLeaderQueue;
window.teamLeaderMap = teamLeaderMap;
window.teamLeaderReject = teamLeaderReject;
window.advanceWorkflow = advanceWorkflow;
window.viewRequestDetails = viewRequestDetails;
window.openRequestForm = openRequestForm;
window.renderAllocationRequests = renderAllocationRequests;
window.retryRenderAllocationRequests = window.retryRenderAllocationRequests;
