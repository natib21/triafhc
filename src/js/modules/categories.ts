// Institution Categories Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

// CategoryType enum values for dropdown
const CATEGORY_TYPES = {
  FEDERAL_GOVERNMENT: "FEDERAL_GOVERNMENT",
  SOE: "SOE",
  ADDIS_ABABA_ADMINISTRATION: "ADDIS_ABABA_ADMINISTRATION",
  DIRE_DAWA_ADMINISTRATION: "DIRE_DAWA_ADMINISTRATION",
  OROMIA_REGIONAL_STATE: "OROMIA_REGIONAL_STATE",
  REGIONAL_GOVERNMENT: "REGIONAL_GOVERNMENT",
  INTERNATIONAL_ORGANIZATION: "INTERNATIONAL_ORGANIZATION",
  EMBASSY: "EMBASSY",
  NGO: "NGO",
  POLITICAL_PARTY: "POLITICAL_PARTY",
  RELIGIOUS: "RELIGIOUS",
  PRIVATE: "PRIVATE",
  OTHER: "OTHER"
};

// Category type labels for display
const CATEGORY_TYPE_LABELS = {
  FEDERAL_GOVERNMENT: 'Federal Government',
  SOE: 'State-Owned Enterprise',
  ADDIS_ABABA_ADMINISTRATION: 'Addis Ababa Administration',
  DIRE_DAWA_ADMINISTRATION: 'Dire Dawa Administration',
  OROMIA_REGIONAL_STATE: 'Oromia Regional State',
  REGIONAL_GOVERNMENT: 'Regional Government',
  INTERNATIONAL_ORGANIZATION: 'International Organization',
  EMBASSY: 'Embassy',
  NGO: 'NGO',
  POLITICAL_PARTY: 'Political Party',
  RELIGIOUS: 'Religious',
  PRIVATE: 'Private',
  OTHER: 'Other'
};

// Category type colors for badges
const CATEGORY_TYPE_COLORS = {
  FEDERAL_GOVERNMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  SOE: 'bg-purple-50 text-purple-700 border-purple-200',
  ADDIS_ABABA_ADMINISTRATION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DIRE_DAWA_ADMINISTRATION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OROMIA_REGIONAL_STATE: 'bg-teal-50 text-teal-700 border-teal-200',
  REGIONAL_GOVERNMENT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  INTERNATIONAL_ORGANIZATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  EMBASSY: 'bg-amber-50 text-amber-700 border-amber-200',
  NGO: 'bg-green-50 text-green-700 border-green-200',
  POLITICAL_PARTY: 'bg-orange-50 text-orange-700 border-orange-200',
  RELIGIOUS: 'bg-rose-50 text-rose-700 border-rose-200',
  PRIVATE: 'bg-slate-50 text-slate-700 border-slate-200',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200'
};

export function renderCategories() {
  try {
    console.log('renderCategories: Starting...');
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) {
      console.error('renderCategories: main-content-area not found');
      return;
    }

    if (!store) {
      console.error('renderCategories: store is undefined');
      showError('Store is not initialized. Please check your application setup.');
      return;
    }

    if (!store.apiService) {
      console.error('renderCategories: apiService is undefined');
      showError('API Service is not initialized. Please check your application setup.');
      return;
    }

    if (!store.categories || !Array.isArray(store.categories)) {
      console.warn('renderCategories: store.categories is not an array, initializing as empty array');
      store.categories = [];
    }

    contentArea.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Institution Categories</h2>
            <p class="text-xs text-slate-500 mt-0.5">Define top-level institutional classifications and sector mappings.</p>
          </div>
          <button id="btn-create-category" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Add Category
          </button>
        </div>

        <!-- Filters & Stats row -->
        <div class="flex items-center gap-3 flex-wrap">
          <button id="filter-all" class="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs">All</button>
          <button id="filter-active" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Active Only</button>
          <button id="filter-inactive" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Inactive Only</button>
        </div>

        <!-- Table Container -->
        <div id="categories-table-container"></div>
      </div>
    `;

    var currentFilter = 'all';
    var searchQuery = '';

    var loadAndRenderTable = function() {
      try {
        console.log('loadAndRenderTable: Loading data...');
        var data = getFilteredData();
        
        if (!data || !Array.isArray(data)) {
          console.error('loadAndRenderTable: Data is not an array:', data);
          data = [];
        }
        
        console.log('loadAndRenderTable: Data loaded:', data.length, 'items');

        if (!Table || typeof Table.render !== 'function') {
          console.error('Table component is not defined or missing render method');
          showError('Table component is not loaded. Please check your imports.');
          return;
        }

        var tableContainer = document.getElementById('categories-table-container');
        if (!tableContainer) {
          console.error('categories-table-container not found');
          return;
        }

        if (data.length === 0) {
          tableContainer.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <div class="relative">
                  <input type="text" placeholder="Search categories by name or code..." value="${searchQuery}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <i class="fa-solid fa-search absolute left-2.5 top-2 text-slate-400 text-xs"></i>
                </div>
              </div>
              <div class="p-8 text-center">
                <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3 block"></i>
                <p class="text-sm text-slate-500">No categories found</p>
                <p class="text-xs text-slate-400 mt-1">Click "Add Category" to create your first category.</p>
              </div>
            </div>
          `;
          return;
        }

        Table.render({
          containerId: 'categories-table-container',
          loading: false,
          searchValue: searchQuery,
          placeholderText: 'Search categories by name or code...',
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
              header: 'Type',
              key: 'type',
              sortable: true,
              render: function(item) {
                var type = item.type || 'OTHER';
                var label = CATEGORY_TYPE_LABELS[type] || type;
                var colorClass = CATEGORY_TYPE_COLORS[type] || 'bg-gray-50 text-gray-700 border-gray-200';
                return '<span class="px-2 py-0.5 text-[10px] font-semibold rounded-md border ' + colorClass + '">' + label + '</span>';
              }
            },
            {
              header: 'Description',
              key: 'description',
              render: function(item) {
                return '<span class="text-slate-500 text-xs line-clamp-1">' + (item.description?.en || '-') + '</span>';
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
                  '<button data-edit-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Category">' +
                    '<i class="fa-solid fa-pen-to-square text-sm"></i>' +
                  '</button>' +
                  '<button data-delete-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Category">' +
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
        showError('Failed to load table: ' + error.message);
      }
    };

    var getFilteredData = function() {
      try {
        var list = store.categories || [];
        if (!Array.isArray(list)) {
          console.error('getFilteredData: store.categories is not an array:', list);
          return [];
        }
        
        if (currentFilter === 'active') {
          list = list.filter(function(c) { return c.isActive === true; });
        } else if (currentFilter === 'inactive') {
          list = list.filter(function(c) { return c.isActive === false; });
        }

        if (searchQuery.trim()) {
          var q = searchQuery.toLowerCase().trim();
          list = list.filter(function(c) {
            var code = (c.code || '').toLowerCase();
            var nameEn = (c.name?.en || '').toLowerCase();
            var nameAm = (c.name?.am || '').toLowerCase();
            var descEn = (c.description?.en || '').toLowerCase();
            var descAm = (c.description?.am || '').toLowerCase();
            var type = (c.type || '').toLowerCase();
            var typeLabel = (CATEGORY_TYPE_LABELS[c.type] || '').toLowerCase();
            
            return code.indexOf(q) !== -1 || 
                   nameEn.indexOf(q) !== -1 || 
                   nameAm.indexOf(q) !== -1 ||
                   descEn.indexOf(q) !== -1 ||
                   descAm.indexOf(q) !== -1 ||
                   type.indexOf(q) !== -1 ||
                   typeLabel.indexOf(q) !== -1;
          });
        }

        return list;
      } catch (error) {
        console.error('getFilteredData error:', error);
        return [];
      }
    };

    var attachActionListeners = function() {
      try {
        var tableContainer = document.getElementById('categories-table-container');
        if (!tableContainer) return;

        var editButtons = tableContainer.querySelectorAll('[data-edit-id]');
        for (var i = 0; i < editButtons.length; i++) {
          (function(btn) {
            btn.addEventListener('click', function() {
              var id = btn.getAttribute('data-edit-id');
              if (id) openCategoryForm(id);
            });
          })(editButtons[i]);
        }

        var deleteButtons = tableContainer.querySelectorAll('[data-delete-id]');
        for (var j = 0; j < deleteButtons.length; j++) {
          (function(btn) {
            btn.addEventListener('click', function() {
              var id = btn.getAttribute('data-delete-id');
              if (id) confirmDeleteCategory(id);
            });
          })(deleteButtons[j]);
        }
      } catch (error) {
        console.error('attachActionListeners error:', error);
      }
    };

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

    var createBtn = document.getElementById('btn-create-category');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        openCategoryForm();
      });
    }

    loadAndRenderTable();
    
    console.log('renderCategories: Completed successfully');
  } catch (error) {
    console.error('renderCategories error:', error);
    showError('Failed to initialize categories: ' + error.message);
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

function getCategoryTypeOptions(selectedType) {
  var options = '';
  for (var key in CATEGORY_TYPE_LABELS) {
    var label = CATEGORY_TYPE_LABELS[key];
    var selected = (selectedType === key) ? 'selected' : '';
    options += '<option value="' + key + '" ' + selected + '>' + label + '</option>';
  }
  return options;
}

function openCategoryForm(id) {
  var isEdit = !!id;
  var item = isEdit ? store.categories.find(function(c) { return c.id === id; }) : null;

  var autoCode = !isEdit 
    ? 'CAT' + String((store.categories?.length || 0) + 1).padStart(3, '0')
    : item?.code || '';

  var selectedType = item?.type || 'OTHER';

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
          placeholder="e.g. Government Institutions"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input 
          type="text" 
          name="name_am" 
          value="${item?.name?.am || ''}" 
          required 
          placeholder="የመንግስት ተቋማት"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans"
        />
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Category Type <span class="text-rose-500">*</span></label>
        <select 
          name="type" 
          required
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Select Category Type...</option>
          ${getCategoryTypeOptions(selectedType)}
        </select>
        <p class="text-xs text-slate-400 mt-1">Choose the classification type for this category.</p>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea 
          name="desc_en" 
          rows="3" 
          placeholder="Sector representation details in English..."
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >${item?.description?.en || ''}</textarea>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea 
          name="desc_am" 
          rows="3" 
          placeholder="ዝርዝር መግለጫ በአማርኛ..."
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans"
        >${item?.description?.am || ''}</textarea>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Sector Color Marker</label>
        <div class="flex items-center gap-3">
          <input 
            type="color" 
            name="color" 
            value="${item?.color || '#2E86AB'}" 
            class="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
          />
          <span class="text-xs text-slate-400">Choose a high-contrast visual category color.</span>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-6">
        <input 
          type="checkbox" 
          id="isActive" 
          name="isActive" 
          ${(!item || item.isActive) ? 'checked' : ''} 
          class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500"
        />
        <label for="isActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Status</label>
      </div>
    </div>
  `;

  Modal.open({
    title: isEdit ? 'Edit Category' : 'Create Category',
    content: formHTML,
    isForm: true,
    confirmText: isEdit ? 'Save Changes' : 'Create Category',
    onConfirm: function(modalEl) {
      try {
        var nameEnInput = modalEl.querySelector('[name="name_en"]');
        var nameAmInput = modalEl.querySelector('[name="name_am"]');
        var typeInput = modalEl.querySelector('[name="type"]');
        var descEnInput = modalEl.querySelector('[name="desc_en"]');
        var descAmInput = modalEl.querySelector('[name="desc_am"]');
        var colorInput = modalEl.querySelector('[name="color"]');
        var isActiveInput = modalEl.querySelector('[name="isActive"]');

        var nameEn = nameEnInput ? nameEnInput.value.trim() : '';
        var nameAm = nameAmInput ? nameAmInput.value.trim() : '';
        var type = typeInput ? typeInput.value : 'OTHER';
        var descEn = descEnInput ? descEnInput.value : '';
        var descAm = descAmInput ? descAmInput.value : '';
        var color = colorInput ? colorInput.value : '#2E86AB';
        var isActive = isActiveInput ? isActiveInput.checked : false;

        // Validate
        if (!nameEn) {
          Toast.warning('Please enter English name.');
          return;
        }
        if (!nameAm) {
          Toast.warning('Please enter Amharic name.');
          return;
        }
        if (!type) {
          Toast.warning('Please select a category type.');
          return;
        }

        var payload = {
          code: autoCode,
          name: { en: nameEn, am: nameAm },
          type: type,
          description: { en: descEn, am: descAm },
          color: color,
          isActive: isActive,
        };

        if (isEdit) {
          store.apiService.put('/institutions-categories/' + id, payload)
            .then(function() {
              Toast.success('Category updated successfully.');
              store.syncWithBackend(true).then(function() {
                renderCategories();
              });
            })
            .catch(function(error) {
              console.error('Error updating category:', error);
              Toast.error('Failed to update category. Please try again.');
            });
        } else {
          store.apiService.post('/institutions-categories', payload)
            .then(function() {
              Toast.success('Category created successfully.');
              store.syncWithBackend(true).then(function() {
                renderCategories();
              });
            })
            .catch(function(error) {
              console.error('Error creating category:', error);
              Toast.error('Failed to create category. Please try again.');
            });
        }
      } catch (error) {
        console.error('Error saving category:', error);
        Toast.error('Failed to save category. Please try again.');
      }
    }
  });
}

function confirmDeleteCategory(id) {
  var item = store.categories.find(function(c) { return c.id === id; });
  if (!item) return;

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this category?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. All mapped institutions for <strong class="text-slate-800">${item.name?.en || 'this category'}</strong> (${item.code}) might be affected.</p>
          ${item.type ? '<p class="text-xs text-slate-400 mt-1">Type: <span class="font-semibold">' + (CATEGORY_TYPE_LABELS[item.type] || item.type) + '</span></p>' : ''}
        </div>
      </div>
    `,
    confirmText: 'Delete Category',
    cancelText: 'Cancel',
    onConfirm: function() {
      try {
        store.apiService.delete('/institutions-categories/' + id)
          .then(function() {
            Toast.success('Category deleted successfully.');
            store.syncWithBackend(true).then(function() {
              renderCategories();
            });
          })
          .catch(function(error) {
            console.error('Error deleting category:', error);
            Toast.error('Failed to delete category. Please try again.');
          });
      } catch (error) {
        console.error('Error deleting category:', error);
        Toast.error('Failed to delete category. Please try again.');
      }
    }
  });
}

// Export for use in other modules
export { CATEGORY_TYPES, CATEGORY_TYPE_LABELS, CATEGORY_TYPE_COLORS };