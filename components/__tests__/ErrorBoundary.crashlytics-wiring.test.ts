/**
 * Crashlytics wiring guard for ErrorBoundary.tsx
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * ErrorBoundary calls `crashlyticsService.recordJSException` inside
 * `componentDidCatch` to report JS crashes to Firebase Crashlytics.  If a
 * future refactor removes that import (while leaving a jest.mock() call in
 * place in another test), every rendering test still passes — but crash
 * reports are silently dropped in production.
 *
 * This file closes that gap with two complementary checks:
 *
 *  1. STATIC IMPORT GUARD — reads the source file as text and asserts that
 *     the `crashlyticsService` import statement is still present.
 *
 *  2. INTEGRATION SMOKE TEST — the real `crashlyticsService` is loaded (no
 *     mock), a jest spy is placed on its `recordJSException` method, and
 *     `componentDidCatch` is invoked directly on an ErrorBoundary instance.
 *     If the import is removed from ErrorBoundary.tsx, the call path is
 *     broken and the spy never fires → test fails.
 */

// ---------------------------------------------------------------------------
// Infrastructure mocks — everything EXCEPT @/services/crashlytics/crashlyticsService
// ---------------------------------------------------------------------------

jest.mock('@/components/ErrorFallback', () => ({
  ErrorFallback: () => null,
}));

// NOTE: @/services/crashlytics/crashlyticsService is intentionally NOT mocked.
// The real module is loaded so that spy calls verify actual end-to-end wiring.
// The native Firebase module is unavailable in Jest, so initializeCrashlytics()
// falls back to noopCrashlytics automatically via its own try/catch.

// ---------------------------------------------------------------------------
// Imports (after mocks are hoisted by Jest)
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';
import { crashlyticsService } from '@/services/crashlytics/crashlyticsService';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ErrorBoundary — Crashlytics wiring guard', () => {
  // -------------------------------------------------------------------------
  // 1. Static import guard
  // -------------------------------------------------------------------------
  describe('static import guard', () => {
    it('has a top-level import of crashlyticsService in ErrorBoundary.tsx', () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, '../ErrorBoundary.tsx'),
        'utf-8'
      );
      // Matches:
      //   import { crashlyticsService } from '@/services/crashlytics/crashlyticsService'
      //   import { ..., crashlyticsService, ... } from '@/services/crashlytics/crashlyticsService'
      expect(src).toMatch(
        /import\s+\{[^}]*crashlyticsService[^}]*\}\s+from\s+['"]@\/services\/crashlytics\/crashlyticsService['"]/
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Integration smoke tests — real crashlyticsService, no-op path
  //
  // If the import is removed from ErrorBoundary.tsx, these tests fail because
  // the spy on crashlyticsService.recordJSException never fires.
  // -------------------------------------------------------------------------
  describe('integration smoke tests — real crashlyticsService (no-op path)', () => {
    let recordJSExceptionSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on the REAL crashlyticsService.recordJSException exported from the
      // module.  Because Jest caches module instances, this is the same object
      // reference that ErrorBoundary imported — so the spy fires on real calls.
      recordJSExceptionSpy = jest.spyOn(crashlyticsService, 'recordJSException');
    });

    afterEach(() => {
      recordJSExceptionSpy.mockRestore();
    });

    it('calls crashlyticsService.recordJSException when componentDidCatch fires', () => {
      // Instantiate the class component directly — no React rendering needed.
      // We pass the minimal props shape required by the constructor.
      const instance = new ErrorBoundary({ children: null });

      const error = new Error('Simulated render crash');
      const componentStack = '\n    at SomeComponent\n    at AnotherComponent';

      instance.componentDidCatch(error, { componentStack });

      expect(recordJSExceptionSpy).toHaveBeenCalledTimes(1);
      expect(recordJSExceptionSpy).toHaveBeenCalledWith(error, componentStack);
    });

    it('calls crashlyticsService.recordJSException with the exact error instance', () => {
      const instance = new ErrorBoundary({ children: null });

      const error = new TypeError('Cannot read property of undefined');
      instance.componentDidCatch(error, { componentStack: '' });

      const [calledError] = recordJSExceptionSpy.mock.calls[0];
      expect(calledError).toBe(error);
    });

    it('calls crashlyticsService.recordJSException even when no componentStack is provided', () => {
      const instance = new ErrorBoundary({ children: null });

      const error = new RangeError('Stack overflow');
      instance.componentDidCatch(error, { componentStack: '' });

      expect(recordJSExceptionSpy).toHaveBeenCalledTimes(1);
      expect(recordJSExceptionSpy).toHaveBeenCalledWith(error, '');
    });

    it('also calls the onError prop after routing through crashlyticsService', () => {
      const onError = jest.fn();
      const instance = new ErrorBoundary({ children: null, onError });

      const error = new Error('Prop callback test');
      const componentStack = '\n    at Root';

      instance.componentDidCatch(error, { componentStack });

      // Crashlytics must fire first, then the optional callback.
      expect(recordJSExceptionSpy).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error, componentStack);
    });

    it('does not call crashlyticsService.recordJSException on the happy path (no error)', () => {
      // Simply constructing and not triggering componentDidCatch means no crash
      // reporting should occur.
      new ErrorBoundary({ children: null });

      expect(recordJSExceptionSpy).not.toHaveBeenCalled();
    });
  });
});
