import { ApiException } from './errors';

export interface GetRequestOptions {
  signal?: AbortSignal;
  /**
   * Startup profile restoration may keep a cached session when its refresh
   * fails transiently. This is transport metadata, not part of the URL or
   * request params.
   */
  preserveSessionOnRefreshFailure?: boolean;
}

interface InFlightRequest<T> {
  controller: AbortController;
  promise: Promise<T>;
  subscribers: Set<symbol>;
}

/**
 * Shares an in-progress read, but never its completed value. Each caller has
 * its own subscription so navigating away only cancels that caller; the
 * transport is aborted only after its final subscriber has gone away.
 */
export class InFlightGetRegistry {
  private readonly requests = new Map<string, InFlightRequest<unknown>>();

  subscribe<T>(
    key: string,
    start: (signal: AbortSignal) => Promise<T>,
    options: GetRequestOptions = {},
  ): Promise<T> {
    let request = this.requests.get(key) as InFlightRequest<T> | undefined;
    if (!request) {
      const controller = new AbortController();
      const promise = start(controller.signal);
      request = {
        controller,
        promise,
        subscribers: new Set<symbol>(),
      };
      this.requests.set(key, request);
      // Do not cache fulfilled or rejected reads. Guard identity so a new
      // request with the same key cannot remove its successor.
      void promise.finally(() => {
        if (this.requests.get(key) === request) {
          this.requests.delete(key);
        }
      }).catch(() => {
        // The subscribers observe the failure. This branch only prevents the
        // bookkeeping promise from becoming an unhandled rejection.
      });
    }

    return this.subscribeToRequest(request, options.signal);
  }

  private subscribeToRequest<T>(request: InFlightRequest<T>, signal?: AbortSignal): Promise<T> {
    const subscriber = Symbol('get-subscriber');
    request.subscribers.add(subscriber);

    if (!signal) {
      return request.promise;
    }

    if (signal.aborted) {
      this.unsubscribe(request, subscriber);
      return Promise.reject(cancellationError());
    }

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        this.unsubscribe(request, subscriber);
        reject(cancellationError());
      };

      signal.addEventListener('abort', onAbort, { once: true });
      request.promise.then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          request.subscribers.delete(subscriber);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', onAbort);
          request.subscribers.delete(subscriber);
          reject(error);
        },
      );
    });
  }

  private unsubscribe<T>(request: InFlightRequest<T>, subscriber: symbol): void {
    request.subscribers.delete(subscriber);
    if (request.subscribers.size === 0 && !request.controller.signal.aborted) {
      request.controller.abort('last_subscriber_cancelled');
    }
  }
}

function cancellationError(): ApiException {
  return new ApiException({
    code: 'CANCELLED',
    message: 'Request was cancelled.',
  });
}

export function stableRequestValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableRequestValue).join(',')}]`;
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableRequestValue(object[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}