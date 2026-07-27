// Global store and state management for FHC Admin Dashboard
import { ApiService } from './api.service';

export interface Category {
  id: string;
  code: string;
  name: { am: string; en: string };
  description?: { am: string; en: string };
  color: string;
  isActive: boolean;
}

export interface Label {
  id: string;
  code: string;
  name: { am: string; en: string };
  description?: { am: string; en: string };
  color: string;
  isActive: boolean;
}

export interface Tier {
  id: string;
  code: string;
  name: { am: string; en: string };
  priorityLevel: number; // 1-10
  description?: string;
  isActive: boolean;
}

export interface Rank {
  id: string;
  code: string;
  name: string;
  priorityLevel: number;
  description?: string;
  isActive: boolean;
}

export interface Title {
  id: string;
  code: string;
  name: { am: string; en: string };
  description?: string;
  isActive: boolean;
}

export interface TierAssignment {
  id: string;
  institutionId: string;
  tierId: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface RankAssignment {
  id: string;
  userExtensionId: string;
  rankId: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  changeReason?: string;
}

export interface Institution {
  id: string;
  code: string;
  name: { am: string; en: string };
  shortName: string;
  institutionType: 'GOVERNMENT' | 'PRIVATE' | 'NGO';
  categoryId: string;
  labelIds: string[];
  requestCapability: 'SELF' | 'SELF_AND_PROXY' | 'PROXY_ONLY';
  tinNumber: string;
  registrationNumber?: string;
  licenseNumber?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  commercialStructure?: 'Company' | 'PLC' | 'Enterprise';
  isActive: boolean;
}

// ─── CURRENT USER TYPES ──────────────────────────────────────────────

export interface UserRole {
  id: string;
  key: string; // e.g. 'super_admin', 'deputy_ceo', 'director', 'team_leader', 'data_encoder'
}

export interface UserPermission {
  id: string;
  key: string; // e.g. 'can:create:role', 'can:review:house_allocation_deputy'
}

export interface CurrentUser {
  id: string;
  name: { am: string; en: string };
  email: string;
  username: string;
  roles: UserRole[];
  permissions: UserPermission[];
  userType: string;
  status: string;
}

export interface UserExtension {
  id: string;
  userId: string;
  firstName: { en: string; am: string };
  middleName?: { en: string[]; am: string[] };
  lastName: { en: string; am: string };
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  currentAddress?: string;
  nationalIdNumber?: string;
  passportNumber?: string;
  tinNumber?: string;
  institutionId?: string;
  currentRankId?: string;
  currentTitleId?: string;
  fullName?: string;
  email?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    name?: { en: string; am: string };
  };
  institution?: {
    id: string;
    code: string;
    name: { en: string; am: string };
  };
  currentRank?: {
    id: string;
    code: string;
    name: { en: string; am: string };
    priorityLevel: number;
  };
  currentTitle?: {
    id: string;
    code: string;
    name: { en: string; am: string };
  };
  rankAssignments?: RankAssignment[];
  isActive: boolean;
}

export interface Beneficiary {
  id: string;
  fullName: string;
  type: 'Individual' | 'Institution';
  rankId?: string;
  titleId?: string;
}

export interface HouseAllocationRequest {
  id: string;
  referenceNumber: string;
  letterDate: string;
  institutionId: string;
  authorizingOfficial: string;
  registeredDate: string;
  beneficiaries: Beneficiary[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  remarks?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
}

export interface QueueItem {
  id: string;
  requestId: string;
  position: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'QUEUED' | 'ALLOCATED' | 'REJECTED';
  createdAt: string;
  rejectionReason?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}



class Store {
  // Config
  public apiMode: 'mock' | 'api' = 'api';
  public token: string = 'fhc_admin_token_2026';
  public baseURL: string = 'http://localhost:3010/api';
  public apiService!: ApiService;

  // Active state
  public activeTab: string = 'dashboard';
  
  // ─── CURRENT USER ──────────────────────────────────────────────────────
  public currentUser: CurrentUser | null = null;
  
  // ✅ Flags to prevent multiple simultaneous operations
  private isFetchingUser: boolean = false;
  private isSyncing: boolean = false;
  private syncTimeout: any = null;

  // Data lists
  public categories: Category[] = [];
  public labels: Label[] = [];
  public tiers: Tier[] = [];
  public ranks: Rank[] = [];
  public titles: Title[] = [];
  public tierAssignments: TierAssignment[] = [];
  public rankAssignments: RankAssignment[] = [];
  public institutions: Institution[] = [];
  public userExtensions: UserExtension[] = [];
  public allocationRequests: HouseAllocationRequest[] = [];
  public allocationQueue: QueueItem[] = [];

  // Listeners for reactive updates
  private listeners: (() => void)[] = [];

  constructor() {
    // Initialize ApiService first with default values
    this.apiService = new ApiService(this.baseURL, this.token);
    
    // Load state from storage
    this.loadStateFromStorage();
    
    // Update ApiService with any stored config
    this.apiService.updateBaseURL(this.baseURL);
    this.apiService.updateToken(this.token);
    
    if (this.apiMode === 'mock' && this.categories.length === 0) {
      this.seedInitialData();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public notify() {
    this.saveStateToStorage();
    this.listeners.forEach((l) => l());
  }

  // ─── FETCH CURRENT USER ──────────────────────────────────────────────

  public async fetchCurrentUser(): Promise<void> {
    // ✅ Prevent multiple simultaneous fetch attempts
    if (this.isFetchingUser) {
      console.log('fetchCurrentUser: Already fetching, skipping...');
      return;
    }
    
    // ✅ Don't fetch if using mock mode or invalid token
    if (this.apiMode === 'mock') {
      console.log('fetchCurrentUser: Mock mode, skipping fetch');
      return;
    }
    
    // ✅ Don't fetch if token is the default mock token
    if (!this.token || this.token === 'fhc_admin_token_2026') {
      console.log('fetchCurrentUser: No valid token, skipping fetch');
      return;
    }
    
    try {
      this.isFetchingUser = true;
      console.log('fetchCurrentUser: Fetching current user...');
      
      const response = await this.apiService.get('/auth/me');
      
      // Handle different response shapes
      const userData = (response as any)?.data || response;
      
      if (userData) {
        this.currentUser = userData as CurrentUser;
        console.log('fetchCurrentUser: User loaded:', this.currentUser?.email);
        console.log('fetchCurrentUser: Roles:', this.currentUser?.roles);
      } else {
        console.warn('fetchCurrentUser: No user data in response');
        this.currentUser = null;
      }
      
      this.isFetchingUser = false;
      this.notify();
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      this.currentUser = null;
      this.isFetchingUser = false;
      this.notify();
    }
  }

  // ─── USER ROLE HELPERS ──────────────────────────────────────────────

  public getCurrentUserRoleKeys(): string[] {
    const roles = this.currentUser?.roles || [];
    console.log('getCurrentUserRoleKeys:', roles);
    return roles.map(r => (r.key || '').toLowerCase());
  }

  public hasRole(roleKey: string): boolean {
    const keys = this.getCurrentUserRoleKeys();
    const result = keys.includes(roleKey.toLowerCase());
    console.log(`hasRole('${roleKey}'):`, result, 'keys:', keys);
    return result;
  }
  
  public isSuperAdmin(): boolean {
    const result = this.hasRole('super_admin');
    console.log('isSuperAdmin():', result);
    return result;
  }

  public hasPermission(permissionKey: string): boolean {
    const permissions = this.currentUser?.permissions || [];
    return permissions.some(p => (p.key || '').toLowerCase() === permissionKey.toLowerCase());
  }

  public setApiMode(mode: 'mock' | 'api') {
    this.apiMode = mode;
    this.notify();
  }

  public setToken(token: string) {
    this.token = token;
    this.apiService.updateToken(token);
    this.notify();
  }

  public setBaseURL(url: string) {
    this.baseURL = url;
    this.apiService.updateBaseURL(url);
    this.notify();
  }

  public setActiveTab(tab: string) {
    this.activeTab = tab;
    this.notify();
  }

  // ✅ Initialize user fetch from the app
  public async initializeUser(): Promise<void> {
    if (this.apiMode === 'mock') {
      // Set a mock user for mock mode
      this.currentUser = {
        id: 'mock-user',
        name: { am: 'አስተዳዳሪ', en: 'Admin' },
        email: 'admin@fhc.gov.et',
        username: 'admin',
        roles: [
          { id: 'role-1', key: 'super_admin' }
        ],
        permissions: [
          { id: 'perm-1', key: 'can:create:role' },
          { id: 'perm-2', key: 'can:review:house_allocation_deputy' }
        ],
        userType: 'admin',
        status: 'active'
      };
      this.notify();
      return;
    }
    
    await this.fetchCurrentUser();
  }

  // ✅ FIXED: syncWithBackend with debounce and prevention of multiple simultaneous syncs
  public async syncWithBackend(silent: boolean = false): Promise<void> {
    // ✅ Prevent multiple simultaneous sync operations
    if (this.isSyncing) {
      console.log('syncWithBackend: Already syncing, skipping...');
      return;
    }
    
    // ✅ Debounce sync calls
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    return new Promise((resolve) => {
      this.syncTimeout = setTimeout(async () => {
        if (this.apiMode === 'mock') {
          resolve();
          return;
        }
        
        try {
          this.isSyncing = true;
          console.log('syncWithBackend: Starting sync...');
          
          // Get data from API - use Promise.all for parallel requests
          const [
            categoriesResponse,
            labelsResponse,
            tiersResponse,
            ranksResponse,
            titlesResponse,
            tierAssignmentsResponse,
            rankAssignmentsResponse,
            institutionsResponse,
            userExtensionsResponse,
            allocationRequestsResponse,
            allocationQueueResponse
          ] = await Promise.all([
            this.apiService.get('/institutions-categories').catch(() => null),
            this.apiService.get('/institution-labels').catch(() => null),
            this.apiService.get('/institution-tiers').catch(() => null),
            this.apiService.get('/ranks').catch(() => null),
            this.apiService.get('/titles').catch(() => null),
            this.apiService.get('/institution-tier-assignment').catch(() => null),
            this.apiService.get('/rank-assignments').catch(() => null),
            this.apiService.get('/institutions').catch(() => null),
            this.apiService.get('/user-extensions?skip=0&take=50').catch(() => null),
            this.apiService.get('/house-allocation-requests').catch(() => null),
            this.apiService.get('/house-allocation-queue').catch(() => null)
          ]);

          // Extract items from responses
          this.categories = this.extractItems(categoriesResponse);
          this.labels = this.extractItems(labelsResponse);
          this.tiers = this.extractItems(tiersResponse);
          this.ranks = this.extractItems(ranksResponse);
          this.titles = this.extractItems(titlesResponse);
          this.tierAssignments = this.extractItems(tierAssignmentsResponse);
          this.rankAssignments = this.extractItems(rankAssignmentsResponse);
          this.institutions = this.extractItems(institutionsResponse);
          this.userExtensions = this.extractItems(userExtensionsResponse);
          this.allocationRequests = this.extractItems(allocationRequestsResponse);
          this.allocationQueue = this.extractItems(allocationQueueResponse);

          console.log('syncWithBackend: Rank assignments loaded:', this.rankAssignments.length);
          console.log('syncWithBackend: User extensions loaded:', this.userExtensions.length);

          // ✅ Only notify if not silent
          if (!silent) {
            this.notify();
          } else {
            this.saveStateToStorage();
          }
          
          this.isSyncing = false;
          resolve();
        } catch (err) {
          console.error('Failed to sync with backend API:', err);
          this.isSyncing = false;
          resolve();
        }
      }, 100); // 100ms debounce
    });
  }

  // ✅ Helper method to extract items from API response
  private extractItems(response: any): any[] {
    if (!response) return [];
    
    if (Array.isArray(response)) {
      return response;
    }
    
    if (response.items && Array.isArray(response.items)) {
      return response.items;
    }
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    if (typeof response === 'object') {
      const values = Object.values(response);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0];
      }
    }
    
    console.warn('extractItems: Unexpected response format:', response);
    return [];
  }

  // ✅ Rank Assignment Methods
  public async createRankAssignment(data: {
    userExtensionId: string;
    rankId: string;
    startDate: string;
    isCurrent?: boolean;
    changeReason?: string;
  }): Promise<any> {
    if (this.apiMode === 'mock') {
      const newAssignment = {
        id: 'rnk-asg-' + Date.now(),
        ...data,
        endDate: null,
        isCurrent: data.isCurrent !== undefined ? data.isCurrent : true
      };
      this.rankAssignments.push(newAssignment);
      this.notify();
      return newAssignment;
    }

    const response = await this.apiService.post('/rank-assignments', {
      userExtensionId: data.userExtensionId,
      rankId: data.rankId,
      startDate: data.startDate,
      isCurrent: data.isCurrent !== undefined ? data.isCurrent : true,
      changeReason: data.changeReason || 'Initial rank assignment'
    });
    
    await this.syncWithBackend(true);
    return response;
  }

  public async updateRankAssignment(id: string, data: {
    rankId?: string;
    endDate?: string;
    isCurrent?: boolean;
    changeReason?: string;
  }): Promise<any> {
    if (this.apiMode === 'mock') {
      const assignment = this.rankAssignments.find(a => a.id === id);
      if (assignment) {
        Object.assign(assignment, data);
        this.notify();
        return assignment;
      }
      throw new Error('Rank assignment not found');
    }

    const response = await this.apiService.put('/rank-assignments/' + id, data);
    await this.syncWithBackend(true);
    return response;
  }

  public async deleteRankAssignment(id: string): Promise<void> {
    if (this.apiMode === 'mock') {
      this.rankAssignments = this.rankAssignments.filter(a => a.id !== id);
      this.notify();
      return;
    }

    await this.apiService.delete('/rank-assignments/' + id);
    await this.syncWithBackend(true);
  }

  public async getRankAssignmentsByUser(userExtensionId: string): Promise<RankAssignment[]> {
    if (this.apiMode === 'mock') {
      return this.rankAssignments.filter(a => a.userExtensionId === userExtensionId);
    }

    const response = await this.apiService.get('/rank-assignments/user/' + userExtensionId);
    return this.extractItems(response);
  }

  // ✅ Cancel any pending sync
  public cancelSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.isSyncing = false;
  }

  private loadStateFromStorage() {
    try {
      const mode = localStorage.getItem('fhc_api_mode');
      if (mode) {
        this.apiMode = (mode as 'mock' | 'api') || 'api';
      }

      const token = localStorage.getItem('fhc_token');
      if (token) {
        this.token = token;
      }

      const url = localStorage.getItem('fhc_base_url');
      if (url) {
        this.baseURL = url;
      }

      const tab = localStorage.getItem('fhc_active_tab');
      if (tab) this.activeTab = tab;

      const categories = localStorage.getItem('fhc_categories');
      if (categories) this.categories = JSON.parse(categories);

      const labels = localStorage.getItem('fhc_labels');
      if (labels) this.labels = JSON.parse(labels);

      const tiers = localStorage.getItem('fhc_tiers');
      if (tiers) this.tiers = JSON.parse(tiers);

      const ranks = localStorage.getItem('fhc_ranks');
      if (ranks) this.ranks = JSON.parse(ranks);

      const titles = localStorage.getItem('fhc_titles');
      if (titles) this.titles = JSON.parse(titles);

      const tierAssignments = localStorage.getItem('fhc_tier_assignments');
      if (tierAssignments) this.tierAssignments = JSON.parse(tierAssignments);

      const rankAssignments = localStorage.getItem('fhc_rank_assignments');
      if (rankAssignments) this.rankAssignments = JSON.parse(rankAssignments);

      const institutions = localStorage.getItem('fhc_institutions');
      if (institutions) this.institutions = JSON.parse(institutions);

      const extensions = localStorage.getItem('fhc_extensions');
      if (extensions) this.userExtensions = JSON.parse(extensions);

      const requests = localStorage.getItem('fhc_requests');
      if (requests) this.allocationRequests = JSON.parse(requests);

      const queue = localStorage.getItem('fhc_queue');
      if (queue) this.allocationQueue = JSON.parse(queue);
    } catch (e) {
      console.error('Failed to load local state', e);
    }
  }

  public saveStateToStorage() {
    try {
      localStorage.setItem('fhc_api_mode', this.apiMode);
      localStorage.setItem('fhc_token', this.token);
      localStorage.setItem('fhc_base_url', this.baseURL);
      localStorage.setItem('fhc_active_tab', this.activeTab);
      localStorage.setItem('fhc_categories', JSON.stringify(this.categories));
      localStorage.setItem('fhc_labels', JSON.stringify(this.labels));
      localStorage.setItem('fhc_tiers', JSON.stringify(this.tiers));
      localStorage.setItem('fhc_ranks', JSON.stringify(this.ranks));
      localStorage.setItem('fhc_titles', JSON.stringify(this.titles));
      localStorage.setItem('fhc_tier_assignments', JSON.stringify(this.tierAssignments));
      localStorage.setItem('fhc_rank_assignments', JSON.stringify(this.rankAssignments));
      localStorage.setItem('fhc_institutions', JSON.stringify(this.institutions));
      localStorage.setItem('fhc_extensions', JSON.stringify(this.userExtensions));
      localStorage.setItem('fhc_requests', JSON.stringify(this.allocationRequests));
      localStorage.setItem('fhc_queue', JSON.stringify(this.allocationQueue));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  private seedInitialData() {
    // ... (your existing seed data remains the same) ...
    
    // Categories
    this.categories = [
      {
        id: 'cat-1',
        code: 'CAT001',
        name: { am: 'የመንግስት ተቋማት', en: 'Government Institutions' },
        description: { am: 'የፌዴራል እና የክልል የመንግስት ተቋማት', en: 'Federal and Regional government entities' },
        color: '#2E86AB',
        isActive: true,
      },
      {
        id: 'cat-2',
        code: 'CAT002',
        name: { am: 'የልማት ድርጅቶች', en: 'State Owned Enterprises' },
        description: { am: 'የመንግስት የልማት ድርጅቶች እና ኮርፖሬሽኖች', en: 'Government-owned companies and utilities' },
        color: '#F18F01',
        isActive: true,
      },
      {
        id: 'cat-3',
        code: 'CAT003',
        name: { am: 'የዲፕሎማቲክ ተልዕኮዎች', en: 'Diplomatic Missions' },
        description: { am: 'ኤምባሲዎች እና ዓለም አቀፍ ተቋማት', en: 'Embassies and international organizations' },
        color: '#780000',
        isActive: true,
      }
    ];

    // ... (rest of your seed data remains the same) ...
    
    // ✅ Set a mock user for mock mode
    this.currentUser = {
      id: 'mock-user',
      name: { am: 'አስተዳዳሪ', en: 'Admin' },
      email: 'admin@fhc.gov.et',
      username: 'admin',
      roles: [
        { id: 'role-1', key: 'super_admin' }
      ],
      permissions: [
        { id: 'perm-1', key: 'can:create:role' },
        { id: 'perm-2', key: 'can:review:house_allocation_deputy' }
      ],
      userType: 'admin',
      status: 'active'
    };
  }
}

export const store = new Store();