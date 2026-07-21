# Allocation Requests Infinite Loop — Bugfix Design

## Overview

The House Allocation Requests module enters an infinite API fetch loop whenever the user navigates to the Allocation Requests tab. The loop is driven by a circular dependency between three collaborating pieces:

1. `renderAllocationRequests()` in `allocationRequests.ts` calls `store.subscribe()` on every invocation, stacking duplicate listeners that never get cleaned up.
2. `store.fetchCurrentUser()`, when called from inside the render function, calls `store.notify()` on completion — which fires every stacked listener and restarts the cycle.
3. `router.ts` registers its own `store.subscribe()` listener that calls `handleRoute(store.activeTab)` on every notification, and `handleRoute` calls `syncWithBackend()` which also calls `notify()` after a successful sync.

The fix introduces a proper module lifecycle (`initAllocationRequests` / `cleanupAllocationRequests`) that separates subscription setup from rendering, moves user fetching outside the render path, and applies a debounced re-render to coalesce rapid successive notifications. The router is updated to call the lifecycle functions instead of invoking the render function directly.

---

## Glossary

- **Bug_Condition (C)**: The condition that makes the system enter the infinite loop — navigating to the Allocation Requests tab when `store.currentUser` is null *and* the render function is registered as a store subscriber, causing `store.notify()` to re-enter the render path.
- **Property (P)**: The desired behavior when the bug condition holds — the module renders exactly once per store change cycle, fetches the current user at most once (from outside the render loop), and registers exactly one store subscription for its entire lifetime.
- **Preservation**: All existing behaviors outside the bug scope that must remain unchanged — other tab rendering, mock-mode display, `syncWithBackend()` debounce guards, workflow action buttons, and `cleanupAllocationRequests()` flag resets.
- **`renderAllocationRequests()`**: The function in `src/js/modules/allocationRequests.ts` that builds and inserts the allocation requests HTML into `#main-content-area`. After the fix it is a pure render function; it does not subscribe to the store or fetch user data.
- **`initAllocationRequests()`**: The new lifecycle entry point (to be created) that registers exactly one store subscription, fetches the current user if needed, and calls `renderAllocationRequests()` as the subscription callback.
- **`cleanupAllocationRequests()`**: The new lifecycle teardown function (to be created / completed) that unsubscribes from the store, cancels any pending debounce timer, and resets the `isRendering` and `isFetchingUser` module-level flags.
- **`store.subscribe(listener)`**: The reactive subscription API on the global store. Returns an unsubscribe function. Each call adds a new entry to `store.listeners`.
- **`store.notify()`**: Saves state to localStorage and then synchronously iterates `store.listeners`, calling every registered callback.
- **`storeUnsubscribe`**: A module-level variable that holds the unsubscribe function returned by the single `store.subscribe()` call in `initAllocationRequests()`.
- **`renderTimeout`**: A module-level `setTimeout` handle used to debounce re-renders triggered by store notifications.
- **isBugCondition(state)**: A function that returns `true` when the preconditions for the infinite loop are present (see Bug Details).

---

## Bug Details

### Bug Condition

The infinite loop manifests when a user navigates to the Allocation Requests tab in API mode under the following concurrent conditions:

- `store.currentUser` is `null` at the time `renderAllocationRequests()` is first called.
- `renderAllocationRequests()` is invoked directly by the router on every `store.notify()` (because the router's own subscriber calls `handleRoute(store.activeTab)` on every notification).
- Each call to `renderAllocationRequests()` would have called `store.subscribe()` again (though the current code has this commented out, the fetch-from-inside-render path re-enters through the router's subscriber).

**Formal Specification:**

```
FUNCTION isBugCondition(state)
  INPUT: state — current application state snapshot
  OUTPUT: boolean

  RETURN state.currentUser IS NULL
         AND state.activeTab = 'allocation-requests'
         AND renderAllocationRequests IS registered as a store subscriber
             (directly or via router.handleRoute)
         AND store.notify() is reachable from within the render execution path
         -- i.e., fetchCurrentUser() or syncWithBackend() can be called
         --      and will call notify() on completion
END FUNCTION
```

### Examples

| Scenario | Expected (correct) | Actual (buggy) |
|---|---|---|
| Navigate to Allocation Requests tab, user not yet loaded | Single `/auth/me` request, loading spinner shown, then one render after user loads | Continuous `/auth/me` and `/house-allocation-requests` requests; page freezes |
| Navigate to Allocation Requests tab, user already loaded | Immediate single render of requests list | One clean render (this path is less affected but still accumulates subscriptions on repeated visits) |
| Navigate away from Allocation Requests tab, then back | Previous subscription cleaned up; exactly one new subscription registered | Dead subscriptions from previous visits accumulate; each fires on every notify |
| `store.notify()` fires while on Allocation Requests tab after fix | Re-render is debounced; render function called at most once per debounce window | Re-render called once per listener in the growing stack |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Mouse clicks on workflow action buttons (Start Deputy Review, Submit Decision, etc.) must continue to trigger the correct API action and update the UI.
- All other tabs (Dashboard, Institutions, Categories, etc.) must continue to render correctly without interference from the Allocation Requests module's subscription.
- When `store.currentUser` is already populated before navigating to the tab, the requests list must render immediately without a loading state or additional `/auth/me` fetch.
- `store.syncWithBackend()` must continue to debounce repeated calls using the existing `isSyncing` and `syncTimeout` flags — these flags must not be touched by the allocation requests fix.
- In mock mode (`store.apiMode === 'mock'`), no HTTP requests must be made; mock data must continue to display correctly.
- `cleanupAllocationRequests()` must clear the active store subscription, cancel any pending render timeout, and reset the `isRendering` and `isFetchingUser` module-level flags, exactly as required by requirement 3.4.

**Scope:**

All inputs and interactions that do NOT involve the subscribe/notify cycle within the Allocation Requests module's render path are completely unaffected by this fix. Specifically:

- Navigation to any tab other than `allocation-requests`
- Mouse and touch interactions with rendered request cards
- `store.setActiveTab()` calls for non-allocation-requests tabs
- All mock-mode flows

---

## Hypothesized Root Cause

Based on direct inspection of `allocationRequests.ts`, `router.ts`, and `store.ts`, the root causes in descending order of severity are:

1. **Router re-renders on every `store.notify()`**: `router.ts` registers a single persistent `store.subscribe()` that calls `handleRoute(store.activeTab)` on every notification. `handleRoute` calls `syncWithBackend()` (which calls `notify()` on completion) and then calls `renderAllocationRequests()`. This means any `notify()` — including the one emitted by `fetchCurrentUser()` — causes a full route re-render.

2. **User fetch triggered from inside the render path**: When `store.currentUser` is null, `renderAllocationRequests()` calls `store.fetchCurrentUser()`. That method calls `store.notify()` on both success and failure (lines `this.notify()` in `fetchCurrentUser`). This notify fires the router's subscriber, which calls `handleRoute('allocation-requests')`, which calls `syncWithBackend()`, which fires another `notify()` — completing the cycle.

3. **No cleanup on tab navigation**: The router calls `renderAllocationRequests()` (or will call `initAllocationRequests()` after fix) but never calls `cleanupAllocationRequests()` before switching to a different tab. Any subscriptions registered by a prior visit to the tab are never removed.

4. **`isRendering` flag is not sufficient**: The existing `isRendering` guard prevents simultaneous re-entrant render calls within the same call stack, but does not protect against asynchronous re-entry through `store.notify()` callbacks scheduled via `setTimeout` (the `fetchCurrentUser` `.then(() => setTimeout(() => renderAllocationRequests(), 100))` path).

5. **`syncWithBackend()` is called on every route change including repeat visits**: Every `handleRoute()` call (including those triggered by `notify()`) calls `syncWithBackend()`. Although `syncWithBackend()` has its own `isSyncing` guard, the `100ms` debounce timer resets on each call, meaning rapid successive `handleRoute()` calls keep delaying the sync and calling `notify()` each time the timer finally fires.

---

## Correctness Properties

Property 1: Bug Condition — Single Subscription and No Re-entrant Render

_For any_ application state where the user navigates to the Allocation Requests tab (i.e., `isBugCondition(state)` returns true — `store.currentUser` is null and the tab is active), the fixed `initAllocationRequests()` function SHALL register exactly one store subscription (not one per render call), fetch the current user exactly once from outside the render function, and invoke `renderAllocationRequests()` at most once per store change cycle via a debounced callback — ensuring no re-entrant render loop occurs regardless of how many times `store.notify()` is called during the user fetch.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation — Non-Allocation-Requests Behavior Unchanged

_For any_ application state where the bug condition does NOT hold (i.e., `isBugCondition(state)` returns false — the active tab is not `allocation-requests`, OR the module has been cleaned up, OR `store.currentUser` is already populated), the fixed code SHALL produce exactly the same observable behavior as the original code: other tabs render identically, `store.syncWithBackend()` guards behave identically, mock-mode produces no HTTP requests, and workflow action button handlers execute unchanged.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct:

**File**: `src/js/modules/allocationRequests.ts`

**Changes**:

1. **Add module-level `storeUnsubscribe` variable**: Add `let storeUnsubscribe: (() => void) | null = null;` to the module-level state block. This holds the single unsubscribe function returned by `store.subscribe()`.

2. **Create `initAllocationRequests()` export**:
   - Call `cleanupAllocationRequests()` first to remove any leftover subscription from a previous visit.
   - Register a single `store.subscribe()` call. The listener must debounce calls to `renderAllocationRequests()` using `renderTimeout` (clear previous timeout, set new one with ~50ms delay).
   - Store the returned unsubscribe function in `storeUnsubscribe`.
   - If `store.currentUser` is null AND `!isFetchingUser`, set `isFetchingUser = true` and call `store.fetchCurrentUser()`. Do NOT call `renderAllocationRequests()` from inside the `.then()` callback — the store subscription will handle re-rendering when `notify()` fires after the fetch completes.
   - Call `renderAllocationRequests()` once immediately (for the case where user is already loaded).

3. **Remove user-fetch logic from `renderAllocationRequests()`**: The block that checks `!store.currentUser` and calls `store.fetchCurrentUser()` must be removed from `renderAllocationRequests()`. The function becomes a pure renderer — if user is still null when it's called, it shows the loading spinner and returns early without initiating any fetch.

4. **Create `cleanupAllocationRequests()` export**:
   - Call `storeUnsubscribe?.()` and set `storeUnsubscribe = null`.
   - Call `clearTimeout(renderTimeout)` and set `renderTimeout = null`.
   - Set `isRendering = false` and `isFetchingUser = false`.

5. **Remove `window.retryRenderAllocationRequests`** global or update it to call `initAllocationRequests()` instead of `renderAllocationRequests()` directly.

**File**: `src/js/router.ts`

**Changes**:

6. **Update import**: Add `initAllocationRequests` and `cleanupAllocationRequests` to the import from `./modules/allocationRequests`. Remove or keep `renderAllocationRequests` import based on whether it is used elsewhere.

7. **Update `routes` map**: Replace the `'allocation-requests': renderAllocationRequests` entry with `'allocation-requests': initAllocationRequests`.

8. **Add cleanup on tab change**: In `handleRoute()`, before calling the new render function, check if the previous tab was `'allocation-requests'` and the new tab is different — if so, call `cleanupAllocationRequests()`. Alternatively, track the active route and call the appropriate cleanup whenever a route changes away from a module that registered a subscription. The minimal targeted fix is to call `cleanupAllocationRequests()` at the start of `handleRoute()` whenever `tab !== 'allocation-requests'`.

9. **Guard against router re-rendering on non-tab-change notifications**: The router's `store.subscribe()` currently calls `handleRoute(store.activeTab)` on every notification — including notifications triggered by data fetches on the current tab. Consider adding a guard: only re-render if `store.activeTab` actually changed since the last render, or use a debounce similar to the module-level approach.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first, surface counterexamples demonstrating the bug on unfixed code to confirm root cause analysis; then verify the fix closes the loop and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the infinite loop BEFORE implementing the fix. Confirm or refute the root cause analysis. If refuted, re-hypothesize.

**Test Plan**: Write unit tests that mock `store.subscribe`, `store.notify`, and `store.fetchCurrentUser`. Simulate navigation to the Allocation Requests tab with `currentUser = null`, fire the callbacks as the real runtime would, and observe whether the render function is called more than once. Run these tests against the UNFIXED code.

**Test Cases**:

1. **Subscription accumulation test**: Call `renderAllocationRequests()` three times sequentially. Assert that `store.listeners.length` is 3 after each call (demonstrating the stacking). On the fix, assert it stays at 1 after any number of `initAllocationRequests()` calls.

2. **Fetch-triggered re-render test**: With `store.currentUser = null`, call `renderAllocationRequests()`. Capture the `fetchCurrentUser` call, resolve it, and observe whether `renderAllocationRequests` is called again (it will be on unfixed code via the router subscriber). On fixed code, the re-render should come from the debounced subscriber, not from inside `renderAllocationRequests` itself.

3. **Router re-entry test**: Simulate the router setup (`store.subscribe` calling `handleRoute`). Navigate to `allocation-requests`, then fire `store.notify()` manually. On unfixed code, assert `renderAllocationRequests` is called again. On fixed code, assert `initAllocationRequests` is NOT called again (because the router guard prevents redundant re-renders for the same active tab).

4. **Tab navigation cleanup test**: Navigate to `allocation-requests`, then navigate to `dashboard`. Assert `store.listeners` no longer contains the allocation-requests subscription after cleanup. On unfixed code, the subscription remains.

**Expected Counterexamples (unfixed code)**:

- `store.listeners.length > 1` after multiple renders of the allocation-requests tab.
- `renderAllocationRequests` call count exceeds 1 per navigation event.
- Possible causes confirmed: router subscriber fires on every `notify()`, `fetchCurrentUser` calls `notify()` on completion, no cleanup on tab change.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**

```
FOR ALL state WHERE isBugCondition(state) DO
  simulate navigation to 'allocation-requests'
  result := observeRenderCallCount(state, fixedCode)
  ASSERT result.subscriptionCount = 1
  ASSERT result.renderCallCount <= 1 per notify() cycle
  ASSERT result.fetchCurrentUserCallCount <= 1 during init
  ASSERT result.networkRequestCount(url='/auth/me') <= 1 per navigation
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**

```
FOR ALL state WHERE NOT isBugCondition(state) DO
  ASSERT fixedCode.handleRoute(state.tab) = originalCode.handleRoute(state.tab)
         FOR tab IN ['dashboard', 'categories', 'institutions', ...]
  ASSERT fixedCode.syncWithBackend() = originalCode.syncWithBackend()
         WITH SAME isSyncing AND syncTimeout behavior
  ASSERT fixedCode.renderAllocationRequests(state WHERE currentUser IS NOT NULL)
         = originalCode.renderAllocationRequests(state WHERE currentUser IS NOT NULL)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It can generate many combinations of store state (various `currentUser` shapes, `apiMode` values, `allocationRequests` array contents) and verify consistent output.
- It catches edge cases like `currentUser` populated but with no roles, empty `allocationRequests` arrays, or rapid successive `notify()` calls during a mock-mode session.
- It provides a strong guarantee that the debounced re-render never fires more than once per debounce window regardless of the number of notifications.

**Test Plan**: Observe current behavior of non-buggy paths (other tabs, mock mode, user-already-loaded path) on unfixed code first, capture expected outputs, then write property tests that assert those outputs are identical on the fixed code.

**Test Cases**:

1. **Other tab rendering preservation**: For each tab key in `['dashboard', 'categories', 'labels', 'tiers', 'ranks', 'institutions', 'user-extensions', 'queue-management']`, call `router.handleRoute(tab)` and assert the correct render function is called exactly once and `cleanupAllocationRequests` is called if the previous tab was `allocation-requests`.

2. **Mock-mode no-HTTP preservation**: With `store.apiMode = 'mock'`, call `initAllocationRequests()`. Assert zero HTTP fetch calls are made and mock allocation requests are rendered from `store.allocationRequests`.

3. **Pre-populated user immediate render**: With `store.currentUser` already set, call `initAllocationRequests()`. Assert `renderAllocationRequests()` is called once synchronously (no loading spinner, no fetch).

4. **Debounce coalescing**: Fire `store.notify()` 10 times in rapid succession. Assert `renderAllocationRequests()` is called at most once (after the debounce timer settles).

5. **Cleanup completeness**: Call `initAllocationRequests()` then `cleanupAllocationRequests()`. Assert `store.listeners` is empty, `renderTimeout` is null, `isRendering === false`, `isFetchingUser === false`.

### Unit Tests

- Test `initAllocationRequests()` registers exactly one subscription regardless of call count.
- Test `renderAllocationRequests()` does NOT call `store.fetchCurrentUser()` under any condition.
- Test `cleanupAllocationRequests()` removes the subscription and resets all module-level flags.
- Test debounce timer: multiple rapid `store.notify()` calls result in a single `renderAllocationRequests()` invocation.
- Test edge case: `initAllocationRequests()` called when `store.currentUser` is null but `isFetchingUser` is already true — should not double-fetch.
- Test edge case: `cleanupAllocationRequests()` called before `initAllocationRequests()` (no subscription registered) — should not throw.

### Property-Based Tests

- Generate random sequences of `store.notify()` calls (count between 1 and 100) within a 50ms window and assert `renderAllocationRequests()` is called ≤ 1 time.
- Generate random store state objects (varying `currentUser`, `allocationRequests`, `apiMode`) and assert `initAllocationRequests()` always results in exactly 1 entry in `store.listeners`.
- Generate random tab navigation sequences and assert `store.listeners` contains at most 1 allocation-requests subscription at any point.
- Generate random `allocationRequests` arrays (0 to 50 items, varied statuses) and assert `renderAllocationRequests()` produces valid HTML containing the correct number of `.request-card` elements when `currentUser` is populated.

### Integration Tests

- Full navigation flow: Start on Dashboard → navigate to Allocation Requests (user null, fetch resolves) → verify single render, no loop → navigate back to Dashboard → verify `cleanupAllocationRequests()` was called → navigate to Allocation Requests again → verify exactly one new subscription registered.
- Mock mode full flow: Set `apiMode = 'mock'` → navigate to Allocation Requests → verify mock data renders immediately, zero HTTP calls made.
- Workflow action button integration: Navigate to Allocation Requests with user loaded → click "Start Deputy Review" on a card → verify the action handler fires once, the UI updates, and no new render loop is triggered.
- Rapid tab switching: Switch between `allocation-requests` and `dashboard` 5 times rapidly → verify `store.listeners` never grows beyond 2 (router's own subscriber + at most one allocation-requests subscriber).
