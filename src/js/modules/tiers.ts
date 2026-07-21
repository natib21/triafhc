// Institution Tiers Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

export function renderTiers() {
  try {
    console.log('renderTiers: Starting...');
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) return;

    // Check if store exists
    if (!store) {
      console.error('renderTiers: store is undefined');
      showError('Store is not initialized.');
      return;
    }

    // ✅ FIX: Ensure store.tiers is always an array
    if (!store.tiers || !Array.isArray(store.tiers)) {
      console.warn('renderTiers: store.tiers is not an array, initializing as empty array');
      store.tiers = [];
    }

    contentArea.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Institution Tiers</h2>
            <p class="text-xs text-slate-500 mt-0.5">Manage prioritization tiers for housing queue assignments (Level 1 = Highest Priority).</p>
          </div>
          <button id="btn-create-tier" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Add Tier
          </button>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-3 flex-wrap">
          <button id="filter-all" class="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs">All</button>
          <button id="filter-active" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Active Only</button>
          <button id="filter-inactive" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Inactive Only</button>
        </div>

        <!-- Table Container -->
        <div id="tiers-table-container"></div>
      </div>
    `;

    let currentFilter = 'all';
    let searchQuery = '';

    const loadAndRenderTable = function() {
      try {
        console.log('loadAndRenderTable: Loading tiers...');
        var data = getFilteredData();
        
        if (!data || !Array.isArray(data)) {
          console.error('loadAndRenderTable: Data is not an array:', data);
          data = [];
        }
        
        console.log('loadAndRenderTable: Data loaded:', data.length, 'items');

        // Check if Table component exists
        if (!Table || typeof Table.render !== 'function') {
          console.error('Table component is not defined');
          showError('Table component is not loaded.');
          return;
        }

        var tableContainer = document.getElementById('tiers-table-container');
        if (!tableContainer) {
          console.error('tiers-table-container not found');
          return;
        }

        // If no data, show empty state
        if (data.length === 0) {
          tableContainer.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <div class="relative">
                  <input type="text" placeholder="Search tiers by name or code..." value="${searchQuery}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <i class="fa-solid fa-search absolute left-2.5 top-2 text-slate-400 text-xs"></i>
                </div>
              </div>
              <div class="p-8 text-center">
                <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3 block"></i>
                <p class="text-sm text-slate-500">No tiers found</p>
                <p class="text-xs text-slate-400 mt-1">Click "Add Tier" to create your first tier.</p>
              </div>
            </div>
          `;
          return;
        }

        Table.render({
          containerId: 'tiers-table-container',
          loading: false,
          searchValue: searchQuery,
          placeholderText: 'Search tiers by name or code...',
          columns: [
            {
              header: 'Code',
              key: 'code',
              sortable: true,
              render: function(item) {
                return '<span class="font-mono font-semibold text-slate-600 text-xs">' + (item.code || '-') + '</span>';
              }
            },
            {
              header: 'Name (EN)',
              key: 'name_en',
              render: function(item) {
                return '<span class="font-medium text-slate-900">' + (item.name?.en || '-') + '</span>';
              }
            },
            {
              header: 'Name (AM)',
              key: 'name_am',
              render: function(item) {
                return '<span class="font-medium text-slate-800 font-sans">' + (item.name?.am || '-') + '</span>';
              }
            },
            {
              header: 'Priority Level',
              key: 'priorityLevel',
              sortable: true,
              render: function(item) {
                // ✅ FIX: Use allocationPriority if priorityLevel doesn't exist
                var priority = item.priorityLevel || item.allocationPriority || 0;
                
                // ✅ FIX: Lower number = higher priority (Level 1 is highest)
                // For visual: Level 1 = 100% (full bar), Level 10 = 10% (small bar)
                var barWidth = Math.max(10, (11 - priority) * 10); // Inverted: 1->100%, 10->10%
                var priorityLabel = priority + ' (Highest)';
                if (priority > 3) priorityLabel = priority + ' (High)';
                if (priority > 6) priorityLabel = priority + ' (Medium)';
                if (priority > 8) priorityLabel = priority + ' (Low)';
                
                // Color coding based on priority level
                var barColor = '#10B981'; // Green for high priority
                if (priority > 3 && priority <= 6) barColor = '#F59E0B'; // Amber for medium
                if (priority > 6) barColor = '#EF4444'; // Red for low priority
                
                return '<div class="flex items-center gap-3">' +
                  '<div class="w-28 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">' +
                    '<div class="h-full rounded-full transition-all" style="width: ' + barWidth + '%; background-color: ' + barColor + '"></div>' +
                  '</div>' +
                  '<span class="font-semibold text-xs text-slate-700 min-w-[80px]">Lvl ' + priority + ' ' +
                    '<span class="font-normal text-slate-400 text-[10px]">' + 
                      (priority <= 2 ? '🏆' : priority <= 4 ? '⭐' : priority <= 6 ? '📊' : '📋') + 
                    '</span>' +
                  '</span>' +
                '</div>';
              }
            },
            {
              header: 'Override Tier',
              key: 'isOverrideTier',
              render: function(item) {
                return item.isOverrideTier 
                  ? '<span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold rounded-md">Override</span>'
                  : '<span class="px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 text-[11px] font-semibold rounded-md">-</span>';
              }
            },
            {
              header: 'Status',
              key: 'isActive',
              render: function(item) {
                return item.isActive 
                  ? '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">Active</span>'
                  : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold rounded-md">Inactive</span>';
              }
            },
            {
              header: 'Actions',
              key: 'id',
              render: function(item) {
                return '<div class="flex items-center gap-1.5">' +
                  '<button data-edit-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Tier">' +
                    '<i class="fa-solid fa-pen-to-square text-sm"></i>' +
                  '</button>' +
                  '<button data-delete-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Tier">' +
                    '<i class="fa-regular fa-trash-can text-sm"></i>' +
                  '</button>' +
                '</div>';
              }
            }
          ],
          data: data,
          onSearch: function(query) {
            searchQuery = query;
            loadAndRenderTable();
          }
        });

        attachActionListeners();
      } catch (error) {
        console.error('loadAndRenderTable error:', error);
        showError('Failed to load tiers: ' + error.message);
      }
    };

    var getFilteredData = function() {
      try {
        var list = store.tiers || [];
        if (!Array.isArray(list)) {
          console.error('getFilteredData: store.tiers is not an array:', list);
          return [];
        }
        
        console.log('getFilteredData: Found', list.length, 'tiers');

        // Apply filters
        if (currentFilter === 'active') {
          list = list.filter(function(t) { return t.isActive === true; });
        } else if (currentFilter === 'inactive') {
          list = list.filter(function(t) { return t.isActive === false; });
        }

        // Apply search
        if (searchQuery.trim()) {
          var q = searchQuery.toLowerCase().trim();
          list = list.filter(function(t) {
            var code = (t.code || '').toLowerCase();
            var nameEn = (t.name?.en || '').toLowerCase();
            var nameAm = (t.name?.am || '').toLowerCase();
            return code.indexOf(q) !== -1 || nameEn.indexOf(q) !== -1 || nameAm.indexOf(q) !== -1;
          });
        }

        // ✅ Sort by priority (lower number = higher priority)
        list.sort(function(a, b) {
          var priorityA = a.priorityLevel || a.allocationPriority || 0;
          var priorityB = b.priorityLevel || b.allocationPriority || 0;
          return priorityA - priorityB;
        });

        return list;
      } catch (error) {
        console.error('getFilteredData error:', error);
        return [];
      }
    };

    var attachActionListeners = function() {
      try {
        var tableContainer = document.getElementById('tiers-table-container');
        if (!tableContainer) return;

        tableContainer.querySelectorAll('[data-edit-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-edit-id');
            if (id) openTierForm(id);
          });
        });

        tableContainer.querySelectorAll('[data-delete-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-delete-id');
            if (id) confirmDeleteTier(id);
          });
        });
      } catch (error) {
        console.error('attachActionListeners error:', error);
      }
    };

    // Setup filters
    var filterAll = document.getElementById('filter-all');
    var filterActive = document.getElementById('filter-active');
    var filterInactive = document.getElementById('filter-inactive');

    var updateFilterButtons = function(activeBtn) {
      var buttons = [filterAll, filterActive, filterInactive];
      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i];
        if (btn) {
          btn.className = 'px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs';
        }
      }
      if (activeBtn) {
        activeBtn.className = 'px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs';
      }
    };

    if (filterAll) {
      filterAll.addEventListener('click', function(e) {
        currentFilter = 'all';
        updateFilterButtons(e.currentTarget);
        loadAndRenderTable();
      });
    }

    if (filterActive) {
      filterActive.addEventListener('click', function(e) {
        currentFilter = 'active';
        updateFilterButtons(e.currentTarget);
        loadAndRenderTable();
      });
    }

    if (filterInactive) {
      filterInactive.addEventListener('click', function(e) {
        currentFilter = 'inactive';
        updateFilterButtons(e.currentTarget);
        loadAndRenderTable();
      });
    }

    // Handle Add Tier trigger
    var createBtn = document.getElementById('btn-create-tier');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        openTierForm();
      });
    }

    // Load table originally
    loadAndRenderTable();
    
    console.log('renderTiers: Completed successfully');
  } catch (error) {
    console.error('renderTiers error:', error);
    showError('Failed to initialize tiers: ' + error.message);
  }
}

function showError(message) {
  var contentArea = document.getElementById('main-content-area');
  if (contentArea) {
    contentArea.innerHTML = `
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
    `;
  }
}

function openTierForm(id) {
  var isEdit = !!id;
  var item = isEdit ? store.tiers.find(function(t) { return t.id === id; }) : null;

  // Code format: TIER000001 or TIR000001 (handle both)
  var autoCode = !isEdit 
    ? 'TIER' + String((store.tiers?.length || 0) + 1).padStart(6, '0')
    : item?.code || '';

  // ✅ FIX: Get priority from either priorityLevel or allocationPriority
  var priority = item?.priorityLevel || item?.allocationPriority || 5;

  var formHTML = `
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
          value="${item?.name?.en || ''}" 
          required 
          placeholder="e.g. Tier 1 (Highest)"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input 
          type="text" 
          name="name_am" 
          value="${item?.name?.am || ''}" 
          required 
          placeholder="ደረጃ ፩ (ከፍተኛ)"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden font-sans"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Priority Level (1 - 10) <span class="text-rose-500">*</span></label>
        <p class="text-[10px] text-slate-400 mt-0.5 mb-1">Lower number = Higher priority (Level 1 is highest)</p>
        <input 
          type="number" 
          name="priorityLevel" 
          value="${priority}" 
          required 
          min="1" 
          max="10" 
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Override Tier</label>
        <select name="isOverrideTier" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden">
          <option value="true" ${item?.isOverrideTier ? 'selected' : ''}>Yes</option>
          <option value="false" ${!item?.isOverrideTier ? 'selected' : ''}>No</option>
        </select>
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="desc_en" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden" placeholder="Description in English...">${item?.description?.en || ''}</textarea>
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea name="desc_am" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden font-sans" placeholder="Description in Amharic...">${item?.description?.am || ''}</textarea>
      </div>

      <div class="flex items-center gap-2 mt-6 md:col-span-2">
        <input 
          type="checkbox" 
          id="isActive" 
          name="isActive" 
          ${(!item || item.isActive) ? 'checked' : ''} 
          class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm"
        />
        <label for="isActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Status</label>
      </div>
    </div>
  `;

  Modal.open({
    title: isEdit ? 'Edit Tier' : 'Create Tier',
    content: formHTML,
    isForm: true,
    confirmText: isEdit ? 'Save Changes' : 'Create Tier',
    onConfirm: function(modalEl) {
      try {
        var nameEnInput = modalEl.querySelector('[name="name_en"]');
        var nameAmInput = modalEl.querySelector('[name="name_am"]');
        var priorityInput = modalEl.querySelector('[name="priorityLevel"]');
        var descEnInput = modalEl.querySelector('[name="desc_en"]');
        var descAmInput = modalEl.querySelector('[name="desc_am"]');
        var isOverrideInput = modalEl.querySelector('[name="isOverrideTier"]');
        var isActiveInput = modalEl.querySelector('[name="isActive"]');

        var nameEn = nameEnInput ? nameEnInput.value : '';
        var nameAm = nameAmInput ? nameAmInput.value : '';
        var priorityLevel = parseInt(priorityInput ? priorityInput.value : '5', 10);
        var descEn = descEnInput ? descEnInput.value : '';
        var descAm = descAmInput ? descAmInput.value : '';
        var isOverrideTier = isOverrideInput ? isOverrideInput.value === 'true' : false;
        var isActive = isActiveInput ? isActiveInput.checked : true;

        var payload = {
          code: autoCode,
          name: { en: nameEn, am: nameAm },
          allocationPriority: priorityLevel,
          description: { en: descEn, am: descAm },
          isOverrideTier: isOverrideTier,
          isActive: isActive,
        };

        if (isEdit) {
          store.apiService.put('/institution-tiers/' + id, payload)
            .then(function() {
              Toast.success('Tier updated successfully.');
              store.syncWithBackend(true).then(function() {
                renderTiers();
              });
            })
            .catch(function(error) {
              console.error('Error updating tier:', error);
              Toast.error('Failed to update tier. Please try again.');
            });
        } else {
          store.apiService.post('/institution-tiers', payload)
            .then(function() {
              Toast.success('Tier created successfully.');
              store.syncWithBackend(true).then(function() {
                renderTiers();
              });
            })
            .catch(function(error) {
              console.error('Error creating tier:', error);
              Toast.error('Failed to create tier. Please try again.');
            });
        }
      } catch (error) {
        console.error('Error saving tier:', error);
        Toast.error('Failed to save tier. Please try again.');
      }
    }
  });
}

function confirmDeleteTier(id) {
  var item = store.tiers.find(function(t) { return t.id === id; });
  if (!item) return;

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this tier?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. Tier <strong class="text-slate-800">${item.name?.en || 'this tier'}</strong> (${item.code}) will be permanently deleted.</p>
        </div>
      </div>
    `,
    confirmText: 'Delete Tier',
    cancelText: 'Cancel',
    onConfirm: function() {
      try {
        store.apiService.delete('/institution-tiers/' + id)
          .then(function() {
            Toast.success('Tier deleted successfully.');
            store.syncWithBackend(true).then(function() {
              renderTiers();
            });
          })
          .catch(function(error) {
            console.error('Error deleting tier:', error);
            Toast.error('Failed to delete tier. Please try again.');
          });
      } catch (error) {
        console.error('Error deleting tier:', error);
        Toast.error('Failed to delete tier. Please try again.');
      }
    }
  });
}