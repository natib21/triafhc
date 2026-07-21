import { store } from '../../store';
import { Modal, Toast } from '../../components';
import { viewRequestDetails, openRequestForm, deputyCeoStartReview, openDecisionModal, teamLeaderQueue, teamLeaderMap, teamLeaderReject, cancelRequest } from './actions';
import { getFilteredData, getEmptyStateHTML, renderRequestCard, showError } from './renderers';
import { currentFilter, searchQuery, setCurrentFilter, setSearchQuery } from './state';

export function attachFilterListeners() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const filter = (this as HTMLElement).dataset.filter;
      if (filter) {
        setCurrentFilter(filter);
        
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.className = 'px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-sm';
        });
        this.className = 'px-3 py-1.5 bg-[#714B67]/10 text-[#714B67] font-semibold text-xs rounded-lg transition-all border border-[#714B67]/20 shadow-sm';
        
        loadAndRenderCards();
      }
    });
  });
}

export function attachSearchListener() {
  const searchInput = document.getElementById('search-requests');
  if (searchInput) {
    searchInput.removeEventListener('input', handleSearch);
    searchInput.addEventListener('input', handleSearch);
  }
}

export function handleSearch(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  setSearchQuery(value);
  loadAndRenderCards();
}

export function attachCardEventListeners() {
  const container = document.getElementById('requests-cards-container');
  if (!container) return;

  container.querySelectorAll('.request-card').forEach(card => {
    card.addEventListener('click', function(e) {
      if ((e.target as HTMLElement).closest('.action-btn')) return;
      const id = (this as HTMLElement).dataset.requestId;
      if (id) {
        viewRequestDetails(id);
      }
    });
  });

  container.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const action = (this as HTMLElement).dataset.action;
      const id = (this as HTMLElement).dataset.requestId;
      if (action && id) {
        handleAction(action, id);
      }
    });
  });
}

export function handleAction(action: string, id: string) {
  const actions: Record<string, () => void> = {
    'view': () => viewRequestDetails(id),
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
}

export function confirmDeleteRequest(id: string) {
  Modal.open({
    title: 'Delete Request',
    content: `
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
          <p class="text-xs text-rose-700 flex items-center gap-2">
            <i class="fa-regular fa-circle-exclamation"></i>
            <span>Are you sure you want to delete this request?</span>
          </p>
        </div>
      </div>
    `,
    isForm: false,
    confirmText: 'Delete',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: () => {
      Toast.info('Deleting request...');
    }
  });
}

export function loadAndRenderCards() {
  try {
    const data = getFilteredData(currentFilter(), searchQuery());
    const container = document.getElementById('requests-cards-container');
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = getEmptyStateHTML(searchQuery());
      attachSearchListener();
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="relative flex-1 max-w-md">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" id="search-requests" placeholder="Search by reference or title..." value="${searchQuery()}" 
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
    showError('Failed to load allocation requests: ' + (error as Error).message);
  }
}
