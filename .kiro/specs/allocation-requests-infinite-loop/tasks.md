# Implementation Plan

## Overview

This task list implements the fix for the allocation-requests infinite loop bug using the exploratory bugfix workflow: write the bug condition property test first (to confirm the bug), write the preservation property tests second (to capture baseline behavior), then apply the fix and verify both test sets pass.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Infinite Loop on Allocation Requests Navigation
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the infinite loop / subscription stacking
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases:
    - `store.currentUser = null` AND `store.activeTab = 'allocation-requests'`
    - Simulate the router setup (`store.subscribe` calling `handleRoute`)
    - Call `renderAllocationRequests()` 3 times sequentially (as the router would on repeated notifies)
    - Assert `store.listeners.length === 1` — it will actually be > 1, proving subscription stacking
  - **Test cases to write (run on UNFIXED code):**
    - **Subscription accumulation**: Call `renderAllocationRequests()` three times. Assert `store.listeners.length` grows by one each call (counterexample confirms stacking).
    - **Fetch-triggered re-render**: With `currentUser = null`, call `renderAllocationRequests()`. Capture the `fetchCurrentUser` promise, resolve it, assert `renderAllocationRequests` is called again via the subscriber chain.
    - **Router re-entry**: Set up the real router subscriber (`store.subscribe` → `handleRoute`). Navigate to `allocation-requests`, then fire `store.notify()` manually once. Assert `renderAllocationRequests` is called more than once (loop confirmed).
  - **Expected FAILING counterexamples on unfixed code:**
    - `store.listeners.length` exceeds 1 after multiple renders
    - `renderAllocationRequests` call count exceeds 1 per navigation event
    - `/auth/me` network requests accumulate with each notify cycle
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — this is correct, it proves the bug exists
  - Document counterexamples found to understand root cause (confirm: router fires on every notify, fetchCurrentUser calls notify on completion, no cleanup on tab change)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [~] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Allocation-Requests Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior for non-buggy inputs first
  - **Non-bug-condition cases to observe (isBugCondition returns false):**
    - `store.activeTab !== 'allocation-requests'` (any other tab)
    - `store.currentUser` is already populated before navigating to the tab
    - `store.apiMode === 'mock'`
    - Module has been cleaned up (after `cleanupAllocationRequests()`)
  - **Observations to record on UNFIXED code:**
    - Observe: `router.handleRoute('dashboard')` calls `renderDashboard` exactly once, no interference
    - Observe: `router.handleRoute('categories')` calls `renderCategories` exactly once
    - Observe: With `currentUser` pre-populated, `renderAllocationRequests()` renders the requests list without a fetch
    - Observe: In mock mode, `renderAllocationRequests()` renders mock data, zero HTTP requests made
    - Observe: `store.syncWithBackend()` called twice rapidly — second call is debounced via `isSyncing` guard
    - Observe: After `cleanupAllocationRequests()` is called, `store.listeners` does not contain the module's subscriber
  - **Property-based tests to write (verify PASS on UNFIXED code):**
    - **Other tab rendering**: For all tabs in `['dashboard', 'categories', 'labels', 'tiers', 'ranks', 'institutions', 'user-extensions', 'queue-management']`, `router.handleRoute(tab)` calls the correct render function exactly once
    - **Mock-mode no-HTTP**: For all store states with `apiMode = 'mock'`, zero `fetch` calls are made when `renderAllocationRequests()` is invoked with mock data in `store.allocationRequests`
    - **Pre-populated user immediate render**: For any valid `currentUser` object, `renderAllocationRequests()` renders synchronously without calling `store.fetchCurrentUser()`
    - **syncWithBackend debounce preservation**: For any number N of rapid successive calls to `syncWithBackend()`, the `isSyncing` and `syncTimeout` flags behave identically to the original implementation
    - **Workflow action buttons**: Clicking action buttons (Start Deputy Review, Submit Decision, etc.) triggers the correct handler exactly once without starting a render loop
  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline behavior to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix the allocation-requests infinite loop

  - [~] 3.1 Add `storeUnsubscribe` module-level variable to `allocationRequests.ts`
    - Add `let storeUnsubscribe: (() => void) | null = null;` to the module-level state block alongside the existing `isRendering`, `isFetchingUser`, and `renderTimeout` variables
    - This variable will hold the single unsubscribe function returned by the one permitted `store.subscribe()` call
    - _Bug_Condition: isBugCondition(state) where state.currentUser IS NULL AND state.activeTab = 'allocation-requests' AND renderAllocationRequests IS registered as a store subscriber reachable from notify()_
    - _Expected_Behavior: storeUnsubscribe is non-null only when the module is active; exactly one entry for this module exists in store.listeners at all times while the tab is open_
    - _Preservation: module-level flags isRendering, isFetchingUser, renderTimeout are not modified by this addition_
    - _Requirements: 2.1_

  - [~] 3.2 Create `cleanupAllocationRequests()` export in `allocationRequests.ts`
    - Call `storeUnsubscribe?.()` to remove the active store listener, then set `storeUnsubscribe = null`
    - Call `clearTimeout(renderTimeout)` and set `renderTimeout = null` to cancel any pending debounced re-render
    - Set `isRendering = false` and `isFetchingUser = false` to reset all module-level flags
    - Must be safe to call when no subscription is registered (i.e., before `initAllocationRequests()` has been called) — should not throw
    - Export the function so `router.ts` can import and call it on tab navigation away from `allocation-requests`
    - _Bug_Condition: isBugCondition(state) — cleanup removes the subscriber that enables the loop_
    - _Expected_Behavior: after cleanupAllocationRequests(), store.listeners contains no entry for this module; renderTimeout is null; isRendering === false; isFetchingUser === false_
    - _Preservation: Preservation Requirement 3.4 — cleanupAllocationRequests() MUST clear subscription, cancel timeout, reset flags_
    - _Requirements: 2.3, 3.4_

  - [~] 3.3 Remove user-fetch logic from `renderAllocationRequests()` in `allocationRequests.ts`
    - Delete the block starting at `if (!store.currentUser)` that calls `store.fetchCurrentUser()`, sets `isFetchingUser = true`, and schedules `setTimeout(() => renderAllocationRequests(), 100)` in the `.then()` callback
    - After removal, `renderAllocationRequests()` becomes a pure renderer: if `store.currentUser` is null, show the loading spinner and `return` immediately — no fetch, no setTimeout re-entry
    - Keep the `window.retryRenderAllocationRequests` global but update it to call `initAllocationRequests()` instead of `renderAllocationRequests()` directly
    - Verify that `renderAllocationRequests()` does NOT call `store.subscribe()`, `store.notify()`, or `store.fetchCurrentUser()` under any code path
    - _Bug_Condition: removing fetch-from-inside-render breaks the notify() re-entry cycle (Root Cause #2 from design)_
    - _Expected_Behavior: renderAllocationRequests() has no side effects on store.listeners or store.notify(); it is idempotent given the same store state_
    - _Preservation: Requirement 3.2 — when currentUser is already populated, renderAllocationRequests() renders the full list immediately_
    - _Requirements: 2.2, 3.2_

  - [~] 3.4 Create `initAllocationRequests()` export in `allocationRequests.ts`
    - First call `cleanupAllocationRequests()` to remove any leftover subscription from a previous visit
    - Register exactly one `store.subscribe()` call — the listener must debounce calls to `renderAllocationRequests()`: clear `renderTimeout`, set a new `setTimeout` (~50ms delay) that calls `renderAllocationRequests()`, and store the handle in `renderTimeout`
    - Store the unsubscribe function returned by `store.subscribe()` in `storeUnsubscribe`
    - After setting up the subscription: if `store.currentUser` is null AND `!isFetchingUser`, set `isFetchingUser = true` and call `store.fetchCurrentUser()` — do NOT schedule `renderAllocationRequests()` in the `.then()` callback; the store subscription debounce will handle re-rendering when `notify()` fires after the fetch
    - Call `renderAllocationRequests()` once immediately (handles the fast path where user is already loaded)
    - Export the function
    - _Bug_Condition: isBugCondition(state) — initAllocationRequests() is the only entry point that registers the subscription; calling it multiple times is safe because it calls cleanup first_
    - _Expected_Behavior: store.listeners.length increases by exactly 1 per initAllocationRequests() call regardless of call count; fetchCurrentUser is called at most once per init; renderAllocationRequests is called at most once per notify() cycle via the debounced subscriber_
    - _Preservation: Requirement 3.2 — when currentUser is pre-populated, immediate renderAllocationRequests() call renders the list without a fetch or loading state_
    - _Requirements: 2.1, 2.2, 2.4_

  - [~] 3.5 Update `router.ts` imports and routes map
    - Add `initAllocationRequests` and `cleanupAllocationRequests` to the import from `./modules/allocationRequests`
    - Replace the `'allocation-requests': renderAllocationRequests` entry in the `routes` map with `'allocation-requests': initAllocationRequests`
    - Keep or remove the `renderAllocationRequests` import depending on whether any other code in `router.ts` references it directly
    - _Bug_Condition: router previously called renderAllocationRequests directly, bypassing lifecycle management (Root Cause #1 from design)_
    - _Expected_Behavior: router delegates to initAllocationRequests() which owns subscription setup; router never directly invokes renderAllocationRequests()_
    - _Preservation: all other route entries in the routes map remain unchanged; other tabs render identically_
    - _Requirements: 2.3, 3.1_

  - [~] 3.6 Add cleanup on tab change and router re-render guard in `router.ts`
    - In `handleRoute()`, call `cleanupAllocationRequests()` at the start whenever `tab !== 'allocation-requests'` — this removes the module's subscription whenever the user navigates away
    - Add a guard to the router's `store.subscribe()` callback to prevent re-rendering when the active tab has not changed: track the last rendered tab in a local variable (e.g., `let lastRenderedTab: string | null = null`); only call `handleRoute(store.activeTab)` when `store.activeTab !== lastRenderedTab`; update `lastRenderedTab` after each `handleRoute` call
    - This guard closes Root Cause #1 (router re-renders on every store.notify()) and Root Cause #3 (no cleanup on tab navigation)
    - _Bug_Condition: without this guard the router calls handleRoute on every notify(), including notifies fired by fetchCurrentUser() and syncWithBackend(), restarting the cycle_
    - _Expected_Behavior: router's subscriber only calls handleRoute when the active tab actually changes; cleanupAllocationRequests() is called before any non-allocation-requests tab is rendered_
    - _Preservation: Requirement 3.1 — other tabs render correctly; Requirement 3.3 — syncWithBackend() debounce flags are not touched_
    - _Requirements: 2.3, 2.4, 3.1, 3.3_

  - [~] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Infinite Loop on Allocation Requests Navigation
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior: exactly 1 listener in `store.listeners` after any number of `initAllocationRequests()` calls, `renderAllocationRequests` called at most once per notify cycle, no runaway fetch loop
    - Run all three bug condition tests (subscription accumulation, fetch-triggered re-render, router re-entry) from step 1 against the FIXED code
    - **EXPECTED OUTCOME**: All three tests PASS — confirms the bug is fixed
    - _Requirements: 2.1, 2.2, 2.4_

  - [~] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Allocation-Requests Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests (other tab rendering, mock-mode no-HTTP, pre-populated user render, syncWithBackend debounce, workflow action buttons) from step 2 against the FIXED code
    - **EXPECTED OUTCOME**: All preservation tests PASS — confirms no regressions introduced
    - Confirm all test suites pass together
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [~] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm every test passes
  - Manually verify in the browser: navigate to Allocation Requests tab with `store.currentUser = null` (API mode), confirm exactly one `/auth/me` request fires, no loop, page renders correctly after user loads
  - Manually verify: navigate away to Dashboard, confirm `cleanupAllocationRequests()` was called (check `store.listeners` count in DevTools)
  - Manually verify: navigate back to Allocation Requests tab, confirm exactly one new subscription is registered and no leftover listeners remain from the previous visit
  - Manually verify: rapid tab switching (Allocation Requests ↔ Dashboard, 5 times) — `store.listeners` never grows beyond 2 (router's own subscriber + at most one allocation-requests subscriber)
  - Manually verify mock mode: set `apiMode = 'mock'`, navigate to Allocation Requests — zero HTTP requests, mock data renders immediately
  - Manually verify workflow buttons: click "Start Deputy Review" on a card — action fires once, no render loop triggered
  - Ask the user if any questions arise before marking the checkpoint complete

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3.1"] },
    { "wave": 4, "tasks": ["3.2"] },
    { "wave": 5, "tasks": ["3.3"] },
    { "wave": 6, "tasks": ["3.4"] },
    { "wave": 7, "tasks": ["3.5"] },
    { "wave": 8, "tasks": ["3.6"] },
    { "wave": 9, "tasks": ["3.7", "3.8"] },
    { "wave": 10, "tasks": ["4"] }
  ]
}
```

- Task 1 must be completed before Task 2 (baseline must be documented before fix exploration)
- Task 2 must be completed before Task 3 (preservation baseline must be captured before applying the fix)
- Tasks 3.1–3.6 are sequential within the implementation phase
- Tasks 3.7 and 3.8 depend on all of 3.1–3.6 being complete
- Task 4 depends on 3.7 and 3.8

## Notes

- **Test framework**: Use the project's existing test setup (check `package.json` for the configured test runner — likely Vitest or Jest). If no test runner is configured, set one up using the standard choice for the TypeScript ecosystem before writing tests.
- **Property-based testing library**: Use `fast-check` for the PBT tasks. Install with `npm install --save-dev fast-check@^3` if not already present.
- **Mock strategy**: Mock `store.subscribe`, `store.notify`, `store.fetchCurrentUser`, and `store.apiService.get` using the test framework's built-in spy/mock utilities. Do not make real HTTP calls in any test.
- **Task 1 MUST fail on unfixed code**: If the exploration test passes on unfixed code, the test is wrong — revise the test before proceeding.
- **Task 2 MUST pass on unfixed code**: If a preservation test fails on unfixed code, it has captured incorrect baseline behavior — fix the test before proceeding.
- **Files to modify**: `src/js/modules/allocationRequests.ts` and `src/js/router.ts` only. Do not touch `store.ts` — the store's `isSyncing`, `syncTimeout`, and `isFetchingUser` flags must remain untouched.
- **Debounce window**: Use ~50ms for the `renderTimeout` debounce in `initAllocationRequests()`. This matches the existing 100ms debounce in `store.syncWithBackend()` and is short enough to feel responsive.
