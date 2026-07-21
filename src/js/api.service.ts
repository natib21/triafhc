// Reusable enterprise API Service with Bearer Auth and seamless local/mock bypass for testing.
import { store } from './store';

export class ApiService {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  public updateToken(newToken: string) {
    this.token = newToken;
  }

  public updateBaseURL(newURL: string) {
    this.baseURL = newURL;
  }

  /**
   * General request wrapper with Bearer token authentication
   */
  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // If store is in mock mode, bypass real fetch and simulate responses.
    // This allows full standalone testing of all 10 modules in the iframe.
    if (store && store.apiMode === 'mock') {
      return this.handleMockRequest<T>(endpoint, options);
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error (Status: ${response.status})`);
    }

    const contentType = response.headers.get('content-type');
    let result: any;
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          result = { message: text } as any;
        }
      } else {
        result = {} as any;
      }
    }

    // Automatically sync store lists after mutation so the UI displays the updated live data immediately.
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET' && store && typeof store.syncWithBackend === 'function') {
      await store.syncWithBackend(true);
    }

    return result as T;
  }

  // Helper methods
  public async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
  
 public async patch<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  /**
   * Emulate the REST backend locally using the Store's data lists.
   * This implements complete CRUD logic so that all 10 endpoints work perfectly.
   */
  private async handleMockRequest<T = any>(endpoint: string, options: RequestInit): Promise<T> {
    // Artificial latency for a premium production feel
    await new Promise((resolve) => setTimeout(resolve, 350));

    const method = options.method || 'GET';
    const cleanEndpoint = endpoint.split('?')[0];
    const pathParts = cleanEndpoint.split('/').filter(Boolean);

    const resource = pathParts[0];
    const id = pathParts[1];

    const body = typeof options.body === 'string' ? JSON.parse(options.body) : null;

    // 1. Categories
    if (resource === 'categories') {
      if (method === 'GET') {
        if (id) {
          const item = store.categories.find(c => c.id === id);
          if (!item) throw new Error('Category not found');
          return item as any;
        }
        return store.categories as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `cat-${Date.now()}`,
          ...body,
        };
        store.categories.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.categories.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Category not found');
        store.categories[index] = { ...store.categories[index], ...body };
        store.saveStateToStorage();
        return store.categories[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.categories = store.categories.filter(c => c.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 2. Labels
    if (resource === 'institution-labels') {
      if (method === 'GET') {
        if (id) {
          const item = store.labels.find(l => l.id === id);
          if (!item) throw new Error('Label not found');
          return item as any;
        }
        return store.labels as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `lbl-${Date.now()}`,
          ...body,
        };
        store.labels.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.labels.findIndex(l => l.id === id);
        if (index === -1) throw new Error('Label not found');
        store.labels[index] = { ...store.labels[index], ...body };
        store.saveStateToStorage();
        return store.labels[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.labels = store.labels.filter(l => l.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 3. Tiers
    if (resource === 'institution-tiers') {
      if (method === 'GET') {
        if (id) {
          const item = store.tiers.find(t => t.id === id);
          if (!item) throw new Error('Tier not found');
          return item as any;
        }
        return store.tiers as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `tier-${Date.now()}`,
          ...body,
        };
        store.tiers.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.tiers.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Tier not found');
        store.tiers[index] = { ...store.tiers[index], ...body };
        store.saveStateToStorage();
        return store.tiers[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.tiers = store.tiers.filter(t => t.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 4. Ranks
    if (resource === 'ranks') {
      if (method === 'GET') {
        if (id) {
          const item = store.ranks.find(r => r.id === id);
          if (!item) throw new Error('Rank not found');
          return item as any;
        }
        return store.ranks as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `rnk-${Date.now()}`,
          ...body,
        };
        store.ranks.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.ranks.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Rank not found');
        store.ranks[index] = { ...store.ranks[index], ...body };
        store.saveStateToStorage();
        return store.ranks[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.ranks = store.ranks.filter(r => r.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 5. Tier Assignments
    if (resource === 'tier-assignments') {
      if (method === 'GET') {
        if (id) {
          const item = store.assignments.find(a => a.id === id);
          if (!item) throw new Error('Assignment not found');
          return item as any;
        }
        return store.assignments as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `asg-${Date.now()}`,
          ...body,
        };
        store.assignments.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.assignments.findIndex(a => a.id === id);
        if (index === -1) throw new Error('Assignment not found');
        store.assignments[index] = { ...store.assignments[index], ...body };
        store.saveStateToStorage();
        return store.assignments[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.assignments = store.assignments.filter(a => a.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 6. Titles
    if (resource === 'titles') {
      if (method === 'GET') {
        if (id) {
          const item = store.titles.find(t => t.id === id);
          if (!item) throw new Error('Title not found');
          return item as any;
        }
        return store.titles as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `tit-${Date.now()}`,
          ...body,
        };
        store.titles.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.titles.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Title not found');
        store.titles[index] = { ...store.titles[index], ...body };
        store.saveStateToStorage();
        return store.titles[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.titles = store.titles.filter(t => t.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 7. Institutions
    if (resource === 'institutions') {
      if (method === 'GET') {
        if (id) {
          const item = store.institutions.find(i => i.id === id);
          if (!item) throw new Error('Institution not found');
          return item as any;
        }
        return store.institutions as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `inst-${Date.now()}`,
          ...body,
        };
        store.institutions.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.institutions.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Institution not found');
        store.institutions[index] = { ...store.institutions[index], ...body };
        store.saveStateToStorage();
        return store.institutions[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.institutions = store.institutions.filter(i => i.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 8. User Extensions
    if (resource === 'user-extensions') {
      if (method === 'GET') {
        if (id) {
          const item = store.userExtensions.find(u => u.id === id);
          if (!item) throw new Error('User extension not found');
          return item as any;
        }
        return store.userExtensions as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `ext-${Date.now()}`,
          ...body,
        };
        store.userExtensions.push(newItem);
        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.userExtensions.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User extension not found');
        store.userExtensions[index] = { ...store.userExtensions[index], ...body };
        store.saveStateToStorage();
        return store.userExtensions[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.userExtensions = store.userExtensions.filter(u => u.id !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 9. House Allocation Requests
    if (resource === 'house-allocation-requests') {
      if (method === 'GET') {
        if (id) {
          const item = store.allocationRequests.find(h => h.id === id);
          if (!item) throw new Error('Request not found');
          return item as any;
        }
        return store.allocationRequests as any;
      }
      if (method === 'POST') {
        const newItem = {
          id: `req-${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...body,
        };
        store.allocationRequests.push(newItem);
        
        // Also automatically add to Queue as "QUEUED"
        const queuePos = store.allocationQueue.length > 0 
          ? Math.max(...store.allocationQueue.map(q => q.position)) + 1 
          : 1;

        store.allocationQueue.push({
          id: `q-${Date.now()}`,
          requestId: newItem.id,
          position: queuePos,
          priority: newItem.priority,
          status: 'QUEUED',
          createdAt: newItem.createdAt,
        });

        store.saveStateToStorage();
        return newItem as any;
      }
      if (method === 'PUT' && id) {
        const index = store.allocationRequests.findIndex(h => h.id === id);
        if (index === -1) throw new Error('Request not found');
        store.allocationRequests[index] = { ...store.allocationRequests[index], ...body };
        store.saveStateToStorage();
        return store.allocationRequests[index] as any;
      }
      if (method === 'DELETE' && id) {
        store.allocationRequests = store.allocationRequests.filter(h => h.id !== id);
        store.allocationQueue = store.allocationQueue.filter(q => q.requestId !== id);
        store.saveStateToStorage();
        return { success: true } as any;
      }
    }

    // 10. House Allocation Queue (and custom actions)
    if (resource === 'house-allocation-queue') {
      if (method === 'GET') {
        if (id === 'next') {
          // Return the next item queued
          const nextItem = store.allocationQueue
            .filter(q => q.status === 'QUEUED')
            .sort((a, b) => a.position - b.position)[0];
          if (!nextItem) throw new Error('No items remaining in queue');
          return nextItem as any;
        }
        if (id === 'position' && pathParts[2]) {
          const reqId = pathParts[2];
          const qItem = store.allocationQueue.find(q => q.requestId === reqId && q.status === 'QUEUED');
          if (!qItem) {
            throw new Error('This request is not active or has been resolved');
          }
          const waitingAhead = store.allocationQueue
            .filter(q => q.status === 'QUEUED' && q.position < qItem.position).length;
          
          return {
            requestId: reqId,
            position: waitingAhead + 1,
            estimatedWaitDays: (waitingAhead + 1) * 14, // 14 days per position estimate
          } as any;
        }
        // Return full queue list
        return store.allocationQueue as any;
      }

      if (method === 'POST') {
        const action = pathParts[2]; // allocate or reject
        const queueItemId = id;

        const qItemIndex = store.allocationQueue.findIndex(q => q.id === queueItemId);
        if (qItemIndex === -1) throw new Error('Queue item not found');

        const qItem = store.allocationQueue[qItemIndex];

        if (action === 'allocate') {
          store.allocationQueue[qItemIndex].status = 'ALLOCATED';
          
          // Also set the main request status to APPROVED / COMPLETED
          const reqIdx = store.allocationRequests.findIndex(r => r.id === qItem.requestId);
          if (reqIdx !== -1) {
            store.allocationRequests[reqIdx].status = 'COMPLETED';
          }
          
          // Shift positions of remaining queued items
          this.recalculateQueuePositions();
          store.saveStateToStorage();
          return { success: true, message: 'House allocated and request completed successfully' } as any;
        }

        if (action === 'reject') {
          store.allocationQueue[qItemIndex].status = 'REJECTED';
          store.allocationQueue[qItemIndex].rejectionReason = body?.reason || 'Administrative rejection';

          const reqIdx = store.allocationRequests.findIndex(r => r.id === qItem.requestId);
          if (reqIdx !== -1) {
            store.allocationRequests[reqIdx].status = 'REJECTED';
          }

          this.recalculateQueuePositions();
          store.saveStateToStorage();
          return { success: true, message: 'Request rejected and removed from active queue' } as any;
        }
      }
    }

    throw new Error(`Endpoint not mock-implemented: ${method} /${resource}`);
  }

  private recalculateQueuePositions() {
    const activeItems = store.allocationQueue
      .filter(q => q.status === 'QUEUED')
      .sort((a, b) => a.position - b.position);
    
    activeItems.forEach((item, index) => {
      const idx = store.allocationQueue.findIndex(q => q.id === item.id);
      if (idx !== -1) {
        store.allocationQueue[idx].position = index + 1;
      }
    });
  }
}
