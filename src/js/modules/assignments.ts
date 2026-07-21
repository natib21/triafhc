// Tier Assignments Module
import { store, TierAssignment } from '../store';
import { Table, Modal, Toast } from '../components';

export function renderAssignments() {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">Tier Assignments</h2>
          <p class="text-xs text-slate-500 mt-0.5">Map federal institutions to specific housing allocation tiers with active duration limits.</p>
        </div>
        <button id="btn-create-assignment" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
          <i class="fa-solid fa-plus"></i> Assign Tier
        </button>
      </div>

      <!-- Table Container -->
      <div id="assignments-table-container"></div>
    </div>
  `;

  let searchQuery = '';

  const loadAndRenderTable = () => {
    // Perform quick search matching names of either the assigned institution or tier
    const list = store.assignments.filter(asg => {
      const inst = store.institutions.find(i => i.id === asg.institutionId);
      const tier = store.tiers.find(t => t.id === asg.tierId);
      
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      
      return (inst && (inst.name.en.toLowerCase().includes(q) || inst.name.am.toLowerCase().includes(q) || inst.shortName.toLowerCase().includes(q))) ||
             (tier && (tier.name.en.toLowerCase().includes(q) || tier.name.am.toLowerCase().includes(q)));
    });

    Table.render<TierAssignment>({
      containerId: 'assignments-table-container',
      loading: false,
      searchValue: searchQuery,
      placeholderText: 'Search by institution or tier...',
      columns: [
        {
          header: 'Institution',
          key: 'institutionId',
          render: (item) => {
            const inst = store.institutions.find(i => i.id === item.institutionId);
            return inst 
              ? `<div class="space-y-0.5">
                   <p class="font-semibold text-slate-900 text-xs sm:text-sm">${inst.name.en}</p>
                   <p class="text-slate-400 font-mono text-[10px]">${inst.shortName} | ${inst.code}</p>
                 </div>`
              : `<span class="text-slate-400">Unknown (${item.institutionId})</span>`;
          }
        },
        {
          header: 'Assigned Priority Tier',
          key: 'tierId',
          render: (item) => {
            const tier = store.tiers.find(t => t.id === item.tierId);
            return tier 
              ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                   <i class="fa-solid fa-layer-group text-[10px]"></i> ${tier.name.en}
                 </span>`
              : `<span class="text-slate-400">Unknown (${item.tierId})</span>`;
          }
        },
        {
          header: 'Effective Period',
          key: 'startDate',
          render: (item) => `
            <div class="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>${item.startDate}</span>
              <i class="fa-solid fa-arrow-right text-[10px] text-slate-300"></i>
              <span>${item.endDate || 'Indefinite'}</span>
            </div>
          `
        },
        {
          header: 'Status',
          key: 'isCurrent',
          render: (item) => item.isCurrent 
            ? `<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg uppercase">CURRENT</span>`
            : `<span class="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold rounded-lg uppercase">EXPIRED</span>`
        },
        {
          header: 'Actions',
          key: 'id',
          render: (item) => `
            <div class="flex items-center gap-1.5">
              <button data-edit-id="${item.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Assignment">
                <i class="fa-solid fa-pen-to-square text-sm"></i>
              </button>
              <button data-delete-id="${item.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Assignment">
                <i class="fa-regular fa-trash-can text-sm"></i>
              </button>
            </div>
          `
        }
      ],
      data: list,
      onSearch: (query) => {
        searchQuery = query;
        loadAndRenderTable();
      }
    });

    attachActionListeners();
  };

  const attachActionListeners = () => {
    const tableContainer = document.getElementById('assignments-table-container');
    if (!tableContainer) return;

    tableContainer.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-id');
        if (id) openAssignmentForm(id);
      });
    });

    tableContainer.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        if (id) confirmDeleteAssignment(id);
      });
    });
  };

  document.getElementById('btn-create-assignment')?.addEventListener('click', () => {
    openAssignmentForm();
  });

  loadAndRenderTable();
}

function openAssignmentForm(id?: string) {
  const isEdit = !!id;
  const item = isEdit ? store.assignments.find(a => a.id === id) : null;

  // Render dropdown selectors dynamically
  const instOptions = store.institutions.map(inst => `
    <option value="${inst.id}" ${item && item.institutionId === inst.id ? 'selected' : ''}>
      ${inst.name.en} (${inst.shortName})
    </option>
  `).join('');

  const tierOptions = store.tiers.map(t => `
    <option value="${t.id}" ${item && item.tierId === t.id ? 'selected' : ''}>
      ${t.name.en} (Lvl ${t.priorityLevel})
    </option>
  `).join('');

  const formHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Select Institution <span class="text-rose-500">*</span></label>
        <select name="institutionId" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden">
          <option value="">-- Choose Institution --</option>
          ${instOptions}
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Select Priority Tier <span class="text-rose-500">*</span></label>
        <select name="tierId" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden">
          <option value="">-- Choose Priority Tier --</option>
          ${tierOptions}
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Effective Start Date <span class="text-rose-500">*</span></label>
        <input 
          type="date" 
          name="startDate" 
          value="${item ? item.startDate : new Date().toISOString().split('T')[0]}" 
          required 
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Effective End Date <span class="text-rose-500">*</span></label>
        <input 
          type="date" 
          name="endDate" 
          value="${item ? item.endDate : ''}" 
          required 
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
        />
      </div>

      <div class="flex items-center gap-2 mt-6 md:col-span-2">
        <input 
          type="checkbox" 
          id="isCurrent" 
          name="isCurrent" 
          ${!item || item.isCurrent ? 'checked' : ''} 
          class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm"
        />
        <label for="isCurrent" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Set as Active Current Assignment</label>
      </div>
    </div>
  `;

  Modal.open({
    title: isEdit ? 'Edit Tier Assignment' : 'Map Tier Assignment',
    content: formHTML,
    isForm: true,
    confirmText: isEdit ? 'Save Mapping' : 'Map Assignment',
    onConfirm: async (modalEl) => {
      const institutionId = (modalEl.querySelector('[name="institutionId"]') as HTMLSelectElement).value;
      const tierId = (modalEl.querySelector('[name="tierId"]') as HTMLSelectElement).value;
      const startDate = (modalEl.querySelector('[name="startDate"]') as HTMLInputElement).value;
      const endDate = (modalEl.querySelector('[name="endDate"]') as HTMLInputElement).value;
      const isCurrent = (modalEl.querySelector('[name="isCurrent"]') as HTMLInputElement).checked;

      if (!institutionId || !tierId) {
        throw new Error('Both institution and priority tier are required.');
      }

      const payload = {
        institutionId,
        tierId,
        startDate,
        endDate,
        isCurrent
      };

      if (isEdit) {
        await store.apiService.put(`/tier-assignments/${id}`, payload);
        Toast.success('Tier assignment updated successfully.');
      } else {
        await store.apiService.post('/tier-assignments', payload);
        Toast.success('Tier mapped to institution successfully.');
      }

      renderAssignments();
    }
  });
}

function confirmDeleteAssignment(id: string) {
  Modal.open({
    title: 'Delete Assignment',
    content: `
      <p class="text-sm text-slate-600">Are you sure you want to delete this tier mapping assignment?</p>
    `,
    confirmText: 'Delete Mapping',
    onConfirm: async () => {
      await store.apiService.delete(`/tier-assignments/${id}`);
      Toast.success('Mapping deleted successfully.');
      renderAssignments();
    }
  });
}
