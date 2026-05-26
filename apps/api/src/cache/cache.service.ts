import { Injectable } from '@nestjs/common';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  updatedAt: string;
};

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  getStale<T>(key: string): { value: T; updatedAt: string } | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    return {
      value: entry.value as T,
      updatedAt: entry.updatedAt
    };
  }

  set<T>(key: string, value: T, ttlSeconds: number) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      updatedAt: new Date().toISOString()
    });
  }

  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<{
    value: T;
    cached: boolean;
    fallback: boolean;
    updatedAt: string;
  }> {
    const cached = this.get<T>(key);
    if (cached) {
      const stale = this.getStale<T>(key);
      return {
        value: cached,
        cached: true,
        fallback: false,
        updatedAt: stale?.updatedAt ?? new Date().toISOString()
      };
    }

    try {
      const value = await loader();
      const updatedAt = new Date().toISOString();
      this.store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
        updatedAt
      });

      return {
        value,
        cached: false,
        fallback: false,
        updatedAt
      };
    } catch (error) {
      const stale = this.getStale<T>(key);
      if (stale) {
        return {
          value: stale.value,
          cached: true,
          fallback: true,
          updatedAt: stale.updatedAt
        };
      }

      throw error;
    }
  }
}

