class InMemoryStorage<T> {
  private storage: Map<string, T> = new Map();

  set(key: string, value: T): void {
    this.storage.set(key, value);
  }

  get(key: string): T | undefined {
    return this.storage.get(key);
  }

  getAll(): T[] {
    return Array.from(this.storage.values());
  }

  delete(key: string): boolean {
    return this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  get size(): number {
    return this.storage.size;
  }
}

export const storage = new InMemoryStorage();
export { InMemoryStorage };
