// Titles Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

export function renderTitles() {
  try {
    console.log('renderTitles: Starting...');
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) return;

    if (!store) {
      console.error('renderTitles: store is undefined');
      showError('Store is not initialized.');
      return;
    }

    if (!store.titles || !Array.isArray(store.titles)) {
      console.warn('renderTitles: store.titles is not an array, initializing as empty array');
      store.titles = [];
    }

    contentArea.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Titles Directory</h2>
            <p class="text-xs text-slate-500 mt-0.5">Manage honorifics, prefixes, and organizational titles for authorizing officials.</p>
          </div>
          <button id="btn-create-title" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Add Title
          </button>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-3 flex-wrap">
          <button id="filter-all" class="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs">All</button>
          <button id="filter-active" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Active Only</button>
          <button id="filter-inactive" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Inactive Only</button>
        </div>

        <!-- Table Container -->
        <div id="titles-table-container"></div>
      </div>
    `;

    let currentFilter = 'all';
    let searchQuery = '';

    const loadAndRenderTable = function() {
      try {
        console.log('loadAndRenderTable: Loading titles...');
        var data = getFilteredData();
        
        if (!data || !Array.isArray(data)) {
          console.error('loadAndRenderTable: Data is not an array:', data);
          data = [];
        }
        
        console.log('loadAndRenderTable: Data loaded:', data.length, 'items');

        if (!Table || typeof Table.render !== 'function') {
          console.error('Table component is not defined');
          showError('Table component is not loaded.');
          return;
        }

        var tableContainer = document.getElementById('titles-table-container');
        if (!tableContainer) {
          console.error('titles-table-container not found');
          return;
        }

        if (data.length === 0) {
          tableContainer.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <div class="relative">
                  <input type="text" placeholder="Search titles by name or code..." value="${searchQuery}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <i class="fa-solid fa-search absolute left-2.5 top-2 text-slate-400 text-xs"></i>
                </div>
              </div>
              <div class="p-8 text-center">
                <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3 block"></i>
                <p class="text-sm text-slate-500">No titles found</p>
                <p class="text-xs text-slate-400 mt-1">Click "Add Title" to create your first title.</p>
              </div>
            </div>
          `;
          return;
        }

        Table.render({
          containerId: 'titles-table-container',
          loading: false,
          searchValue: searchQuery,
          placeholderText: 'Search titles by name or code...',
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
              header: 'Title (EN)',
              key: 'name_en',
              sortable: true,
              render: function(item) {
                return '<span class="font-medium text-slate-900">' + (item.name?.en || '-') + '</span>';
              }
            },
            {
              header: 'Title (AM)',
              key: 'name_am',
              render: function(item) {
                return '<span class="font-medium text-slate-800 font-sans">' + (item.name?.am || '-') + '</span>';
              }
            },
            {
              header: 'Abbreviation',
              key: 'abbreviation',
              render: function(item) {
                var abbr = item.abbreviations?.en || item.abbreviations?.am || '-';
                return '<span class="text-xs font-mono text-slate-600">' + abbr + '</span>';
              }
            },
            {
              header: 'Gender',
              key: 'gender',
              render: function(item) {
                var gender = item.gender || 'N/A';
                var icon = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '⚧️';
                return '<span class="text-xs text-slate-600">' + icon + ' ' + gender + '</span>';
              }
            },
            {
              header: 'Description',
              key: 'description',
              render: function(item) {
                return '<span class="text-slate-500 text-xs">' + (item.description?.en || item.description || '-') + '</span>';
              }
            },
            {
              header: 'Status',
              key: 'isActive',
              render: function(item) {
                return item.isActive 
                  ? '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">✅ Active</span>'
                  : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold rounded-md">❌ Inactive</span>';
              }
            },
            {
              header: 'Actions',
              key: 'id',
              render: function(item) {
                return '<div class="flex items-center gap-1.5">' +
                  '<button data-view-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Details">' +
                    '<i class="fa-regular fa-eye text-sm"></i>' +
                  '</button>' +
                  '<button data-edit-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Title">' +
                    '<i class="fa-solid fa-pen-to-square text-sm"></i>' +
                  '</button>' +
                  '<button data-delete-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Title">' +
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
        showError('Failed to load titles: ' + error.message);
      }
    };

    var getFilteredData = function() {
      try {
        var list = store.titles || [];
        if (!Array.isArray(list)) {
          console.error('getFilteredData: store.titles is not an array:', list);
          return [];
        }
        
        console.log('getFilteredData: Found', list.length, 'titles');

        if (currentFilter === 'active') {
          list = list.filter(function(t) { return t.isActive === true; });
        } else if (currentFilter === 'inactive') {
          list = list.filter(function(t) { return t.isActive === false; });
        }

        if (searchQuery.trim()) {
          var q = searchQuery.toLowerCase().trim();
          list = list.filter(function(t) {
            var code = (t.code || '').toLowerCase();
            var nameEn = (t.name?.en || '').toLowerCase();
            var nameAm = (t.name?.am || '').toLowerCase();
            var abbr = (t.abbreviations?.en || t.abbreviations?.am || '').toLowerCase();
            return code.indexOf(q) !== -1 || 
                   nameEn.indexOf(q) !== -1 || 
                   nameAm.indexOf(q) !== -1 ||
                   abbr.indexOf(q) !== -1;
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
        var tableContainer = document.getElementById('titles-table-container');
        if (!tableContainer) return;

        // View Details
        tableContainer.querySelectorAll('[data-view-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-view-id');
            if (id) viewTitleDetails(id);
          });
        });

        tableContainer.querySelectorAll('[data-edit-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-edit-id');
            if (id) openTitleForm(id);
          });
        });

        tableContainer.querySelectorAll('[data-delete-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-delete-id');
            if (id) confirmDeleteTitle(id);
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

    var createBtn = document.getElementById('btn-create-title');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        openTitleForm();
      });
    }

    loadAndRenderTable();
    
    console.log('renderTitles: Completed successfully');
  } catch (error) {
    console.error('renderTitles error:', error);
    showError('Failed to initialize titles: ' + error.message);
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

/**
 * View Title Details
 */
function viewTitleDetails(id) {
  var item = store.titles.find(function(t) { return t.id === id; });
  if (!item) {
    Toast.error('Title not found');
    return;
  }

  var detailHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900">${item.name?.en || 'N/A'}</h3>
          <p class="text-sm text-slate-500 font-sans">${item.name?.am || 'N/A'}</p>
          <p class="text-xs text-slate-400 font-mono mt-1">${item.code || 'N/A'}</p>
        </div>
        <div class="text-right">
          <span class="px-2 py-1 text-xs font-bold rounded-md ${item.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
            ${item.isActive ? '✅ Active' : '❌ Inactive'}
          </span>
        </div>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Abbreviation</label>
            <p class="text-sm text-slate-800">${item.abbreviations?.en || item.abbreviations?.am || 'N/A'}</p>
          </div>

          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Gender</label>
            <p class="text-sm text-slate-800">${item.gender || 'N/A'}</p>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Description (English)</label>
            <p class="text-sm text-slate-800">${item.description?.en || 'N/A'}</p>
          </div>

          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Description (Amharic)</label>
            <p class="text-sm text-slate-800 font-sans">${item.description?.am || 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-slate-100 pt-3 text-[10px] text-slate-400 flex justify-between">
        <span>Created: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</span>
        <span>Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</span>
      </div>
    </div>
  `;

  Modal.open({
    title: 'Title Details',
    content: detailHTML,
    isForm: false,
    confirmText: 'Close',
    onConfirm: function() {}
  });
}

/**
 * Open Create / Edit Title Form
 */
function openTitleForm(id) {
  var isEdit = !!id;
  var item = isEdit ? store.titles.find(function(t) { return t.id === id; }) : null;

  var autoCode = !isEdit 
    ? 'TTL' + String((store.titles?.length || 0) + 1).padStart(6, '0')
    : item?.code || '';

  var formHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Code (Auto-Generated)</label>
        <input type="text" name="code" value="${autoCode}" readonly class="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 font-mono focus:outline-hidden" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Title Name (English) <span class="text-rose-500">*</span></label>
        <input type="text" name="name_en" value="${item?.name?.en || ''}" required placeholder="e.g. Doctor" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Title Name (Amharic) <span class="text-rose-500">*</span></label>
        <input type="text" name="name_am" value="${item?.name?.am || ''}" required placeholder="ዶክተር" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Abbreviation (English)</label>
        <input type="text" name="abbr_en" value="${item?.abbreviations?.en || ''}" placeholder="e.g. Dr." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Abbreviation (Amharic)</label>
        <input type="text" name="abbr_am" value="${item?.abbreviations?.am || ''}" placeholder="ዶ/ር" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Gender</label>
        <select name="gender" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
          <option value="">Not Specified</option>
          <option value="male" ${item && item.gender === 'male' ? 'selected' : ''}>♂️ Male</option>
          <option value="female" ${item && item.gender === 'female' ? 'selected' : ''}>♀️ Female</option>
        </select>
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="desc_en" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500">${item?.description?.en || ''}</textarea>
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea name="desc_am" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans">${item?.description?.am || ''}</textarea>
      </div>

      <div class="flex items-center gap-2 mt-2 md:col-span-2">
        <input type="checkbox" id="isActive" name="isActive" ${(!item || item.isActive) ? 'checked' : ''} class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
        <label for="isActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Status</label>
      </div>
    </div>
  `;

  Modal.open({
    title: isEdit ? 'Edit Title' : 'Create Title',
    content: formHTML,
    isForm: true,
    confirmText: isEdit ? 'Save Changes' : 'Create Title',
    onConfirm: function(modalEl) {
      try {
        var nameEn = modalEl.querySelector('[name="name_en"]')?.value || '';
        var nameAm = modalEl.querySelector('[name="name_am"]')?.value || '';
        var abbrEn = modalEl.querySelector('[name="abbr_en"]')?.value || '';
        var abbrAm = modalEl.querySelector('[name="abbr_am"]')?.value || '';
        var gender = modalEl.querySelector('[name="gender"]')?.value || null;
        var descEn = modalEl.querySelector('[name="desc_en"]')?.value || '';
        var descAm = modalEl.querySelector('[name="desc_am"]')?.value || '';
        var isActive = modalEl.querySelector('[name="isActive"]')?.checked || false;

        var payload = {
          code: autoCode,
          name: { en: nameEn, am: nameAm },
          abbreviations: { en: abbrEn, am: abbrAm },
          gender: gender,
          description: { en: descEn, am: descAm },
          isActive: isActive,
        };

        if (isEdit) {
          store.apiService.put('/titles/' + id, payload)
            .then(function() {
              Toast.success('Title updated successfully.');
              store.syncWithBackend(true).then(function() {
                renderTitles();
              });
            })
            .catch(function(error) {
              console.error('Error updating title:', error);
              Toast.error('Failed to update title. Please try again.');
            });
        } else {
          store.apiService.post('/titles', payload)
            .then(function() {
              Toast.success('Title created successfully.');
              store.syncWithBackend(true).then(function() {
                renderTitles();
              });
            })
            .catch(function(error) {
              console.error('Error creating title:', error);
              Toast.error('Failed to create title. Please try again.');
            });
        }
      } catch (error) {
        console.error('Error saving title:', error);
        Toast.error('Failed to save title. Please try again.');
      }
    }
  });
}

/**
 * Delete confirmation dialog
 */
function confirmDeleteTitle(id) {
  var item = store.titles.find(function(t) { return t.id === id; });
  if (!item) return;

  var name = item.name?.en || item.name || 'this title';

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this title?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. Title <strong class="text-slate-800">${name}</strong> (${item.code}) will be permanently deleted.</p>
        </div>
      </div>
    `,
    confirmText: 'Delete Title',
    cancelText: 'Cancel',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: function() {
      try {
        store.apiService.delete('/titles/' + id)
          .then(function() {
            Toast.success('Title deleted successfully.');
            store.syncWithBackend(true).then(function() {
              renderTitles();
            });
          })
          .catch(function(error) {
            console.error('Error deleting title:', error);
            Toast.error('Failed to delete title. Please try again.');
          });
      } catch (error) {
        console.error('Error deleting title:', error);
        Toast.error('Failed to delete title. Please try again.');
      }
    }
  });
}