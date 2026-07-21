// Main App Shell Setup and Bootstrapper for FHC Admin Dashboard
import { store } from './store';
import { router } from './router';
import { Modal, Toast } from './components';

export function initApp() {
  const root = document.getElementById('root');
  if (!root) return;

  // Insert the core layout shell (Sidebar, Header, Content Area, Breadcrumb, Toast container, etc.)
  root.innerHTML = `
    <div class="h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans overflow-hidden">
      
      <!-- HEADER - Fixed at top -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shadow-xs flex-shrink-0 z-50">
        <!-- Left: Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span id="breadcrumb-section" class="text-slate-400">FHC</span>
          <i class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
          <span id="breadcrumb-active-label" class="text-slate-800 font-medium">Dashboard Overview</span>
        </nav>

        <!-- Right: System Settings quick badge -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-150">
            <i class="fa-solid fa-server text-[10px] text-slate-400"></i>
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gateway Status:</span>
            <span id="navbar-api-badge" class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md ${
              store.apiMode === 'mock' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }">
              ${store.apiMode === 'mock' ? 'MOCK_LOCAL' : 'LIVE_REST'}
            </span>
          </div>
          
          <div class="w-8.5 h-8.5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
            <i class="fa-regular fa-user text-slate-600 text-sm"></i>
          </div>
        </div>
      </header>

      <!-- Main Body - Sidebar + Content -->
      <div class="flex flex-1 overflow-hidden">
        
        <!-- SIDEBAR - Fixed on left -->
        <aside class="w-64 bg-white text-slate-600 flex-shrink-0 flex flex-col border-r border-slate-200 shadow-sm overflow-hidden h-full">
          <!-- Logo Header -->
          <div class="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-white flex-shrink-0">
            <div class="w-8.5 h-8.5 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <i class="fa-solid fa-hotel text-sm"></i>
            </div>
            <div>
              <h1 class="text-sm font-bold tracking-tight text-slate-800">FHC Enterprise</h1>
              <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Admin Panel v1.0</p>
            </div>
          </div>

          <!-- Navigation Categories - Scrollable -->
          <div class="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-hide">
            <!-- Main Group: Dashboard -->
            <div class="space-y-1.5">
              <p class="px-4 text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Core Panel</p>
              <button data-nav-tab="dashboard" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-chart-line text-base w-5 text-center"></i> Dashboard
              </button>
            </div>

            <!-- Group 1: Institutions -->
            <div class="space-y-1.5">
              <p class="px-4 text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">🏛 Institutions</p>
              <button data-nav-tab="institutions" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-building text-base w-5 text-center"></i> Institutions
              </button>
            </div>

            <!-- Group 2: User Management -->
            <div class="space-y-1.5">
              <p class="px-4 text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">👤 User Management</p>
              <button data-nav-tab="user-extensions" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-address-book text-base w-5 text-center"></i> Extensions
              </button>
            </div>

            <!-- Group 3: Housing Allocation -->
            <div class="space-y-1.5">
              <p class="px-4 text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">🏠 House Allocation</p>
              <button data-nav-tab="allocation-requests" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-regular fa-paper-plane text-base w-5 text-center"></i> Requests
              </button>
              <button data-nav-tab="queue-management" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-list-ol text-base w-5 text-center"></i> Queue Manage
              </button>
            </div>

            <!-- Settings Group: Configuration Items -->
            <div class="space-y-1.5 border-t border-slate-200 pt-4">
              <p class="px-4 text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">⚙️ Settings & Config</p>
              <button data-nav-tab="categories" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-layer-group text-base w-5 text-center"></i> Categories
              </button>
              <button data-nav-tab="labels" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-tags text-base w-5 text-center"></i> Labels
              </button>
              <button data-nav-tab="tiers" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-sliders text-base w-5 text-center"></i> Tiers
              </button>
              <button data-nav-tab="ranks" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-medal text-base w-5 text-center"></i> Ranks
              </button>
              <button data-nav-tab="titles" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600 transition-all">
                <i class="fa-solid fa-user-tag text-base w-5 text-center"></i> Titles
              </button>
            </div>

            <!-- Sidebar Footer Status -->
            <div class="space-y-2 pt-4 border-t border-slate-100">
              <button id="btn-toggle-config" class="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all shadow-xs">
                <i class="fa-solid fa-gears mr-1"></i> API Config Panel
              </button>
              <div class="flex items-center gap-2 justify-center text-[10px] text-slate-500 font-medium">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Mode: <strong class="text-slate-700 font-mono">${store.apiMode === 'mock' ? 'Offline DB' : 'REST API'}</strong>
              </div>
            </div>
          </div>
        </aside>

        <!-- MAIN CONTENT AREA -->
        <main class="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-hide">
          <div id="main-content-area" class="max-w-7xl mx-auto space-y-6">
            <!-- Rendered by modules dynamically -->
          </div>
        </main>
      </div>

    </div>
  `;

  // Inject scrollbar-hide CSS if not already present
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    /* Hide scrollbar for Chrome, Safari and Opera */
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    .scrollbar-hide {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;
  document.head.appendChild(styleTag);

  // Attach Configuration Modal triggers
  document.getElementById('btn-toggle-config')?.addEventListener('click', openConfigModal);

  // Initialize Router
  router.init();
}

/**
 * Configure API parameters (Base URL, Bearer Auth Token, Toggle Mock/Real)
 */
function openConfigModal() {
  const formHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-indigo-50 text-indigo-800 rounded-lg text-xs leading-relaxed border border-indigo-150">
        Customize connection strings, authorization Bearer headers, and toggle simulation mode to match your local docker backend runtime.
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Runtime Mode <span class="text-rose-500">*</span></label>
        <select id="config-api-mode" name="apiMode" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden">
          <option value="mock" ${store.apiMode === 'mock' ? 'selected' : ''}>Simulation: Local In-Memory Offline Storage (Best for preview)</option>
          <option value="api" ${store.apiMode === 'api' ? 'selected' : ''}>Integration: Live REST REST API (Calls backend directly)</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">REST API Backend URL <span class="text-rose-500">*</span></label>
        <input 
          type="url" 
          id="config-base-url" 
          name="baseURL" 
          value="${store.baseURL}" 
          required 
          placeholder="http://localhost:3110/api"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-hidden"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1.5">Bearer Authorization Token <span class="text-rose-500">*</span></label>
        <input 
          type="text" 
          id="config-token" 
          name="token" 
          value="${store.token}" 
          required 
          placeholder="Bearer sample_token_string"
          class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-hidden"
        />
      </div>
    </div>
  `;

  Modal.open({
    title: 'Gateway Endpoint Configuration',
    content: formHTML,
    confirmText: 'Save Gateway Config',
    onConfirm: (modalEl) => {
      const apiMode = (modalEl.querySelector('#config-api-mode') as HTMLSelectElement).value as 'mock' | 'api';
      const baseURL = (modalEl.querySelector('#config-base-url') as HTMLInputElement).value;
      const token = (modalEl.querySelector('#config-token') as HTMLInputElement).value;

      store.setApiMode(apiMode);
      store.setBaseURL(baseURL);
      store.setToken(token);

      Toast.success('API Service settings saved successfully.');

      // Refresh layout badge and current view
      const badge = document.getElementById('navbar-api-badge');
      if (badge) {
        badge.className = `px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md ${
          store.apiMode === 'mock' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
        }`;
        badge.textContent = store.apiMode === 'mock' ? 'MOCK_LOCAL' : 'LIVE_REST';
      }

      router.handleRoute(store.activeTab);
    }
  });
}