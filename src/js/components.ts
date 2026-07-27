// Reusable, interactive UI components for FHC Admin Dashboard using Vanilla DOM manipulation.

export interface TableColumn<T> {
  header: string;
  key: keyof T | string;
  render?: (item: T) => string;
  sortable?: boolean;
}

export interface TableOptions<T> {
  containerId: string;
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onSearch?: (query: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  placeholderText?: string;
  searchValue?: string;
  rowClassName?: (item: T) => string;
  firstCellClassName?: (item: T) => string;
}

export class Table {
  public static render<T>(options: TableOptions<T>) {
    const container = document.getElementById(options.containerId);
    if (!container) return;

    const loading = options.loading ?? false;
    const emptyMessage = options.emptyMessage ?? 'No records found.';
    const columns = options.columns;
    const data = options.data;
    const searchValue = options.searchValue ?? '';

    let html = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <!-- Search & Control Header -->
        <div class="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <span class="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input 
              type="text" 
              id="${options.containerId}-search-input"
              class="w-full pl-8 pr-8 py-1.5 bg-slate-100 border-none rounded-full text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="${options.placeholderText || 'Search records...'}"
              value="${searchValue}"
            />
            ${searchValue ? `
              <button id="${options.containerId}-search-clear" class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                <i class="fa-solid fa-circle-xmark text-xs"></i>
              </button>
            ` : ''}
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <i class="fa-solid fa-circle-info text-indigo-500"></i>
            Total: <strong>${data.length}</strong> items
          </div>
        </div>

        <div class="overflow-x-auto relative min-h-[160px]">
          ${loading ? `
            <!-- Loading Indicator -->
            <div class="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10">
              <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="mt-2 text-sm font-medium text-slate-600">Fetching live record stream...</p>
            </div>
          ` : ''}

          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                ${columns.map(col => `
                  <th class="px-6 py-4 font-bold">
                    <div class="flex items-center gap-1.5 ${col.sortable ? 'cursor-pointer hover:text-slate-800' : ''}" data-sort-key="${String(col.key)}">
                      ${col.header}
                      ${col.sortable ? `<i class="fa-solid fa-sort text-slate-300 text-[10px]"></i>` : ''}
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm text-slate-700">
              ${data.length === 0 ? `
                <tr>
                  <td colspan="${columns.length}" class="px-6 py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                      <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-2"></i>
                      <p class="font-medium text-slate-500">${emptyMessage}</p>
                      <p class="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search criteria.</p>
                    </div>
                  </td>
                </tr>
              ` : data.map((item, idx) => {
                const rowClass = options.rowClassName ? options.rowClassName(item) : 'hover:bg-slate-50';
                return `
                  <tr class="transition-colors ${rowClass}">
                    ${columns.map((col, colIdx) => {
                      const cellClass = (colIdx === 0 && options.firstCellClassName) ? options.firstCellClassName(item) : '';
                      return `
                        <td class="px-6 py-4 align-middle ${cellClass}">
                          ${col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        ${options.totalPages && options.totalPages > 1 ? `
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div class="text-xs text-slate-500">
              Page <strong>${options.currentPage}</strong> of <strong>${options.totalPages}</strong>
            </div>
            <div class="flex items-center gap-1.5">
              <button 
                id="${options.containerId}-btn-prev"
                class="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs"
                ${options.currentPage === 1 ? 'disabled' : ''}
              >
                <i class="fa-solid fa-chevron-left mr-1"></i> Previous
              </button>
              <button 
                id="${options.containerId}-btn-next"
                class="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs"
                ${options.currentPage === options.totalPages ? 'disabled' : ''}
              >
                Next <i class="fa-solid fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;

    // Attach search event
    const searchInput = document.getElementById(`${options.containerId}-search-input`) as HTMLInputElement;
    if (searchInput && options.onSearch) {
      // Debounce slightly or run on input change
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        options.onSearch!(query);
      });
    }

    const clearBtn = document.getElementById(`${options.containerId}-search-clear`);
    if (clearBtn && options.onSearch) {
      clearBtn.addEventListener('click', () => {
        options.onSearch!('');
      });
    }

    // Attach column sorting
    const headers = container.querySelectorAll('[data-sort-key]');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const sortKey = header.getAttribute('data-sort-key');
        if (sortKey && options.onSort) {
          options.onSort(sortKey, 'asc'); // Keep simplified
        }
      });
    });

    // Attach pagination events
    const prevBtn = document.getElementById(`${options.containerId}-btn-prev`);
    const nextBtn = document.getElementById(`${options.containerId}-btn-next`);

    if (prevBtn && options.currentPage && options.onPageChange) {
      prevBtn.addEventListener('click', () => {
        if (options.currentPage! > 1) {
          options.onPageChange!(options.currentPage! - 1);
        }
      });
    }

    if (nextBtn && options.currentPage && options.onPageChange) {
      nextBtn.addEventListener('click', () => {
        if (options.currentPage! < options.totalPages!) {
          options.onPageChange!(options.currentPage! + 1);
        }
      });
    }
  }
}

export interface ModalOptions {
  title: string;
  content: string; // HTML format
  onConfirm?: (modalElement: HTMLElement) => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  isForm?: boolean;
  onOpen?: (modalElement: HTMLElement) => void | Promise<void>;
}

export class Modal {
  public static open(options: ModalOptions) {
    // Remove existing modal if any
    const existing = document.getElementById('global-modal-wrapper');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'global-modal-wrapper';
    wrapper.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in';

    const modalHTML = `
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col transform transition-all scale-100 overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-white">
          <h3 class="text-sm font-bold tracking-tight text-slate-900">${options.title}</h3>
          <button id="modal-close-btn" class="text-slate-400 hover:text-slate-600 focus:outline-hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-6 overflow-y-auto flex-1">
          ${options.isForm ? `<form id="modal-form" class="space-y-4">${options.content}</form>` : options.content}
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-end gap-3">
          <button 
            id="modal-cancel-btn" 
            class="px-4 py-2 text-xs font-bold tracking-wider uppercase border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            ${options.cancelText || 'Cancel'}
          </button>
          <button 
            id="modal-confirm-btn" 
            class="px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center gap-1.5"
          >
            <span id="modal-confirm-spinner" class="hidden w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span id="modal-confirm-text">${options.confirmText || 'Confirm'}</span>
          </button>
        </div>
      </div>
    `;

    wrapper.innerHTML = modalHTML;
    document.body.appendChild(wrapper);

    if (options.onOpen) {
      options.onOpen(wrapper);
    }

    // Event hooks
    const close = () => {
      wrapper.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => wrapper.remove(), 200);
    };

    const closeBtn = wrapper.querySelector('#modal-close-btn');
    const cancelBtn = wrapper.querySelector('#modal-cancel-btn');
    const confirmBtn = wrapper.querySelector('#modal-confirm-btn') as HTMLButtonElement;
    const spinner = wrapper.querySelector('#modal-confirm-spinner');
    const confirmTextSpan = wrapper.querySelector('#modal-confirm-text');

    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);
    wrapper.addEventListener('click', (e) => {
      if (e.target === wrapper) close();
    });

    if (options.onConfirm) {
      confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Trigger default HTML5 form validation if there is a form
        const form = wrapper.querySelector('#modal-form') as HTMLFormElement;
        if (options.isForm && form && !form.checkValidity()) {
          form.reportValidity();
          return;
        }

        try {
          confirmBtn.disabled = true;
          spinner?.classList.remove('hidden');
          if (confirmTextSpan) confirmTextSpan.textContent = 'Processing...';

          await options.onConfirm!(wrapper);
          close();
        } catch (error: any) {
          console.error(error);
          Toast.error(error.message || 'Action failed');
        } finally {
          confirmBtn.disabled = false;
          spinner?.classList.add('hidden');
          if (confirmTextSpan) confirmTextSpan.textContent = options.confirmText || 'Confirm';
        }
      });
    } else {
      confirmBtn.addEventListener('click', close);
    }
  }

  public static close() {
    const existing = document.getElementById('global-modal-wrapper');
    if (existing) {
      existing.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => existing.remove(), 200);
    }
  }
}

export class Toast {
  private static getContainer(): HTMLElement {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none';
      document.body.appendChild(container);
    }
    return container;
  }

  public static show(text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    const container = this.getContainer();
    const id = `toast-${Date.now()}`;

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border border-slate-100 transform translate-y-2 opacity-0 pointer-events-auto transition-all duration-300';

    let iconHTML = '';
    let borderClass = '';

    if (type === 'success') {
      iconHTML = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg mt-0.5"></i>';
      borderClass = 'border-l-4 border-l-emerald-500';
    } else if (type === 'error') {
      iconHTML = '<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg mt-0.5"></i>';
      borderClass = 'border-l-4 border-l-rose-500';
    } else if (type === 'warning') {
      iconHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg mt-0.5"></i>';
      borderClass = 'border-l-4 border-l-amber-500';
    } else {
      iconHTML = '<i class="fa-solid fa-circle-info text-blue-500 text-lg mt-0.5"></i>';
      borderClass = 'border-l-4 border-l-blue-500';
    }

    toast.className += ` ${borderClass}`;
    toast.innerHTML = `
      <div class="flex-shrink-0">${iconHTML}</div>
      <div class="flex-1 text-sm font-medium text-slate-800 pr-4">${text}</div>
      <button onclick="this.parentElement.remove()" class="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    `;

    container.appendChild(toast);

    // Trigger entering animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  public static success(text: string) {
    this.show(text, 'success');
  }

  public static error(text: string) {
    this.show(text, 'error');
  }

  public static warning(text: string) {
    this.show(text, 'warning');
  }

  public static info(text: string) {
    this.show(text, 'info');
  }
}
