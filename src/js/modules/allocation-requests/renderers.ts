/**
 * renderers.ts - House Allocation Requests Module
 * 
 * This file contains ALL rendering functions for the allocation requests module.
 * Each function generates HTML that is inserted into the DOM.
 * These are PURE functions - they don't fetch data or modify state, they just render.
 * 
 * @module renderers
 */

import { STATUS_MAP, WORKFLOW_STEPS, BENEFICIARY_STATUS_MAP } from './constants';
import { 
  getStatusInfo, 
  getBeneficiaryStatusInfo, 
  getBeneficiaryStatusColor, 
  getBeneficiaryStatusLabel, 
  getInstitutionName, 
  getUserFullName, 
  calculateRequestStatus, 
  hasAnyBeneficiaryRejected, 
  getPendingBeneficiaries, 
  areAllBeneficiariesReviewed 
} from './utils';
import { store } from '../../store';
import { Modal, Toast } from '../../components';
import { submitTeamOfficerDecision, viewRequestDetails } from './actions';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Displays an error message using the Toast component
 * 
 * @param message - The error message to display
 * @example
 * showError('Failed to load allocation requests');
 */
export function showError(message: string) {
  Toast.error(message);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMPTY STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders an empty state message when no allocation requests exist
 * Includes a search input that remains functional for filtering
 * 
 * @param searchQuery - The current search query to preserve in the input
 * @returns HTML string for the empty state
 * @example
 * getEmptyStateHTML('ministry of health') // Shows search term in input
 */
export function getEmptyStateHTML(searchQuery: string) {
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// METRICS DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders the 4 metric cards at the top of the allocation requests page
 * Shows: Total Intake, Approval Rate, Active Processing, Total Budget
 * 
 * @returns HTML string with 4 metric cards
 * @example
 * renderMetrics() // Shows: 15 requests, 67% approved, 8 active, $120k budget
 */
export function renderMetrics() {
  // Get all allocation requests from store
  const items = store.allocationRequests || [];
  
  // Calculate metrics
  const totalCount = items.length;
  const approvedCount = items.filter(i => i.status === 'APPROVED').length;
  const activeCount = items.filter(i => !['APPROVED', 'REJECTED', 'CANCELLED'].includes(i.status)).length;
  const totalBudget = items.reduce((sum, i) => sum + (i.budget || 0), 0);

  return `
    <!-- Card 1: Total Intake -->
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

    <!-- Card 2: Approval Rate -->
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

    <!-- Card 3: Active Processing -->
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

    <!-- Card 4: Total Budget -->
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA FILTERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Filters and sorts allocation requests based on current filter and search query
 * 
 * @param currentFilter - The active filter ('all', 'active', or a specific status)
 * @param searchQuery - The text to search for in reference numbers and titles
 * @returns Filtered and sorted array of allocation requests
 * 
 * @example
 * getFilteredData('active', 'ministry') 
 * // Returns all active requests containing 'ministry' in reference or title
 */
export function getFilteredData(currentFilter: string, searchQuery: string) {
  // Start with all requests
  let list = [...(store.allocationRequests || [])];

  // Apply status filter
  if (currentFilter === 'active') {
    // Show only requests that are NOT in terminal states
    list = list.filter(req => !['approved', 'rejected', 'cancelled'].includes((req.status || '').toLowerCase()));
  } else if (currentFilter !== 'all') {
    // Show only requests matching the specific status
    list = list.filter(req => (req.status || '').toLowerCase() === currentFilter.toLowerCase());
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(req => 
      (req.letterReferenceNumber || req.referenceNumber || '').toLowerCase().includes(q) ||
      (req.title || '').toLowerCase().includes(q)
    );
  }

  // Sort by creation date (newest first)
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return list;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST CARD - BENEFICIARY SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders a summary of beneficiaries for a request card
 * Shows up to 3 beneficiaries with their names, ranks, and statuses
 * 
 * @param item - The allocation request object
 * @returns HTML string showing beneficiary summary
 * 
 * @example
 * renderBeneficiarySummary(request) 
 * // Shows: 👤 John Doe 🎖️Director ✅ Eligible, 👤 Jane Smith ⏳ Waiting
 */
export function renderBeneficiarySummary(item: any) {
  const beneficiaries = item.beneficiaries || [];
  let html = '';

  // Show first 3 beneficiaries
  for (let i = 0; i < Math.min(beneficiaries.length, 3); i++) {
    const ben = beneficiaries[i];
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    let name = 'N/A';
    let rank = 'N/A';
    const status = ben.status || 'WAITING';
    const statusColor = getBeneficiaryStatusColor(status);
    
    if (individual) {
      // Beneficiary is an individual person
      name = getUserFullName(individual);
      
      // Get their rank if available
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
      // Beneficiary is an institution
      name = getInstitutionName(institution);
      html += `
        <div class="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
          <span class="text-[10px] font-medium text-slate-700">🏛️ ${name}</span>
          <span class="px-1.5 py-0.5 ${statusColor} text-[8px] font-bold rounded">${status}</span>
        </div>
      `;
    }
  }
  
  // Show "+N more" if there are more than 3 beneficiaries
  if (beneficiaries.length > 3) {
    html += `
      <div class="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
        <span class="text-[10px] font-medium text-slate-500">+${beneficiaries.length - 3} more</span>
      </div>
    `;
  }
  
  return html || '<span class="text-xs text-slate-400">No beneficiaries</span>';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST CARD - WORKFLOW ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders workflow action buttons for a request card
 * Shows different buttons based on the request's current status
 * 
 * @param item - The allocation request object
 * @returns HTML string with action buttons
 * 
 * @example
 * getWorkflowActions(request) 
 * // For 'submitted' status: Shows "Start Deputy Review" and "Cancel"
 * // For 'under_deputy_ceo_review': Shows "Submit Decision" and "Cancel"
 */
export function getWorkflowActions(item: any) {
  const status = (item.status || 'SUBMITTED').toUpperCase();
  const id = item.id;
  
  // Define action button sets for each status
  const actionSets = {
    // Status: Submitted - Deputy CEO can start review
    'SUBMITTED': `
      <button class="action-btn px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded transition-colors" data-action="deputy-start" data-request-id="${id}">
        <i class="fa-regular fa-play mr-1"></i>Start Deputy Review
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="cancel" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Cancel
      </button>
    `,
    
    // Status: Under Deputy CEO Review - Deputy CEO can submit decision
    'UNDER_DEPUTY_CEO_REVIEW': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="deputy-decision" data-request-id="${id}">
        <i class="fa-regular fa-check mr-1"></i>Submit Decision
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="cancel" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Cancel
      </button>
    `,
    
    // Status: Under Director Review - Director can submit decision
    'UNDER_DIRECTOR_REVIEW': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="director-decision" data-request-id="${id}">
        <i class="fa-regular fa-check mr-1"></i>Submit Decision
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="cancel" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Cancel
      </button>
    `,
    
    // Status: Ready for Team Leader - Team Leader can queue, map, or reject
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
    
    // Status: Queued - Can map or reject
    'QUEUED': `
      <button class="action-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors" data-action="map" data-request-id="${id}">
        <i class="fa-regular fa-map mr-1"></i>Map
      </button>
      <button class="action-btn px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-colors" data-action="reject" data-request-id="${id}">
        <i class="fa-regular fa-xmark mr-1"></i>Reject
      </button>
    `
  };

  // Default: View button for any other status
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST CARD - MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders a single allocation request card for the list view
 * Includes: reference, priority, date, title, status, beneficiary summary, actions
 * 
 * @param item - The allocation request object
 * @returns HTML string for a single request card
 * 
 * @example
 * renderRequestCard(request) 
 * // Returns a clickable card with all request information
 */
export function renderRequestCard(item: any) {
  // Get status information (label and color)
  const statusInfo = getStatusInfo(item.status);
  
  // Get institution name (requesting institution)
  const instName = getInstitutionName(item.requestingInstitution || item.institution);
  
  const beneficiaries = item.beneficiaries || [];
  const ref = item.letterReferenceNumber || item.referenceNumber || 'N/A';
  const letterDate = item.letterDate ? new Date(item.letterDate).toLocaleDateString() : 'N/A';
  const queuePriority = item.queuePriority ? `Priority: ${item.queuePriority}` : '';
  
  // Determine priority color
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
      <!-- Header: Reference, Priority, Date, Title -->
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
        
        <!-- Status Badge -->
        <div class="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span class="px-2.5 py-0.5 ${statusInfo.color} border text-[10px] font-bold rounded-full whitespace-nowrap">${statusInfo.label}</span>
          <span class="text-[10px] text-slate-400">${beneficiaries.length} beneficiaries</span>
        </div>
      </div>

      <!-- Beneficiary Summary -->
      <div class="mt-3 pt-3 border-t border-slate-100">
        <div class="flex flex-wrap gap-1.5">
          ${renderBeneficiarySummary(item)}
        </div>
      </div>

      <!-- Workflow Action Buttons -->
      ${getWorkflowActions(item)}
    </div>
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSTITUTION DETAILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders detailed institution information for the request detail view
 * Shows: name, code, type, category, tier, contact info, registration numbers, labels
 * 
 * @param inst - The institution object
 * @returns HTML string with institution details
 * 
 * @example
 * renderInstitutionDetails(institution) 
 * // Shows full institution profile with all metadata
 */
export function renderInstitutionDetails(inst: any) {
  if (!inst) {
    return '<div class="col-span-full text-sm text-slate-400">No institution information available.</div>';
  }

  const tier = inst.currentTier || null;
  const category = inst.category || null;
  const labels = inst.labels || [];

  return `
    <!-- Column 1: Basic Info -->
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

    <!-- Column 2: Classification -->
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
        ` : '<p class="text-sm text-slate-400">No tier assigned</p>'}
      </div>
    </div>

    <!-- Column 3: Contact & Registration -->
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW STATUS BAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders the workflow status bar for the request detail view
 * Determines the current status based on beneficiaries and renders appropriate view
 * 
 * @param item - The allocation request object
 * @returns HTML string with workflow status bar
 * 
 * @example
 * renderOdooStatusBar(request) 
 * // Shows: Draft → Submitted → Deputy CEO Review (active) → Director Review → Team Leader Review
 */
export function renderOdooStatusBar(item: any) {
  const currentStatus = (item.status || 'draft').toLowerCase();
  const beneficiaries = item.beneficiaries || [];
  
  // Calculate status based on beneficiary statuses
  const calculatedStatus = calculateRequestStatus(beneficiaries);
  
  // Use calculated status if it's a terminal/conditional state
  const displayStatus = ['partial_waiting_list', 'partial_allocation', 'waiting_list', 'allocated'].includes(calculatedStatus) 
    ? calculatedStatus 
    : currentStatus;
  
  // Find current step index
  const currentIndex = WORKFLOW_STEPS.findIndex(step => step.key === displayStatus);
  
  // Handle cases where status is not found
  if (currentIndex === -1) {
    const fallbackIndex = WORKFLOW_STEPS.findIndex(step => step.key === currentStatus);
    if (fallbackIndex !== -1) {
      return renderWorkflowSteps(item, fallbackIndex, displayStatus);
    }
    return renderTerminalStatus('UNKNOWN', 'Unknown', 'bg-gray-600 text-white border-gray-700', item);
  }

  // If all beneficiaries are allocated, show terminal status
  if (displayStatus === 'allocated') {
    return renderTerminalStatus('ALLOCATED', 'Allocated', 'bg-emerald-600 text-white border-emerald-700', item);
  }

  // Render the workflow steps
  return renderWorkflowSteps(item, currentIndex, displayStatus);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS (Internal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Checks if the current user is a super admin
 * 
 * @returns boolean - true if user is super admin
 */
function isSuperAdmin() {
  return store.isSuperAdmin();
}

/**
 * Gets the current user's role keys
 * 
 * @returns string[] - array of role keys
 */
function getCurrentUserRoleKeys() {
  return store.getCurrentUserRoleKeys();
}

/**
 * Renders beneficiary status summary badges for the workflow bar
 * Shows counts of eligible, waiting, allocated, and rejected beneficiaries
 * 
 * @param beneficiaries - Array of beneficiary objects
 * @returns HTML string with status badges
 */
function getBeneficiarySummaryBadges(beneficiaries: any[]) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return '';
  }

  // Count beneficiaries by status
  const eligible = beneficiaries.filter(b => (b.status || '').toLowerCase() === 'eligible').length;
  const waiting = beneficiaries.filter(b => (b.status || '').toLowerCase() === 'waiting_list').length;
  const allocated = beneficiaries.filter(b => (b.status || '').toLowerCase() === 'allocated').length;
  const rejected = beneficiaries.filter(b => (b.status || '').toLowerCase() === 'unauthorized_by_directive').length;
  const total = beneficiaries.length;

  let html = '<div class="flex flex-wrap gap-1.5">';
  
  // Show each status with appropriate color
  if (eligible > 0) {
    html += `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">✓ ${eligible} Eligible</span>`;
  }
  if (waiting > 0) {
    html += `<span class="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-bold">🕒 ${waiting} Waiting</span>`;
  }
  if (allocated > 0) {
    html += `<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">🏠 ${allocated} Allocated</span>`;
  }
  if (rejected > 0) {
    html += `<span class="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">✗ ${rejected} Rejected</span>`;
  }
  
  html += `<span class="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold">Total: ${total}</span>`;
  html += '</div>';
  
  return html;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW STEPS RENDERER (Main Workflow UI)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders the detailed workflow steps with progress bar * This is the main workflow UI that appears in the request detail view
 * Shows: revision banner, action buttons, beneficiary status, progress steps
 * 
 * @param item - The allocation request object
 * @param currentIndex - The index of the current workflow step
 * @param displayStatus - The status to display
 * @returns HTML string with full workflow UI
 */
export function renderWorkflowSteps(item: any, currentIndex: number, displayStatus: string) {
  // Calculate progress percentage
  const progressPercent = ((currentIndex + 1) / WORKFLOW_STEPS.length) * 100;
  const userIsAdmin = isSuperAdmin();
  const beneficiaries = item.beneficiaries || [];
  
  // Check beneficiary review status
  const allReviewed = areAllBeneficiariesReviewed(beneficiaries);
  const pendingBeneficiaries = getPendingBeneficiaries(beneficiaries);
  const hasRejected = hasAnyBeneficiaryRejected(beneficiaries);
  
  const currentStatus = (item.status || 'draft').toLowerCase();
  
  // Determine if user can act on this request
  let userCanAct = userIsAdmin;
  let actionButtons = '';
  
  // ─── REVISION BANNER ──────────────────────────────────────────────────────
  // Show revision banner if any beneficiary needs revision
  let revisionBanner = '';
  if (currentStatus === 'submitted' || currentStatus === 'pending_team_leader_decision') {
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
  // Show submit draft button for draft status
  if (currentStatus === 'draft' && userCanAct) {
    actionButtons = `
      <button onclick="window.submitDraft('${item.id}')" 
        class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg shadow-sm">
        <i class="fa-regular fa-paper-plane"></i> Submit Draft
      </button>
    `;
  }

  // ─── RENDER WORKFLOW UI ──────────────────────────────────────────────────
  return `
    ${revisionBanner}
    <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
      <!-- Header: Title + Action Buttons -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Request Workflow</h3>
          ${getBeneficiarySummaryBadges(beneficiaries)}
        </div>
        ${actionButtons}
      </div>
      
      <!-- Progress Bar with Steps -->
      <div class="relative">
        <!-- Background Progress Bar -->
        <div class="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full -translate-y-1/2"></div>
        
        <!-- Filled Progress Bar -->
        <div class="absolute top-1/2 left-0 h-1 bg-[#714B67] rounded-full -translate-y-1/2 transition-all duration-500" style="width: ${progressPercent}%"></div>
        
        <!-- Steps -->
        <div class="flex items-center justify-between relative z-10">
          ${WORKFLOW_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isConditional = step.conditional;
            
            // Determine styling for each step
            let stepClass = 'flex flex-col items-center';
            let circleClass = 'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all';
            let labelClass = 'text-xs mt-2 font-medium';
            
            if (isCompleted) {
              // Completed steps: purple filled circle with white text
              circleClass += ' bg-[#714B67] border-[#714B67] text-white';
              labelClass += ' text-[#714B67]';
            } else if (isCurrent) {
              // Current step: white circle with purple border and ring
              circleClass += ' bg-white border-[#714B67] text-[#714B67] ring-2 ring-[#714B67]/20';
              labelClass += ' text-[#714B67] font-bold';
            } else {
              // Pending steps: gray circle
              circleClass += ' bg-white border-slate-300 text-slate-400';
              labelClass += ' text-slate-400';
              if (isConditional) {
                circleClass += ' opacity-50';
                labelClass += ' opacity-50';
              }
            }
            
            return `
              <div class="${stepClass}">
                <div class="${circleClass}">
                  <i class="${step.icon} text-sm"></i>
                </div>
                <span class="${labelClass}">${step.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TERMINAL STATUS RENDERER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders a terminal status view (allocated, waiting list, etc.)
 * Shows a large status icon with label and description
 * 
 * @param status - The status key (e.g., 'ALLOCATED')
 * @param label - The display label (e.g., 'Allocated')
 * @param className - CSS classes for the status icon
 * @param item - The allocation request object
 * @returns HTML string with terminal status view
 */
export function renderTerminalStatus(status: string, label: string, className: string, item: any) {
  const beneficiaries = item.beneficiaries || [];
  
  return `
    <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Request Status</h3>
          ${getBeneficiarySummaryBadges(beneficiaries)}
        </div>
      </div>
      
      <div class="flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 ${className}">
            <i class="fa-regular fa-circle-check text-2xl"></i>
          </div>
          <h4 class="text-lg font-bold text-slate-800">${label}</h4>
          <p class="text-sm text-slate-500 mt-1">This request has been ${label.toLowerCase()}</p>
        </div>
      </div>
    </div>
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW DECISIONS RENDERER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders review decisions from all reviewers (Deputy CEO, Director, Team Leader, Team Officer)
 * Shows each reviewer's decision and reason for each beneficiary
 * 
 * @param item - The allocation request object
 * @returns HTML string with review decisions
 */
export function renderReviewDetails(item: any) {
  const beneficiaries = item.beneficiaries || []

   // ✅ DEBUG: Log what decisions exist
  console.log('=== REVIEW DECISIONS DEBUG ===');
  console.log('Beneficiaries:', beneficiaries.length);
  beneficiaries.forEach((b, i) => {
    console.log(`Beneficiary ${i+1}:`, {
      deputyCeoDecision: b.deputyCeoDecision,
      directorDecision: b.directorDecision,
      teamLeaderDecision: b.teamLeaderDecision,
      teamOfficerDecision: b.teamOfficerDecision
    });
  });
  console.log('===============================');
  
  // Define all possible reviewer roles
  const reviewDecisions = [
    { role: 'deputyCeoDecision', label: 'Deputy CEO' },
    { role: 'directorDecision', label: 'Director' },
    { role: 'teamLeaderDecision', label: 'Team Leader' },
    { role: 'teamOfficerDecision', label: 'Team Officer' }
  ];
  
  let html = '';
  
  // For each reviewer role, show their decisions
  reviewDecisions.forEach(({ role, label }) => {
    // Check if any beneficiary has a decision from this reviewer
    const hasDecisions = beneficiaries.some(b => b[role] !== null && b[role] !== undefined);
    if (!hasDecisions) return;
    
    html += `
      <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden mt-6">
        <div class="bg-[#714B67]/5 border-b border-[#E5E7EB] px-6 py-3 flex items-center gap-2">
          <i class="fa-regular fa-user text-[#714B67]"></i>
          <h3 class="text-sm font-bold text-slate-800">${label} Decisions</h3>
        </div>
        <div class="p-6">
          <div class="space-y-3">
            ${beneficiaries.filter(b => b[role]).map(b => {
              const individual = b.beneficiaryIndividual || b.individual || null;
              const name = individual ? getUserFullName(individual) : 'Beneficiary';
              const decision = b[role];
              const reason = b[`${role}Reason`] || '';
              
              // Determine badge color based on decision
              let decisionBadge = '';
              if (decision === 'allowed') {
                decisionBadge = '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">✓ Allowed</span>';
              } else if (decision === 'legal_revision_required') {
                decisionBadge = '<span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">⚖️ Legal Revision</span>';
              } else if (decision === 'unauthorized_by_directive') {
                decisionBadge = '<span class="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">✗ Rejected</span>';
              }
              
              return `
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-slate-800">${name}</span>
                    ${decisionBadge}
                  </div>
                  ${reason ? `<p class="text-xs text-slate-500 mt-1">${reason}</p>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  });
  
  return html;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST DETAIL VIEW (Main Detail Page)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders the full request detail view
 * This is the main detail page shown when a user clicks on a request card
 * Includes: back button, workflow status, header, institution details, beneficiaries, review decisions
 * 
 * @param item - The allocation request object
 * @returns void - Renders directly to the DOM
 * 
 * @example
 * renderRequestDetailView(request)
 * // Shows full detail page with all request information
 */
export function renderRequestDetailView(item: any) {
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

    contentArea.innerHTML = `
      <div class="min-h-screen bg-[#F8F9FA] p-6">
        <div class="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
          <!-- Back Button -->
          <button onclick="renderAllocationRequests()" class="flex items-center gap-2 text-sm text-slate-600 hover:text-[#714B67] transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <i class="fa-solid fa-arrow-left"></i> Back to Requests
          </button>

          <!-- Workflow Status Bar -->
          ${renderOdooStatusBar(item)}

          <!-- Request Header -->
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
              <!-- Edit Button (only for non-terminal statuses) -->
              <div class="flex gap-2 flex-wrap">
                ${!['allocated', 'partial_allocation', 'waiting_list'].includes((item.status || '').toLowerCase()) ? `
                  <button onclick="window.openRequestForm('${item.id}')" class="px-3 py-1.5 bg-[#714B67] hover:bg-[#5f3e56] text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                    <i class="fa-regular fa-pen mr-1"></i>Edit
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Institution Details -->
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
                <span class="text-xs text-slate-500">Total: ${beneficiaries.length} beneficiary${beneficiaries.length !== 1 ? 'ies' : ''}</span>
              </div>
            </div>
            <div class="p-6">
              ${renderBeneficiaryDetails(beneficiaries, item.status, item.id)}
            </div>
          </div>

          <!-- Review Decisions -->
          ${renderReviewDetails(item)}

          <!-- Timestamps Footer -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4 flex justify-between text-xs text-slate-400">
            <span>Created: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</span>
            <span>Last Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
    
    // Attach event listeners for beneficiary actions
    setTimeout(() => {
      attachBeneficiaryDropdownListeners(item.id, '');
      attachSelectAllListeners(item.id);
      attachBulkActionListeners(item.id, '');
    }, 100);
    
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
                <p class="text-sm text-rose-600 mt-1">${(error as Error).message}</p>
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BENEFICIARY DETAILS TABLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders the detailed beneficiary table with all fields
 * Includes: name, institution, title, rank, contact, ID numbers, status, actions
 * 
 * @param beneficiaries - Array of beneficiary objects
 * @param requestStatus - The current status of the request
 * @param requestId - The ID of the request
 * @returns HTML string with beneficiary table
 */
// ─── RENDER BENEFICIARY DETAILS ──────────────────────────────────────────

export function renderBeneficiaryDetails(beneficiaries: any[], requestStatus: string, requestId: string) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return '<div class="text-center text-sm text-slate-400 py-8">No beneficiaries assigned to this request.</div>';
  }

  // ─── ROLE CHECKS ──────────────────────────────────────────────────────────
  const currentUserRoles = getCurrentUserRoleKeys();
  const isDeputyCEO = currentUserRoles.includes('deputy_ceo');
  const isDirector = currentUserRoles.includes('director');
  const isTeamLeader = currentUserRoles.includes('team_leader');
  const isTeamOfficer = currentUserRoles.includes('team_officer');
  const isAdmin = isSuperAdmin();
  
  // ─── Determine which role can act ──────────────────────────────────────
  let canActOnBeneficiaries = false;
  let roleForActions = '';
  let decisionField = '';
  
  // Check which review stage we're in
  if (requestStatus === 'under_deputy_ceo_review' && (isDeputyCEO || isAdmin)) {
    canActOnBeneficiaries = true;
    roleForActions = 'deputy';
    decisionField = 'deputyCeoDecision';
  } else if (requestStatus === 'under_director_review' && (isDirector || isAdmin)) {
    canActOnBeneficiaries = true;
    roleForActions = 'director';
    decisionField = 'directorDecision';
  } else if (requestStatus === 'pending_team_leader_decision' && (isTeamLeader || isAdmin)) {
    canActOnBeneficiaries = true;
    roleForActions = 'team_leader';
    decisionField = 'teamLeaderDecision';
  } else if (requestStatus === 'under_team_officer_review' && (isTeamOfficer || isAdmin)) {
    canActOnBeneficiaries = true;
    roleForActions = 'team_officer';
    decisionField = 'teamOfficerDecision';
  }

  // ─── BUILD HTML ──────────────────────────────────────────────────────────
  let html = `
    <div class="overflow-x-auto">
      ${canActOnBeneficiaries ? `
      <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="text-xs text-blue-700 flex items-center gap-2">
          <i class="fa-regular fa-circle-info"></i>
          <span>You are reviewing beneficiaries for this request. Click "Review" on each beneficiary to make a decision.</span>
        </p>
      </div>
      ` : ''}

      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50">
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Beneficiary</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">🏛️ Institution</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">📌 Title</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">🎖️ Rank</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
            ${canActOnBeneficiaries ? `<th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Review Status</th>` : ''}
            ${canActOnBeneficiaries ? `<th class="px-3 py-2 text-left text-xs font-semibold text-slate-600">Actions</th>` : ''}
          </tr>
        </thead>
        <tbody>
  `;

  for (let i = 0; i < beneficiaries.length; i++) {
    const ben = beneficiaries[i];
    const individual = ben.beneficiaryIndividual || ben.individual || null;
    const institution = ben.beneficiaryInstitution || ben.institution || null;
    const benStatus = ben.status || 'PENDING_REVIEW';
    const statusColor = getBeneficiaryStatusColor(benStatus);
    
    // ─── Check if this beneficiary has been reviewed by the current role ──
    const hasBeenReviewed = ben[decisionField] !== null && ben[decisionField] !== undefined;
    const canActOnThisBeneficiary = canActOnBeneficiaries && !hasBeenReviewed;

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

    let statusCell = `
      <span class="px-2 py-0.5 ${statusColor} text-[10px] font-bold rounded">${benStatus}</span>
      ${ben.reason ? `<p class="text-[10px] text-slate-400 mt-1">${ben.reason}</p>` : ''}
    `;

    // ─── REVIEW STATUS CELL ──────────────────────────────────────────────
    let reviewStatusCell = '';
    if (canActOnBeneficiaries) {
      if (hasBeenReviewed) {
        const decision = ben[decisionField];
        let decisionLabel = '';
        if (decision === 'ALLOWED' || decision === 'allowed') {
          decisionLabel = '✅ Allowed';
        } else if (decision === 'LEGAL_REVISION_REQUIRED' || decision === 'legal_revision_required') {
          decisionLabel = '⚖️ Legal Revision';
        } else if (decision === 'UNAUTHORIZED_BY_DIRECTIVE' || decision === 'unauthorized_by_directive') {
          decisionLabel = '❌ Rejected';
        } else {
          decisionLabel = decision;
        }
        reviewStatusCell = `
          <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded">
            ${decisionLabel}
          </span>
        `;
      } else {
        reviewStatusCell = `
          <span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded animate-pulse">
            ⏳ Pending Review
          </span>
        `;
      }
    }

    // ─── ACTION BUTTON ────────────────────────────────────────────────────
    let actionCell = '';
    if (canActOnThisBeneficiary) {
      const beneficiaryName = fullName.replace(/'/g, "\\'");
      actionCell = `
        <button class="review-beneficiary-btn px-3 py-1.5 bg-[#714B67] hover:bg-[#5f3e56] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                data-request-id="${requestId}"
                data-beneficiary-id="${ben.id}"
                data-beneficiary-name="${beneficiaryName}"
                data-role="${roleForActions}">
          <i class="fa-regular fa-pen mr-1"></i> Review
        </button>
      `;
    } else if (canActOnBeneficiaries && hasBeenReviewed) {
      actionCell = `
        <span class="text-[10px] text-slate-400 italic">Reviewed ✓</span>
      `;
    }

    html += `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
          ${statusCell}
        </td>
        ${canActOnBeneficiaries ? `<td class="px-3 py-3">${reviewStatusCell}</td>` : ''}
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
  setTimeout(() => {
    attachReviewButtonListeners();
  }, 100);
  
  return html;
}

// ─── ATTACH REVIEW BUTTON LISTENERS ─────────────────────────────────────

function attachReviewButtonListeners() {
  document.querySelectorAll('.review-beneficiary-btn').forEach(btn => {
    btn.removeEventListener('click', handleReviewClick);
    btn.addEventListener('click', handleReviewClick);
  });
}

function handleReviewClick(e: Event) {
  const btn = e.currentTarget as HTMLElement;
  const requestId = btn.dataset.requestId!;
  const beneficiaryId = btn.dataset.beneficiaryId!;
  const beneficiaryName = btn.dataset.beneficiaryName || 'this beneficiary';
  const role = btn.dataset.role!;
  
  // ✅ Open the decision modal for this specific beneficiary
  openIndividualDecisionModal(requestId, beneficiaryId, beneficiaryName, role);
}

// ─── OPEN INDIVIDUAL DECISION MODAL ─────────────────────────────────────

function openIndividualDecisionModal(requestId: string, beneficiaryId: string, beneficiaryName: string, role: string) {
  const roleLabel = role === 'deputy' ? 'Deputy CEO' : 
                     role === 'director' ? 'Director' : 
                     role === 'team_leader' ? 'Team Leader' : 'Reviewer';

  Modal.open({
    title: `${roleLabel} Review`,
    content: `
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-700 flex items-center gap-2">
            <i class="fa-regular fa-user"></i>
            <span>Reviewing: <strong>${beneficiaryName}</strong></span>
          </p>
        </div>
        
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Decision <span class="text-rose-500">*</span></label>
          <select id="individual-decision-select" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="ALLOWED">✅ Allowed</option>
            <option value="LEGAL_REVISION_REQUIRED">⚖️ Legal Revision Required</option>
            <option value="UNAUTHORIZED_BY_DIRECTIVE">❌ Unauthorized by Directive</option>
          </select>
        </div>
        
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Comment <span class="text-rose-500" id="comment-required">*</span></label>
          <textarea id="individual-decision-comment" rows="3" placeholder="Add your review comment..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
          <p class="text-[10px] text-slate-400 mt-1">Comment is required for non-approval decisions.</p>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Submit Decision',
    onConfirm: (modalEl: HTMLElement) => {
      const decision = (modalEl.querySelector('#individual-decision-select') as HTMLSelectElement)?.value || 'ALLOWED';
      const comment = (modalEl.querySelector('#individual-decision-comment') as HTMLTextAreaElement)?.value || '';

      if (decision !== 'ALLOWED' && (!comment || comment.trim() === '')) {
        Toast.error('Comment is required for non-approval decisions.');
        return;
      }

      // ✅ Submit the decision for this beneficiary
       const submitFn = role === 'deputy' ? submitDeputyCeoDecision :
                    role === 'director' ? submitDirectorDecision :
                    role === 'team_leader' ? submitTeamLeaderDecision :
                    role === 'team_officer' ? submitTeamOfficerDecision : null;

      if (submitFn) {
        submitFn(requestId, beneficiaryId, decision, comment);
      }
    }
  });
}

// ─── IMPORT SUBMIT FUNCTIONS ────────────────────────────────────────────

import { 
  submitDeputyCeoDecision, 
  submitDirectorDecision, 
  submitTeamLeaderDecision 
} from './actions';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BENEFICIARY EVENT LISTENERS (Internal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Attaches dropdown toggle and action handlers for beneficiary actions
 * Handles: approve, legal revision, reject
 * 
 * @param requestId - The ID of the request
 * @param role - The role of the current user
 */
function attachBeneficiaryDropdownListeners(requestId: string, role: string) {
  // Toggle dropdown on button click
  document.querySelectorAll('.beneficiary-action-btn').forEach(btn => {
    btn.addEventListener('click', toggleBeneficiaryDropdown);
  });

  // Approve action
  document.querySelectorAll('.dropdown-approve').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const beneficiaryId = (this as HTMLElement).dataset.beneficiaryId;
      if (beneficiaryId) {
        closeAllBeneficiaryDropdowns();
        handleBeneficiaryApprove(requestId, beneficiaryId, role);
      }
    });
  });

  // Legal Revision action
  document.querySelectorAll('.dropdown-legal-revision').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const beneficiaryId = (this as HTMLElement).dataset.beneficiaryId;
      if (beneficiaryId) {
        closeAllBeneficiaryDropdowns();
        handleBeneficiaryLegalRevision(requestId, beneficiaryId, role);
      }
    });
  });

  // Reject action
  document.querySelectorAll('.dropdown-reject').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const beneficiaryId = (this as HTMLElement).dataset.beneficiaryId;
      const beneficiaryName = (this as HTMLElement).dataset.beneficiaryName || 'this beneficiary';
      if (beneficiaryId) {
        closeAllBeneficiaryDropdowns();
        openBeneficiaryRejectModal(requestId, beneficiaryId, beneficiaryName, role);
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', closeAllBeneficiaryDropdowns);
}

/**
 * Toggles the visibility of a beneficiary action dropdown
 */
function toggleBeneficiaryDropdown(e: Event) {
  e.stopPropagation();
  const btn = e.currentTarget as HTMLElement;
  const dropdown = btn.parentElement?.querySelector('.beneficiary-dropdown');
  if (dropdown) {
    document.querySelectorAll('.beneficiary-dropdown').forEach(d => {
      if (d !== dropdown) d.classList.add('hidden');
    });
    dropdown.classList.toggle('hidden');
  }
}

/**
 * Closes all beneficiary action dropdowns
 */
function closeAllBeneficiaryDropdowns() {
  document.querySelectorAll('.beneficiary-dropdown').forEach(d => {
    d.classList.add('hidden');
  });
}

/**
 * Handles approving a single beneficiary
 * Opens a modal for confirmation and reason
 */
function handleBeneficiaryApprove(requestId: string, beneficiaryId: string, role: string) {
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
          <textarea id="beneficiary-approve-comment" rows="3" placeholder="Add any remarks..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Approve Beneficiary',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
    onConfirm: (modalEl: HTMLElement) => {
      const comment = (modalEl.querySelector('#beneficiary-approve-comment') as HTMLTextAreaElement)?.value || '';
      
      // Update beneficiary status to 'eligible'
      const payload = { 
        status: 'eligible',
        reason: comment || 'Approved by reviewer'
      };
      
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

/**
 * Handles marking a beneficiary for legal revision
 * Opens a modal for confirmation and reason
 */
function handleBeneficiaryLegalRevision(requestId: string, beneficiaryId: string, role: string) {
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
          <textarea id="legal-revision-reason" rows="3" placeholder="Enter legal revision reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Submit Legal Revision',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
    onConfirm: (modalEl: HTMLElement) => {
      const reason = (modalEl.querySelector('#legal-revision-reason') as HTMLTextAreaElement)?.value || '';
      
      // Update beneficiary status to 'under_legal_revision'
      const payload = { 
        status: 'under_legal_revision',
        reason: reason || 'Legal revision required'
      };
      
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

/**
 * Handles rejecting a single beneficiary
 * Opens a modal for confirmation and rejection reason
 */
function openBeneficiaryRejectModal(requestId: string, beneficiaryId: string, beneficiaryName: string, role: string) {
  Modal.open({
    title: 'Reject Beneficiary',
    content: `
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
          <p class="text-xs text-rose-700 flex items-center gap-2">
            <i class="fa-regular fa-circle-xmark"></i>
            <span>Are you sure you want to reject ${beneficiaryName}?</span>
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
          <textarea id="beneficiary-reject-reason" rows="3" placeholder="Enter rejection reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Reject Beneficiary',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: (modalEl: HTMLElement) => {
      const reason = (modalEl.querySelector('#beneficiary-reject-reason') as HTMLTextAreaElement)?.value || '';
      if (!reason.trim()) {
        Toast.error('Rejection reason is required.');
        return;
      }
      
      // Update beneficiary status to 'unauthorized_by_directive'
      const payload = { 
        status: 'unauthorized_by_directive',
        reason: reason.trim()
      };
      
      store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
        .then(() => {
          Toast.success('Beneficiary rejected successfully.');
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SELECT ALL AND BULK ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Attaches "Select All" and bulk action listeners for beneficiary table
 * Handles: select all checkboxes and bulk approve/reject/legal revision
 */
function attachSelectAllListeners(requestId: string) {
  const selectAllHeader = document.getElementById('select-all-beneficiaries-header');
  const selectAll = document.getElementById('select-all-beneficiaries');
  const checkboxes = document.querySelectorAll('.beneficiary-select');
  const selectedCount = document.getElementById('selected-count');
  const bulkApproveBtn = document.getElementById('bulk-approve-btn');
  const bulkRejectBtn = document.getElementById('bulk-reject-btn');
  const bulkLegalRevisionBtn = document.getElementById('bulk-legal-revision-btn');

  /**
   * Updates the selected count and bulk action button states
   */
  function updateSelectedCount() {
    const checked = document.querySelectorAll('.beneficiary-select:checked');
    const total = document.querySelectorAll('.beneficiary-select:not(:disabled)');
    const count = checked.length;
    
    if (selectedCount) {
      selectedCount.textContent = `${count} selected`;
    }
    
    // Enable/disable bulk action buttons
    if (bulkApproveBtn) {
      bulkApproveBtn.disabled = count === 0;
    }
    if (bulkRejectBtn) {
      bulkRejectBtn.disabled = count === 0;
    }
    if (bulkLegalRevisionBtn) {
      bulkLegalRevisionBtn.disabled = count === 0;
    }
    
    // Update select all checkbox states
    if (selectAll) {
      const totalEnabled = total.length;
      selectAll.checked = count > 0 && count === totalEnabled;
      (selectAll as HTMLInputElement).indeterminate = count > 0 && count < totalEnabled;
    }
    if (selectAllHeader) {
      const totalEnabled = total.length;
      selectAllHeader.checked = count > 0 && count === totalEnabled;
      (selectAllHeader as HTMLInputElement).indeterminate = count > 0 && count < totalEnabled;
    }
  }

  // Main Select All checkbox
  if (selectAll) {
    selectAll.addEventListener('change', function() {
      const isChecked = (this as HTMLInputElement).checked;
      document.querySelectorAll('.beneficiary-select:not(:disabled)').forEach(cb => {
        (cb as HTMLInputElement).checked = isChecked;
      });
      updateSelectedCount();
    });
  }

  // Header Select All checkbox
  if (selectAllHeader) {
    selectAllHeader.addEventListener('change', function() {
      const isChecked = (this as HTMLInputElement).checked;
      document.querySelectorAll('.beneficiary-select:not(:disabled)').forEach(cb => {
        (cb as HTMLInputElement).checked = isChecked;
      });
      if (selectAll) (selectAll as HTMLInputElement).checked = isChecked;
      updateSelectedCount();
    });
  }

  // Individual checkboxes
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateSelectedCount);
  });

  // Initial update
  updateSelectedCount();
}

/**
 * Attaches bulk action button listeners (Approve, Reject, Legal Revision)
 * Each opens a modal for confirmation and reason
 */
function attachBulkActionListeners(requestId: string, role: string) {
  const bulkApproveBtn = document.getElementById('bulk-approve-btn');
  const bulkRejectBtn = document.getElementById('bulk-reject-btn');
  const bulkLegalRevisionBtn = document.getElementById('bulk-legal-revision-btn');

  // ─── BULK APPROVE ──────────────────────────────────────────────────────
  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', function() {
      const selected = document.querySelectorAll('.beneficiary-select:checked');
      if (selected.length === 0) return;
      
      Modal.open({
        title: 'Bulk Approve Beneficiaries',
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
              <textarea id="bulk-comment" rows="2" placeholder="Add any remarks..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"></textarea>
            </div>
          </div>
        `,
        isForm: true,
        confirmText: 'Approve All',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
        onConfirm: (modalEl: HTMLElement) => {
          const comment = (modalEl.querySelector('#bulk-comment') as HTMLTextAreaElement)?.value || '';
          const promises = [];
          
          // Approve each selected beneficiary
          selected.forEach(cb => {
            const beneficiaryId = (cb as HTMLElement).dataset.beneficiaryId;
            const payload = { 
              status: 'eligible',
              reason: comment || 'Approved via bulk action'
            };
            promises.push(
              store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
            );
          });
          
          Promise.all(promises)
            .then(() => {
              Toast.success(`${selected.length} beneficiary(ies) approved successfully.`);
              store.syncWithBackend(true).then(() => {
                viewRequestDetails(requestId);
              });
            })
            .catch(error => {
              console.error('Error in bulk approve:', error);
              Toast.error('Failed to approve some beneficiaries. Please try again.');
            });
        }
      });
    });
  }

  // ─── BULK REJECT ───────────────────────────────────────────────────────
  if (bulkRejectBtn) {
    bulkRejectBtn.addEventListener('click', function() {
      const selected = document.querySelectorAll('.beneficiary-select:checked');
      if (selected.length === 0) return;
      
      Modal.open({
        title: 'Bulk Reject Beneficiaries',
        content: `
          <div class="space-y-4">
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p class="text-xs text-rose-700 flex items-center gap-2">
                <i class="fa-regular fa-circle-xmark"></i>
                <span>You are about to reject <strong>${selected.length}</strong> beneficiary(ies).</span>
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
              <textarea id="bulk-reject-reason" rows="3" placeholder="Enter rejection reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"></textarea>
            </div>
          </div>
        `,
        isForm: true,
        confirmText: 'Reject All',
        confirmClass: 'bg-rose-600 hover:bg-rose-700',
        onConfirm: (modalEl: HTMLElement) => {
          const reason = (modalEl.querySelector('#bulk-reject-reason') as HTMLTextAreaElement)?.value || '';
          if (!reason.trim()) {
            Toast.error('Rejection reason is required.');
            return;
          }
          
          const promises = [];
          // Reject each selected beneficiary
          selected.forEach(cb => {
            const beneficiaryId = (cb as HTMLElement).dataset.beneficiaryId;
            const payload = { 
              status: 'unauthorized_by_directive',
              reason: reason.trim()
            };
            promises.push(
              store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
            );
          });
          
          Promise.all(promises)
            .then(() => {
              Toast.success(`${selected.length} beneficiary(ies) rejected successfully.`);
              store.syncWithBackend(true).then(() => {
                viewRequestDetails(requestId);
              });
            })
            .catch(error => {
              console.error('Error in bulk reject:', error);
              Toast.error('Failed to reject some beneficiaries. Please try again.');
            });
        }
      });
    });
  }

  // ─── BULK LEGAL REVISION ──────────────────────────────────────────────
  if (bulkLegalRevisionBtn) {
    bulkLegalRevisionBtn.addEventListener('click', function() {
      const selected = document.querySelectorAll('.beneficiary-select:checked');
      if (selected.length === 0) return;
      
      Modal.open({
        title: 'Bulk Legal Revision',
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
              <textarea id="bulk-legal-reason" rows="3" placeholder="Enter legal revision reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"></textarea>
            </div>
          </div>
        `,
        isForm: true,
        confirmText: 'Submit All',
        confirmClass: 'bg-amber-600 hover:bg-amber-700',
        onConfirm: (modalEl: HTMLElement) => {
          const reason = (modalEl.querySelector('#bulk-legal-reason') as HTMLTextAreaElement)?.value || '';
          if (!reason.trim()) {
            Toast.error('Legal revision reason is required.');
            return;
          }
          
          const promises = [];
          // Mark each selected beneficiary for legal revision
          selected.forEach(cb => {
            const beneficiaryId = (cb as HTMLElement).dataset.beneficiaryId;
            const payload = { 
              status: 'under_legal_revision',
              reason: reason.trim()
            };
            promises.push(
              store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
            );
          });
          
          Promise.all(promises)
            .then(() => {
              Toast.success(`${selected.length} beneficiary(ies) marked for legal revision.`);
              store.syncWithBackend(true).then(() => {
                viewRequestDetails(requestId);
              });
            })
            .catch(error => {
              console.error('Error in bulk legal revision:', error);
              Toast.error('Failed to mark for legal revision. Please try again.');
            });
        }
      });
    });
  }
}