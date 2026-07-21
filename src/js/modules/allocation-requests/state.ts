// Module State Management

// State variables (private to this module)
let _isRendering = false;
let _isFetchingUser = false;
let _renderTimeout: number | null = null;
let _storeUnsubscribe: (() => void) | null = null;
let _currentFilter = 'all';
let _searchQuery = '';

// Getter functions
export const isRendering = () => _isRendering;
export const isFetchingUser = () => _isFetchingUser;
export const renderTimeout = () => _renderTimeout;
export const storeUnsubscribe = () => _storeUnsubscribe;
export const currentFilter = () => _currentFilter;
export const searchQuery = () => _searchQuery;

// Setter functions
export const setIsRendering = (value: boolean) => { _isRendering = value; };
export const setIsFetchingUser = (value: boolean) => { _isFetchingUser = value; };
export const setRenderTimeout = (value: number | null) => { _renderTimeout = value; };
export const setStoreUnsubscribe = (value: (() => void) | null) => { _storeUnsubscribe = value; };
export const setCurrentFilter = (value: string) => { _currentFilter = value; };
export const setSearchQuery = (value: string) => { _searchQuery = value; };
