// Institutions Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

// Institutions Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

export function renderInstitutions() {
  try {
    console.log('renderInstitutions: Starting...');
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) return;

    if (!store) {
      console.error('renderInstitutions: store is undefined');
      showError('Store is not initialized.');
      return;
    }

    if (!store.institutions || !Array.isArray(store.institutions)) {
      console.warn('renderInstitutions: store.institutions is not an array, initializing as empty array');
      store.institutions = [];
    }

    contentArea.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Institutions Directories</h2>
            <p class="text-xs text-slate-500 mt-0.5">Manage federal and private institutions permitted to request public housing allocation.</p>
          </div>
          <button id="btn-create-institution" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Add Institution
          </button>
        </div>

        <!-- Advanced Filters -->
        <div class="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Search -->
            <div class="flex-1 min-w-[200px]">
              <input type="text" id="search-institutions" placeholder="Search institutions by name, code, TIN..." class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <!-- Category Filter -->
            <div class="min-w-[150px]">
              <select id="filter-category" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">All Categories</option>
                ${store.categories && Array.isArray(store.categories) ? store.categories.map(function(cat) {
                  return '<option value="' + cat.id + '">' + (cat.name?.en || cat.name?.am || '-') + '</option>';
                }).join('') : ''}
              </select>
            </div>

            <!-- Institution Type Filter -->
            // Institution Type Filter in the filters section
<div class="min-w-[140px]">
  <select id="filter-type" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
    <option value="">All Types</option>
    ${INSTITUTION_TYPE_OPTIONS.map(function(opt) {
      return '<option value="' + opt.value + '">' + opt.emoji + ' ' + opt.label + '</option>';
    }).join('')}
  </select>
</div>

            <!-- Tier Filter -->
            <div class="min-w-[150px]">
              <select id="filter-tier" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">All Tiers</option>
                ${store.tiers && Array.isArray(store.tiers) ? store.tiers.map(function(tier) {
                  return '<option value="' + tier.id + '">' + (tier.name?.en || tier.name?.am || tier.code || '-') + '</option>';
                }).join('') : ''}
              </select>
            </div>

            <!-- Status Filter -->
            <div class="min-w-[120px]">
              <select id="filter-status" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">All Status</option>
                <option value="active">✅ Active</option>
                <option value="inactive">❌ Inactive</option>
              </select>
            </div>

            <!-- Reset Filters -->
            <button id="reset-filters" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm transition-colors">
              <i class="fa-solid fa-rotate-right mr-1"></i> Reset
            </button>
          </div>

          <!-- Stats Row -->
        <!-- Stats Row -->
<div id="institution-stats" class="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
  <span>Total: <strong id="stat-total" class="text-slate-700">0</strong></span>
  <span>🏛️ Federal: <strong id="stat-federal" class="text-slate-700">0</strong></span>
  <span>🏢 SOE: <strong id="stat-soe" class="text-slate-700">0</strong></span>
  <span>🏙️ Addis: <strong id="stat-addis" class="text-slate-700">0</strong></span>
  <span>🏙️ Dire Dawa: <strong id="stat-dire-dawa" class="text-slate-700">0</strong></span>
  <span>🌍 Oromia: <strong id="stat-oromia" class="text-slate-700">0</strong></span>
  <span>🏛️ Regional: <strong id="stat-regional" class="text-slate-700">0</strong></span>
  <span>🌐 International: <strong id="stat-international" class="text-slate-700">0</strong></span>
  <span>🏛️ Embassy: <strong id="stat-embassy" class="text-slate-700">0</strong></span>
  <span>🤝 NGO: <strong id="stat-ngo" class="text-slate-700">0</strong></span>
  <span>🗳️ Political: <strong id="stat-political" class="text-slate-700">0</strong></span>
  <span>⛪ Religious: <strong id="stat-religious" class="text-slate-700">0</strong></span>
  <span>🏢 Private: <strong id="stat-private" class="text-slate-700">0</strong></span>
  <span>📌 Other: <strong id="stat-other" class="text-slate-700">0</strong></span>
  <span>✅ Active: <strong id="stat-active" class="text-slate-700">0</strong></span>
  <span>📊 With Tier: <strong id="stat-with-tier" class="text-slate-700">0</strong></span>
</div>
        </div>

        <div id="institutions-table-container"></div>
      </div>
    `;

    // Filter state
    let currentFilter = {
      type: 'all',
      category: '',
      tier: '',
      status: '',
      search: ''
    };

    // Function to load and render table
    const loadAndRenderTable = function() {
      try {
        console.log('loadAndRenderTable: Loading institutions...');
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

        var tableContainer = document.getElementById('institutions-table-container');
        if (!tableContainer) {
          console.error('institutions-table-container not found');
          return;
        }

        // Update stats
        updateStats();

        if (data.length === 0) {
          tableContainer.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <div class="relative">
                  <input type="text" placeholder="Search institutions by name, short name, TIN, code..." value="${currentFilter.search}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <i class="fa-solid fa-search absolute left-2.5 top-2 text-slate-400 text-xs"></i>
                </div>
              </div>
              <div class="p-8 text-center">
                <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3 block"></i>
                <p class="text-sm text-slate-500">No institutions found</p>
                <p class="text-xs text-slate-400 mt-1">Try adjusting your filters or click "Add Institution" to create one.</p>
              </div>
            </div>
          `;
          return;
        }

        Table.render({
          containerId: 'institutions-table-container',
          loading: false,
          searchValue: currentFilter.search,
          placeholderText: 'Search institutions by name, short name, TIN, code...',
          columns: [
            {
              header: 'Code / Type',
  key: 'code',
  render: function(item) {
    // Find the type option
    var typeOption = INSTITUTION_TYPE_OPTIONS.find(function(opt) { 
      return opt.value === item.institutionType; 
    });
    var typeEmoji = typeOption ? typeOption.emoji : '📌';
    var typeLabel = typeOption ? typeOption.label : item.institutionType || '-';
    var typeColor = 'text-indigo-600';
    
    if (item.institutionType === 'PRIVATE') { typeColor = 'text-emerald-600'; }
    else if (item.institutionType === 'NGO') { typeColor = 'text-amber-600'; }
    else if (item.institutionType === 'RELIGIOUS') { typeColor = 'text-purple-600'; }
    else if (item.institutionType === 'INTERNATIONAL_ORGANIZATION') { typeColor = 'text-cyan-600'; }
    else if (item.institutionType === 'EMBASSY') { typeColor = 'text-rose-600'; }
    else if (item.institutionType === 'POLITICAL_PARTY') { typeColor = 'text-orange-600'; }
    
    return '<div class="space-y-0.5">' +
      '<span class="font-mono font-bold text-slate-600 text-xs">' + (item.code || '-') + '</span>' +
      '<p class="text-[10px] font-bold tracking-wider ' + typeColor + '">' + typeEmoji + ' ' + typeLabel + '</p>' +
    '</div>';
  }
            },
            {
              header: 'Institution Name',
              key: 'name_en',
              render: function(item) {
                return '<div class="space-y-0.5">' +
                  '<p class="font-semibold text-slate-900">' + (item.name?.en || '-') + '</p>' +
                  '<p class="text-slate-500 text-xs font-sans">' + (item.name?.am || '-') + ' (' + (item.shortName || '-') + ')</p>' +
                '</div>';
              }
            },
            // {
            //   header: 'Category',
            //   key: 'category',
            //   render: function(item) {
            //     var cat = item.category;
            //     if (!cat) return '<span class="text-slate-400">-</span>';
                
            //     var color = cat.color || '#6B7280';
            //     return '<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md" style="background-color: ' + color + '15; color: ' + color + '">' +
            //       '<span class="w-1.5 h-1.5 rounded-full" style="background-color: ' + color + '"></span>' +
            //       (cat.name?.en || cat.name?.am || '-') +
            //     '</span>';
            //   }
            // },
            {
  header: 'Tier',
  key: 'tier',
  render: function(item) {
    // ✅ Get tier from the institution's tierAssignments
    var tierAssignment = item.tierAssignments && Array.isArray(item.tierAssignments) 
      ? item.tierAssignments.find(function(a) { return a.isCurrent === true; }) 
      : null;
    
    if (!tierAssignment) return '<span class="text-slate-400">-</span>';
    
    var tier = tierAssignment.tier;
    if (!tier) return '<span class="text-slate-400">-</span>';
    
    var priority = tier.allocationPriority || tier.priorityLevel || '?';
    var color = '#6B7280';
    if (priority <= 3) color = '#10B981';
    else if (priority <= 6) color = '#F59E0B';
    else color = '#EF4444';
    
    return '<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md" style="background-color: ' + color + '15; color: ' + color + '; border: 1px solid ' + color + '25">' +
      (tier.name?.en || tier.name?.am || tier.code || 'Tier') + ' (Level ' + priority + ')' +
    '</span>';
  }
},

// Add this new column configuration in the columns array
{
  header: 'Capability',
  key: 'requestCapability',
  render: function(item) {
    var capability = item.requestCapability || 'N/A';
    var color = '';
    var label = '';
    
    if (capability === 'self') {
      color = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Self';
    } else if (capability === 'self_and_proxy') {
      color = 'bg-purple-50 text-purple-700 border-purple-200';
      label = 'Self + Proxy';
    } else if (capability === 'proxy_only') {
      color = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Proxy Only';
    } else {
      color = 'bg-slate-50 text-slate-500 border-slate-200';
      label = capability;
    }
    
    return '<span class="px-2 py-0.5 text-[10px] font-semibold rounded-md border ' + color + '">' + label +'</span>';
  }
},
            {
              header: 'Labels',
              key: 'labels',
              render: function(item) {
                var labels = item.labels || [];
                if (!labels || labels.length === 0) return '<span class="text-slate-400">-</span>';
                
                var html = '<div class="flex flex-wrap gap-1 max-w-[150px]">';
                for (var i = 0; i < labels.length; i++) {
                  var lbl = labels[i];
                  var color = lbl.color || '#6B7280';
                  html += '<span class="px-1.5 py-0.5 text-[9px] font-bold rounded-md" style="background-color: ' + color + '15; color: ' + color + '; border: 1px solid ' + color + '25">' + (lbl.name?.en || lbl.name?.am || '-') + '</span>';
                }
                html += '</div>';
                return html;
              }
            },
            {
              header: 'TIN / Email',
              key: 'tinNumber',
              render: function(item) {
                return '<div class="text-xs space-y-0.5">' +
                  '<p class="font-mono font-medium text-slate-700">TIN: ' + (item.tinNumber || '-') + '</p>' +
                  '<p class="text-slate-400 truncate max-w-[120px]">' + (item.email || '-') + '</p>' +
                '</div>';
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
                  '<button data-edit-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Institution">' +
                    '<i class="fa-solid fa-pen-to-square text-sm"></i>' +
                  '</button>' +
                  '<button data-delete-id="' + item.id + '" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Institution">' +
                    '<i class="fa-regular fa-trash-can text-sm"></i>' +
                  '</button>' +
                '</div>';
              }
            }
          ],
          data: data,
          onSearch: function(query) {
            currentFilter.search = query;
            document.getElementById('search-institutions').value = query;
            loadAndRenderTable();
          }
        });

        attachActionListeners();
      } catch (error) {
        console.error('loadAndRenderTable error:', error);
        showError('Failed to load institutions: ' + error.message);
      }
    };
    function mapInstitutionData(item) {
  if (!item) return item;
  
  // Map labelAssignments to labels
  if (item.labelAssignments && Array.isArray(item.labelAssignments)) {
    item.labels = item.labelAssignments
      .filter(function(assignment) { return assignment.label !== null && assignment.label !== undefined; })
      .map(function(assignment) { return assignment.label; });
  } else {
    item.labels = [];
  }
  
  return item;
}

    var getFilteredData = function() {
  try {
    var list = store.institutions || [];
    if (!Array.isArray(list)) {
      console.error('getFilteredData: store.institutions is not an array:', list);
      return [];
    }
    
    // ✅ Map each institution to include labels
    list = list.map(mapInstitutionData);
    
    console.log('getFilteredData: Found', list.length, 'institutions');

    // Filter by type
   // Filter by type
if (currentFilter.type && currentFilter.type !== 'all') {
  list = list.filter(function(inst) { 
    return inst.institutionType === currentFilter.type; 
  });
}

    // Filter by category
    if (currentFilter.category) {
      list = list.filter(function(inst) { 
        return inst.category && inst.category.id === currentFilter.category; 
      });
    }

    // Filter by tier
    if (currentFilter.tier) {
      list = list.filter(function(inst) {
        var tierAssignment = store.assignments ? store.assignments.find(function(a) { 
          return a.institutionId === inst.id && a.isCurrent === true; 
        }) : null;
        return tierAssignment && tierAssignment.tierId === currentFilter.tier;
      });
    }

    // Filter by status
    if (currentFilter.status === 'active') {
      list = list.filter(function(inst) { return inst.isActive === true; });
    } else if (currentFilter.status === 'inactive') {
      list = list.filter(function(inst) { return inst.isActive === false; });
    }

    // Filter by search
    if (currentFilter.search.trim()) {
      var q = currentFilter.search.toLowerCase().trim();
      list = list.filter(function(inst) {
        var code = (inst.code || '').toLowerCase();
        var nameEn = (inst.name?.en || '').toLowerCase();
        var nameAm = (inst.name?.am || '').toLowerCase();
        var shortName = (inst.shortName || '').toLowerCase();
        var tin = (inst.tinNumber || '').toLowerCase();
        var email = (inst.email || '').toLowerCase();
        // ✅ Also search by label names
        var labelNames = (inst.labels || []).map(function(l) { 
          return (l.name?.en || l.name?.am || '').toLowerCase(); 
        }).join(' ');
        
        return code.indexOf(q) !== -1 || 
               nameEn.indexOf(q) !== -1 || 
               nameAm.indexOf(q) !== -1 ||
               shortName.indexOf(q) !== -1 ||
               tin.indexOf(q) !== -1 ||
               email.indexOf(q) !== -1 ||
               labelNames.indexOf(q) !== -1;
      });
    }

    return list;
  } catch (error) {
    console.error('getFilteredData error:', error);
    return [];
  }
};

   var updateStats = function() {
  try {
    var all = store.institutions || [];
    
    // Count by institution type
    var federalGovernment = all.filter(function(i) { return i.institutionType === 'FEDERAL_GOVERNMENT'; });
    var soe = all.filter(function(i) { return i.institutionType === 'SOE'; });
    var addisAbaba = all.filter(function(i) { return i.institutionType === 'ADDIS_ABABA_ADMINISTRATION'; });
    var direDawa = all.filter(function(i) { return i.institutionType === 'DIRE_DAWA_ADMINISTRATION'; });
    var oromia = all.filter(function(i) { return i.institutionType === 'OROMIA_REGIONAL_STATE'; });
    var regionalGov = all.filter(function(i) { return i.institutionType === 'REGIONAL_GOVERNMENT'; });
    var international = all.filter(function(i) { return i.institutionType === 'INTERNATIONAL_ORGANIZATION'; });
    var embassy = all.filter(function(i) { return i.institutionType === 'EMBASSY'; });
    var ngo = all.filter(function(i) { return i.institutionType === 'NGO'; });
    var politicalParty = all.filter(function(i) { return i.institutionType === 'POLITICAL_PARTY'; });
    var religious = all.filter(function(i) { return i.institutionType === 'RELIGIOUS'; });
    var privateInst = all.filter(function(i) { return i.institutionType === 'PRIVATE'; });
    var other = all.filter(function(i) { return i.institutionType === 'OTHER'; });
    var active = all.filter(function(i) { return i.isActive === true; });
    
    // Count institutions with tier assignment
    var withTier = all.filter(function(i) {
      var tierAssignment = store.assignments ? store.assignments.find(function(a) { 
        return a.institutionId === i.id && a.isCurrent === true; 
      }) : null;
      return tierAssignment !== null;
    });

    document.getElementById('stat-total').textContent = all.length;
    document.getElementById('stat-federal').textContent = federalGovernment.length;
    document.getElementById('stat-soe').textContent = soe.length;
    document.getElementById('stat-addis').textContent = addisAbaba.length;
    document.getElementById('stat-dire-dawa').textContent = direDawa.length;
    document.getElementById('stat-oromia').textContent = oromia.length;
    document.getElementById('stat-regional').textContent = regionalGov.length;
    document.getElementById('stat-international').textContent = international.length;
    document.getElementById('stat-embassy').textContent = embassy.length;
    document.getElementById('stat-ngo').textContent = ngo.length;
    document.getElementById('stat-political').textContent = politicalParty.length;
    document.getElementById('stat-religious').textContent = religious.length;
    document.getElementById('stat-private').textContent = privateInst.length;
    document.getElementById('stat-other').textContent = other.length;
    document.getElementById('stat-active').textContent = active.length;
    document.getElementById('stat-with-tier').textContent = withTier.length;
  } catch (error) {
    console.error('updateStats error:', error);
  }
};

    var attachActionListeners = function() {
      try {
        var tableContainer = document.getElementById('institutions-table-container');
        if (!tableContainer) return;

        // View Details
        tableContainer.querySelectorAll('[data-view-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-view-id');
            if (id) viewInstitutionDetails(id);
          });
        });

        tableContainer.querySelectorAll('[data-edit-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-edit-id');
            if (id) openInstitutionForm(id);
          });
        });

        tableContainer.querySelectorAll('[data-delete-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-delete-id');
            if (id) confirmDeleteInstitution(id);
          });
        });
      } catch (error) {
        console.error('attachActionListeners error:', error);
      }
    };

    // Setup filter listeners
    var searchInput = document.getElementById('search-institutions');
    var filterCategory = document.getElementById('filter-category');
    var filterType = document.getElementById('filter-type');
    var filterTier = document.getElementById('filter-tier');
    var filterStatus = document.getElementById('filter-status');
    var resetBtn = document.getElementById('reset-filters');

    if (searchInput) {
      searchInput.addEventListener('input', function() {
        currentFilter.search = this.value;
        loadAndRenderTable();
      });
    }

    if (filterCategory) {
      filterCategory.addEventListener('change', function() {
        currentFilter.category = this.value;
        loadAndRenderTable();
      });
    }

    if (filterType) {
      filterType.addEventListener('change', function() {
        currentFilter.type = this.value;
        loadAndRenderTable();
      });
    }

    if (filterTier) {
      filterTier.addEventListener('change', function() {
        currentFilter.tier = this.value;
        loadAndRenderTable();
      });
    }

    if (filterStatus) {
      filterStatus.addEventListener('change', function() {
        currentFilter.status = this.value;
        loadAndRenderTable();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        currentFilter = { type: 'all', category: '', tier: '', status: '', search: '' };
        if (searchInput) searchInput.value = '';
        if (filterCategory) filterCategory.value = '';
        if (filterType) filterType.value = '';
        if (filterTier) filterTier.value = '';
        if (filterStatus) filterStatus.value = '';
        loadAndRenderTable();
      });
    }

    var createBtn = document.getElementById('btn-create-institution');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        openInstitutionForm();
      });
    }

    loadAndRenderTable();
    
    console.log('renderInstitutions: Completed successfully');
  } catch (error) {
    console.error('renderInstitutions error:', error);
    showError('Failed to initialize institutions: ' + error.message);
  }
}

// ... (keep all other functions: showError, viewInstitutionDetails, openInstitutionForm, confirmDeleteInstitution)

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
// ─── INSTITUTION TYPE OPTIONS ──────────────────────────────────────────────
const INSTITUTION_TYPE_OPTIONS = [
  // Government ownership tiers
  { value: 'FEDERAL_GOVERNMENT', label: 'Federal Government', emoji: '🏛️' },
  { value: 'SOE', label: 'State-Owned Enterprise', emoji: '🏢' },
  // Sub-national government
  { value: 'ADDIS_ABABA_ADMINISTRATION', label: 'Addis Ababa Administration', emoji: '🏙️' },
  { value: 'DIRE_DAWA_ADMINISTRATION', label: 'Dire Dawa Administration', emoji: '🏙️' },
  { value: 'OROMIA_REGIONAL_STATE', label: 'Oromia Regional State', emoji: '🌍' },
  { value: 'REGIONAL_GOVERNMENT', label: 'Regional Government', emoji: '🏛️' },
  // Non-government
  { value: 'INTERNATIONAL_ORGANIZATION', label: 'International Organization', emoji: '🌐' },
  { value: 'EMBASSY', label: 'Embassy', emoji: '🏛️' },
  { value: 'NGO', label: 'NGO', emoji: '🤝' },
  { value: 'POLITICAL_PARTY', label: 'Political Party', emoji: '🗳️' },
  { value: 'RELIGIOUS', label: 'Religious', emoji: '⛪' },
  { value: 'PRIVATE', label: 'Private', emoji: '🏢' },
  { value: 'OTHER', label: 'Other', emoji: '📌' }
];
/**
 * View Institution Details
 */
/**
 * View Institution Details
 */
function viewInstitutionDetails(id) {
  var item = store.institutions.find(function(i) { return i.id === id; });
  if (!item) {
    Toast.error('Institution not found');
    return;
  }

  // Show loading state with modal - store reference to close it later
  var loadingHTML = `
    <div class="flex flex-col items-center justify-center p-8 space-y-4">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm text-slate-500">Loading institution details...</p>
    </div>
  `;

  // Open loading modal and store the instance
  var loadingModal = Modal.open({
    title: 'Institution Details',
    content: loadingHTML,
    isForm: false,
    confirmText: 'Close',
    onConfirm: function() {}
  });

  // Fetch tier assignment from API
  store.apiService.get('/institution-tier-assignment/institution/' + id)
    .then(function(response) {
      console.log('Tier assignment response:', response);
      
      // Close the loading modal
      if (loadingModal && typeof loadingModal.close === 'function') {
        loadingModal.close();
      } else if (loadingModal && typeof loadingModal === 'function') {
        loadingModal();
      }

      // Extract data from response
      var institutionData = response.institution || item;
      var tier = response.tier || null;
      var startDate = response.startDate || null;
      var endDate = response.endDate || null;
      var isCurrent = response.isCurrent || false;
      var changeReason = response.changeReason || null;

      // Get category name
      var category = institutionData.category ? 
        (institutionData.category.name?.en || institutionData.category.name?.am) : 'N/A';

      // Get labels
      var labels = institutionData.labels || [];
      var labelHtml = '<span class="text-slate-400">No labels</span>';
      if (labels.length > 0) {
        labelHtml = '<div class="flex flex-wrap gap-1">';
        for (var i = 0; i < labels.length; i++) {
          var lbl = labels[i];
          var color = lbl.color || '#6B7280';
          labelHtml += '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md" style="background-color: ' + color + '15; color: ' + color + '; border: 1px solid ' + color + '25">' + (lbl.name?.en || lbl.name?.am || '-') + '</span>';
        }
        labelHtml += '</div>';
      }

      // Commercial Structure (only for PRIVATE)
      var commercialHtml = '<span class="text-slate-400">N/A</span>';
      if (institutionData.institutionType === 'PRIVATE' && institutionData.commercialStructure) {
        commercialHtml = '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">' + institutionData.commercialStructure + '</span>';
      }

      // Tier information with correct priority display (lower number = higher priority)
      var tierHtml = '<p class="text-sm text-slate-400">No tier assigned</p>';
      var tierDetailsHtml = '';
      if (tier) {
        var tierName = tier.name?.en || tier.name?.am || 'N/A';
        var tierPriority = tier.allocationPriority || tier.priorityLevel || 'N/A';
        var tierColor = tier.color || '#6B7280';
        var tierCode = tier.code || 'N/A';
        
        // ✅ FIX: Determine priority level label and color based on value
        // Lower number = Higher priority (1 is highest)
        var priorityLabel = '';
        var priorityColor = '';
        var priorityEmoji = '';
        
        if (tierPriority <= 2) {
          priorityLabel = 'Highest Priority';
          priorityColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
          priorityEmoji = '🏆';
        } else if (tierPriority <= 4) {
          priorityLabel = 'High Priority';
          priorityColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
          priorityEmoji = '⭐';
        } else if (tierPriority <= 6) {
          priorityLabel = 'Medium Priority';
          priorityColor = 'text-amber-700 bg-amber-50 border-amber-200';
          priorityEmoji = '📊';
        } else if (tierPriority <= 8) {
          priorityLabel = 'Low Priority';
          priorityColor = 'text-orange-600 bg-orange-50 border-orange-200';
          priorityEmoji = '📋';
        } else {
          priorityLabel = 'Lowest Priority';
          priorityColor = 'text-rose-600 bg-rose-50 border-rose-200';
          priorityEmoji = '📌';
        }
        
        tierHtml = '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="px-2 py-0.5 text-xs font-semibold rounded-md" style="background-color: ' + tierColor + '15; color: ' + tierColor + '; border: 1px solid ' + tierColor + '25">' + tierName + '</span>' +
          '<span class="text-sm text-slate-800 font-semibold">(Priority: ' + tierPriority + ')</span>' +
          '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md border ' + priorityColor + '">' + priorityEmoji + ' ' + priorityLabel + '</span>' +
        '</div>';

        // Additional tier details with priority bar (inverted: lower number = fuller bar)
        var barWidth = Math.max(10, (11 - tierPriority) * 10); // 1->100%, 10->10%
        var barColor = '#10B981'; // Green for high priority
        if (tierPriority > 3 && tierPriority <= 6) barColor = '#F59E0B'; // Amber for medium
        if (tierPriority > 6) barColor = '#EF4444'; // Red for low priority

        tierDetailsHtml = `
          <div class="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Priority Level:</span>
              <div class="flex items-center gap-2 flex-1 ml-2">
                <div class="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="h-full rounded-full transition-all" style="width: ${barWidth}%; background-color: ${barColor};"></div>
                </div>
                <span class="font-mono font-semibold text-slate-600 text-[10px]">${tierPriority}/10</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Tier Code:</span>
              <span class="font-mono font-semibold text-slate-700">${tierCode}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Start Date:</span>
              <span class="font-medium text-slate-700">${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">End Date:</span>
              <span class="font-medium text-slate-700">${endDate ? new Date(endDate).toLocaleDateString() : 'Current (No End Date)'}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Status:</span>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${isCurrent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                ${isCurrent ? '✅ Current Assignment' : 'Inactive'}
              </span>
            </div>
            ${changeReason ? `
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Change Reason:</span>
              <span class="font-medium text-slate-700">${changeReason}</span>
            </div>
            ` : ''}
          </div>
        `;
      }

      var detailContent = `
        <div class="space-y-6">
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">${institutionData.name?.en || 'N/A'}</h3>
              <p class="text-sm text-slate-500 font-sans">${institutionData.name?.am || 'N/A'} (${institutionData.shortName || 'N/A'})</p>
              <p class="text-xs text-slate-400 font-mono mt-1">${institutionData.code || 'N/A'}</p>
            </div>
            <div class="text-right">
              <span class="px-2 py-1 text-xs font-bold rounded-md ${institutionData.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                ${institutionData.isActive ? 'Active' : 'Inactive'}
              </span>
              <p class="text-[10px] uppercase font-bold tracking-wider mt-1 ${institutionData.institutionType === 'GOVERNMENT' ? 'text-indigo-600' : institutionData.institutionType === 'PRIVATE' ? 'text-emerald-600' : 'text-amber-600'}">
                ${institutionData.institutionType || 'N/A'}
              </p>
            </div>
          </div>

          <!-- Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left Column -->
            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Category</label>
                <p class="text-sm text-slate-800">${category}</p>
              </div>
              
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Labels</label>
                ${labelHtml}
              </div>

              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Request Capability</label>
                <p class="text-sm text-slate-800">${institutionData.requestCapability || 'N/A'}</p>
              </div>

              ${institutionData.institutionType === 'PRIVATE' ? `
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Commercial Structure</label>
                ${commercialHtml}
              </div>
              ` : ''}

              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Tier Assignment</label>
                ${tierHtml}
                ${tierDetailsHtml}
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Registration & License</label>
                <p class="text-sm text-slate-800">TIN: ${institutionData.tinNumber || 'N/A'}</p>
                <p class="text-sm text-slate-800">Reg: ${institutionData.registrationNumber || 'N/A'}</p>
                <p class="text-sm text-slate-800">License: ${institutionData.licenseNumber || 'N/A'}</p>
              </div>

              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Address</label>
                <p class="text-sm text-slate-800">${institutionData.address || 'N/A'}</p>
              </div>

              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Contact</label>
                <p class="text-sm text-slate-800">${institutionData.contactPosition || 'N/A'}</p>
                <p class="text-sm text-slate-800">${institutionData.contactPhone || institutionData.phone || 'N/A'}</p>
                <p class="text-sm text-slate-800">${institutionData.contactEmail || institutionData.email || 'N/A'}</p>
              </div>

              ${institutionData.website ? `
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Website</label>
                <p class="text-sm text-slate-800"><a href="${institutionData.website}" target="_blank" class="text-indigo-600 hover:underline">${institutionData.website}</a></p>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-slate-100 pt-3 text-[10px] text-slate-400 flex justify-between">
            <span>Created: ${institutionData.createdAt ? new Date(institutionData.createdAt).toLocaleString() : 'N/A'}</span>
            <span>Updated: ${institutionData.updatedAt ? new Date(institutionData.updatedAt).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
      `;

      // Open a new modal with the details
      Modal.open({
        title: 'Institution Details',
        content: detailContent,
        isForm: false,
        confirmText: 'Close',
        onConfirm: function() {}
      });
    })
    .catch(function(error) {
      console.error('Error fetching tier assignment:', error);
      
      // Close the loading modal if possible
      if (loadingModal && typeof loadingModal.close === 'function') {
        loadingModal.close();
      } else if (loadingModal && typeof loadingModal === 'function') {
        loadingModal();
      }

      // Show error in a new modal
      var errorHTML = `
        <div class="flex flex-col items-center justify-center p-8 space-y-4">
          <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
            <i class="fa-solid fa-circle-exclamation text-3xl"></i>
          </div>
          <div class="text-center">
            <h3 class="text-sm font-semibold text-slate-800">Failed to Load Details</h3>
            <p class="text-xs text-slate-500 mt-1">${error.message || 'Could not fetch institution details. Please try again.'}</p>
          </div>
          <button onclick="location.reload()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">
            <i class="fa-solid fa-rotate mr-2"></i>Retry
          </button>
        </div>
      `;

      Modal.open({
        title: 'Error',
        content: errorHTML,
        isForm: false,
        confirmText: 'Close',
        onConfirm: function() {}
      });
    });
}
/**
 * Open Create / Edit Institution Form
 */
/**
 * Open Create / Edit Institution Form
 */
function openInstitutionForm(id) {
  var isEdit = !!id;
  var item = isEdit ? store.institutions.find(function(i) { return i.id === id; }) : null;
  
  if (item && item.labelAssignments) {
    item.labels = item.labelAssignments
      .filter(function(a) { return a.label !== null && a.label !== undefined; })
      .map(function(a) { return a.label; });
  }
  
  // Fetch current tier assignment if editing
  var currentTierId = null;
  var currentTierAssignmentId = null;
  var currentStartDate = null;
  var currentEndDate = null;
  var currentChangeReason = null;
  
  if (isEdit && item) {
    var assignment = store.assignments ? store.assignments.find(function(a) { 
      return a.institutionId === id && a.isCurrent === true; 
    }) : null;
    if (assignment) {
      currentTierId = assignment.tierId;
      currentTierAssignmentId = assignment.id;
      currentStartDate = assignment.startDate;
      currentEndDate = assignment.endDate;
      currentChangeReason = assignment.changeReason;
    }
  }

  // Auto generate code
  var autoCode = !isEdit 
    ? 'INS' + String((store.institutions?.length || 0) + 1).padStart(6, '0')
    : item?.code || '';

  // Store form data in a variable to persist
  var formData = {
    shortName: item?.shortName || '',
    nameEn: item?.name?.en || '',
    nameAm: item?.name?.am || '',
    institutionType: item?.institutionType || 'FEDERAL_GOVERNMENT',
    requestCapability: item?.requestCapability || 'self_and_proxy',
    tinNumber: item?.tinNumber || '',
    registrationNumber: item?.registrationNumber || '',
    licenseNumber: item?.licenseNumber || '',
    address: item?.address || '',
    phone: item?.phone || '',
    email: item?.email || '',
    website: item?.website || '',
    contactPosition: item?.contactPosition || '',
    contactPhone: item?.contactPhone || '',
    contactEmail: item?.contactEmail || '',
    commercialStructure: item?.commercialStructure || '',
    isActive: item?.isActive !== undefined ? item.isActive : true,
    labelIds: item?.labels ? item.labels.map(function(l) { return l.id; }) : [],
    tierId: currentTierId || '',
    tierStartDate: currentStartDate || new Date().toISOString().split('T')[0],
    tierEndDate: currentEndDate || '',
    tierChangeReason: currentChangeReason || ''
  };

  // Function to build the form HTML
  function buildFormHTML() {
    // Tier options
    var tierOptions = '';
    if (store.tiers && Array.isArray(store.tiers)) {
      for (var t = 0; t < store.tiers.length; t++) {
        var tier = store.tiers[t];
        var selected = formData.tierId === tier.id ? 'selected' : '';
        tierOptions += '<option value="' + tier.id + '" ' + selected + '>' + (tier.name?.en || tier.name?.am || tier.code || '-') + ' (Priority: ' + (tier.allocationPriority || tier.priorityLevel || 'N/A') + ')</option>';
      }
    }

    // Label options with "Create New" option
    var labelOptions = '';
    if (store.labels && Array.isArray(store.labels)) {
      for (var l = 0; l < store.labels.length; l++) {
        var lbl = store.labels[l];
        var isChecked = formData.labelIds && formData.labelIds.indexOf(lbl.id) !== -1;
        var color = lbl.color || '#6B7280';
        labelOptions += `
          <label class="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs">
            <input type="checkbox" name="labelIds" value="${lbl.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-indigo-600 rounded-xs border-slate-300" />
            <span class="flex items-center gap-1 font-semibold" style="color: ${color}">
              <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
              ${lbl.name?.en || lbl.name?.am || '-'}
            </span>
          </label>
        `;
      }
    }

    // Determine if commercial structure should be shown
    var commercialTypes = ['PRIVATE', 'INTERNATIONAL_ORGANIZATION', 'RELIGIOUS'];
    var showCommercial = commercialTypes.indexOf(formData.institutionType) !== -1;

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1" id="institution-form-container">
        <!-- Institution Fields -->
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Code (Auto-Generated)</label>
          <input type="text" name="code" value="${autoCode}" readonly class="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 font-mono focus:outline-hidden" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Short Name <span class="text-rose-500">*</span></label>
          <input type="text" name="shortName" value="${formData.shortName}" required placeholder="e.g. PMO" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
          <input type="text" name="name_en" value="${formData.nameEn}" required placeholder="e.g. Prime Minister's Office" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
          <input type="text" name="name_am" value="${formData.nameAm}" required placeholder="የጠቅላይ ሚኒስትር ጽህፈት ቤት" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
        </div>

        <!-- Institution Type -->
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Institution Type <span class="text-rose-500">*</span></label>
          <select id="inst-type-selector" name="institutionType" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
            <option value="">-- Select Type --</option>
            ${INSTITUTION_TYPE_OPTIONS.map(function(opt) {
              var selected = formData.institutionType === opt.value ? 'selected' : '';
              return '<option value="' + opt.value + '" ' + selected + '>' + opt.emoji + ' ' + opt.label + '</option>';
            }).join('')}
          </select>
        </div>

        <!-- Request Capability -->
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Request Capability <span class="text-rose-500">*</span></label>
          <select name="requestCapability" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
            <option value="self" ${formData.requestCapability === 'self' ? 'selected' : ''}>SELF</option>
            <option value="self_and_proxy" ${formData.requestCapability === 'self_and_proxy' ? 'selected' : ''}>SELF_AND_PROXY</option>
            <option value="proxy_only" ${formData.requestCapability === 'proxy_only' ? 'selected' : ''}>PROXY_ONLY</option>
          </select>
        </div>

        <!-- Commercial Structure Container -->
        <div id="commercial-structure-container" class="${showCommercial ? '' : 'hidden'}">
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Commercial Structure</label>
          <select name="commercialStructure" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
            <option value="">-- Select Commercial Structure --</option>
            <option value="sole_trader" ${formData.commercialStructure === 'sole_trader' ? 'selected' : ''}>Sole Trader (የንግድ ስራ ባለቤት)</option>
            <option value="general_partnership" ${formData.commercialStructure === 'general_partnership' ? 'selected' : ''}>General Partnership (አጠቃላይ ሽርክና)</option>
            <option value="limited_partnership" ${formData.commercialStructure === 'limited_partnership' ? 'selected' : ''}>Limited Partnership (ውስን ሽርክና)</option>
            <option value="llp" ${formData.commercialStructure === 'llp' ? 'selected' : ''}>LLP (ኃላፊነቱ የተወሰነ ሽርክና)</option>
            <option value="plc" ${formData.commercialStructure === 'plc' ? 'selected' : ''}>PLC (ኃላፊነቱ የተወሰነ የግል ማኅበር)</option>
            <option value="one_person_plc" ${formData.commercialStructure === 'one_person_plc' ? 'selected' : ''}>One Person PLC (ባለ አንድ አባል)</option>
            <option value="share_company" ${formData.commercialStructure === 'share_company' ? 'selected' : ''}>Share Company (የአክሲዮን ማኅበር)</option>
            <option value="joint_venture" ${formData.commercialStructure === 'joint_venture' ? 'selected' : ''}>Joint Venture (የጋራ ሽርክና)</option>
            <option value="cooperative" ${formData.commercialStructure === 'cooperative' ? 'selected' : ''}>Cooperative (የህብረት ስራ ማኅበር)</option>
            <option value="association" ${formData.commercialStructure === 'association' ? 'selected' : ''}>Association (ማኅበር)</option>
          </select>
        </div>

        <!-- TIN Number -->
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">TIN Number <span class="text-rose-500">*</span></label>
          <input type="text" name="tinNumber" value="${formData.tinNumber}" required pattern="[0-9]{10}" placeholder="10-digit tax number" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Registration Number</label>
          <input type="text" name="registrationNumber" value="${formData.registrationNumber}" placeholder="e.g. REG-0912" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">License Number</label>
          <input type="text" name="licenseNumber" value="${formData.licenseNumber}" placeholder="e.g. LIC-2219" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Address <span class="text-rose-500">*</span></label>
          <input type="text" name="address" value="${formData.address}" required placeholder="e.g. Addis Ababa, Bole Subcity" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Phone <span class="text-rose-500">*</span></label>
          <input type="text" name="phone" value="${formData.phone}" required placeholder="e.g. +251 115 510000" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Email <span class="text-rose-500">*</span></label>
          <input type="email" name="email" value="${formData.email}" required placeholder="info@institution.gov.et" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Website</label>
          <input type="url" name="website" value="${formData.website}" placeholder="https://www.agency.gov.et" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Contact Position</label>
          <input type="text" name="contactPosition" value="${formData.contactPosition}" placeholder="e.g. Chief of Staff" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Contact Phone</label>
          <input type="text" name="contactPhone" value="${formData.contactPhone}" placeholder="e.g. +251 115 511234" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Contact Email</label>
          <input type="email" name="contactEmail" value="${formData.contactEmail}" placeholder="contact@institution.gov.et" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>

        <!-- Labels Section with Create New -->
        <div class="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-tags text-indigo-500"></i> Labels
            </h4>
            <button type="button" id="btn-create-label" class="px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors">
              <i class="fa-solid fa-plus mr-1"></i> Create New Label
            </button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="labels-container">
            ${labelOptions || '<p class="text-slate-400 text-xs col-span-2">No labels available. Click "Create New Label" to add one.</p>'}
          </div>
        </div>

        <!-- Tier Assignment Section with Create New -->
        <div class="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-sliders-h text-indigo-500"></i> Tier Assignment
            </h4>
            <button type="button" id="btn-create-tier" class="px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors">
              <i class="fa-solid fa-plus mr-1"></i> Create New Tier
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Select Tier</label>
              <select name="tierId" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500" id="tier-select">
                <option value="">-- No Tier Assigned --</option>
                ${tierOptions}
              </select>
            </div>
            ${isEdit ? `
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Start Date <span class="text-rose-500">*</span></label>
              <input type="date" name="tierStartDate" value="${formData.tierStartDate}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">End Date</label>
              <input type="date" name="tierEndDate" value="${formData.tierEndDate}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
              <p class="text-[10px] text-slate-400 mt-1">Leave empty for current/ongoing assignment</p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Change Reason</label>
              <input type="text" name="tierChangeReason" value="${formData.tierChangeReason}" placeholder="e.g. Updated tier assignment" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            ` : ''}
          </div>
          ${!isEdit ? `
          <div class="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <i class="fa-solid fa-info-circle"></i>
            <span>Start date will be set to today automatically. You can update dates later when editing.</span>
          </div>
          ` : ''}
        </div>

        <div class="flex items-center gap-2 mt-2 md:col-span-2">
          <input type="checkbox" id="isActive" name="isActive" ${formData.isActive ? 'checked' : ''} class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
          <label for="isActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Status</label>
        </div>
      </div>
    `;
  }

  // Function to open the modal with current form data
  function openMainModal() {
    return Modal.open({
      title: isEdit ? 'Edit Institution' : 'Add Institution',
      content: buildFormHTML(),
      isForm: true,
      confirmText: isEdit ? 'Save Changes' : 'Create Institution',
      onConfirm: function(modalEl) {
        try {
          // Get institution data
          var nameEnInput = modalEl.querySelector('[name="name_en"]');
          var nameAmInput = modalEl.querySelector('[name="name_am"]');
          var shortNameInput = modalEl.querySelector('[name="shortName"]');
          var typeInput = modalEl.querySelector('[name="institutionType"]');
          var capInput = modalEl.querySelector('[name="requestCapability"]');
          var tinInput = modalEl.querySelector('[name="tinNumber"]');
          var regInput = modalEl.querySelector('[name="registrationNumber"]');
          var licenseInput = modalEl.querySelector('[name="licenseNumber"]');
          var addressInput = modalEl.querySelector('[name="address"]');
          var phoneInput = modalEl.querySelector('[name="phone"]');
          var emailInput = modalEl.querySelector('[name="email"]');
          var websiteInput = modalEl.querySelector('[name="website"]');
          var contactPosInput = modalEl.querySelector('[name="contactPosition"]');
          var contactPhoneInput = modalEl.querySelector('[name="contactPhone"]');
          var contactEmailInput = modalEl.querySelector('[name="contactEmail"]');
          var commercialInput = modalEl.querySelector('[name="commercialStructure"]');
          var isActiveInput = modalEl.querySelector('[name="isActive"]');

          var tierIdInput = modalEl.querySelector('[name="tierId"]');
          var tierStartDateInput = modalEl.querySelector('[name="tierStartDate"]');
          var tierEndDateInput = modalEl.querySelector('[name="tierEndDate"]');
          var tierChangeReasonInput = modalEl.querySelector('[name="tierChangeReason"]');

          var nameEn = nameEnInput ? nameEnInput.value : '';
          var nameAm = nameAmInput ? nameAmInput.value : '';
          var shortName = shortNameInput ? shortNameInput.value : '';
          var institutionType = typeInput ? typeInput.value : 'FEDERAL_GOVERNMENT';
          var requestCapability = capInput ? capInput.value : 'self_and_proxy';
          var tinNumber = tinInput ? tinInput.value : '';
          var registrationNumber = regInput ? regInput.value : '';
          var licenseNumber = licenseInput ? licenseInput.value : '';
          var address = addressInput ? addressInput.value : '';
          var phone = phoneInput ? phoneInput.value : '';
          var email = emailInput ? emailInput.value : '';
          var website = websiteInput ? websiteInput.value : '';
          var contactPosition = contactPosInput ? contactPosInput.value : '';
          var contactPhone = contactPhoneInput ? contactPhoneInput.value : '';
          var contactEmail = contactEmailInput ? contactEmailInput.value : '';
          var commercialStructure = commercialInput ? commercialInput.value : null;
          var isActive = isActiveInput ? isActiveInput.checked : true;

          var tierId = tierIdInput ? tierIdInput.value : '';
          var tierStartDate = tierStartDateInput ? tierStartDateInput.value : '';
          var tierEndDate = tierEndDateInput ? tierEndDateInput.value : '';
          var tierChangeReason = tierChangeReasonInput ? tierChangeReasonInput.value : '';

          // Get selected label IDs
          var labelCheckboxes = modalEl.querySelectorAll('input[name="labelIds"]:checked');
          var labelIds = [];
          for (var i = 0; i < labelCheckboxes.length; i++) {
            labelIds.push(labelCheckboxes[i].value);
          }

          // Build payload (category removed)
          var payload = {
            code: autoCode,
            name: { en: nameEn, am: nameAm },
            shortName: shortName,
            institutionType: institutionType,
            labels: labelIds,
            requestCapability: requestCapability,
            tinNumber: tinNumber,
            registrationNumber: registrationNumber,
            licenseNumber: licenseNumber,
            address: address,
            phone: phone,
            email: email,
            website: website,
            contactPosition: contactPosition,
            contactPhone: contactPhone,
            contactEmail: contactEmail,
            commercialStructure: (institutionType === 'PRIVATE' || institutionType === 'INTERNATIONAL_ORGANIZATION' || institutionType === 'RELIGIOUS') ? commercialStructure : null,
            isActive: isActive,
          };

          var savePromise;
          if (isEdit) {
            savePromise = store.apiService.put('/institutions/' + id, payload);
          } else {
            savePromise = store.apiService.post('/institutions', payload);
          }

          savePromise
            .then(function(response) {
              var institutionId = isEdit ? id : response.id;
              Toast.success(isEdit ? 'Institution updated successfully.' : 'Institution created successfully.');
              
              if (tierId && institutionId) {
                var tierPayload = {
                  tierId: tierId,
                  institutionIds: [institutionId],
                  changeReason: tierChangeReason || 'Initial tier assignment'
                };
                
                var existingAssignment = store.assignments ? store.assignments.find(function(a) { 
                  return a.institutionId === institutionId && a.isCurrent === true; 
                }) : null;
                
                var tierPromise;
                if (existingAssignment) {
                  tierPromise = store.apiService.put('/institution-tier-assignment/' + existingAssignment.id, tierPayload);
                } else {
                  tierPromise = store.apiService.post('/institution-tier-assignment', tierPayload);
                }
                
                return tierPromise.then(function() {
                  Toast.success('Tier assigned successfully.');
                  store.syncWithBackend(true).then(function() {
                    renderInstitutions();
                  });
                });
              } else {
                store.syncWithBackend(true).then(function() {
                  renderInstitutions();
                });
              }
            })
            .catch(function(error) {
              console.error('Error saving institution or tier:', error);
              var errorMessage = error.message || 'Failed to save institution. Please try again.';
              Toast.error(errorMessage);
            });
        } catch (error) {
          console.error('Error saving institution:', error);
          Toast.error('Failed to save institution. Please try again.');
        }
      }
    });
  }

  // Open the main modal
  var mainModal = openMainModal();

  // Function to reopen the modal with updated data
  function reopenModal() {
    if (mainModal && typeof mainModal.close === 'function') {
      mainModal.close();
    }
    mainModal = openMainModal();
    setTimeout(function() {
      attachEventListeners();
    }, 100);
  }

  // Function to save form data from DOM
  function saveFormDataFromDOM() {
    var container = document.getElementById('institution-form-container');
    if (!container) return;
    
    var inputs = container.querySelectorAll('input, select, textarea');
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var name = input.getAttribute('name');
      if (name) {
        if (input.type === 'checkbox' && name === 'isActive') {
          formData.isActive = input.checked;
        } else if (input.type === 'checkbox') {
          continue;
        } else {
          formData[name] = input.value;
        }
      }
    }
    
    var labelCheckboxes = container.querySelectorAll('input[name="labelIds"]:checked');
    formData.labelIds = [];
    for (var j = 0; j < labelCheckboxes.length; j++) {
      formData.labelIds.push(labelCheckboxes[j].value);
    }
  }

  // Function to attach event listeners
  function attachEventListeners() {
    var typeSelector = document.getElementById('inst-type-selector');
    var structureContainer = document.getElementById('commercial-structure-container');
    if (typeSelector && structureContainer) {
      typeSelector.addEventListener('change', function() {
        var type = typeSelector.value;
        var commercialTypes = ['PRIVATE', 'INTERNATIONAL_ORGANIZATION', 'RELIGIOUS'];
        if (commercialTypes.indexOf(type) !== -1) {
          structureContainer.classList.remove('hidden');
        } else {
          structureContainer.classList.add('hidden');
        }
        saveFormDataFromDOM();
      });
    }

    // Create New Tier button
    var createTierBtn = document.getElementById('btn-create-tier');
    if (createTierBtn) {
      createTierBtn.addEventListener('click', function() {
        saveFormDataFromDOM();
        openCreateTierModal(function(newTierId) {
          if (newTierId) {
            var newTier = store.tiers.find(function(t) { return t.id === newTierId; });
            if (newTier) {
              formData.tierId = newTierId;
              reopenModal();
              Toast.success('Tier created and selected!');
            }
          }
        });
      });
    }

    // Create New Label button
    var createLabelBtn = document.getElementById('btn-create-label');
    if (createLabelBtn) {
      createLabelBtn.addEventListener('click', function() {
        saveFormDataFromDOM();
        openCreateLabelModal(function(newLabelId) {
          if (newLabelId) {
            var newLabel = store.labels.find(function(l) { return l.id === newLabelId; });
            if (newLabel) {
              if (!formData.labelIds) {
                formData.labelIds = [];
              }
              formData.labelIds.push(newLabelId);
              reopenModal();
              Toast.success('Label created and selected!');
            }
          }
        });
      });
    }
  }

  // Attach event listeners after modal renders
  setTimeout(function() {
    attachEventListeners();
  }, 100);
}
/**
 * Open Create Category Modal
 */
function openCreateCategoryModal(callback) {
  // Category type options with labels
  const categoryTypeOptions = [
    { value: 'FEDERAL_GOVERNMENT', label: 'Federal Government', emoji: '🏛️' },
    { value: 'SOE', label: 'State-Owned Enterprise', emoji: '🏢' },
    { value: 'ADDIS_ABABA_ADMINISTRATION', label: 'Addis Ababa Administration', emoji: '🏙️' },
    { value: 'DIRE_DAWA_ADMINISTRATION', label: 'Dire Dawa Administration', emoji: '🏙️' },
    { value: 'OROMIA_REGIONAL_STATE', label: 'Oromia Regional State', emoji: '🌍' },
    { value: 'REGIONAL_GOVERNMENT', label: 'Regional Government', emoji: '🏛️' },
    { value: 'INTERNATIONAL_ORGANIZATION', label: 'International Organization', emoji: '🌐' },
    { value: 'EMBASSY', label: 'Embassy', emoji: '🏛️' },
    { value: 'NGO', label: 'NGO', emoji: '🤝' },
    { value: 'POLITICAL_PARTY', label: 'Political Party', emoji: '🗳️' },
    { value: 'RELIGIOUS', label: 'Religious', emoji: '⛪' },
    { value: 'PRIVATE', label: 'Private', emoji: '🏢' },
    { value: 'OTHER', label: 'Other', emoji: '📌' }
  ];

  // Build type options HTML
  var typeOptionsHTML = '<option value="">Select Category Type...</option>';
  for (var i = 0; i < categoryTypeOptions.length; i++) {
    var opt = categoryTypeOptions[i];
    typeOptionsHTML += '<option value="' + opt.value + '">' + opt.emoji + ' ' + opt.label + '</option>';
  }

  var formHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Category Type <span class="text-rose-500">*</span></label>
        <select name="catType" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
          ${typeOptionsHTML}
        </select>
        <p class="text-[10px] text-slate-400 mt-1">Choose the classification type for this category.</p>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
        <input type="text" name="catNameEn" required placeholder="e.g. Government Institutions" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input type="text" name="catNameAm" required placeholder="የመንግስት ተቋማት" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Color</label>
        <div class="flex items-center gap-3">
          <input type="color" name="catColor" value="#6366F1" class="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer" />
          <span class="text-xs text-slate-400">Choose a color for the category</span>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="catDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea name="catDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="catIsActive" name="catIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
        <label for="catIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
      </div>
    </div>
  `;

  Modal.open({
    title: 'Create New Category',
    content: formHTML,
    isForm: true,
    confirmText: 'Create Category',
    onConfirm: function(modalEl) {
      try {
        var type = modalEl.querySelector('[name="catType"]')?.value || 'OTHER';
        var nameEn = modalEl.querySelector('[name="catNameEn"]')?.value || '';
        var nameAm = modalEl.querySelector('[name="catNameAm"]')?.value || '';
        var color = modalEl.querySelector('[name="catColor"]')?.value || '#6366F1';
        var descEn = modalEl.querySelector('[name="catDescEn"]')?.value || '';
        var descAm = modalEl.querySelector('[name="catDescAm"]')?.value || '';
        var isActive = modalEl.querySelector('[name="catIsActive"]')?.checked || true;

        // Validate
        if (!type) {
          Toast.warning('Please select a category type.');
          return;
        }
        if (!nameEn) {
          Toast.warning('Please enter English name.');
          return;
        }
        if (!nameAm) {
          Toast.warning('Please enter Amharic name.');
          return;
        }

        var code = 'CAT' + String((store.categories?.length || 0) + 1).padStart(6, '0');

        var payload = {
          code: code,
          name: { en: nameEn, am: nameAm },
          type: type,
          description: { en: descEn, am: descAm },
          color: color,
          isActive: isActive
        };

        store.apiService.post('/institutions-categories', payload)
          .then(function(response) {
            Toast.success('Category created successfully!');
            store.syncWithBackend(true).then(function() {
              if (typeof callback === 'function') {
                callback(response.id);
              }
            });
          })
          .catch(function(error) {
            console.error('Error creating category:', error);
            var errorMsg = error.message || 'Failed to create category. Please try again.';
            Toast.error(errorMsg);
          });
      } catch (error) {
        console.error('Error creating category:', error);
        Toast.error('Failed to create category. Please try again.');
      }
    }
  });
}

/**
 * Open Create Tier Modal
 */
function openCreateTierModal(callback) {
  var formHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
        <input type="text" name="tierNameEn" required placeholder="e.g. Executive Level" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input type="text" name="tierNameAm" required placeholder="የአስፈጻሚ ደረጃ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Priority Level (1-10) <span class="text-rose-500">*</span></label>
        <p class="text-[10px] text-slate-400 mt-0.5 mb-1">Lower number = Higher priority</p>
        <input type="number" name="tierPriority" value="5" required min="1" max="10" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="tierDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea name="tierDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="tierIsActive" name="tierIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
        <label for="tierIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
      </div>
    </div>
  `;

  Modal.open({
    title: 'Create New Tier',
    content: formHTML,
    isForm: true,
    confirmText: 'Create Tier',
    onConfirm: function(modalEl) {
      try {
        var nameEn = modalEl.querySelector('[name="tierNameEn"]')?.value || '';
        var nameAm = modalEl.querySelector('[name="tierNameAm"]')?.value || '';
        var priority = parseInt(modalEl.querySelector('[name="tierPriority"]')?.value || '5', 10);
        var descEn = modalEl.querySelector('[name="tierDescEn"]')?.value || '';
        var descAm = modalEl.querySelector('[name="tierDescAm"]')?.value || '';
        var isActive = modalEl.querySelector('[name="tierIsActive"]')?.checked || true;

        var code = 'TIER' + String((store.tiers?.length || 0) + 1).padStart(6, '0');

        var payload = {
          code: code,
          name: { en: nameEn, am: nameAm },
          allocationPriority: priority,
          description: { en: descEn, am: descAm },
          isActive: isActive,
          isOverrideTier: false
        };

        store.apiService.post('/institution-tiers', payload)
          .then(function(response) {
            Toast.success('Tier created successfully!');
            store.syncWithBackend(true).then(function() {
              if (typeof callback === 'function') {
                callback(response.id);
              }
            });
          })
          .catch(function(error) {
            console.error('Error creating tier:', error);
            Toast.error('Failed to create tier. Please try again.');
          });
      } catch (error) {
        console.error('Error creating tier:', error);
        Toast.error('Failed to create tier. Please try again.');
      }
    }
  });
}

/**
 * Open Create Label Modal
 */
function openCreateLabelModal(callback) {
  var formHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
        <input type="text" name="labelNameEn" required placeholder="e.g. Strategic" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
        <input type="text" name="labelNameAm" required placeholder="ስልታዊ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Color</label>
        <div class="flex items-center gap-3">
          <input type="color" name="labelColor" value="#6366F1" class="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer" />
          <span class="text-xs text-slate-400">Choose a color for the label</span>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
        <textarea name="labelDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
        <textarea name="labelDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="labelIsActive" name="labelIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
        <label for="labelIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
      </div>
    </div>
  `;

  Modal.open({
    title: 'Create New Label',
    content: formHTML,
    isForm: true,
    confirmText: 'Create Label',
    onConfirm: function(modalEl) {
      try {
        var nameEn = modalEl.querySelector('[name="labelNameEn"]')?.value || '';
        var nameAm = modalEl.querySelector('[name="labelNameAm"]')?.value || '';
        var color = modalEl.querySelector('[name="labelColor"]')?.value || '#6366F1';
        var descEn = modalEl.querySelector('[name="labelDescEn"]')?.value || '';
        var descAm = modalEl.querySelector('[name="labelDescAm"]')?.value || '';
        var isActive = modalEl.querySelector('[name="labelIsActive"]')?.checked || true;

        var code = 'INLeb' + String((store.labels?.length || 0) + 1).padStart(6, '0');

        var payload = {
          code: code,
          name: { en: nameEn, am: nameAm },
          description: { en: descEn, am: descAm },
          color: color,
          isActive: isActive
        };

        store.apiService.post('/institution-labels', payload)
          .then(function(response) {
            Toast.success('Label created successfully!');
            store.syncWithBackend(true).then(function() {
              if (typeof callback === 'function') {
                callback(response.id);
              }
            });
          })
          .catch(function(error) {
            console.error('Error creating label:', error);
            Toast.error('Failed to create label. Please try again.');
          });
      } catch (error) {
        console.error('Error creating label:', error);
        Toast.error('Failed to create label. Please try again.');
      }
    }
  });
}



// function openCreateTierModal(callback) {
//   var formHTML = `
//     <div class="space-y-4">
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
//         <input type="text" name="tierNameEn" required placeholder="e.g. Executive Level" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
//         <input type="text" name="tierNameAm" required placeholder="የአስፈጻሚ ደረጃ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Priority Level (1-10) <span class="text-rose-500">*</span></label>
//         <p class="text-[10px] text-slate-400 mt-0.5 mb-1">Lower number = Higher priority</p>
//         <input type="number" name="tierPriority" value="5" required min="1" max="10" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
//         <textarea name="tierDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
//         <textarea name="tierDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
//       </div>
//       <div class="flex items-center gap-2">
//         <input type="checkbox" id="tierIsActive" name="tierIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
//         <label for="tierIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
//       </div>
//     </div>
//   `;

//   Modal.open({
//     title: 'Create New Tier',
//     content: formHTML,
//     isForm: true,
//     confirmText: 'Create Tier',
//     onConfirm: function(modalEl) {
//       try {
//         var nameEn = modalEl.querySelector('[name="tierNameEn"]')?.value || '';
//         var nameAm = modalEl.querySelector('[name="tierNameAm"]')?.value || '';
//         var priority = parseInt(modalEl.querySelector('[name="tierPriority"]')?.value || '5', 10);
//         var descEn = modalEl.querySelector('[name="tierDescEn"]')?.value || '';
//         var descAm = modalEl.querySelector('[name="tierDescAm"]')?.value || '';
//         var isActive = modalEl.querySelector('[name="tierIsActive"]')?.checked || true;

//         var code = 'TIER' + String((store.tiers?.length || 0) + 1).padStart(6, '0');

//         var payload = {
//           code: code,
//           name: { en: nameEn, am: nameAm },
//           allocationPriority: priority,
//           description: { en: descEn, am: descAm },
//           isActive: isActive,
//           isOverrideTier: false
//         };

//         store.apiService.post('/institution-tiers', payload)
//           .then(function(response) {
//             Toast.success('Tier created successfully!');
//             store.syncWithBackend(true).then(function() {
//               if (typeof callback === 'function') {
//                 callback(response.id);
//               }
//             });
//           })
//           .catch(function(error) {
//             console.error('Error creating tier:', error);
//             Toast.error('Failed to create tier. Please try again.');
//           });
//       } catch (error) {
//         console.error('Error creating tier:', error);
//         Toast.error('Failed to create tier. Please try again.');
//       }
//     }
//   });
// }

// /**
//  * Open Create Label Modal
//  */
// function openCreateLabelModal(callback) {
//   var formHTML = `
//     <div class="space-y-4">
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
//         <input type="text" name="labelNameEn" required placeholder="e.g. Strategic" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
//         <input type="text" name="labelNameAm" required placeholder="ስልታዊ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Color</label>
//         <div class="flex items-center gap-3">
//           <input type="color" name="labelColor" value="#6366F1" class="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer" />
//           <span class="text-xs text-slate-400">Choose a color for the label</span>
//         </div>
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
//         <textarea name="labelDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
//       </div>
//       <div>
//         <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
//         <textarea name="labelDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
//       </div>
//       <div class="flex items-center gap-2">
//         <input type="checkbox" id="labelIsActive" name="labelIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
//         <label for="labelIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
//       </div>
//     </div>
//   `;

//   Modal.open({
//     title: 'Create New Label',
//     content: formHTML,
//     isForm: true,
//     confirmText: 'Create Label',
//     onConfirm: function(modalEl) {
//       try {
//         var nameEn = modalEl.querySelector('[name="labelNameEn"]')?.value || '';
//         var nameAm = modalEl.querySelector('[name="labelNameAm"]')?.value || '';
//         var color = modalEl.querySelector('[name="labelColor"]')?.value || '#6366F1';
//         var descEn = modalEl.querySelector('[name="labelDescEn"]')?.value || '';
//         var descAm = modalEl.querySelector('[name="labelDescAm"]')?.value || '';
//         var isActive = modalEl.querySelector('[name="labelIsActive"]')?.checked || true;

//         var code = 'INLeb' + String((store.labels?.length || 0) + 1).padStart(6, '0');

//         var payload = {
//           code: code,
//           name: { en: nameEn, am: nameAm },
//           description: { en: descEn, am: descAm },
//           color: color,
//           isActive: isActive
//         };

//         store.apiService.post('/institution-labels', payload)
//           .then(function(response) {
//             Toast.success('Label created successfully!');
//             store.syncWithBackend(true).then(function() {
//               if (typeof callback === 'function') {
//                 callback(response.id);
//               }
//             });
//           })
//           .catch(function(error) {
//             console.error('Error creating label:', error);
//             Toast.error('Failed to create label. Please try again.');
//           });
//       } catch (error) {
//         console.error('Error creating label:', error);
//         Toast.error('Failed to create label. Please try again.');
//       }
//     }
//   });
// }
// /**
//  * Delete confirmation dialog
//  */
function confirmDeleteInstitution(id) {
  var item = store.institutions.find(function(i) { return i.id === id; });
  if (!item) return;

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this institution?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. Institution <strong class="text-slate-800">${item.name?.en || 'this institution'}</strong> (${item.code}) and all associated records will be permanently deleted.</p>
          <ul class="mt-2 text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>All tier assignments</li>
            <li>All user extensions</li>
            <li>All allocation requests</li>
            <li>All associated beneficiary records</li>
          </ul>
        </div>
      </div>
    `,
    confirmText: 'Delete Institution',
    cancelText: 'Cancel',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: function() {
      try {
        store.apiService.delete('/institutions/' + id)
          .then(function() {
            Toast.success('Institution deleted successfully.');
            store.syncWithBackend(true).then(function() {
              renderInstitutions();
            });
          })
          .catch(function(error) {
            console.error('Error deleting institution:', error);
            Toast.error('Failed to delete institution. Please try again.');
          });
      } catch (error) {
        console.error('Error deleting institution:', error);
        Toast.error('Failed to delete institution. Please try again.');
      }
    }
  });
}

// institutions.js - Add this at the bottom of the file

// Export for use in other modules
export { viewInstitutionDetails };