// Ranks Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

export function renderRanks() {
  try {
    console.log('renderRanks: Starting...');
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) return;

    if (!store) {
      console.error('renderRanks: store is undefined');
      showError('Store is not initialized.');
      return;
    }

    if (!store.ranks || !Array.isArray(store.ranks)) {
      console.warn('renderRanks: store.ranks is not an array, initializing as empty array');
      store.ranks = [];
    }

    contentArea.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Ranks Directory</h2>
            <p class="text-xs text-slate-500 mt-0.5">Define employee ranks and priority structures across federal institutions.</p>
          </div>
          <button id="btn-create-rank" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Add Rank
          </button>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-3 flex-wrap">
          <button id="filter-all" class="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs">All</button>
          <button id="filter-active" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Active Only</button>
          <button id="filter-inactive" class="px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs">Inactive Only</button>
        </div>

        <!-- Table Container -->
        <div id="ranks-table-container"></div>
      </div>
    `;

    let currentFilter = 'all';
    let searchQuery = '';

    const loadAndRenderTable = function() {
      try {
        console.log('loadAndRenderTable: Loading ranks...');
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

        var tableContainer = document.getElementById('ranks-table-container');
        if (!tableContainer) {
          console.error('ranks-table-container not found');
          return;
        }

        if (data.length === 0) {
          tableContainer.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <div class="relative">
                  <input type="text" placeholder="Search ranks by name or code..." value="${searchQuery}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <i class="fa-solid fa-search absolute left-2.5 top-2 text-slate-400 text-xs"></i>
                </div>
              </div>
              <div class="p-8 text-center">
                <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3 block"></i>
                <p class="text-sm text-slate-500">No ranks found</p>
                <p class="text-xs text-slate-400 mt-1">Click "Add Rank" to create your first rank.</p>
              </div>
            </div>
          `;
          return;
        }

        Table.render({
          containerId: 'ranks-table-container',
          loading: false,
          searchValue: searchQuery,
          placeholderText: 'Search ranks by name or code...',
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
              sortable: true,
              render: function(item) {
                return '<span class="font-medium text-slate-900">' + (item.name?.en || item.name || '-') + '</span>';
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
                var priority = item.priorityLevel || item.allocationPriority || 'N/A';
                if (priority === 'N/A') {
                  return '<span class="text-slate-400 text-xs">Not Set</span>';
                }
                
                // Color coding based on priority (lower = higher priority)
                var color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                if (priority <= 2) color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                else if (priority <= 4) color = 'bg-blue-50 text-blue-700 border-blue-200';
                else if (priority <= 6) color = 'bg-amber-50 text-amber-700 border-amber-200';
                else if (priority <= 8) color = 'bg-orange-50 text-orange-700 border-orange-200';
                else color = 'bg-rose-50 text-rose-700 border-rose-200';
                
                return '<div class="flex items-center gap-2">' +
                  '<span class="px-2 py-0.5 text-xs font-bold rounded-md border ' + color + '">' +
                    'Level ' + priority +
                  '</span>' +
                '</div>';
              }
            },
            {
              header: 'Bedrooms',
              key: 'bedroomEntitlement',
              render: function(item) {
                var bedrooms = item.bedroomEntitlement || 'N/A';
                var rule = item.bedroomEntitlementRule || 'ANY';
                return '<div class="text-xs">' +
                  '<span class="font-semibold text-slate-700">' + bedrooms + '</span>' +
                  '<span class="text-slate-400 ml-1 text-[10px]">(' + rule + ')</span>' +
                '</div>';
              }
            },
            {
              header: 'House Types',
              key: 'preferredHouseTypes',
              render: function(item) {
                var preferred = item.preferredHouseTypes || [];
                var fallback = item.fallbackHouseTypes || [];
                
                var html = '<div class="text-xs">';
                if (preferred.length > 0) {
                  html += '<span class="font-medium text-emerald-600">' + preferred.join(', ') + '</span>';
                }
                if (fallback.length > 0) {
                  html += '<span class="text-slate-400 ml-1">→ ' + fallback.join(', ') + '</span>';
                }
                if (preferred.length === 0 && fallback.length === 0) {
                  html += '<span class="text-slate-400">Any</span>';
                }
                html += '</div>';
                return html;
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
                  '<button data-edit-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Rank">' +
                    '<i class="fa-solid fa-pen-to-square text-sm"></i>' +
                  '</button>' +
                  '<button data-delete-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Rank">' +
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
        showError('Failed to load ranks: ' + error.message);
      }
    };

    var getFilteredData = function() {
      try {
        var list = store.ranks || [];
        if (!Array.isArray(list)) {
          console.error('getFilteredData: store.ranks is not an array:', list);
          return [];
        }
        
        console.log('getFilteredData: Found', list.length, 'ranks');

        if (currentFilter === 'active') {
          list = list.filter(function(r) { return r.isActive === true; });
        } else if (currentFilter === 'inactive') {
          list = list.filter(function(r) { return r.isActive === false; });
        }

        if (searchQuery.trim()) {
          var q = searchQuery.toLowerCase().trim();
          list = list.filter(function(r) {
            var code = (r.code || '').toLowerCase();
            var nameEn = (r.name?.en || r.name || '').toLowerCase();
            var nameAm = (r.name?.am || '').toLowerCase();
            return code.indexOf(q) !== -1 || 
                   nameEn.indexOf(q) !== -1 || 
                   nameAm.indexOf(q) !== -1;
          });
        }

        // Sort by priority (lower number = higher priority)
        list.sort(function(a, b) {
          var priorityA = a.priorityLevel || a.allocationPriority || 999;
          var priorityB = b.priorityLevel || b.allocationPriority || 999;
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
        var tableContainer = document.getElementById('ranks-table-container');
        if (!tableContainer) return;

        // View Details
        tableContainer.querySelectorAll('[data-view-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-view-id');
            if (id) viewRankDetails(id);
          });
        });

        tableContainer.querySelectorAll('[data-edit-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-edit-id');
            if (id) openRankForm(id);
          });
        });

        tableContainer.querySelectorAll('[data-delete-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-delete-id');
            if (id) confirmDeleteRank(id);
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

    var createBtn = document.getElementById('btn-create-rank');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        openRankForm();
      });
    }

    loadAndRenderTable();
    
    console.log('renderRanks: Completed successfully');
  } catch (error) {
    console.error('renderRanks error:', error);
    showError('Failed to initialize ranks: ' + error.message);
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
 * View Rank Details
 */
function viewRankDetails(id) {
  var item = store.ranks.find(function(r) { return r.id === id; });
  if (!item) {
    Toast.error('Rank not found');
    return;
  }

  var priority = item.priorityLevel || item.allocationPriority || 'Not Set';
  var priorityLabel = '';
  var priorityColor = '';
  
  if (priority !== 'Not Set') {
    if (priority <= 2) { priorityLabel = 'Highest Priority'; priorityColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'; }
    else if (priority <= 4) { priorityLabel = 'High Priority'; priorityColor = 'text-blue-700 bg-blue-50 border-blue-200'; }
    else if (priority <= 6) { priorityLabel = 'Medium Priority'; priorityColor = 'text-amber-700 bg-amber-50 border-amber-200'; }
    else if (priority <= 8) { priorityLabel = 'Low Priority'; priorityColor = 'text-orange-700 bg-orange-50 border-orange-200'; }
    else { priorityLabel = 'Lowest Priority'; priorityColor = 'text-rose-700 bg-rose-50 border-rose-200'; }
  }

  var detailHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900">${item.name?.en || item.name || 'N/A'}</h3>
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
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Priority Level</label>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-3 py-1 text-sm font-bold rounded-md border ${priorityColor || 'bg-slate-100 text-slate-600 border-slate-200'}">
                ${priority !== 'Not Set' ? 'Level ' + priority : 'Not Set'}
              </span>
              ${priority !== 'Not Set' ? '<span class="text-xs text-slate-500">' + priorityLabel + '</span>' : ''}
            </div>
          </div>

          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Description</label>
            <p class="text-sm text-slate-800">${item.description?.en || item.description || 'N/A'}</p>
            <p class="text-sm text-slate-500 font-sans">${item.description?.am || ''}</p>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Bedroom Entitlement</label>
            <p class="text-sm text-slate-800 font-semibold">${item.bedroomEntitlement || 'N/A'}</p>
            <p class="text-xs text-slate-500">Rule: ${item.bedroomEntitlementRule || 'ANY'}</p>
          </div>

          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">House Types</label>
            <div class="space-y-1">
              ${item.preferredHouseTypes && item.preferredHouseTypes.length > 0 ? `
                <div>
                  <span class="text-xs text-slate-500">Preferred:</span>
                  <span class="text-xs font-medium text-emerald-600 ml-1">${item.preferredHouseTypes.join(', ')}</span>
                </div>
              ` : ''}
              ${item.fallbackHouseTypes && item.fallbackHouseTypes.length > 0 ? `
                <div>
                  <span class="text-xs text-slate-500">Fallback:</span>
                  <span class="text-xs font-medium text-amber-600 ml-1">${item.fallbackHouseTypes.join(', ')}</span>
                </div>
              ` : ''}
              ${(!item.preferredHouseTypes || item.preferredHouseTypes.length === 0) && (!item.fallbackHouseTypes || item.fallbackHouseTypes.length === 0) ? `
                <p class="text-sm text-slate-400">Any house type allowed</p>
              ` : ''}
            </div>
          </div>

          <div>
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Allow Any House Type</label>
            <p class="text-sm text-slate-800">${item.allowAnyHouseType ? '✅ Yes' : '❌ No'}</p>
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
    title: 'Rank Details',
    content: detailHTML,
    isForm: false,
    confirmText: 'Close',
    onConfirm: function() {}
  });
}

/**
 * Open Create / Edit Rank Form
 */
function openRankForm(id) {
  var isEdit = !!id;
  var item = isEdit ? store.ranks.find(function(r) { return r.id === id; }) : null;

  var autoCode = !isEdit 
    ? 'RNK' + String((store.ranks?.length || 0) + 1).padStart(6, '0')
    : item?.code || '';

  var priority = item?.priorityLevel || item?.allocationPriority || 5;

  var formHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Code (Auto-Generated)</label>
        <input type="text" name="code" value="${autoCode}" readonly class="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 font-mono focus:outline-hidden" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
        <input type="text" name="name_en" value="${item?.name?.en || item?.name || ''}" required placeholder="e.g. Director General" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input type="text" name="name_am" value="${item?.name?.am || ''}" required placeholder="ዋና ዳይሬክተር" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Abbreviation (English)</label>
        <input type="text" name="abbr_en" value="${item?.abbreviations?.en || ''}" placeholder="e.g. DG" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Abbreviation (Amharic)</label>
        <input type="text" name="abbr_am" value="${item?.abbreviations?.am || ''}" placeholder="ዋ/ዳ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Priority Level (1-10) <span class="text-rose-500">*</span></label>
        <p class="text-[10px] text-slate-400 mt-0.5 mb-1">Lower number = Higher priority (1 is highest)</p>
        <input type="number" name="priorityLevel" value="${priority}" required min="1" max="10" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Bedroom Entitlement Rule</label>
        <select name="bedroomRule" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
          <option value="ANY" ${item?.bedroomEntitlementRule === 'ANY' ? 'selected' : ''}>ANY</option>
          <option value="MAXIMUM" ${item?.bedroomEntitlementRule === 'MAXIMUM' ? 'selected' : ''}>MAXIMUM</option>
          <option value="MINIMUM" ${item?.bedroomEntitlementRule === 'MINIMUM' ? 'selected' : ''}>MINIMUM</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Bedroom Entitlement</label>
        <input type="number" name="bedroomEntitlement" value="${item?.bedroomEntitlement || ''}" placeholder="e.g. 4" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Preferred House Types</label>
        <input type="text" name="preferredHouseTypes" value="${item?.preferredHouseTypes ? item.preferredHouseTypes.join(', ') : ''}" placeholder="e.g. APARTMENT, VILLA" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Fallback House Types</label>
        <input type="text" name="fallbackHouseTypes" value="${item?.fallbackHouseTypes ? item.fallbackHouseTypes.join(', ') : ''}" placeholder="e.g. VILLA" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>

      <div class="flex items-center gap-2 md:col-span-2">
        <input type="checkbox" id="allowAnyHouseType" name="allowAnyHouseType" ${item?.allowAnyHouseType ? 'checked' : ''} class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
        <label for="allowAnyHouseType" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Allow Any House Type</label>
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="desc_en" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500">${item?.description?.en || item?.description || ''}</textarea>
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
    title: isEdit ? 'Edit Rank' : 'Create Rank',
    content: formHTML,
    isForm: true,
    confirmText: isEdit ? 'Save Changes' : 'Create Rank',
    onConfirm: function(modalEl) {
      try {
        var nameEn = modalEl.querySelector('[name="name_en"]')?.value || '';
        var nameAm = modalEl.querySelector('[name="name_am"]')?.value || '';
        var abbrEn = modalEl.querySelector('[name="abbr_en"]')?.value || '';
        var abbrAm = modalEl.querySelector('[name="abbr_am"]')?.value || '';
        var priorityLevel = parseInt(modalEl.querySelector('[name="priorityLevel"]')?.value || '5', 10);
        var bedroomRule = modalEl.querySelector('[name="bedroomRule"]')?.value || 'ANY';
        var bedroomEntitlement = parseInt(modalEl.querySelector('[name="bedroomEntitlement"]')?.value || '', 10) || null;
        var preferredHouseTypes = modalEl.querySelector('[name="preferredHouseTypes"]')?.value || '';
        var fallbackHouseTypes = modalEl.querySelector('[name="fallbackHouseTypes"]')?.value || '';
        var allowAnyHouseType = modalEl.querySelector('[name="allowAnyHouseType"]')?.checked || false;
        var descEn = modalEl.querySelector('[name="desc_en"]')?.value || '';
        var descAm = modalEl.querySelector('[name="desc_am"]')?.value || '';
        var isActive = modalEl.querySelector('[name="isActive"]')?.checked || false;

        var payload = {
          code: autoCode,
          name: { en: nameEn, am: nameAm },
          abbreviations: { en: abbrEn, am: abbrAm },
          priorityLevel: priorityLevel,
          bedroomEntitlementRule: bedroomRule,
          bedroomEntitlement: bedroomEntitlement,
          allowAnyHouseType: allowAnyHouseType,
          preferredHouseTypes: preferredHouseTypes ? preferredHouseTypes.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
          fallbackHouseTypes: fallbackHouseTypes ? fallbackHouseTypes.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
          description: { en: descEn, am: descAm },
          isActive: isActive,
        };

        if (isEdit) {
          store.apiService.put('/ranks/' + id, payload)
            .then(function() {
              Toast.success('Rank updated successfully.');
              store.syncWithBackend(true).then(function() {
                renderRanks();
              });
            })
            .catch(function(error) {
              console.error('Error updating rank:', error);
              Toast.error('Failed to update rank. Please try again.');
            });
        } else {
          store.apiService.post('/ranks', payload)
            .then(function() {
              Toast.success('Rank created successfully.');
              store.syncWithBackend(true).then(function() {
                renderRanks();
              });
            })
            .catch(function(error) {
              console.error('Error creating rank:', error);
              Toast.error('Failed to create rank. Please try again.');
            });
        }
      } catch (error) {
        console.error('Error saving rank:', error);
        Toast.error('Failed to save rank. Please try again.');
      }
    }
  });
}

/**
 * Delete confirmation dialog
 */
function confirmDeleteRank(id) {
  var item = store.ranks.find(function(r) { return r.id === id; });
  if (!item) return;

  var name = item.name?.en || item.name || 'this rank';

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this rank?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. Rank <strong class="text-slate-800">${name}</strong> (${item.code}) will be permanently deleted.</p>
          <ul class="mt-2 text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>All rank assignments</li>
            <li>Associated user extensions</li>
            <li>House allocation eligibility rules</li>
          </ul>
        </div>
      </div>
    `,
    confirmText: 'Delete Rank',
    cancelText: 'Cancel',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: function() {
      try {
        store.apiService.delete('/ranks/' + id)
          .then(function() {
            Toast.success('Rank deleted successfully.');
            store.syncWithBackend(true).then(function() {
              renderRanks();
            });
          })
          .catch(function(error) {
            console.error('Error deleting rank:', error);
            Toast.error('Failed to delete rank. Please try again.');
          });
      } catch (error) {
        console.error('Error deleting rank:', error);
        Toast.error('Failed to delete rank. Please try again.');
      }
    }
  });
}

export {viewRankDetails}