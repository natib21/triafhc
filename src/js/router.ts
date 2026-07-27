// Client-side router to render modules dynamically based on user navigation.
import { store } from './store';
import { renderDashboard } from './modules/dashboard';
import { renderCategories } from './modules/categories';
import { renderLabels } from './modules/labels';
import { renderTiers } from './modules/tiers';
import { renderRanks } from './modules/ranks';
import { renderAssignments } from './modules/assignments';
import { renderTitles } from './modules/titles';
import { renderInstitutions } from './modules/institutions';
import { renderUserExtensions } from './modules/userExtensions';
import { renderAllocationRequests } from './modules/allocation-requests';
import { renderQueueManagement } from './modules/queueManagement';
import { renderQueueByInstitution } from './modules/queueByInstitution'; // ✅ New import
import { initAllocationRequests } from "./modules/allocationRequests.old";

class Router {
  private routes: Record<string, () => void> = {
    'dashboard': renderDashboard,
    'categories': renderCategories,
    'labels': renderLabels,
    'tiers': renderTiers,
    'ranks': renderRanks,
    'assignments': renderAssignments,
    'titles': renderTitles,
    'institutions': renderInstitutions,
    'user-extensions': renderUserExtensions,
    'allocation-requests': initAllocationRequests,
    'queue-management': renderQueueManagement,
    'queue-by-institution': renderQueueByInstitution, // ✅ New route
  };

  public init() {
    // Listen for store tab updates
    store.subscribe(() => {
      this.handleRoute(store.activeTab);
    });

    // Handle initial route
    this.handleRoute(store.activeTab);
    this.setupSidebarListeners();
  }

  public async handleRoute(tab: string) {
     console.log('Router handling route:', tab);
     console.log('📋 Available routes:', Object.keys(this.routes));
    const renderFn = this.routes[tab];
    if (renderFn) {
      // 1. Update breadcrumb
      console.log(`✅ Route "${tab}" found, rendering...`);
      this.updateBreadcrumb(tab);

      // 2. Update active visual states in Sidebar
      this.updateSidebarUI(tab);

      // 3. Clear container and call module rendering
      const contentArea = document.getElementById('main-content-area');
      if (contentArea) {
        if (store.apiMode === 'api') {
          contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 space-y-4">
              <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-xs text-slate-500 font-bold tracking-wider uppercase">Loading live data from server...</p>
            </div>
          `;
          try {
            await store.syncWithBackend(true);
          } catch (err) {
            console.error('API sync failed:', err);
          }
        }

        contentArea.innerHTML = ''; // Fresh container for the module
        try {
          renderFn();
        } catch (err) {
          console.error(`Error rendering tab ${tab}:`, err);
          contentArea.innerHTML = `
            <div class="p-8 text-center bg-white rounded-xl border border-red-100 shadow-xs max-w-lg mx-auto mt-12">
              <i class="fa-solid fa-triangle-exclamation text-red-500 text-4xl mb-3"></i>
              <h3 class="text-lg font-semibold text-slate-800">Renderer Crash</h3>
              <p class="text-sm text-slate-500 mt-1">Failed to initialize the dashboard view component.</p>
              <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors">
                <i class="fa-solid fa-rotate mr-2"></i>Reload Page
              </button>
            </div>
          `;
        }
      }
    } else {
      console.warn(`Route "${tab}" not found. Falling back to dashboard.`);
      this.handleRoute('dashboard');
    }
  }

  private setupSidebarListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const navItem = target.closest('[data-nav-tab]');
      if (navItem) {
        const tab = navItem.getAttribute('data-nav-tab');
        if (tab) {
          store.setActiveTab(tab);
          
          // ✅ If clicking on queue-by-institution, also expand the submenu
          if (tab === 'queue-by-institution') {
            const parentBtn = navItem.closest('.submenu-container')?.parentElement?.querySelector('[data-nav-tab="queue-management"]');
            if (parentBtn) {
              const container = parentBtn.parentElement.querySelector('.submenu-container');
              if (container) {
                container.classList.add('open');
                parentBtn.dataset.expanded = 'true';
              }
            }
          }
        }
      }
    });
  }

  private updateSidebarUI(activeTab: string) {
    // Remove active class from all nav items
    document.querySelectorAll('[data-nav-tab]').forEach(item => {
      item.className = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-transparent transition-all';
    });

    // Add active class to the current tab
    const activeItem = document.querySelector(`[data-nav-tab="${activeTab}"]`);
    if (activeItem) {
      activeItem.className = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 transition-all';
      
      // If it's a submenu item, highlight its parent too
      if (activeTab === 'queue-by-institution') {
        const parentBtn = activeItem.closest('.submenu-container')?.parentElement?.querySelector('[data-nav-tab="queue-management"]');
        if (parentBtn) {
          parentBtn.className = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 transition-all';
        }
      }
    }

    // Also highlight the parent if the submenu is active
    if (activeTab === 'queue-by-institution') {
      const parentBtn = document.querySelector('[data-nav-tab="queue-management"]');
      if (parentBtn && !parentBtn.classList.contains('text-indigo-700')) {
        parentBtn.className = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 transition-all';
      }
    }
  }

  private updateBreadcrumb(tab: string) {
    const breadcrumbLabel = document.getElementById('breadcrumb-active-label');
    const breadcrumbSection = document.getElementById('breadcrumb-section');
    if (!breadcrumbLabel) return;

    const metadata: Record<string, { section: string; label: string }> = {
      'dashboard': { section: 'FHC', label: 'Dashboard Overview' },
      'categories': { section: 'Institutions', label: 'Categories' },
      'labels': { section: 'Institutions', label: 'Labels' },
      'tiers': { section: 'Institutions', label: 'Tiers' },
      'assignments': { section: 'Institutions', label: 'Tier Assignments' },
      'ranks': { section: 'User Management', label: 'Ranks' },
      'titles': { section: 'User Management', label: 'Titles' },
      'institutions': { section: 'Institutions', label: 'Institutions Directories' },
      'user-extensions': { section: 'User Management', label: 'User Extensions' },
      'allocation-requests': { section: 'House Allocation', label: 'Requests' },
      'queue-management': { section: 'House Allocation', label: 'Queue Management' },
      'queue-by-institution': { section: 'House Allocation', label: 'Queue by Institution' }, // ✅ New breadcrumb
    };

    const entry = metadata[tab] || { section: 'FHC', label: 'Admin Panel' };
    
    if (breadcrumbSection) {
      breadcrumbSection.textContent = entry.section;
    }
    breadcrumbLabel.textContent = entry.label;
  }
}

export const router = new Router();