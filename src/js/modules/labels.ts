// Institution Labels Module
import { store, Label } from '../store';
import { Table, Modal, Toast } from '../components';

export function renderLabels() {
  const contentArea = document.getElementById('main-content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">Institution Labels</h2>
          <p class="text-xs text-slate-500 mt-0.5">Define metadata tags and color badges for quick organizational tracking.</p>
        </div>
        <button id="btn-create-label" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
          <i class="fa-solid fa-plus"></i> Add Label
        </button>
      </div>

      <!-- Table Container -->
      <div id="labels-table-container"></div>
    </div>
  `;

  let searchQuery = '';

  const loadAndRenderTable = () => {
    const list = store.labels.filter(lbl => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return lbl.code.toLowerCase().includes(q) ||
             lbl.name.en.toLowerCase().includes(q) ||
             lbl.name.am.toLowerCase().includes(q);
    });

    Table.render<Label>({
      containerId: 'labels-table-container',
      loading: false,
      searchValue: searchQuery,
      placeholderText: 'Search labels...',
      columns: [
        {
          header: 'Code',
          key: 'code',
          sortable: true,
          render: (item) => `<span class="font-mono font-semibold text-slate-600 text-xs">${item.code}</span>`
        },
        {
          header: 'Name (EN)',
          key: 'name_en',
          render: (item) => `<span class="font-medium text-slate-900">${item.name.en}</span>`
        },
        {
          header: 'Name (AM)',
          key: 'name_am',
          render: (item) => `<span class="font-medium text-slate-800 font-sans">${item.name.am}</span>`
        },
        {
          header: 'Preview Badge',
          key: 'color',
          render: (item) => `
            <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border" style="background-color: ${item.color}15; color: ${item.color}; border-color: ${item.color}35">
              <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${item.color}"></span>
              ${item.name.en}
            </span>
          `
        },
        {
          header: 'Status',
          key: 'isActive',
          render: (item) => item.isActive 
            ? `<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">Active</span>`
            : `<span class="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold rounded-md">Inactive</span>`
        },
        {
          header: 'Actions',
          key: 'id',
          render: (item) => `
            <div class="flex items-center gap-1.5">
              <button data-edit-id="${item.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Label">
                <i class="fa-solid fa-pen-to-square text-sm"></i>
              </button>
              <button data-delete-id="${item.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Label">
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
    const tableContainer = document.getElementById('labels-table-container');
    if (!tableContainer) return;

    tableContainer.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-id');
        if (id) openLabelForm(id);
      });
    });

    tableContainer.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        if (id) confirmDeleteLabel(id);
      });
    });
  };

  document.getElementById('btn-create-label')?.addEventListener('click', () => {
    openLabelForm();
  });

  loadAndRenderTable();
}

function openLabelForm(id?: string) {
  const isEdit = !!id;
  const item = isEdit ? store.labels.find(l => l.id === id) : null;

  // Code format: INLeb000001
  const autoCode = !isEdit 
    ? `INLeb${String(store.labels.length + 1).padStart(6, '0')}`
    : item?.code || '';

  const formHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Code (Auto-Generated)</label>
        <input 
          type="text" 
          name="code" 
          value="${autoCode}" 
          readonly 
          class="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 font-mono focus:outline-hidden"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
        <input 
          type="text" 
          name="name_en" 
          value="${item ? item.name.en : ''}" 
          required 
          placeholder="e.g. Strategic Entity"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input 
          type="text" 
          name="name_am" 
          value="${item ? item.name.am : ''}" 
          required 
          placeholder="ስልታዊ ተቋም"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden font-sans"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="desc_en" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden">${item?.description?.en || ''}</textarea>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea name="desc_am" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden font-sans">${item?.description?.am || ''}</textarea>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Label Color Badge</label>
        <div class="flex items-center gap-3">
          <input 
            type="color" 
            name="color" 
            value="${item ? item.color : '#4F46E5'}" 
            class="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
          />
          <span class="text-xs text-slate-400">Choose custom label banner styling.</span>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-6">
        <input 
          type="checkbox" 
          id="isActive" 
          name="isActive" 
          ${!item || item.isActive ? 'checked' : ''} 
          class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm"
        />
        <label for="isActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Status</label>
      </div>
    </div>
  `;

  Modal.open({
    title: isEdit ? 'Edit Label' : 'Create Label',
    content: formHTML,
    isForm: true,
    confirmText: isEdit ? 'Save Changes' : 'Create Label',
    onConfirm: async (modalEl) => {
      const nameEn = (modalEl.querySelector('[name="name_en"]') as HTMLInputElement).value;
      const nameAm = (modalEl.querySelector('[name="name_am"]') as HTMLInputElement).value;
      const descEn = (modalEl.querySelector('[name="desc_en"]') as HTMLTextAreaElement).value;
      const descAm = (modalEl.querySelector('[name="desc_am"]') as HTMLTextAreaElement).value;
      const color = (modalEl.querySelector('[name="color"]') as HTMLInputElement).value;
      const isActive = (modalEl.querySelector('[name="isActive"]') as HTMLInputElement).checked;

      const payload = {
        code: autoCode,
        name: { en: nameEn, am: nameAm },
        description: { en: descEn, am: descAm },
        color,
        isActive,
      };

      if (isEdit) {
        await store.apiService.put(`/institution-labels/${id}`, payload);
        Toast.success('Label saved successfully.');
      } else {
        await store.apiService.post('/institution-labels', payload);
        Toast.success('Label created successfully.');
      }

      renderLabels();
    }
  });
}

function confirmDeleteLabel(id: string) {
  const item = store.labels.find(l => l.id === id);
  if (!item) return;

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <p class="text-sm text-slate-600">Are you sure you want to delete label <strong>${item.name.en}</strong> (${item.code})?</p>
    `,
    confirmText: 'Delete Label',
    onConfirm: async () => {
      await store.apiService.delete(`/institution-labels/${id}`);
      Toast.success('Label deleted successfully.');
      renderLabels();
    }
  });
}
