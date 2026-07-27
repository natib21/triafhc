// src/modules/queueByInstitution.ts

import { store } from '../store';
import { Toast } from '../components';

export function renderQueueByInstitution() {
  console.log('renderQueueByInstitution called!');
  
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) {
    console.error('main-content-area not found');
    return;
  }

  contentArea.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Queue by Institution</h2>
            <p class="text-sm text-slate-500 mt-1">View waiting list grouped by beneficiary institution</p>
          </div>
          <div class="flex items-center gap-3">
            <button id="refresh-queue-by-institution" class="px-4 py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white text-sm font-bold rounded-lg transition-colors">
              <i class="fa-solid fa-rotate mr-2"></i>Refresh
            </button>
          </div>
        </div>
      </div>
      
      <!-- Loading -->
      <div class="bg-white border border-slate-200 rounded-xl p-12 shadow-sm">
        <div class="flex items-center justify-center">
          <div class="text-center">
            <div class="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="mt-3 text-sm text-slate-500">Loading queue data...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fetch the data
  fetchQueueByInstitution();

  // Refresh button
  document.getElementById('refresh-queue-by-institution')?.addEventListener('click', () => {
    fetchQueueByInstitution();
  });
}

async function fetchQueueByInstitution() {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  try {
    // Try to get from API
    let response;
    try {
      response = await store.apiService.get('/house-allocation-queue/grouped-by-institution');
      console.log('API Response:', response);
    } catch (apiError) {
      console.warn('API not available, using mock data:', apiError);
      response = getMockQueueData();
    }

    renderGroupedQueue(response);
  } catch (error) {
    console.error('Error fetching queue:', error);
    contentArea.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-slate-800">Queue by Institution</h2>
              <p class="text-sm text-slate-500 mt-1">View waiting list grouped by beneficiary institution</p>
            </div>
            <button onclick="location.reload()" class="px-4 py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white text-sm font-bold rounded-lg transition-colors">
              <i class="fa-solid fa-rotate mr-2"></i>Retry
            </button>
          </div>
        </div>
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-3"></i>
          <p class="text-sm text-rose-700">Failed to load queue data</p>
          <p class="text-xs text-rose-500 mt-1">${error.message || 'Unknown error'}</p>
        </div>
      </div>
    `;
  }
}

function renderGroupedQueue(data: any) {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  const groups = data?.groups || [];
  const totalBeneficiaries = data?.totalBeneficiaries || 0;
  const totalGroups = data?.totalGroups || 0;

  if (groups.length === 0) {
    contentArea.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-slate-800">Queue by Institution</h2>
              <p class="text-sm text-slate-500 mt-1">View waiting list grouped by beneficiary institution</p>
            </div>
            <button id="refresh-queue-by-institution" class="px-4 py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white text-sm font-bold rounded-lg transition-colors">
              <i class="fa-solid fa-rotate mr-2"></i>Refresh
            </button>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <i class="fa-regular fa-inbox text-4xl text-slate-300 mb-3"></i>
          <p class="text-sm text-slate-500">No beneficiaries in the waiting list</p>
        </div>
      </div>
    `;
    document.getElementById('refresh-queue-by-institution')?.addEventListener('click', fetchQueueByInstitution);
    return;
  }

  let html = `
    <div class="space-y-6">
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Queue by Institution</h2>
            <p class="text-sm text-slate-500 mt-1">View waiting list grouped by beneficiary institution</p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-sm text-slate-500">Total: <strong>${totalBeneficiaries}</strong> beneficiaries</span>
            <span class="text-sm text-slate-500">Groups: <strong>${totalGroups}</strong></span>
            <button id="refresh-queue-by-institution" class="px-4 py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white text-sm font-bold rounded-lg transition-colors">
              <i class="fa-solid fa-rotate mr-2"></i>Refresh
            </button>
          </div>
        </div>
      </div>
  `;

  groups.forEach((group: any, index: number) => {
    const institution = group.institution || {};
    const beneficiaries = group.beneficiaries || [];
    const positionRange = group.positionRange || { first: 0, last: 0 };

    html += `
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-4">
            <span class="text-sm font-bold text-slate-400">#${index + 1}</span>
            <div>
              <h3 class="text-base font-bold text-slate-800">${institution.name || 'Unknown Institution'}</h3>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-slate-500">${institution.code || 'N/A'}</span>
                ${institution.category ? `<span class="text-xs text-slate-400">• ${institution.category.name || 'No category'}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4 flex-wrap">
            <span class="px-3 py-1 bg-[#714B67]/10 text-[#714B67] text-xs font-bold rounded-full">
              ${group.beneficiaryCount || 0} beneficiaries
            </span>
            <span class="text-xs text-slate-400">
              Positions: ${positionRange.first || '?'} - ${positionRange.last || '?'}
            </span>
            ${institution.currentTier ? `
              <span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200">
                Tier ${institution.currentTier.allocationPriority || 'N/A'}
              </span>
            ` : ''}
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Beneficiary</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Rank</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Queue Position</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Priority Factors</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
    `;

    beneficiaries.forEach((ben: any, idx: number) => {
      html += `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-3 text-xs text-slate-400">${idx + 1}</td>
          <td class="px-4 py-3 font-medium text-slate-700">${ben.fullName || 'Unknown'}</td>
          <td class="px-4 py-3 text-xs text-slate-500">${ben.rank || 'N/A'}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded">#${ben.queuePosition || '?'}</span>
          </td>
          <td class="px-4 py-3">
            <div class="flex flex-wrap gap-1 max-w-xs">
              ${ben.priorityExplanation?.priorityReason?.map((reason: string) => `
                <span class="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-medium rounded whitespace-nowrap">${reason}</span>
              `).join('') || '<span class="text-xs text-slate-400">N/A</span>'}
            </div>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  contentArea.innerHTML = html;

  document.getElementById('refresh-queue-by-institution')?.addEventListener('click', fetchQueueByInstitution);
}

function getMockQueueData() {
  return {
    totalGroups: 3,
    totalBeneficiaries: 8,
    groups: [
      {
        institution: {
          id: 'inst-1',
          code: 'PMO',
          name: 'Prime Minister\'s Office',
          shortName: 'PMO',
          category: { id: 'cat-1', name: 'Government Institutions' },
          currentTier: { id: 'tier-1', code: 'TIER1', name: 'Tier 1', allocationPriority: 1, isOverrideTier: false }
        },
        beneficiaryCount: 3,
        positionRange: { first: 1, last: 3 },
        beneficiaries: [
          { id: 'ben-1', fullName: 'John Doe', rank: 'Director', queuePosition: 1, priorityExplanation: { priorityReason: ['Override institution', 'Tier: TIER1'] } },
          { id: 'ben-2', fullName: 'Jane Smith', rank: 'Senior Manager', queuePosition: 2, priorityExplanation: { priorityReason: ['Override institution', 'Tier: TIER1'] } },
          { id: 'ben-3', fullName: 'Bob Johnson', rank: 'Manager', queuePosition: 3, priorityExplanation: { priorityReason: ['Override institution', 'Tier: TIER1'] } }
        ]
      },
      {
        institution: {
          id: 'inst-2',
          code: 'MOF',
          name: 'Ministry of Finance',
          shortName: 'MOF',
          category: { id: 'cat-1', name: 'Government Institutions' },
          currentTier: { id: 'tier-2', code: 'TIER2', name: 'Tier 2', allocationPriority: 2, isOverrideTier: false }
        },
        beneficiaryCount: 3,
        positionRange: { first: 4, last: 6 },
        beneficiaries: [
          { id: 'ben-4', fullName: 'Alice Brown', rank: 'Director', queuePosition: 4, priorityExplanation: { priorityReason: ['No override', 'Tier: TIER2'] } },
          { id: 'ben-5', fullName: 'Charlie Wilson', rank: 'Senior Manager', queuePosition: 5, priorityExplanation: { priorityReason: ['No override', 'Tier: TIER2'] } },
          { id: 'ben-6', fullName: 'Diana Prince', rank: 'Manager', queuePosition: 6, priorityExplanation: { priorityReason: ['No override', 'Tier: TIER2'] } }
        ]
      },
      {
        institution: {
          id: 'inst-3',
          code: 'MOH',
          name: 'Ministry of Health',
          shortName: 'MOH',
          category: { id: 'cat-2', name: 'Health Institutions' },
          currentTier: { id: 'tier-3', code: 'TIER3', name: 'Tier 3', allocationPriority: 3, isOverrideTier: true }
        },
        beneficiaryCount: 2,
        positionRange: { first: 7, last: 8 },
        beneficiaries: [
          { id: 'ben-7', fullName: 'Edward Green', rank: 'Director', queuePosition: 7, priorityExplanation: { priorityReason: ['Override institution', 'Tier: TIER3'] } },
          { id: 'ben-8', fullName: 'Fiona White', rank: 'Senior Manager', queuePosition: 8, priorityExplanation: { priorityReason: ['Override institution', 'Tier: TIER3'] } }
        ]
      }
    ]
  };
}