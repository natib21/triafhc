// User Extensions Module
import { store } from '../store';
import { Table, Modal, Toast } from '../components';

// ─── CONSTANTS ────────────────────────────────────────────────────────────
const CATEGORY_TYPE_OPTIONS = [
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

  let currentFilter = 'all';
  let searchQuery = '';

  // ─── HELPERS ───────────────────────────────────────────────────────────
 function computeFullName(item) {
  // Get title prefix
  let titlePrefix = '';
  if (item.currentTitle?.name?.en) {
    titlePrefix = item.currentTitle.name.en + ' ';
  } else if (item.currentTitle?.name?.am) {
    titlePrefix = item.currentTitle.name.am + ' ';
  }
  
  const firstName = item.firstName?.en || item.firstName?.am || '';
  let middleName = '';
  if (item.middleName) {
    if (Array.isArray(item.middleName.en)) middleName = item.middleName.en.join(' ');
    else if (Array.isArray(item.middleName.am)) middleName = item.middleName.am.join(' ');
    else middleName = item.middleName.en || item.middleName.am || '';
  }
  const lastName = item.lastName?.en || item.lastName?.am || '';
  
  // If firstName is empty, try to use user.name
  let name = '';
  if (firstName || lastName) {
    name = [firstName, middleName, lastName].filter(Boolean).join(' ');
  } else if (item.user?.name?.en) {
    name = item.user.name.en;
  } else if (item.user?.name?.am) {
    name = item.user.name.am;
  }
  
  return name ? titlePrefix + name : 'N/A';
}

function getFilteredData() {
  // ✅ FIX: Defensively handle data shape
  let source = [];
  
  // Try to get the data from store.userExtensions
  if (store.userExtensions) {
    if (Array.isArray(store.userExtensions)) {
      source = store.userExtensions;
    } else if (store.userExtensions.items && Array.isArray(store.userExtensions.items)) {
      source = store.userExtensions.items;
      store.userExtensions = source;
    } else if (typeof store.userExtensions === 'object') {
      const keys = Object.keys(store.userExtensions);
      for (const key of keys) {
        if (Array.isArray(store.userExtensions[key])) {
          source = store.userExtensions[key];
          store.userExtensions = source;
          break;
        }
      }
    }
  }
  
  if (!Array.isArray(source)) {
    console.error('getFilteredData: source is not an array:', source);
    source = [];
  }
  
  let list = [...source];

  if (currentFilter === 'active') {
    list = list.filter(ext => ext && ext.user?.isActive !== false);
  } else if (currentFilter === 'inactive') {
    list = list.filter(ext => ext && ext.user?.isActive === false);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(ext => {
      if (!ext) return false;
      const firstName = ext.firstName?.en || ext.firstName?.am || '';
      const lastName = ext.lastName?.en || ext.lastName?.am || '';
      const titleName = ext.currentTitle?.name?.en || ext.currentTitle?.name?.am || '';
      const userName = ext.user?.name?.en || ext.user?.name?.am || '';
      const userEmail = ext.user?.email || '';
      const userUsername = ext.user?.username || '';
      const searchable = [
        firstName.toLowerCase(),
        lastName.toLowerCase(),
        titleName.toLowerCase(),
        userName.toLowerCase(),
        userEmail.toLowerCase(),
        userUsername.toLowerCase(),
        (ext.nationalIdNumber || '').toLowerCase(),
        (ext.passportNumber || '').toLowerCase(),
        (ext.tinNumber || '').toLowerCase(),
        (ext.currentAddress || '').toLowerCase(),
        (ext.institution?.name?.en || ext.institution?.name?.am || '').toLowerCase(),
        // ✅ Also search by rank name
        (ext.currentRank?.name?.en || ext.currentRank?.name?.am || '').toLowerCase()
      ];
      return searchable.some(field => field.includes(q));
    });
  }

  return list.map(item => {
    if (!item) return { fullName: 'N/A' };
    
    // ✅ Extract current rank from rankAssignments
    let currentRank = null;
    if (item.rankAssignments && Array.isArray(item.rankAssignments)) {
      const currentAssignment = item.rankAssignments.find(assignment => assignment.isCurrent === true);
      if (currentAssignment) {
        currentRank = currentAssignment.rank;
      }
    }
    
    // Compute fullName with title
    let titlePrefix = '';
    if (item.currentTitle?.name?.en) {
      titlePrefix = item.currentTitle.name.en + ' ';
    } else if (item.currentTitle?.name?.am) {
      titlePrefix = item.currentTitle.name.am + ' ';
    }
    
    const firstName = item.firstName?.en || item.firstName?.am || '';
    let middleName = '';
    if (item.middleName) {
      if (Array.isArray(item.middleName.en)) middleName = item.middleName.en.join(' ');
      else if (Array.isArray(item.middleName.am)) middleName = item.middleName.am.join(' ');
      else middleName = item.middleName.en || item.middleName.am || '';
    }
    const lastName = item.lastName?.en || item.lastName?.am || '';
    
    let fullName = '';
    if (firstName || lastName) {
      fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    } else if (item.user?.name?.en) {
      fullName = item.user.name.en;
    } else if (item.user?.name?.am) {
      fullName = item.user.name.am;
    }
    
    fullName = fullName ? titlePrefix + fullName : 'N/A';
    
    // ✅ Return item with currentRank extracted
    return {
      ...item,
      fullName: fullName,
      currentRank: currentRank // ✅ Add currentRank to the item
    };
  });
}


function renderManualTable(container, data) {
  console.log('Rendering manual table with', data.length, 'items');
  
  let html = `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User Information</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rank</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Institution</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Personal</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID Numbers</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  data.forEach(item => {
    const fullName = item.fullName || 'N/A';
    const email = item.user?.email || item.userId || 'N/A';
    const username = item.user?.username || 'N/A';
    
    // ✅ Title handling
    const titleName = item.currentTitle?.name?.en || item.currentTitle?.name?.am || '-';
    const titleDisplay = titleName !== '-' 
      ? `<span class="text-xs font-medium px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">📌 ${titleName}</span>`
      : `<span class="text-xs text-slate-400 italic">No title assigned</span>`;
    
    // ✅ Rank handling with priority visualization (lower number = higher priority)
    let rankDisplay = '';
    if (item.currentRank) {
      const rankName = item.currentRank.name?.en || item.currentRank.name?.am || '-';
      const rankPriority = item.currentRank.priorityLevel || item.currentRank.allocationPriority || '';
      const bedroomEntitlement = item.currentRank.bedroomEntitlement || '';
      
      // ✅ Priority level styling (lower number = higher priority)
      let priorityBadge = '';
      let priorityEmoji = '';
      let priorityColor = '';
      let priorityLabel = '';
      
      if (rankPriority !== '') {
        const priority = parseInt(rankPriority);
        if (priority <= 2) {
          priorityEmoji = '🏆';
          priorityColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          priorityLabel = 'Highest Priority';
        } else if (priority <= 4) {
          priorityEmoji = '⭐';
          priorityColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          priorityLabel = 'High Priority';
        } else if (priority <= 6) {
          priorityEmoji = '📊';
          priorityColor = 'bg-amber-50 text-amber-700 border-amber-200';
          priorityLabel = 'Medium Priority';
        } else if (priority <= 8) {
          priorityEmoji = '📋';
          priorityColor = 'bg-orange-50 text-orange-700 border-orange-200';
          priorityLabel = 'Low Priority';
        } else {
          priorityEmoji = '📌';
          priorityColor = 'bg-rose-50 text-rose-700 border-rose-200';
          priorityLabel = 'Lowest Priority';
        }
        
        // Priority bar - wider for higher priority (lower number = wider bar)
        const barWidth = Math.max(10, (11 - priority) * 10);
        const barColor = priority <= 3 ? '#10B981' : priority <= 6 ? '#F59E0B' : '#EF4444';
        
        priorityBadge = `
          <div class="mt-1 p-2 bg-slate-50 rounded border border-slate-100">
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-slate-500">Priority:</span>
              <div class="flex items-center gap-2 flex-1 ml-2">
                <div class="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full transition-all" style="width: ${barWidth}%; background-color: ${barColor};"></div>
                </div>
                <span class="font-mono font-semibold text-slate-600 text-[10px]">${priority}/10</span>
              </div>
            </div>
            <div class="flex items-center gap-1 mt-0.5">
              <span class="px-1.5 py-0.5 text-[9px] font-bold rounded-md ${priorityColor} border">
                ${priorityEmoji} ${priorityLabel}
              </span>
            </div>
          </div>
        `;
      }
      
      rankDisplay = `
        <div class="text-xs space-y-0.5">
          <span class="font-medium px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">🎖️ ${rankName}</span>
          ${bedroomEntitlement ? `<span class="text-slate-500 block mt-0.5">🛏️ Bedrooms: ${bedroomEntitlement}</span>` : ''}
          ${priorityBadge}
        </div>
      `;
    } else {
      rankDisplay = `<span class="text-xs text-slate-400 italic">No rank assigned</span>`;
    }
    
    const instName = item.institution?.name?.en || item.institution?.name?.am || '-';
    const instDisplay = instName !== '-' 
      ? `<p class="text-xs text-slate-600">🏛️ ${instName}</p>`
      : `<span class="text-xs text-slate-400 italic">No institution</span>`;
    
    const gender = item.gender || 'N/A';
    const genderIcon = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '⚧️';
    const dob = item.dateOfBirth ? new Date(item.dateOfBirth).toLocaleDateString() : 'N/A';
    const nationality = item.nationality || 'N/A';
    const nationalId = item.nationalIdNumber || 'N/A';
    const passport = item.passportNumber || 'N/A';
    const tin = item.tinNumber || 'N/A';
    const isActive = item.user?.isActive !== false;
    const statusHtml = isActive 
      ? '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">✅ Active</span>'
      : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold rounded-md">❌ Inactive</span>';
    
    html += `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3">
          <div class="space-y-0.5">
            <p class="font-semibold text-slate-900 text-sm">${fullName}</p>
            <p class="text-slate-400 font-mono text-xs">${email}</p>
            <p class="text-slate-400 font-mono text-xs">@${username}</p>
          </div>
        </td>
        <td class="px-4 py-3">
          ${titleDisplay}
        </td>
        <td class="px-4 py-3">
          ${rankDisplay}
        </td>
        <td class="px-4 py-3">
          ${instDisplay}
        </td>
        <td class="px-4 py-3">
          <div class="text-xs space-y-0.5">
            <p class="text-slate-700">${genderIcon} ${gender}</p>
            <p class="text-slate-500">DOB: ${dob}</p>
            <p class="text-slate-500">${nationality}</p>
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="text-xs space-y-0.5">
            <p class="font-mono text-slate-600">National ID: ${nationalId}</p>
            <p class="font-mono text-slate-600">Passport: ${passport}</p>
            <p class="font-mono text-slate-600">TIN: ${tin}</p>
          </div>
        </td>
        <td class="px-4 py-3">
          ${statusHtml}
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-1.5">
            <button data-view-id="${item.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Details">
              <i class="fa-regular fa-eye text-sm"></i>
            </button>
            <button data-edit-id="${item.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit User">
              <i class="fa-solid fa-pen-to-square text-sm"></i>
            </button>
            <button data-delete-id="${item.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete User">
              <i class="fa-regular fa-trash-can text-sm"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
      <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
        Showing ${data.length} user extension${data.length > 1 ? 's' : ''}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  console.log('Manual table rendered successfully');
}


  // ✅ FIX: Fallback table rendering if Table.render fails
  function showFallbackTable(container, data) {
    let html = `
      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Email</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Rank</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Institution</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(item => {
      html += `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="px-4 py-2 text-sm font-medium text-slate-900">${item.fullName}</td>
          <td class="px-4 py-2 text-sm text-slate-600">${item.user?.email || item.userId || 'N/A'}</td>
          <td class="px-4 py-2 text-sm text-slate-600">${item.currentRank?.name?.en || item.currentRank?.name?.am || '-'}</td>
          <td class="px-4 py-2 text-sm text-slate-600">${item.institution?.name?.en || item.institution?.name?.am || '-'}</td>
          <td class="px-4 py-2 text-sm">
            ${item.user 
              ? '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">✅ Active</span>'
              : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold rounded-md">❌ Inactive</span>'
            }
          </td>
          <td class="px-4 py-2 text-sm">
            <button data-view-id="${item.id}" class="p-1 text-indigo-600 hover:bg-indigo-50 rounded">View</button>
            <button data-edit-id="${item.id}" class="p-1 text-indigo-600 hover:bg-indigo-50 rounded">Edit</button>
            <button data-delete-id="${item.id}" class="p-1 text-rose-600 hover:bg-rose-50 rounded">Delete</button>
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
    
    container.innerHTML = html;
  }

  function getTableColumns() {
    return [
      {
        header: 'User Information',
        key: 'fullName',
        sortable: true,
        render: function(item) {
          return `<div class="space-y-0.5">
            <p class="font-semibold text-slate-900 text-sm">${item.fullName}</p>
            <p class="text-slate-400 font-mono text-xs">Email: ${item.user?.email || item.userId || 'N/A'}</p>
          </div>`;
        }
      },
      {
        header: 'Rank / Title',
        key: 'rank',
        render: function(item) {
          return `<div class="text-xs space-y-0.5">
            <p class="text-slate-700">🎖️ Rank: ${item.currentRank?.name?.en || item.currentRank?.name?.am || '-'}</p>
            <p class="text-slate-500">📌 Title: ${item.currentTitle?.name?.en || item.currentTitle?.name?.am || '-'}</p>
          </div>`;
        }
      },
      {
        header: 'Institution',
        key: 'institution',
        render: function(item) {
          return `<div class="text-xs"><p class="text-slate-600">🏛️ ${item.institution?.name?.en || item.institution?.name?.am || '-'}</p></div>`;
        }
      },
      {
        header: 'Personal Details',
        key: 'personal',
        render: function(item) {
          const gender = item.gender || 'N/A';
          const genderIcon = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '⚧️';
          const dob = item.dateOfBirth ? new Date(item.dateOfBirth).toLocaleDateString() : 'N/A';
          return `<div class="text-xs space-y-0.5">
            <p class="text-slate-700">${genderIcon} ${gender}</p>
            <p class="text-slate-500">DOB: ${dob}</p>
          </div>`;
        }
      },
      {
        header: 'ID Numbers',
        key: 'ids',
        render: function(item) {
          return `<div class="text-xs space-y-0.5">
            <p class="font-mono text-slate-600">National ID: ${item.nationalIdNumber || 'N/A'}</p>
            <p class="font-mono text-slate-600">Passport: ${item.passportNumber || 'N/A'}</p>
            <p class="font-mono text-slate-600">TIN: ${item.tinNumber || 'N/A'}</p>
          </div>`;
        }
      },
      {
        header: 'Status',
        key: 'isActive',
        render: function(item) {
          return item.user 
            ? '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">✅ Active</span>'
            : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold rounded-md">❌ Inactive</span>';
        }
      },
      {
        header: 'Actions',
        key: 'id',
        render: function(item) {
          return `<div class="flex items-center gap-1.5">
            <button data-view-id="${item.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Details"><i class="fa-regular fa-eye text-sm"></i></button>
            <button data-edit-id="${item.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit User"><i class="fa-solid fa-pen-to-square text-sm"></i></button>
            <button data-delete-id="${item.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete User"><i class="fa-regular fa-trash-can text-sm"></i></button>
          </div>`;
        }
      }
    ];
  }

  function attachActionListeners() {
    const container = document.getElementById('user-extensions-table-container');
    if (!container) return;

    container.querySelectorAll('[data-view-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-view-id');
        if (id) viewUserDetails(id);
      });
    });

    container.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-edit-id');
        if (id) openExtensionForm(id);
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-delete-id');
        if (id) confirmDeleteExtension(id);
      });
    });
  }
 function loadAndRenderTable() {
  try {
    const data = getFilteredData();
    const tableContainer = document.getElementById('user-extensions-table-container');
    if (!tableContainer) return;

    console.log('Table data:', data);
    console.log('Table data length:', data.length);
    console.log('First item:', data.length > 0 ? data[0] : 'No data');

    if (!data || data.length === 0) {
      tableContainer.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100">
            <div class="relative">
              <input type="text" id="search-input" placeholder="Search contacts by name, email, phone..." value="${searchQuery}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <i class="fa-solid fa-search absolute left-2.5 top-2 text-slate-400 text-xs"></i>
            </div>
          </div>
          <div class="p-8 text-center">
            <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3 block"></i>
            <p class="text-sm text-slate-500">No user extensions found</p>
            <p class="text-xs text-slate-400 mt-1">Click "Add Extension Contact" to create one.</p>
          </div>
        </div>
      `;
      
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          searchQuery = this.value;
          loadAndRenderTable();
        });
      }
      return;
    }

    // ✅ DIRECT RENDER: Use manual table rendering instead of Table.render
    renderManualTable(tableContainer, data);
    attachActionListeners();
    renderPaginationControls();
    
  } catch (error) {
    console.error('loadAndRenderTable error:', error);
    const tableContainer = document.getElementById('user-extensions-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <p class="text-sm text-rose-600">Error loading table: ${error.message}</p>
          <button onclick="location.reload()" class="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      `;
    }
  }
}

// ─── Helper: Unwrap API Response ──────────────────────────────────────
function unwrapResponse(response) {
  // If response is null/undefined, return as-is
  if (!response) return response;
  
  // If response has a data property, use it
  if (response.data !== undefined && response.data !== null) {
    return response.data;
  }
  
  // If response has an item property, use it
  if (response.item !== undefined && response.item !== null) {
    return response.item;
  }
  
  // If response has an items property (paginated), return it
  if (response.items !== undefined && Array.isArray(response.items)) {
    return response.items;
  }
  
  // Otherwise return the response as-is
  return response;
}

// ─── MAIN RENDER FUNCTION ──────────────────────────────────────────────
// ─── MAIN RENDER FUNCTION ──────────────────────────────────────────────
let isLoading = false; // ✅ Add loading flag at module level

export function renderUserExtensions() {
  try {
    console.log('renderUserExtensions: Starting...');
    
    const contentArea = document.getElementById('main-content-area');
    if (!contentArea) return;

    if (!store) {
      console.error('renderUserExtensions: store is undefined');
      showError('Store is not initialized.');
      return;
    }

    // ✅ If already loading, return to prevent infinite loop
    if (isLoading) {
      console.log('Already loading, skipping...');
      return;
    }

    // ✅ FIX: Ensure store.userExtensions is always an array
    if (!store.userExtensions || !Array.isArray(store.userExtensions)) {
      console.warn('renderUserExtensions: store.userExtensions is not an array, initializing as empty array');
      store.userExtensions = [];
    }

    // Initialize other store arrays
     store.userExtensions = [];
    store.ranks = store.ranks || [];
    store.titles = store.titles || [];
    store.institutions = store.institutions || [];

     renderUI(contentArea);
    //  fetchPage(1);
    console.log('Current store.userExtensions:', store.userExtensions);
    console.log('Is array?', Array.isArray(store.userExtensions));
    console.log('Length:', store.userExtensions.length);

    // ✅ FIX: Check if we need to fetch data
    const needsFetch = store.userExtensions.length === 0 || 
                       (!Array.isArray(store.userExtensions));

    if (needsFetch) {
      console.log('Fetching user extensions from API...');
      isLoading = true; // ✅ Set loading flag
      
      store.apiService.get('/user-extensions')
        .then(function(response) {
          console.log('User extensions API response:', response);
          
          let data = [];
          if (response && response.items && Array.isArray(response.items)) {
            data = response.items;
          } else if (Array.isArray(response)) {
            data = response;
          } else if (response && typeof response === 'object') {
            for (const key of Object.keys(response)) {
              if (Array.isArray(response[key])) {
                data = response[key];
                break;
              }
            }
          }
          
          console.log('Extracted data:', data);
          console.log('Data length:', data.length);
          
          store.userExtensions = data;
          isLoading = false; // ✅ Reset loading flag
          
          // ✅ Render the UI with the data (not call renderUserExtensions again)
          renderUI(contentArea);
        })
        .catch(function(error) {
          console.error('Error fetching user extensions:', error);
          store.userExtensions = [];
          isLoading = false; // ✅ Reset loading flag on error
          showError('Failed to load user extensions. Please refresh the page.');
        });
      
      // Show loading state
      contentArea.innerHTML = `
        <div class="flex items-center justify-center p-12">
          <div class="text-center">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="mt-3 text-sm text-slate-500">Loading user extensions...</p>
          </div>
        </div>
      `;
      return;
    }

    // ✅ Data is already loaded, render UI directly
    console.log('Rendering UI with', store.userExtensions.length, 'user extensions');
    renderUI(contentArea);
    
  } catch (error) {
    console.error('renderUserExtensions error:', error);
    showError('Failed to initialize user extensions: ' + error.message);
  }
}

// ─── PAGINATION STATE ────────────────────────────────────────────────
let currentPage = 1;
let pageSize = 20;
let totalCount = 0;

// ─── FETCH ONE PAGE ──────────────────────────────────────────────────
// ─── FETCH ONE PAGE ──────────────────────────────────────────────────
function fetchPage(page) {
  // ✅ Prevent multiple simultaneous fetches
  if (isLoading) {
    console.log('Already loading, skipping...');
    return;
  }
  
  isLoading = true;
  const skip = (page - 1) * pageSize;
  
  // ✅ Show loading state in the table container
  const tableContainer = document.getElementById('user-extensions-table-container');
  if (tableContainer) {
    tableContainer.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="ml-3 text-sm text-slate-500">Loading user extensions...</p>
      </div>
    `;
  }

  const url = `/user-extensions?skip=${skip}&take=${pageSize}`;
  console.log('📡 Fetching:', url);
  
  return store.apiService.get(url)
    .then(function (response) {
      console.log('📥 Response received:', response);
      
      let items = [];
      let count = 0;

      if (Array.isArray(response)) {
        items = response;
        count = response.length;
      } else if (response && Array.isArray(response.items)) {
        items = response.items;
        count = typeof response.count === 'number' ? response.count
              : typeof response.total === 'number' ? response.total
              : items.length;
      } else if (response && Array.isArray(response.data)) {
        items = response.data;
        count = typeof response.count === 'number' ? response.count
              : typeof response.total === 'number' ? response.total
              : items.length;
      } else {
        // Fallback: try to find any array in the response
        if (response && typeof response === 'object') {
          for (const key of Object.keys(response)) {
            if (Array.isArray(response[key])) {
              items = response[key];
              count = items.length;
              break;
            }
          }
        }
      }

      console.log('📊 Extracted items:', items.length, 'items, total:', count);

      // ✅ Update state
      store.userExtensions = items;
      totalCount = count;
      currentPage = page;
      isLoading = false;

      // ✅ Load and render the table
      loadAndRenderTable();
      renderPaginationControls();
    })
    .catch(function (error) {
      console.error('❌ Error fetching user extensions page:', error);
      isLoading = false;
      
      // ✅ Show error state in the table container
      const tableContainer = document.getElementById('user-extensions-table-container');
      if (tableContainer) {
        tableContainer.innerHTML = `
          <div class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
            <p class="text-sm text-rose-600">Failed to load user extensions. Please try again.</p>
            <button onclick="fetchPage(${currentPage})" class="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm">
              <i class="fa-solid fa-rotate mr-2"></i> Retry
            </button>
          </div>
        `;
      }
      Toast.error('Failed to load user extensions. Please try again.');
    });
}
// ─── PAGINATION CONTROLS ─────────────────────────────────────────────
function renderPaginationControls() {
  const container = document.getElementById('user-extensions-pagination-container');
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  container.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
      <p class="text-xs text-slate-500">Showing ${start}-${end} of ${totalCount}</p>
      <div class="flex items-center gap-2">
        <button id="pg-prev" ${currentPage <= 1 ? 'disabled' : ''}
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 ${currentPage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50'}">
          <i class="fa-solid fa-chevron-left"></i> Prev
        </button>
        <span class="text-xs text-slate-500 font-mono">Page ${currentPage} of ${totalPages}</span>
        <button id="pg-next" ${currentPage >= totalPages ? 'disabled' : ''}
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 ${currentPage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50'}">
          Next <i class="fa-solid fa-chevron-right"></i>
        </button>
        <select id="pg-size" class="ml-2 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
          ${[10, 20, 50, 100].map(n => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n} / page</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  document.getElementById('pg-prev')?.addEventListener('click', function () {
    if (currentPage > 1) fetchPage(currentPage - 1);
  });
  document.getElementById('pg-next')?.addEventListener('click', function () {
    if (currentPage < totalPages) fetchPage(currentPage + 1);
  });
  document.getElementById('pg-size')?.addEventListener('change', function () {
    pageSize = parseInt(this.value, 10);
    fetchPage(1);
  });
 }

// ─── UI RENDER ──────────────────────────────────────────────────────────
function renderUI(contentArea) {
  contentArea.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">User Extensions Directory</h2>
          <p class="text-xs text-slate-500 mt-0.5">Manage administrative contacts, roles, ranks, and telephone mappings inside institutions.</p>
        </div>
        <button id="btn-create-extension" class="sm:self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5">
          <i class="fa-solid fa-plus"></i> Add Extension Contact
        </button>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <button class="filter-btn px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs" data-filter="all">All</button>
        <button class="filter-btn px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs" data-filter="active">Active Only</button>
        <button class="filter-btn px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs" data-filter="inactive">Inactive Only</button>
      </div>

      <div id="user-extensions-table-container">
        <div class="flex items-center justify-center p-12">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="ml-3 text-sm text-slate-500">Loading user extensions...</p>
        </div>
      </div>
      <div id="user-extensions-pagination-container"></div>
    </div>
  `;


  // ─── STATE ─────────────────────────────────────────────────────────────


  // ─── FILTERS ──────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const filter = this.dataset.filter;
      currentFilter = filter;
      
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'px-3 py-1.5 bg-white text-slate-600 font-medium text-xs rounded-lg transition-all border border-slate-200 hover:bg-slate-50 shadow-xs';
      });
      this.className = 'px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all border border-indigo-200 shadow-xs';
      
      loadAndRenderTable();
    });
  });

  // ─── CREATE BUTTON ────────────────────────────────────────────────────
  document.getElementById('btn-create-extension')?.addEventListener('click', function() {
    openExtensionForm();
  });
loadAndRenderTable();
  // ─── INITIAL LOAD ────────────────────────────────────────────────────
  // loadAndRenderTable();
}

// ─── SHOW ERROR ──────────────────────────────────────────────────────
function showError(message) {
  const contentArea = document.getElementById('main-content-area');
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

// ─── OPEN CREATE RANK MODAL ──────────────────────────────────────────
function openCreateRankModal(callback) {
  Modal.open({
    title: 'Create New Rank',
    content: `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Code <span class="text-rose-500">*</span></label>
          <input type="text" name="rankCode" placeholder="e.g. RANK001" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
          <input type="text" name="rankNameEn" required placeholder="e.g. Senior Executive" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
          <input type="text" name="rankNameAm" required placeholder="e.g. ከፍተኛ ሥራ አስፈጻሚ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Priority Level (1-10) <span class="text-rose-500">*</span></label>
          <p class="text-[10px] text-slate-400 mt-0.5 mb-1">Lower number = Higher priority (1 is highest)</p>
          <input type="number" name="rankPriority" value="5" required min="1" max="10" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Bedroom Entitlement</label>
          <input type="number" name="rankBedrooms" value="0" min="0" max="10" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
          <textarea name="rankDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
          <textarea name="rankDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="rankIsActive" name="rankIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
          <label for="rankIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Create Rank',
    onConfirm: function(modalEl) {
      try {
        const code = modalEl.querySelector('[name="rankCode"]')?.value || '';
        const nameEn = modalEl.querySelector('[name="rankNameEn"]')?.value || '';
        const nameAm = modalEl.querySelector('[name="rankNameAm"]')?.value || '';
        const priority = parseInt(modalEl.querySelector('[name="rankPriority"]')?.value || '5', 10);
        const bedrooms = parseInt(modalEl.querySelector('[name="rankBedrooms"]')?.value || '0', 10);
        const descEn = modalEl.querySelector('[name="rankDescEn"]')?.value || '';
        const descAm = modalEl.querySelector('[name="rankDescAm"]')?.value || '';
        const isActive = modalEl.querySelector('[name="rankIsActive"]')?.checked || true;

        if (!code || !nameEn || !nameAm) {
          Toast.warning('Please fill in all required fields.');
          return;
        }

        store.apiService.post('/ranks', {
          code, name: { en: nameEn, am: nameAm },
          priorityLevel: priority, allocationPriority: priority,
          bedroomEntitlement: bedrooms,
          description: { en: descEn, am: descAm }, isActive
        }).then(function(response) {
          Toast.success('Rank created successfully!');
          store.syncWithBackend(true).then(function() {
            if (typeof callback === 'function') callback(response.id);
          });
        }).catch(function(error) {
          console.error('Error creating rank:', error);
          Toast.error('Failed to create rank. Please try again.');
        });
      } catch (error) {
        console.error('Error creating rank:', error);
        Toast.error('Failed to create rank. Please try again.');
      }
    }
  });
}

// ─── OPEN CREATE TITLE MODAL ──────────────────────────────────────────
function openCreateTitleModal(callback) {
  Modal.open({
    title: 'Create New Title',
    content: `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Code <span class="text-rose-500">*</span></label>
          <input type="text" name="titleCode" placeholder="e.g. TITLE001" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
          <input type="text" name="titleNameEn" required placeholder="e.g. Director" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
          <input type="text" name="titleNameAm" required placeholder="e.g. ዳይሬክተር" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (English)</label>
          <textarea name="titleDescEn" rows="2" placeholder="Description in English..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Description (Amharic)</label>
          <textarea name="titleDescAm" rows="2" placeholder="Description in Amharic..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="titleIsActive" name="titleIsActive" checked class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
          <label for="titleIsActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active</label>
        </div>
      </div>
    `,
    isForm: true,
    confirmText: 'Create Title',
    onConfirm: function(modalEl) {
      try {
        const code = modalEl.querySelector('[name="titleCode"]')?.value || '';
        const nameEn = modalEl.querySelector('[name="titleNameEn"]')?.value || '';
        const nameAm = modalEl.querySelector('[name="titleNameAm"]')?.value || '';
        const descEn = modalEl.querySelector('[name="titleDescEn"]')?.value || '';
        const descAm = modalEl.querySelector('[name="titleDescAm"]')?.value || '';
        const isActive = modalEl.querySelector('[name="titleIsActive"]')?.checked || true;

        if (!code || !nameEn || !nameAm) {
          Toast.warning('Please fill in all required fields.');
          return;
        }

        store.apiService.post('/titles', {
          code, name: { en: nameEn, am: nameAm },
          description: { en: descEn, am: descAm }, isActive
        }).then(function(response) {
          Toast.success('Title created successfully!');
          store.syncWithBackend(true).then(function() {
            if (typeof callback === 'function') callback(response.id);
          });
        }).catch(function(error) {
          console.error('Error creating title:', error);
          Toast.error('Failed to create title. Please try again.');
        });
      } catch (error) {
        console.error('Error creating title:', error);
        Toast.error('Failed to create title. Please try again.');
      }
    }
  });
}


function openExtensionForm(id) {
  const isEdit = !!id;
  const item = isEdit ? store.userExtensions.find(u => u.id === id) : null;

  // ─── Get options (unchanged) ────────────────────────────────────────
function getRankOptions(selectedId) {
  let html = '<option value="">-- No Rank --</option>';
  if (store.ranks) {
    store.ranks.forEach(rank => {
      const selected = (selectedId === rank.id) ? 'selected' : '';
      const priority = rank.priorityLevel || rank.allocationPriority || 'N/A';
      const name = rank.name?.en || rank.name?.am || rank.code || '-';
      html += `<option value="${rank.id}" ${selected}>${name} (Priority: ${priority})</option>`;
    });
  }
  return html;
}

  function getTitleOptions(selectedId) {
    let html = '<option value="">-- No Title --</option>';
    if (store.titles) {
      store.titles.forEach(title => {
        const selected = (selectedId === title.id) ? 'selected' : '';
        html += `<option value="${title.id}" ${selected}>${title.name?.en || title.name?.am || title.code || '-'}</option>`;
      });
    }
    return html;
  }

  function getInstitutionOptions(selectedId) {
    let html = '<option value="">-- Select Institution --</option>';
    if (store.institutions) {
      store.institutions.forEach(inst => {
        const selected = (selectedId === inst.id) ? 'selected' : '';
        html += `<option value="${inst.id}" ${selected}>${inst.name?.en || inst.name?.am || inst.code || '-'}</option>`;
      });
    }
    return html;
  }

  // ─── Form state ─────────────────────────────────────────────────────
  const formData = {
    username: item?.user?.username || item?.user?.email || '',
   userType: item?.user?.userType || 'employee',
    phone: item?.user?.phoneNumber || '',
    nameEn: item?.user?.name?.en || '',
    nameAm: item?.user?.name?.am || '',
    firstNameEn: item?.firstName?.en || '',
    firstNameAm: item?.firstName?.am || '',
    middleNameEn: item?.middleName?.en || '',
    middleNameAm: item?.middleName?.am || '',
    lastNameEn: item?.lastName?.en || '',
    lastNameAm: item?.lastName?.am || '',
    gender: item?.gender || 'male',
    dateOfBirth: item?.dateOfBirth || '',
    nationality: item?.nationality || '',
    nationalIdNumber: item?.nationalIdNumber || '',
    passportNumber: item?.passportNumber || '',
    tinNumber: item?.tinNumber || '',
    currentAddress: item?.currentAddress || '',
    institutionId: item?.institution?.id || '',
    rankId: item?.currentRank?.id || '',
    titleId: item?.currentTitle?.id || '',
    isActive: !!item?.user
  };

  let activeTab = 'account';
  let modalInstance = null;
  let isSubmitting = false;



  

  // ─── Build form HTML ────────────────────────────────────────────────
  function buildFormHTML() {
    return `
      <div class="max-h-[70vh] overflow-y-auto p-1" id="extension-form-container">
        <div class="flex border-b border-slate-200 mb-4">
          <button class="tab-btn px-4 py-2 text-sm font-semibold ${activeTab === 'account' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}" data-tab="account">Account</button>
          <button class="tab-btn px-4 py-2 text-sm font-semibold ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}" data-tab="profile">Profile</button>
          <button class="tab-btn px-4 py-2 text-sm font-semibold ${activeTab === 'assignment' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}" data-tab="assignment">Assignment</button>
        </div>

        <!-- Tab 1: Account -->
        <div class="tab-content ${activeTab === 'account' ? 'block' : 'hidden'}" id="tab-account">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p class="text-xs text-blue-700 flex items-center gap-2">
              <i class="fa-solid fa-info-circle"></i>
              <span>Username and Email must be the same for the system to work properly.</span>
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Username / Email <span class="text-rose-500">*</span></label>
              <input type="text" id="signup-username" value="${formData.username}" placeholder="john.doe@example.com" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">User Type <span class="text-rose-500">*</span></label>
             <!-- ✅ NEW - Valid values -->
<select id="signup-user-type" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
  <option value="employee" ${formData.userType === 'employee' ? 'selected' : ''}>👔 Employee</option>
  <option value="individual" ${formData.userType === 'individual' ? 'selected' : ''}>👤 Individual</option>
  <option value="external_organization" ${formData.userType === 'external_organization' ? 'selected' : ''}>🏢 External Organization</option>
</select>
            </div>
            ${!isEdit ? `
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Password <span class="text-rose-500">*</span></label>
              <input type="password" id="signup-password" placeholder="Minimum 8 characters" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Confirm Password <span class="text-rose-500">*</span></label>
              <input type="password" id="signup-confirm-password" placeholder="Confirm password" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            ` : `
            <div class="col-span-2">
              <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <p class="text-sm text-slate-500">Password cannot be changed here. Use the password reset feature.</p>
              </div>
            </div>
            `}
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Phone Number <span class="text-rose-500">*</span></label>
              <input type="text" id="signup-phone" value="${formData.phone}" placeholder="+251 900 000 000" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (English) <span class="text-rose-500">*</span></label>
              <input type="text" id="signup-name-en" value="${formData.nameEn}" placeholder="John Doe" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Name (Amharic) <span class="text-rose-500">*</span></label>
              <input type="text" id="signup-name-am" value="${formData.nameAm}" placeholder="ጆን ዶ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
            </div>
          </div>
          <!-- ✅ Next button for Account tab -->
          <div class="flex justify-end mt-4 pt-4 border-t border-slate-200">
            <button type="button" id="tab-next-account" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
              Next: Profile →
            </button>
          </div>
        </div>

        <!-- Tab 2: Profile -->
        <div class="tab-content ${activeTab === 'profile' ? 'block' : 'hidden'}" id="tab-profile">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">First Name (English) <span class="text-rose-500">*</span></label>
              <input type="text" name="firstNameEn" value="${formData.firstNameEn}" placeholder="John" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">First Name (Amharic) <span class="text-rose-500">*</span></label>
              <input type="text" name="firstNameAm" value="${formData.firstNameAm}" placeholder="ጆን" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Middle Name (English)</label>
              <input type="text" name="middleNameEn" value="${formData.middleNameEn}" placeholder="Michael" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Middle Name (Amharic)</label>
              <input type="text" name="middleNameAm" value="${formData.middleNameAm}" placeholder="ሚካኤል" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Last Name (English) <span class="text-rose-500">*</span></label>
              <input type="text" name="lastNameEn" value="${formData.lastNameEn}" placeholder="Doe" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Last Name (Amharic) <span class="text-rose-500">*</span></label>
              <input type="text" name="lastNameAm" value="${formData.lastNameAm}" placeholder="ዶ" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Gender <span class="text-rose-500">*</span></label>
              <select name="gender" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
                <option value="male" ${formData.gender === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${formData.gender === 'female' ? 'selected' : ''}>Female</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Date of Birth <span class="text-rose-500">*</span></label>
              <input type="date" name="dateOfBirth" value="${formData.dateOfBirth}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Nationality <span class="text-rose-500">*</span></label>
              <input type="text" name="nationality" value="${formData.nationality}" placeholder="Ethiopian" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">National ID Number</label>
              <input type="text" name="nationalIdNumber" value="${formData.nationalIdNumber}" placeholder="ETH198502100001" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Passport Number</label>
              <input type="text" name="passportNumber" value="${formData.passportNumber}" placeholder="EP1000001" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">TIN Number</label>
              <input type="text" name="tinNumber" value="${formData.tinNumber}" placeholder="1000000001" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Current Address</label>
              <input type="text" name="currentAddress" value="${formData.currentAddress}" placeholder="Kazanchis, Addis Ababa" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div class="flex justify-between mt-4 pt-4 border-t border-slate-200">
            <button type="button" id="tab-back-account" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold">
              ← Back
            </button>
            <button type="button" id="tab-next-assignment" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
              Next: Assignment →
            </button>
          </div>
        </div>

        <!-- Tab 3: Assignment -->
        <div class="tab-content ${activeTab === 'assignment' ? 'block' : 'hidden'}" id="tab-assignment">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Institution</label>
              <div class="flex items-center gap-2">
                <select name="institutionId" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
                  <option value="">-- Select Institution --</option>
                  ${getInstitutionOptions(formData.institutionId)}
                </select>
                <button type="button" id="btn-create-institution" class="px-2 py-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Current Rank</label>
              <div class="flex items-center gap-2">
                <select name="currentRankId" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
                  <option value="">-- No Rank --</option>
                  ${getRankOptions(formData.rankId)}
                </select>
                <button type="button" id="btn-create-rank" class="px-2 py-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Current Title</label>
              <div class="flex items-center gap-2">
                <select name="currentTitleId" class="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
                  <option value="">-- No Title --</option>
                  ${getTitleOptions(formData.titleId)}
                </select>
                <button type="button" id="btn-create-title" class="px-2 py-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isActive" name="isActive" ${formData.isActive ? 'checked' : ''} class="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm" />
              <label for="isActive" class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Status</label>
            </div>
          </div>
          <div class="flex justify-between mt-4 pt-4 border-t border-slate-200">
            <button type="button" id="tab-back-profile" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold">
              ← Back
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Save form data from DOM ────────────────────────────────────────
  function saveFormDataFromDOM(container) {
    if (!container) return;
    
    const getVal = (selector) => container.querySelector(selector)?.value || '';
    const getChecked = (selector) => container.querySelector(selector)?.checked || false;

    formData.username = getVal('#signup-username');
    formData.userType = getVal('#signup-user-type');
    formData.phone = getVal('#signup-phone');
    formData.nameEn = getVal('#signup-name-en');
    formData.nameAm = getVal('#signup-name-am');
    formData.firstNameEn = getVal('[name="firstNameEn"]');
    formData.firstNameAm = getVal('[name="firstNameAm"]');
    formData.middleNameEn = getVal('[name="middleNameEn"]');
    formData.middleNameAm = getVal('[name="middleNameAm"]');
    formData.lastNameEn = getVal('[name="lastNameEn"]');
    formData.lastNameAm = getVal('[name="lastNameAm"]');
    formData.gender = getVal('[name="gender"]') || 'male';
    formData.dateOfBirth = getVal('[name="dateOfBirth"]');
    formData.nationality = getVal('[name="nationality"]');
    formData.nationalIdNumber = getVal('[name="nationalIdNumber"]');
    formData.passportNumber = getVal('[name="passportNumber"]');
    formData.tinNumber = getVal('[name="tinNumber"]');
    formData.currentAddress = getVal('[name="currentAddress"]');
    formData.institutionId = getVal('[name="institutionId"]');
    formData.rankId = getVal('[name="currentRankId"]');
    formData.titleId = getVal('[name="currentTitleId"]');
    formData.isActive = getChecked('[name="isActive"]');
  }

  // ─── Validate current tab ───────────────────────────────────────────
  function validateCurrentTab(tab) {
    if (tab === 'account') {
      if (!formData.username) {
        Toast.warning('Please enter username/email.');
        return false;
      }
      if (!formData.phone) {
        Toast.warning('Please enter phone number.');
        return false;
      }
      if (!formData.nameEn) {
        Toast.warning('Please enter name in English.');
        return false;
      }
      if (!formData.nameAm) {
        Toast.warning('Please enter name in Amharic.');
        return false;
      }
      return true;
    }
    
    if (tab === 'profile') {
      if (!formData.firstNameEn) {
        Toast.warning('Please enter first name in English.');
        return false;
      }
      if (!formData.firstNameAm) {
        Toast.warning('Please enter first name in Amharic.');
        return false;
      }
      if (!formData.lastNameEn) {
        Toast.warning('Please enter last name in English.');
        return false;
      }
      if (!formData.lastNameAm) {
        Toast.warning('Please enter last name in Amharic.');
        return false;
      }
      if (!formData.gender) {
        Toast.warning('Please select gender.');
        return false;
      }
      if (!formData.dateOfBirth) {
        Toast.warning('Please select date of birth.');
        return false;
      }
      if (!formData.nationality) {
        Toast.warning('Please enter nationality.');
        return false;
      }
      return true;
    }
    
    return true;
  }

  // ─── Get user ID from /api/auth/me ──────────────────────────────────
// ─── Get user ID from /api/auth/me ──────────────────────────────────
function getUserIdFromAuth(signupResponse) {
  // ✅ Get token from signup response
  const token = signupResponse.token;
  
  if (!token) {
    console.error('No token in signup response:', signupResponse);
    return Promise.reject(new Error('No token received from signup'));
  }
  
  console.log('Token from signup:', token);
  
  // ✅ Call /auth/me with the token from signup
  return store.apiService.get('/auth/me', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(function(response) {
    console.log('Auth/me response:', response);
    return response.id || response.userId;
  })
  .catch(function(error) {
    console.error('Error getting user from auth/me:', error);
    throw new Error('Failed to get user info. Please try again.');
  });
}

  // ─── Create User Extension ──────────────────────────────────────────
 // ─── Create User Extension ──────────────────────────────────────────
function createUserExtension(userId) {
  return store.apiService.post('/user-extensions', {
    userId: userId,
    firstName: { en: formData.firstNameEn, am: formData.firstNameAm },
    middleName: { en: formData.middleNameEn || '', am: formData.middleNameAm || '' },
    lastName: { en: formData.lastNameEn, am: formData.lastNameAm },
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    nationality: formData.nationality,
    currentAddress: formData.currentAddress || '',
    nationalIdNumber: formData.nationalIdNumber || '',
    passportNumber: formData.passportNumber || '',
    tinNumber: formData.tinNumber || '',
    currentTitleId: formData.titleId || null,
    currentRankId: formData.rankId || null,  // ✅ This stores the rank ID in the extension
    institutionId: formData.institutionId || null
  }).then(function(response) {
    const extension = unwrapResponse(response);
    console.log('createUserExtension: raw response =', response, '| unwrapped =', extension);
    return extension;
  });;
}

// ─── Create Rank Assignment ──────────────────────────────────────────
function createRankAssignment(userExtensionId, rankId) {
  if (!rankId) {
    console.log('No rank selected, skipping rank assignment');
    return Promise.resolve();
  }
  
  const payload = {
    userExtensionId: userExtensionId,
    rankId: rankId,
    startDate: new Date().toISOString().split('T')[0], // Today's date
    isCurrent: true,
    changeReason: 'Initial rank assignment'
  };
  
  return store.apiService.post('/rank-assignments', payload)
    .then(function(response) {
      console.log('Rank assignment created:', response);
      return response;
    })
    .catch(function(error) {
      console.error('Error creating rank assignment:', error);
      throw new Error('Failed to assign rank. Please try again.');
    });
}

  // ─── Update User Extension ──────────────────────────────────────────
// ─── Update User Extension ──────────────────────────────────────────
function updateUserExtension(id) {
  // First update the user extension
  return store.apiService.put('/user-extensions/' + id, {
    firstName: { en: formData.firstNameEn, am: formData.firstNameAm },
    middleName: { en: formData.middleNameEn || '', am: formData.middleNameAm || '' },
    lastName: { en: formData.lastNameEn, am: formData.lastNameAm },
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    nationality: formData.nationality,
    currentAddress: formData.currentAddress || '',
    nationalIdNumber: formData.nationalIdNumber || '',
    passportNumber: formData.passportNumber || '',
    tinNumber: formData.tinNumber || '',
    currentTitleId: formData.titleId || null,
    currentRankId: formData.rankId || null,
    institutionId: formData.institutionId || null
  })
  .then(function(extensionResponse) {
      const unwrapped = unwrapResponse(extensionResponse);
    console.log('User extension updated:', unwrapped);
    
    // ✅ If rank is selected, create/update rank assignment
    const rankId = formData.rankId;
    const userExtensionId = extensionResponse.id;
    
    if (rankId && userExtensionId) {
      // Check if rank assignment already exists
      return store.apiService.get('/rank-assignments?userExtensionId=' + userExtensionId)
        .then(function(existingAssignments) {
          if (existingAssignments && existingAssignments.length > 0) {
            // Update existing rank assignment
            const assignmentId = existingAssignments[0].id;
            return store.apiService.put('/rank-assignments/' + assignmentId, {
              rankId: rankId,
              startDate: new Date().toISOString().split('T')[0],
              isCurrent: true,
              changeReason: 'Rank updated'
            });
          } else {
            // ✅ THIS IS WHERE RANK ASSIGNMENT IS CREATED FOR UPDATES
            return createRankAssignment(userExtensionId, rankId);
          }
        });
    }
    return Promise.resolve();
  })
  .then(function() {
    Toast.success('User updated successfully.');
    store.syncWithBackend(true).then(function() {
      renderUserExtensions();
    });
  })
  .catch(function(error) {
    console.error('Error updating user:', error);
    Toast.error(error.message || 'Failed to update user. Please try again.');
    isSubmitting = false;
  });
}
  // ─── Handle signup and create extension ─────────────────────────────
// ─── Handle signup and create extension ─────────────────────────────
function handleSignupAndCreateExtension(password, confirmPassword, modalEl) {
  // Validate password
  if (!password || password.length < 8) {
    Toast.warning('Password must be at least 8 characters.');
    return;
  }
  if (password !== confirmPassword) {
    Toast.warning('Passwords do not match.');
    return;
  }

  // Step 1: Create user account via signup
  const signupPayload = {
    email: formData.username,
    username: formData.username,
    phoneNumber: formData.phone,
    userType: formData.userType,
    name: { am: formData.nameAm, en: formData.nameEn },
    password: password,
    confirmPassword: confirmPassword
  };

  store.apiService.post('/auth/signup-with-pwd', signupPayload)
    .then(function(signupResponse) {
      console.log('Signup response:', signupResponse);
      return getUserIdFromAuth(signupResponse);
    })
    .then(function(userId) {
      if (!userId) {
        throw new Error('User ID not found. Please login again.');
      }
      console.log('User ID from auth/me:', userId);
      
      // Step 2: Create user extension
      return createUserExtension(userId);
    })
    .then(function(extensionResponse) {
      console.log('User extension created:', extensionResponse);
      
      // ✅ Step 3: Create rank assignment if rank is selected
      const userExtensionId = extensionResponse.id;
      const rankId = formData.rankId;

        console.log("extension =", extensionResponse);
    console.log("userExtensionId =", userExtensionId);
    console.log("rankId =", rankId);
    console.log("before createRankAssignment");
      
      if (rankId && userExtensionId) {
        return createRankAssignment(userExtensionId, rankId)
          .then(function() {
            Toast.success('User created and rank assigned successfully!');
            store.syncWithBackend(true).then(function() {
              renderUserExtensions();
            });
          });
      } else {
        Toast.success('User created successfully!');
        store.syncWithBackend(true).then(function() {
          renderUserExtensions();
        });
      }
    })
    .catch(function(error) {
      console.error('Error creating user:', error);
      Toast.error(error.message || 'Failed to create user. Please try again.');
      isSubmitting = false;
    });
}

  // ─── Open main modal ─────────────────────────────────────────────────
  function openMainModal() {
    modalInstance = Modal.open({
      title: isEdit ? 'Edit Extension Contact' : 'Add Extension Contact',
      content: buildFormHTML(),
      isForm: true,
      confirmText: isEdit ? 'Save Changes' : 'Create User',
      onConfirm: function(modalEl) {
        // Prevent multiple submissions
        if (isSubmitting) return;
        isSubmitting = true;

        // Save form data from DOM
        saveFormDataFromDOM(modalEl);

        // ✅ Validate all tabs before submitting
        if (!validateCurrentTab('account')) {
          isSubmitting = false;
          return;
        }
        if (!validateCurrentTab('profile')) {
          isSubmitting = false;
          return;
        }

        if (!isEdit) {
          // ✅ NEW USER: Get password from form and handle signup
          const password = modalEl.querySelector('#signup-password')?.value || '';
          const confirmPassword = modalEl.querySelector('#signup-confirm-password')?.value || '';
          
          handleSignupAndCreateExtension(password, confirmPassword, modalEl);
        } else {
          // ✅ EDIT USER: Update existing user
          updateUserExtension(id)
            .then(function() {
              Toast.success('User updated successfully.');
              store.syncWithBackend(true).then(function() {
                renderUserExtensions();
              });
            })
            .catch(function(error) {
              console.error('Error updating user:', error);
              Toast.error(error.message || 'Failed to update user. Please try again.');
              isSubmitting = false;
            });
        }
      }
    });

    // Attach tab listeners after modal renders
    setTimeout(attachTabListeners, 100);
  }

  // ─── Tab switching with validation ──────────────────────────────────
  function attachTabListeners() {
    const container = document.getElementById('extension-form-container');
    if (!container) return;

    // Tab button clicks (header)
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const tab = this.dataset.tab;
        switchToTab(tab);
      });
    });

    // Next button: Account → Profile
    const nextAccountBtn = container.querySelector('#tab-next-account');
    if (nextAccountBtn) {
      nextAccountBtn.addEventListener('click', function() {
        // Save and validate account tab
        saveFormDataFromDOM(container);
        if (validateCurrentTab('account')) {
          switchToTab('profile');
        }
      });
    }

    // Next button: Profile → Assignment
    const nextAssignmentBtn = container.querySelector('#tab-next-assignment');
    if (nextAssignmentBtn) {
      nextAssignmentBtn.addEventListener('click', function() {
        // Save and validate profile tab
        saveFormDataFromDOM(container);
        if (validateCurrentTab('profile')) {
          switchToTab('assignment');
        }
      });
    }

    // Back button: Profile → Account
    const backAccountBtn = container.querySelector('#tab-back-account');
    if (backAccountBtn) {
      backAccountBtn.addEventListener('click', function() {
        saveFormDataFromDOM(container);
        switchToTab('account');
      });
    }

    // Back button: Assignment → Profile
    const backProfileBtn = container.querySelector('#tab-back-profile');
    if (backProfileBtn) {
      backProfileBtn.addEventListener('click', function() {
        saveFormDataFromDOM(container);
        switchToTab('profile');
      });
    }

    // Create Rank button
    const createRankBtn = container.querySelector('#btn-create-rank');
    if (createRankBtn) {
      createRankBtn.addEventListener('click', function() {
        saveFormDataFromDOM(container);
        openCreateRankModal(function(newRankId) {
          if (newRankId) {
            store.syncWithBackend(true).then(function() {
              formData.rankId = newRankId;
              if (modalInstance && typeof modalInstance.close === 'function') {
                modalInstance.close();
              }
              openMainModal();
              Toast.success('Rank created and selected!');
            });
          }
        });
      });
    }

    // Create Title button
    const createTitleBtn = container.querySelector('#btn-create-title');
    if (createTitleBtn) {
      createTitleBtn.addEventListener('click', function() {
        saveFormDataFromDOM(container);
        openCreateTitleModal(function(newTitleId) {
          if (newTitleId) {
            store.syncWithBackend(true).then(function() {
              formData.titleId = newTitleId;
              if (modalInstance && typeof modalInstance.close === 'function') {
                modalInstance.close();
              }
              openMainModal();
              Toast.success('Title created and selected!');
            });
          }
        });
      });
    }

    // Create Institution button
    const createInstitutionBtn = container.querySelector('#btn-create-institution');
    if (createInstitutionBtn) {
      createInstitutionBtn.addEventListener('click', function() {
        window.location.hash = 'institutions';
        Toast.info('Please create an institution in the Institutions page.');
      });
    }
  }

  // ─── Switch tab function ────────────────────────────────────────────
  function switchToTab(tab) {
    const container = document.getElementById('extension-form-container');
    if (!container) return;

    activeTab = tab;
    
    // Update button styles
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.className = 'tab-btn px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700';
    });
    const activeBtn = container.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (activeBtn) {
      activeBtn.className = 'tab-btn px-4 py-2 text-sm font-semibold text-indigo-600 border-b-2 border-indigo-600';
    }
    
    // Update content visibility
    container.querySelectorAll('.tab-content').forEach(content => {
      content.className = 'tab-content hidden';
    });
    const target = document.getElementById('tab-' + tab);
    if (target) {
      target.className = 'tab-content block';
    }
  }

  // ─── Open the modal ──────────────────────────────────────────────────
  openMainModal();
}


function viewUserDetails(id) {
  const item = store.userExtensions.find(u => u.id === id);
  if (!item) {
    Toast.error('User not found');
    return;
  }

  const loadingModal = Modal.open({
    title: 'User Details',
    content: `
      <div class="flex flex-col items-center justify-center p-8 space-y-4">
        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500">Loading user details...</p>
      </div>
    `,
    isForm: false,
    confirmText: 'Close'
  });

  // ✅ FIX: Use the actual userId for the beneficiary API
  const actualUserId = item.userId || item.id;
  
  console.log('UserExtension ID:', id);
  console.log('Actual User ID (for beneficiary API):', actualUserId);

  // ✅ FIX: Use /rank-assignments with query param
  Promise.all([
    store.apiService.get('/rank-assignments?userExtensionId=' + id).catch(() => null),
    store.apiService.get('/house-allocation-requests/beneficiary/' + actualUserId).catch(() => null)
  ]).then(function(results) {
    const rankResponse = results[0];
    const beneficiaryResponse = results[1];
    
    console.log('Rank assignment response:', rankResponse);
    console.log('Beneficiary requests response:', beneficiaryResponse);
    
    if (loadingModal && typeof loadingModal.close === 'function') {
      loadingModal.close();
    }

    // Build user details HTML
    const firstName = item.firstName?.en || item.firstName?.am || '';
    let middleName = '';
    if (item.middleName?.en && Array.isArray(item.middleName.en)) {
      middleName = item.middleName.en.join(' ');
    } else if (item.middleName?.am && Array.isArray(item.middleName.am)) {
      middleName = item.middleName.am.join(' ');
    } else {
      middleName = item.middleName?.en || item.middleName?.am || '';
    }
    const lastName = item.lastName?.en || item.lastName?.am || '';
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'N/A';

    // Build rank details from API response if available
    let rankDetailsHtml = '';
    let rankName = 'Not Assigned';
    let rankPriority = 'N/A';
    
    // ✅ Handle rank response (could be array or single object)
    if (rankResponse) {
      let currentAssignment = null;
      // Handle array response
      if (Array.isArray(rankResponse) && rankResponse.length > 0) {
        currentAssignment = rankResponse.find(r => r.isCurrent === true) || rankResponse[0];
      } else if (rankResponse && typeof rankResponse === 'object' && !Array.isArray(rankResponse)) {
        // Handle single object response
        currentAssignment = rankResponse;
      }
      
      if (currentAssignment && currentAssignment.rank) {
        const rank = currentAssignment.rank;
        rankName = rank.name?.en || rank.name?.am || 'N/A';
        rankPriority = rank.priorityLevel || rank.allocationPriority || 'N/A';
        const bedroomEntitlement = rank.bedroomEntitlement || '';
        const startDate = currentAssignment.startDate || '';
        const isCurrent = currentAssignment.isCurrent || false;
        const changeReason = currentAssignment.changeReason || '';
        
        rankDetailsHtml = `
          <div class="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p class="text-sm font-semibold text-slate-800">🎖️ ${rankName}</p>
            <p class="text-xs text-slate-500">Priority: ${rankPriority}/10</p>
            ${bedroomEntitlement ? `<p class="text-xs text-slate-500">🛏️ Bedrooms: ${bedroomEntitlement}</p>` : ''}
            <p class="text-xs text-slate-400 mt-1">Start: ${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</p>
            <p class="text-xs text-slate-400">Status: ${isCurrent ? '✅ Current' : '❌ Inactive'}</p>
            ${changeReason ? `<p class="text-xs text-slate-400">Reason: ${changeReason}</p>` : ''}
          </div>
        `;
      } else {
        rankDetailsHtml = `
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <p class="text-sm text-slate-400">No rank assigned to this user</p>
          </div>
        `;
      }
    } else {
      rankDetailsHtml = `
        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
          <p class="text-sm text-slate-400">No rank assigned to this user</p>
        </div>
      `;
    }

    // ... rest of the function (beneficiary HTML and modal) ...
    
    Modal.open({
      title: 'User Details',
      content: `
        <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div class="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">${fullName}</h3>
              <p class="text-sm text-slate-500">${item.user?.email || 'N/A'}</p>
              <p class="text-xs text-slate-400 font-mono mt-1">User ID: ${item.userId || item.id || 'N/A'}</p>
            </div>
            <div class="text-right">
              <span class="px-2 py-1 text-xs font-bold rounded-md ${item.user ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                ${item.user ? '✅ Active' : '❌ Inactive'}
              </span>
              <p class="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-500">${item.gender || 'N/A'}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Personal Information</label>
                <p class="text-sm text-slate-800">Gender: ${item.gender || 'N/A'}</p>
                <p class="text-sm text-slate-800">Nationality: ${item.nationality || 'N/A'}</p>
                <p class="text-sm text-slate-800">Date of Birth: ${item.dateOfBirth ? new Date(item.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Identification Numbers</label>
                <p class="text-sm text-slate-800 font-mono">National ID: ${item.nationalIdNumber || 'N/A'}</p>
                <p class="text-sm text-slate-800 font-mono">Passport: ${item.passportNumber || 'N/A'}</p>
                <p class="text-sm text-slate-800 font-mono">TIN: ${item.tinNumber || 'N/A'}</p>
              </div>
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Institution</label>
                <p class="text-sm text-slate-800">🏛️ ${item.institution?.name?.en || item.institution?.name?.am || 'Not Assigned'}</p>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Current Rank</label>
                ${rankDetailsHtml}
              </div>
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Current Title</label>
                <div class="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p class="text-sm font-semibold text-slate-800">📌 ${item.currentTitle?.name?.en || item.currentTitle?.name?.am || 'Not Assigned'}</p>
                </div>
              </div>
              <div>
                <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Address</label>
                <p class="text-sm text-slate-800">${item.currentAddress || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4">
            <label class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-2 block">🏛️ Allocation History (Beneficiary)</label>
            ${beneficiaryHtml}
          </div>

          <div class="border-t border-slate-100 pt-3 text-[10px] text-slate-400 flex justify-between">
            <span>Created: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</span>
            <span>Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
      `,
      isForm: false,
      confirmText: 'Close'
    });
  }).catch(function(error) {
    console.error('Error fetching data:', error);
    if (loadingModal && typeof loadingModal.close === 'function') {
      loadingModal.close();
    }
    Toast.error('Failed to load user details. Please try again.');
  });
}

// ─── DELETE CONFIRMATION ─────────────────────────────────────────────
function confirmDeleteExtension(id) {
  const item = store.userExtensions.find(u => u.id === id);
  if (!item) return;

  const firstName = item.firstName?.en || item.firstName?.am || 'this user';

  Modal.open({
    title: 'Confirm Deletion',
    content: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-950">Are you sure you want to delete this user?</p>
          <p class="text-xs text-slate-500 mt-1">This action cannot be undone. User <strong class="text-slate-800">${firstName}</strong> will be permanently deleted.</p>
        </div>
      </div>
    `,
    confirmText: 'Delete User',
    cancelText: 'Cancel',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    onConfirm: function() {
      store.apiService.delete('/user-extensions/' + id)
        .then(function() {
          Toast.success('User deleted successfully.');
          store.syncWithBackend(true).then(renderUserExtensions);
        })
        .catch(function(error) {
          console.error('Error deleting user:', error);
          Toast.error('Failed to delete user. Please try again.');
        });
    }
  });
}

// ─── EXPORTS ──────────────────────────────────────────────────────────
export { viewUserDetails };