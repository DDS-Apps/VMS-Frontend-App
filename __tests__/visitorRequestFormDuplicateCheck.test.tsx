/**
 * The Create Visit form must not ask the server about duplicate visits on
 * every keystroke. These tests drive the same hooks the form composes
 * (debounced value -> validity-gated params -> query) against a mocked API and
 * check the form is actually wired to them.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCheckDuplicateVisit = jest.fn();
const mockListUsers = jest.fn();

jest.mock('@/services/api/requestApiService', () => ({
  requestApiService: {
    checkDuplicateVisit: (...args: unknown[]) => mockCheckDuplicateVisit(...args),
  },
}));

jest.mock('@/services/api/userApiService', () => ({
  userApiService: {
    list: (...args: unknown[]) => mockListUsers(...args),
  },
}));

jest.mock('@/hooks/queries/useDashboardKpiQuery', () => ({
  dashboardKpiKeys: { all: ['dashboard-kpis'] },
  invalidateDashboardKpis: jest.fn(),
}));

import { useDuplicateCheckQuery } from '@/hooks/queries/useApprovalQueries';
import { useUsersQuery } from '@/hooks/queries/useUserQueries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  DUPLICATE_CHECK_DEBOUNCE_MS,
  buildDuplicateCheckParams,
  isDuplicateCheckPending,
} from '@/utils/duplicateCheckParams';

const DATE = '2026-09-15';
const EMPTY_VISITS = { success: true, data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } };

type Snapshot = { isCheckingDuplicate: boolean; hasData: boolean };
let latest: Snapshot | null = null;

/** Mirrors the wiring in VisitorRequestFormScreen for the duplicate check. */
function DuplicateCheckHarness({ email, phone }: { email: string; phone: string }) {
  const debouncedEmail = useDebouncedValue(email, DUPLICATE_CHECK_DEBOUNCE_MS);
  const debouncedPhone = useDebouncedValue(phone, DUPLICATE_CHECK_DEBOUNCE_MS);
  const params = buildDuplicateCheckParams({ isWalkIn: false, date: DATE, email: debouncedEmail, phone: debouncedPhone });
  const debouncing = isDuplicateCheckPending(
    buildDuplicateCheckParams({ isWalkIn: false, date: DATE, email, phone }),
    params,
  );
  const { data, isLoading, isFetching } = useDuplicateCheckQuery(params, true);
  latest = { isCheckingDuplicate: debouncing || isLoading || isFetching, hasData: data !== undefined };
  return null;
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// Lets a re-render queued inside act (e.g. a debounce timer firing) start its
// fetch, then drains the microtasks and zero-delay timers React Query uses to
// resolve the fetch and notify observers. The async timer variant interleaves
// microtasks between timers, so a resolved mock reaches the observer here.
const flush = async () => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
};

const settle = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
  await flush();
};

beforeEach(() => {
  jest.useFakeTimers();
  latest = null;
  mockCheckDuplicateVisit.mockReset();
  mockCheckDuplicateVisit.mockResolvedValue(EMPTY_VISITS);
  mockListUsers.mockReset();
  mockListUsers.mockResolvedValue({ success: true, data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('duplicate check while typing', () => {
  it('sends a single request for an email typed character by character', async () => {
    const client = newClient();
    const typed = 'john@example.com';
    let renderer!: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(
        <QueryClientProvider client={client}>
          <DuplicateCheckHarness email="" phone="" />
        </QueryClientProvider>,
      );
    });

    for (let i = 1; i <= typed.length; i += 1) {
      await act(async () => {
        renderer.update(
          <QueryClientProvider client={client}>
            <DuplicateCheckHarness email={typed.slice(0, i)} phone="" />
          </QueryClientProvider>,
        );
      });
      await settle(80); // a quick typist: well inside the debounce window
    }

    expect(mockCheckDuplicateVisit).not.toHaveBeenCalled();
    // The address became complete a few keystrokes ago, so a check is owed and
    // Submit must keep waiting even though no request has been sent yet.
    expect(latest?.isCheckingDuplicate).toBe(true);

    await settle(DUPLICATE_CHECK_DEBOUNCE_MS);

    expect(mockCheckDuplicateVisit).toHaveBeenCalledTimes(1);
    expect(mockCheckDuplicateVisit.mock.calls[0][0]).toEqual({ date: DATE, email: typed });
    expect(mockCheckDuplicateVisit.mock.calls[0][1]).toEqual({ signal: expect.any(AbortSignal) });
    expect(latest).toEqual({ isCheckingDuplicate: false, hasData: true });

    await act(async () => {
      renderer.unmount();
    });
  });

  it('never asks the server about an address or number that is not complete', async () => {
    const client = newClient();
    let renderer!: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(
        <QueryClientProvider client={client}>
          <DuplicateCheckHarness email="john@" phone="+966 5" />
        </QueryClientProvider>,
      );
    });
    await settle(DUPLICATE_CHECK_DEBOUNCE_MS * 2);

    expect(mockCheckDuplicateVisit).not.toHaveBeenCalled();
    expect(latest).toEqual({ isCheckingDuplicate: false, hasData: false });

    await act(async () => {
      renderer.unmount();
    });
  });

  it('reuses the answer when the same value is typed again within the freshness window', async () => {
    const client = newClient();
    let renderer!: ReturnType<typeof create>;
    const render = (email: string) => (
      <QueryClientProvider client={client}>
        <DuplicateCheckHarness email={email} phone="" />
      </QueryClientProvider>
    );

    await act(async () => {
      renderer = create(render('john@example.com'));
    });
    await settle(DUPLICATE_CHECK_DEBOUNCE_MS);
    expect(mockCheckDuplicateVisit).toHaveBeenCalledTimes(1);

    // Backspace the last character, then retype it.
    await act(async () => {
      renderer.update(render('john@example.co'));
    });
    await settle(DUPLICATE_CHECK_DEBOUNCE_MS);
    await act(async () => {
      renderer.update(render('john@example.com'));
    });
    await settle(DUPLICATE_CHECK_DEBOUNCE_MS);

    expect(mockCheckDuplicateVisit).toHaveBeenCalledTimes(2);
    expect(mockCheckDuplicateVisit.mock.calls[1][0]).toEqual({ date: DATE, email: 'john@example.co' });
    expect(mockCheckDuplicateVisit.mock.calls[1][1]).toEqual({ signal: expect.any(AbortSignal) });
    expect(latest).toEqual({ isCheckingDuplicate: false, hasData: true });

    await act(async () => {
      renderer.unmount();
    });
  });
});

describe('walk-in host list', () => {
  function UsersHarness() {
    useUsersQuery({ page: 1, limit: 100 }, true);
    return null;
  }

  it('does not re-download the host list when the picker re-opens within the freshness window', async () => {
    const client = newClient();
    const mount = async () => {
      let renderer!: ReturnType<typeof create>;
      await act(async () => {
        renderer = create(
          <QueryClientProvider client={client}>
            <UsersHarness />
          </QueryClientProvider>,
        );
      });
      await flush();
      return renderer;
    };

    const first = await mount();
    expect(mockListUsers).toHaveBeenCalledTimes(1);
    await act(async () => {
      first.unmount();
    });

    await settle(5 * 1000);
    const second = await mount();
    expect(mockListUsers).toHaveBeenCalledTimes(1);
    await act(async () => {
      second.unmount();
    });

    // Past the window the list is refreshed again.
    await settle(31 * 1000);
    const third = await mount();
    expect(mockListUsers).toHaveBeenCalledTimes(2);
    await act(async () => {
      third.unmount();
    });
  });
});

describe('VisitorRequestFormScreen wiring', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../screens/Employee/VisitorRequestFormScreen.tsx'),
    'utf8',
  );

  it('feeds the duplicate check from debounced, validity-gated values', () => {
    expect(source).toMatch(/useDebouncedValue\(email,\s*DUPLICATE_CHECK_DEBOUNCE_MS\)/);
    expect(source).toMatch(/useDebouncedValue\(phone,\s*DUPLICATE_CHECK_DEBOUNCE_MS\)/);
    expect(source).toMatch(/buildDuplicateCheckParams\(\{[\s\S]*?email:\s*debouncedEmail,[\s\S]*?phone:\s*debouncedPhone,/);
    expect(source).toMatch(/const duplicateCheckParams = buildDuplicateCheckParams\(/);
    expect(source).toMatch(/useDuplicateCheckQuery\(duplicateCheckParams,/);
  });

  it('keeps Submit waiting while the latest keystrokes still owe a check', () => {
    expect(source).toMatch(/isDuplicateCheckDebouncing\s*\|\|\s*isDuplicateCheckLoading\s*\|\|\s*isDuplicateCheckFetching/);
    expect(source).toMatch(/\(!isWalkIn && isCheckingDuplicate\)/);
  });
});
