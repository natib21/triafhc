import { store } from '../../store';
import { Modal, Toast } from '../../components';
import { renderAllocationRequests } from './index';
import { renderRequestDetailView } from './renderers';
import { getBeneficiaryStatusInfo, getInstitutionName, getUserFullName } from './utils';
import { currentFilter, searchQuery, setCurrentFilter, setSearchQuery } from './state';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST DETAILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * View details of a specific allocation request
 */
export function viewRequestDetails(id: string) {
  console.log('viewRequestDetails called with id:', id);
  
  const cachedItem = store.allocationRequests.find(r => r.id === id);
  
  if (cachedItem && cachedItem.beneficiaries && cachedItem.beneficiaries.length > 0) {
    console.log('Using cached data for request:', id);
    renderRequestDetailView(cachedItem);
    return;
  }

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

  console.log('Fetching request details from API for ID:', id);
  
  store.apiService.get('/house-allocation-requests/' + id)
    .then((response) => {
      console.log('API Response received:', response);
      
      let item = response;
      
      if (response && response.data) {
        item = response.data;
      }
      
      if (response && response.item) {
        item = response.item;
      }
      
      console.log('Processed item:', item);
      
      if (!item || !item.id) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
      
      const index = store.allocationRequests.findIndex(r => r.id === id);
      if (index !== -1) {
        store.allocationRequests[index] = item;
      } else {
        store.allocationRequests.push(item);
      }
      
      renderRequestDetailView(item);
    })
    .catch((error) => {
      console.error('Error fetching request details:', error);
      
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
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST FORM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST FORM - FULL IMPLEMENTATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let formModalInstance: any = null;

/**
 * Opens the request form modal for creating or editing a request
 * 
 * @param id - Optional request ID for editing existing request
 */
export function openRequestForm(id?: string) {
  console.log('openRequestForm called with id:', id);
  
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

  let modalInstance: any = null;

  function buildInstitutionOptions(selectedId: string) {
    let html = '<option value="">-- Select Institution --</option>';
    if (store.institutions && Array.isArray(store.institutions)) {
      store.institutions.forEach((inst: any) => {
        const selected = inst.id === selectedId ? 'selected' : '';
        const name = inst.name?.en || inst.name?.am || inst.shortName || inst.code || 'Unnamed';
        html += `<option value="${inst.id}" ${selected}>${name}</option>`;
      });
    }
    return html;
  }

  function getUserFullName(user: any) {
    if (!user) return 'Unknown';
    if (user.fullName && user.fullName !== 'N/A') return user.fullName;
    const firstName = user.firstName?.en || user.firstName?.am || '';
    const lastName = user.lastName?.en || user.lastName?.am || '';
    if (firstName || lastName) return `${firstName} ${lastName}`.trim();
    return user.user?.name?.en || user.user?.name?.am || user.user?.username || user.id || 'Unknown';
  }

  function getFilteredUsers() {
    let users = store.userExtensions || [];
    
    // Get IDs of already selected beneficiaries
    const existingBeneficiaryIds = formState.selectedBeneficiaries
      .map(b => b.beneficiaryIndividualId)
      .filter(id => id);
    
    // Filter out users already added
    let filtered = users.filter(user => {
      const userId = user.id || user.userId || '';
      return userId && !existingBeneficiaryIds.includes(userId);
    });
    
    const search = formState.userSearch.toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(user => {
        const fullName = getUserFullName(user).toLowerCase();
        const email = (user.user?.email || '').toLowerCase();
        const phone = (user.user?.phoneNumber || '').toLowerCase();
        const nationalId = (user.nationalIdNumber || '').toLowerCase();
        return [fullName, email, phone, nationalId].some(f => f.includes(search));
      });
    }

    filtered.sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
    formState.totalUsers = filtered.length;
    
    const start = (formState.userPage - 1) * formState.userPageSize;
    const paginated = filtered.slice(start, start + formState.userPageSize);
    formState.filteredUsers = paginated;
    return paginated;
  }

  function buildUserOptions(users: any[]) {
    if (!users || users.length === 0) {
      return `<option value="">-- No available users --</option>`;
    }
    
    return users.map(user => {
      const name = getUserFullName(user);
      const userId = user.id || user.userId || '';
      const details = [user.user?.email, user.nationalIdNumber].filter(Boolean).join(' | ');
      return `<option value="${userId}">${name}${details ? ' (' + details + ')' : ''}</option>`;
    }).join('');
  }

  function renderSelectedBeneficiaries() {
    if (formState.selectedBeneficiaries.length === 0) {
      return '<p class="text-sm text-slate-400 py-4">No beneficiaries added yet.</p>';
    }

    return `<div class="space-y-2">${formState.selectedBeneficiaries.map((ben: any, i: number) => {
      const user = store.userExtensions.find((u: any) => (u.id || u.userId) === ben.beneficiaryIndividualId);
      const inst = store.institutions.find((inst: any) => inst.id === ben.beneficiaryInstitutionId);
      const userName = user ? getUserFullName(user) : 'Unknown User';
      const userDetail = user?.user?.email || user?.nationalIdNumber || '';
      const instName = inst ? (inst.name?.en || inst.name?.am || inst.shortName || 'Unknown') : 'Unknown Institution';
      
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
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#714B67]" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Requesting Institution <span class="text-rose-500">*</span></label>
            <div class="flex items-center gap-2">
              <select id="step-institution" required
                class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]">
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
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#714B67]" />
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
    const benInstOptions = buildInstitutionOptions('');
    
    return `
      <div class="space-y-4">
        <h3 class="text-base font-bold text-slate-800">👥 Add Beneficiaries</h3>
        <p class="text-xs text-slate-500">Search and add beneficiaries to this allocation request.</p>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div class="relative">
            <i class="fa-solid fa-search absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="beneficiary-search" placeholder="Search by name, national ID, email, or phone..." 
              value="${formState.userSearch}"
              class="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#714B67]" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Beneficiary Individual <span class="text-rose-500">*</span></label>
              <div class="flex items-center gap-2">
                <select id="beneficiary-user" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]">
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
              ${formState.totalUsers === 0 && formState.selectedBeneficiaries.length > 0 ? `
                <p class="text-xs text-amber-600 mt-1">⚠️ All available users are already added as beneficiaries</p>
              ` : ''}
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">Beneficiary Institution <span class="text-rose-500">*</span></label>
              <div class="flex items-center gap-2">
                <select id="beneficiary-institution" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]">
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
    const inst = store.institutions.find((i: any) => i.id === d.requestingInstitutionId);
    const instName = inst ? (inst.name?.en || inst.name?.am || inst.shortName || 'Not selected') : 'Not selected';
    
    const beneficiariesHtml = formState.selectedBeneficiaries.length > 0 
      ? formState.selectedBeneficiaries.map((ben: any, index: number) => {
          const user = store.userExtensions.find((u: any) => (u.id || u.userId) === ben.beneficiaryIndividualId);
          const inst = store.institutions.find((i: any) => i.id === ben.beneficiaryInstitutionId);
          const userName = user ? getUserFullName(user) : 'Unknown';
          const userDetail = user?.user?.email || user?.nationalIdNumber || '';
          const instName = inst ? (inst.name?.en || inst.name?.am || inst.shortName || 'Unknown') : 'Unknown';
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
              <button onclick="window.openRequestForm()" class="text-xs text-[#714B67] hover:text-[#5f3e56] font-medium">
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
        <div class="flex items-center gap-2">
          ${[1, 2, 3].map(num => {
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
                <span class="text-xs font-medium ${isActive ? 'text-[#714B67]' : 'text-slate-500'}">
                  ${num === 1 ? 'Request Info' : num === 2 ? 'Add Beneficiaries' : 'Review & Submit'}
                </span>
                ${num < 3 ? '<div class="w-6 h-0.5 bg-slate-200 mx-1"></div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
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

    // Institution creation
    document.getElementById('btn-create-requesting-institution')?.addEventListener('click', function() {
      saveStepData();
      Toast.info('Please create an institution in the Institutions page, then return.');
      // You can implement openInstitutionForm here if available
    });

    // Beneficiary individual creation
    document.getElementById('btn-create-beneficiary-individual')?.addEventListener('click', function() {
      saveStepData();
      Toast.info('Please create a user in the User Extensions page, then return.');
    });

    // Beneficiary institution creation
    document.getElementById('btn-create-beneficiary-institution')?.addEventListener('click', function() {
      saveStepData();
      Toast.info('Please create an institution in the Institutions page, then return.');
    });

    // Search input
    document.getElementById('beneficiary-search')?.addEventListener('input', function() {
      formState.userSearch = (this as HTMLInputElement).value;
      formState.userPage = 1;
      renderStep();
    });

    // Pagination
    document.getElementById('user-page-prev')?.addEventListener('click', () => {
      if (formState.userPage > 1) {
        formState.userPage--;
        renderStep();
      }
    });

    document.getElementById('user-page-next')?.addEventListener('click', () => {
      const totalPages = Math.ceil(formState.totalUsers / formState.userPageSize);
      if (formState.userPage < totalPages) {
        formState.userPage++;
        renderStep();
      }
    });

    // Add beneficiary
    document.getElementById('add-beneficiary-btn')?.addEventListener('click', () => {
      const userId = (document.getElementById('beneficiary-user') as HTMLSelectElement)?.value || '';
      const institutionId = (document.getElementById('beneficiary-institution') as HTMLSelectElement)?.value || '';
      
      if (!userId || !institutionId) {
        Toast.error('Please select both a user and an institution.');
        return;
      }

      const exists = formState.selectedBeneficiaries.some((b: any) => 
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

      (document.getElementById('beneficiary-user') as HTMLSelectElement).value = '';
      (document.getElementById('beneficiary-institution') as HTMLSelectElement).value = '';
      formState.userSearch = '';
      formState.userPage = 1;
      
      Toast.success('Beneficiary added successfully.');
      renderStep();
    });

    // Remove beneficiary
    document.querySelectorAll('.remove-beneficiary').forEach(btn => {
      btn.removeEventListener('click', handleRemoveBeneficiary);
      btn.addEventListener('click', handleRemoveBeneficiary);
    });
  }

  function handleRemoveBeneficiary(this: HTMLElement) {
    const index = parseInt(this.dataset.index || '');
    if (!isNaN(index)) {
      formState.selectedBeneficiaries.splice(index, 1);
      Toast.info('Beneficiary removed.');
      renderStep();
    }
  }

  function validateStep(step: number): boolean {
    if (step === 1) {
      const institution = (document.getElementById('step-institution') as HTMLSelectElement)?.value || formState.data.requestingInstitutionId;
      const letterDate = (document.getElementById('step-letter-date') as HTMLInputElement)?.value || formState.data.letterDate;
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
    const institutionEl = document.getElementById('step-institution') as HTMLSelectElement;
    const letterDateEl = document.getElementById('step-letter-date') as HTMLInputElement;
    const registeredAtEl = document.getElementById('step-registered-at') as HTMLInputElement;
    
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
      .catch((error) => {
        console.error('Error saving request:', error);
        const message = error.response?.data?.message || 'Failed to save request.';
        Toast.error(Array.isArray(message) ? message.join(', ') : message);
      });
  }

  if (isEdit && item?.beneficiaries) {
    formState.selectedBeneficiaries = item.beneficiaries.map((b: any) => ({
      beneficiaryIndividualId: b.beneficiaryIndividual?.id || b.individual?.id || '',
      beneficiaryInstitutionId: b.beneficiaryInstitution?.id || b.institution?.id || ''
    }));
  }

  renderStep();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW ACTIONS - DEPUTY CEO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Deputy CEO starts the review process for a request
 * 
 * @param id - The request ID
 */
export function deputyCeoStartReview(id: string) {
  console.log('deputyCeoStartReview called with id:', id);
  
  store.apiService.patch(`/house-allocation-requests/${id}/deputy-ceo/start-review`)
    .then(() => {
      Toast.success('Request is now under Deputy CEO review.');
      store.syncWithBackend(true).then(renderAllocationRequests);
    })
    .catch((error) => {
      console.error('Error starting review:', error);
      Toast.error('Failed to start review. Please try again.');
    });
}

/**
 * Submits a beneficiary decision for Deputy CEO review
 * 
 * @param requestId - The request ID
 * @param beneficiaryId - The beneficiary ID
 * @param decision - The decision (allowed, legal_revision_required, unauthorized_by_directive)
 * @param reason - Optional reason/comment
 */
export function submitDeputyCeoDecision(requestId: string, beneficiaryId: string, decision: string, reason: string = '') {
  console.log('submitDeputyCeoDecision called:', { requestId, beneficiaryId, decision, reason });
  
  // Map decision to status
  const statusMap = {
    'allowed': 'eligible',
    'legal_revision_required': 'under_legal_revision',
    'unauthorized_by_directive': 'unauthorized_by_directive'
  };
  
  const payload = {
    status: statusMap[decision] || 'eligible',
    reason: reason,
    // Store the decision for display in review details
    deputyCeoDecision: decision,
    deputyCeoReason: reason,
    deputyCeoReviewedAt: new Date().toISOString()
  };
  
  store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
    .then(() => {
      Toast.success(`Beneficiary ${decision === 'allowed' ? 'approved' : decision === 'legal_revision_required' ? 'marked for legal revision' : 'rejected'} successfully.`);
      store.syncWithBackend(true).then(() => {
        viewRequestDetails(requestId);
      });
    })
    .catch((error) => {
      console.error('Error submitting decision:', error);
      Toast.error('Failed to submit decision. Please try again.');
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW ACTIONS - DIRECTOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Submits a beneficiary decision for Director review
 * 
 * @param requestId - The request ID
 * @param beneficiaryId - The beneficiary ID
 * @param decision - The decision (allowed, legal_revision_required, unauthorized_by_directive)
 * @param reason - Optional reason/comment
 */
export function submitDirectorDecision(requestId: string, beneficiaryId: string, decision: string, reason: string = '') {
  console.log('submitDirectorDecision called:', { requestId, beneficiaryId, decision, reason });
  
  const statusMap = {
    'allowed': 'eligible',
    'legal_revision_required': 'under_legal_revision',
    'unauthorized_by_directive': 'unauthorized_by_directive'
  };
  
  const payload = {
    status: statusMap[decision] || 'eligible',
    reason: reason,
    directorDecision: decision,
    directorReason: reason,
    directorReviewedAt: new Date().toISOString()
  };
  
  store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
    .then(() => {
      Toast.success(`Beneficiary ${decision === 'allowed' ? 'approved' : decision === 'legal_revision_required' ? 'marked for legal revision' : 'rejected'} successfully.`);
      store.syncWithBackend(true).then(() => {
        viewRequestDetails(requestId);
      });
    })
    .catch((error) => {
      console.error('Error submitting decision:', error);
      Toast.error('Failed to submit decision. Please try again.');
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW ACTIONS - TEAM LEADER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Team Leader queues a request for processing
 * 
 * @param id - The request ID
 */
export function teamLeaderQueue(id: string) {
  console.log('teamLeaderQueue called with id:', id);
  
  store.apiService.patch(`/house-allocation-requests/${id}/team-leader/queue`)
    .then(() => {
      Toast.success('Request queued for processing.');
      store.syncWithBackend(true).then(renderAllocationRequests);
    })
    .catch((error) => {
      console.error('Error queueing request:', error);
      Toast.error('Failed to queue request. Please try again.');
    });
}

/**
 * Team Leader maps houses to beneficiaries
 * 
 * @param id - The request ID
 * @param remarks - Optional remarks
 */
export function teamLeaderMap(id: string, remarks: string = '') {
  console.log('teamLeaderMap called with id:', id);
  
  Modal.open({
    title: 'Map Houses for Request',
    content: `
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Enter any remarks for this mapping:</p>
        <textarea id="map-remarks" rows="3" placeholder="e.g., Houses assigned to beneficiaries..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
      </div>
    `,
    isForm: true,
    confirmText: 'Map Houses',
    onConfirm: (modalEl: HTMLElement) => {
      const remarks = (modalEl.querySelector('#map-remarks') as HTMLTextAreaElement)?.value || '';
      store.apiService.patch(`/house-allocation-requests/${id}/team-leader/map`, { remarks })
        .then(() => {
          Toast.success('Houses mapped successfully.');
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch((error) => {
          console.error('Error mapping houses:', error);
          Toast.error('Failed to map houses. Please try again.');
        });
    }
  });
}

/**
 * Team Leader rejects a request
 * 
 * @param id - The request ID
 */
export function teamLeaderReject(id: string) {
  console.log('teamLeaderReject called with id:', id);
  
  Modal.open({
    title: 'Reject Request',
    content: `
      <div class="space-y-4">
        <p class="text-sm text-rose-600 font-medium">⚠️ This will permanently reject this request.</p>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Rejection Reason <span class="text-rose-500">*</span></label>
          <textarea id="reject-reason" rows="3" placeholder="Enter rejection reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Reject Request',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: (modalEl: HTMLElement) => {
      const reason = (modalEl.querySelector('#reject-reason') as HTMLTextAreaElement)?.value || '';
      if (!reason.trim()) {
        Toast.error('Rejection reason is required.');
        return;
      }
      store.apiService.patch(`/house-allocation-requests/${id}/team-leader/reject`, { rejectionReason: reason })
        .then(() => {
          Toast.success('Request rejected successfully.');
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch((error) => {
          console.error('Error rejecting request:', error);
          Toast.error('Failed to reject request. Please try again.');
        });
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW ACTIONS - TEAM OFFICER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Submits a beneficiary decision for Team Officer review
 * 
 * @param requestId - The request ID
 * @param beneficiaryId - The beneficiary ID
 * @param decision - The decision (waiting_list, allocated)
 * @param reason - Optional reason/comment
 */
export function submitTeamOfficerDecision(requestId: string, beneficiaryId: string, decision: string, reason: string = '') {
  console.log('submitTeamOfficerDecision called:', { requestId, beneficiaryId, decision, reason });
  
  const payload = {
    status: decision,
    reason: reason,
    teamOfficerDecision: decision,
    teamOfficerReason: reason,
    teamOfficerReviewedAt: new Date().toISOString()
  };
  
  store.apiService.patch(`/house-allocation-requests/beneficiaries/${beneficiaryId}/status`, payload)
    .then(() => {
      Toast.success(`Beneficiary ${decision === 'waiting_list' ? 'moved to waiting list' : 'allocated'} successfully.`);
      store.syncWithBackend(true).then(() => {
        viewRequestDetails(requestId);
      });
    })
    .catch((error) => {
      console.error('Error submitting decision:', error);
      Toast.error('Failed to submit decision. Please try again.');
    });
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEAM OFFICER WORKFLOW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function teamOfficerMoveToWaitingList(requestId: string, beneficiaryIds: string[]) {
  console.log('teamOfficerMoveToWaitingList called:', { requestId, beneficiaryIds });
  
  store.apiService.patch(`/house-allocation-requests/${requestId}/team-officer/move-to-waiting-list`, {
    beneficiaryIds: beneficiaryIds
  })
    .then(() => {
      Toast.success(`${beneficiaryIds.length} beneficiary(ies) moved to waiting list.`);
      store.syncWithBackend(true).then(() => {
        viewRequestDetails(requestId);
      });
    })
    .catch((error) => {
      console.error('Error moving to waiting list:', error);
      Toast.error('Failed to move beneficiaries. Please try again.');
    });
}

export function teamOfficerAllocateHouse(
  requestId: string, 
  beneficiaryId: string, 
  houseId: string
) {
  console.log('teamOfficerAllocateHouse called:', { requestId, beneficiaryId, houseId });
  
  store.apiService.patch(`/house-allocation-requests/${requestId}/team-officer/allocate`, {
    beneficiaryId: beneficiaryId,
    houseId: houseId
  })
    .then(() => {
      Toast.success('House allocated successfully.');
      store.syncWithBackend(true).then(() => {
        viewRequestDetails(requestId);
      });
    })
    .catch((error) => {
      console.error('Error allocating house:', error);
      Toast.error('Failed to allocate house. Please try again.');
    });
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW ACTIONS - GENERAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Opens a decision modal for a specific reviewer role
 * 
 * @param id - The request ID
 * @param role - The reviewer role (deputy, director, team_leader)
 */
export function openDecisionModal(id: string, role: string) {
  console.log('openDecisionModal called with id:', id, 'and role:', role);
  
  const item = store.allocationRequests.find(r => r.id === id);
  if (!item) {
    Toast.error('Request not found');
    return;
  }

  const roleLabel = role === 'deputy' ? 'Deputy CEO' : 
                     role === 'director' ? 'Director' : 
                     role === 'team_leader' ? 'Team Leader' : 'Reviewer';

  // ✅ Map role to field names
  const decisionField = role === 'deputy' ? 'deputyCeoDecision' :
                         role === 'director' ? 'directorDecision' :
                         role === 'team_leader' ? 'teamLeaderDecision' : '';
  
  const reasonField = role === 'deputy' ? 'deputyCeoReason' :
                       role === 'director' ? 'directorReason' :
                       role === 'team_leader' ? 'teamLeaderReason' : '';
  
  const timeField = role === 'deputy' ? 'deputyCeoReviewedAt' :
                     role === 'director' ? 'directorReviewedAt' :
                     role === 'team_leader' ? 'teamLeaderReviewedAt' : '';

  // ✅ Get beneficiaries that need review
  const pendingBeneficiaries = item.beneficiaries?.filter(b => 
    (b.status || '').toLowerCase() === 'pending_review' || 
    (b.status || '').toLowerCase() === 'eligible'
  ) || [];

  if (pendingBeneficiaries.length === 0) {
    Toast.info('All beneficiaries have already been reviewed.');
    return;
  }

  Modal.open({
    title: `${roleLabel} Review - ${pendingBeneficiaries.length} Beneficiaries Pending`,
    content: `
      <div class="space-y-4 max-h-[60vh] overflow-y-auto">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-700 flex items-center gap-2">
            <i class="fa-regular fa-circle-info"></i>
            <span>You are reviewing <strong>${pendingBeneficiaries.length}</strong> beneficiary(ies). All will receive the same decision.</span>
          </p>
        </div>
        
        <!-- Decision Select -->
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Decision <span class="text-rose-500">*</span></label>
          <select id="decision-select" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="allowed">✅ Allowed</option>
            <option value="legal_revision_required">⚖️ Legal Revision Required</option>
            <option value="unauthorized_by_directive">❌ Unauthorized by Directive</option>
          </select>
        </div>
        
        <!-- Comment -->
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Comment <span class="text-rose-500" id="comment-required">*</span></label>
          <textarea id="decision-comment" rows="3" placeholder="Add your review comment..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
          <p class="text-[10px] text-slate-400 mt-1">Comment is required for non-approval decisions.</p>
        </div>
        
        <!-- Beneficiaries List -->
        <div class="border border-slate-200 rounded-lg divide-y divide-slate-100">
          <div class="px-4 py-2 bg-slate-50 rounded-t-lg">
            <span class="text-xs font-semibold text-slate-600">Beneficiaries Being Reviewed</span>
          </div>
          <div class="p-3 max-h-[150px] overflow-y-auto">
            ${pendingBeneficiaries.map((b, idx) => {
              const individual = b.beneficiaryIndividual || b.individual || null;
              const name = individual ? getUserFullName(individual) : 'Unknown';
              const institution = b.beneficiaryInstitution || b.institution || null;
              const instName = institution ? getInstitutionName(institution) : 'N/A';
              const statusInfo = getBeneficiaryStatusInfo(b.status);
              
              return `
                <div class="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="text-slate-400 flex-shrink-0">${idx + 1}.</span>
                    <span class="font-medium text-slate-700 truncate">👤 ${name}</span>
                    <span class="text-slate-400 flex-shrink-0">→</span>
                    <span class="font-medium text-slate-700 truncate">🏛️ ${instName}</span>
                  </div>
                  <span class="px-1.5 py-0.5 ${statusInfo.color} text-[8px] font-bold rounded flex-shrink-0">${statusInfo.label}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <p class="text-xs text-slate-400">Request: ${item.letterReferenceNumber || item.referenceNumber || 'N/A'}</p>
      </div>
    `,
    isForm: true,
    confirmText: 'Submit All Decisions',
    onConfirm: (modalEl: HTMLElement) => {
      const decision = (modalEl.querySelector('#decision-select') as HTMLSelectElement)?.value || 'allowed';
      const comment = (modalEl.querySelector('#decision-comment') as HTMLTextAreaElement)?.value || '';

      if (decision !== 'allowed' && (!comment || comment.trim() === '')) {
        Toast.error('Comment is required for non-approval decisions.');
        return;
      }

      // ✅ Submit decision for EACH beneficiary individually
      const promises = pendingBeneficiaries.map(ben => {
        const payload = {
          status: decision === 'allowed' ? 'eligible' : 
                   decision === 'legal_revision_required' ? 'under_legal_revision' : 
                   'unauthorized_by_directive',
          reason: comment || 'Approved by reviewer',
          // ✅ Store the decision for display
          [decisionField]: decision,
          [reasonField]: comment || '',
          [timeField]: new Date().toISOString()
        };
        
        return store.apiService.patch(`/house-allocation-requests/beneficiaries/${ben.id}/status`, payload);
      });

      Promise.all(promises)
        .then(() => {
          Toast.success(`${pendingBeneficiaries.length} beneficiary(ies) reviewed successfully.`);
          store.syncWithBackend(true).then(() => {
            viewRequestDetails(id);
          });
        })
        .catch((error) => {
          console.error('Error submitting decisions:', error);
          Toast.error('Failed to submit decisions. Please try again.');
        });
    }
  });
}
/**
 * Cancels a request
 * 
 * @param id - The request ID
 */
export function cancelRequest(id: string) {
  console.log('cancelRequest called with id:', id);
  
  Modal.open({
    title: 'Cancel Request',
    content: `
      <div class="space-y-4">
        <p class="text-sm text-amber-600 font-medium">⚠️ Are you sure you want to cancel this request?</p>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Cancellation Reason (Optional)</label>
          <textarea id="cancel-reason" rows="3" placeholder="Enter cancellation reason..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Cancel Request',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
    onConfirm: (modalEl: HTMLElement) => {
      const reason = (modalEl.querySelector('#cancel-reason') as HTMLTextAreaElement)?.value || '';
      store.apiService.patch(`/house-allocation-requests/${id}/cancel`, { reason })
        .then(() => {
          Toast.success('Request cancelled successfully.');
          store.syncWithBackend(true).then(renderAllocationRequests);
        })
        .catch((error) => {
          console.error('Error cancelling request:', error);
          Toast.error('Failed to cancel request. Please try again.');
        });
    }
  });
}

/**
 * Submits a draft request for review
 * 
 * @param id - The request ID
 */
export function submitDraft(id: string) {
  console.log('submitDraft called with id:', id);
  
  store.apiService.patch(`/house-allocation-requests/${id}/submit`)
    .then(() => {
      Toast.success('Draft submitted successfully. Awaiting review.');
      store.syncWithBackend(true).then(renderAllocationRequests);
    })
    .catch((error) => {
      console.error('Error submitting draft:', error);
      Toast.error('Failed to submit draft. Please try again.');
    });
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKFLOW ACTIONS - TEAM LEADER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ✅ Submits a Team Leader decision for an individual beneficiary
 * 
 * @param requestId - The request ID
 * @param beneficiaryId - The beneficiary ID
 * @param decision - The decision (ALLOWED, LEGAL_REVISION_REQUIRED, UNAUTHORIZED_BY_DIRECTIVE)
 * @param comment - Optional comment
 */
export function submitTeamLeaderDecision(
  requestId: string, 
  beneficiaryId: string, 
  decision: string, 
  comment: string = ''
) {
  console.log('submitTeamLeaderDecision called:', { requestId, beneficiaryId, decision, comment });
  
  const payload = {
    beneficiaryId: beneficiaryId,
    decision: decision,
    comment: comment
  };
  
  store.apiService.patch(`/house-allocation-requests/${requestId}/team-leader/decision`, payload)
    .then(() => {
      Toast.success(`Beneficiary decision recorded.`);
      store.syncWithBackend(true).then(() => {
        viewRequestDetails(requestId);
      });
    })
    .catch((error) => {
      console.error('Error submitting decision:', error);
      Toast.error('Failed to submit decision. Please try again.');
    });
}
/**
 * Advances the workflow to the next stage
 * 
 * @param id - The request ID
 */
export function advanceWorkflow(id: string) {
  console.log('advanceWorkflow called with id:', id);
  
  const item = store.allocationRequests.find(r => r.id === id);
  if (!item) {
    Toast.error('Request not found');
    return;
  }
  
  const currentStatus = (item.status || 'draft').toLowerCase();
  const statusMap = {
    'submitted': 'under_deputy_ceo_review',
    'under_deputy_ceo_review': 'under_director_review',
    'under_director_review': 'pending_team_leader_decision',
    'pending_team_leader_decision': 'under_team_officer_review',
    'under_team_officer_review': 'waiting_list'
  };
  
  const nextStatus = statusMap[currentStatus];
  if (!nextStatus) {
    Toast.info('No further action available for current status');
    return;
  }
  
  store.apiService.patch(`/house-allocation-requests/${id}/status`, { status: nextStatus })
    .then(() => {
      Toast.success(`Request advanced to ${nextStatus.replace(/_/g, ' ')}.`);
      store.syncWithBackend(true).then(renderAllocationRequests);
    })
    .catch((error) => {
      console.error('Error advancing workflow:', error);
      Toast.error('Failed to advance workflow. Please try again.');
    });
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPOSE ALL FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

