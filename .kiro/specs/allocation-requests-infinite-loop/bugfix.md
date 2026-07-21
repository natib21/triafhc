# Bugfix Requirements Document

## Introduction

The House Allocation Requests module triggers an infinite API fetch loop when navigated to. The browser continuously sends requests to the backend, causing the application to become unresponsive or crash. The root cause is a circular dependency: `renderAllocationRequests()` subscribes to store changes on every invocation, and every store notification triggers a new render, which re-subscribes and triggers yet another notification. Additionally, fetching the current user inside the render function calls `store.notify()` on completion, feeding back into the same cycle. This bug affects all users who navigate to the Allocation Requests tab in API mode.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user navigates to the Allocation Requests tab THEN the system calls `store.subscribe()` inside `renderAllocationRequests()` on every render, stacking up duplicate listeners indefinitely.

1.2 WHEN `store.currentUser` is null at render time THEN the system calls `store.fetchCurrentUser()` from within `renderAllocationRequests()`, which on completion calls `store.notify()`, which re-triggers all store subscribers including the stacked render listeners, restarting the loop.

1.3 WHEN the router handles the `allocation-requests` route THEN the system calls `renderAllocationRequests()` directly, which cannot manage its own subscription lifecycle, so navigating away does not clean up the registered store listeners.

1.4 WHEN the infinite loop is active THEN the system sends endless HTTP requests to `/house-allocation-requests` and `/auth/me`, causing the browser's network tab to fill with repeated requests and the page to become unresponsive.

### Expected Behavior (Correct)

2.1 WHEN the user navigates to the Allocation Requests tab THEN the system SHALL register exactly one store subscription for the module, not a new one on every render call.

2.2 WHEN `store.currentUser` is null at render time THEN the system SHALL trigger a user fetch from outside the render loop (in an init function) so that the resulting `store.notify()` does not re-enter `renderAllocationRequests()` through a stacked listener.

2.3 WHEN the router handles the `allocation-requests` route THEN the system SHALL call `initAllocationRequests()` (not `renderAllocationRequests()` directly) so that subscription setup is done once, and SHALL call `cleanupAllocationRequests()` when navigating away to remove the listener.

2.4 WHEN store state changes after the module is initialized THEN the system SHALL re-render the Allocation Requests view exactly once per change cycle, using a debounced re-render to coalesce rapid successive notifications.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user navigates to any other tab (Dashboard, Institutions, etc.) THEN the system SHALL CONTINUE TO render that tab correctly without interference from the Allocation Requests module.

3.2 WHEN `store.currentUser` is already populated before navigating to the Allocation Requests tab THEN the system SHALL CONTINUE TO render the full requests list immediately without a loading state or additional fetch.

3.3 WHEN the store's `syncWithBackend()` method is called THEN the system SHALL CONTINUE TO debounce and guard against re-entrant calls using the existing `isSyncing` and `syncTimeout` flags.

3.4 WHEN `cleanupAllocationRequests()` is called THEN the system SHALL CONTINUE TO clear the active store subscription, cancel any pending render timeout, and reset the `isRendering` and `isFetchingUser` module-level flags.

3.5 WHEN the user clicks a workflow action button (e.g., Start Deputy Review, Submit Decision) on a request card THEN the system SHALL CONTINUE TO perform the correct action and update the UI without triggering a full re-render loop.

3.6 WHEN the application runs in mock mode THEN the system SHALL CONTINUE TO display mock allocation requests without making any HTTP requests to the backend.
