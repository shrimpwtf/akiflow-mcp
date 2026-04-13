import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type V5CacheKey =
  | "tasks"
  | "projects"
  | "tags"
  | "events"
  | "calendars"
  | "timeSlots";

export type AkiCacheKey = "recordings" | "meetingBriefs";

export interface V5EntityState<T> {
  itemsById: Record<string, T>;
  syncToken: string | null;
  updatedAt: string | null;
}

export interface AkiEntityState<T> {
  itemsById: Record<string, T>;
  updatedAt: string | null;
}

interface SyncStoreState {
  version: 1;
  v5: Record<V5CacheKey, V5EntityState<unknown>>;
  aki: Record<AkiCacheKey, AkiEntityState<unknown>>;
}

const emptyV5State = (): V5EntityState<unknown> => ({
  itemsById: {},
  syncToken: null,
  updatedAt: null,
});

const emptyAkiState = (): AkiEntityState<unknown> => ({
  itemsById: {},
  updatedAt: null,
});

const createEmptyState = (): SyncStoreState => ({
  version: 1,
  v5: {
    tasks: emptyV5State(),
    projects: emptyV5State(),
    tags: emptyV5State(),
    events: emptyV5State(),
    calendars: emptyV5State(),
    timeSlots: emptyV5State(),
  },
  aki: {
    recordings: emptyAkiState(),
    meetingBriefs: emptyAkiState(),
  },
});

export class SyncStore {
  private readonly filePath: string;
  private state: SyncStoreState = createEmptyState();
  private initPromise: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? path.join(os.homedir(), ".akiflow-mcp", "cache.json");
  }

  async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.load();
    }
    await this.initPromise;
  }

  getV5State<T>(key: V5CacheKey): V5EntityState<T> {
    return this.state.v5[key] as V5EntityState<T>;
  }

  getAkiState<T>(key: AkiCacheKey): AkiEntityState<T> {
    return this.state.aki[key] as AkiEntityState<T>;
  }

  async setV5State<T>(key: V5CacheKey, value: V5EntityState<T>): Promise<void> {
    this.state.v5[key] = value as V5EntityState<unknown>;
    await this.save();
  }

  async setAkiState<T>(
    key: AkiCacheKey,
    value: AkiEntityState<T>,
  ): Promise<void> {
    this.state.aki[key] = value as AkiEntityState<unknown>;
    await this.save();
  }

  private async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<SyncStoreState>;
      this.state = {
        ...createEmptyState(),
        ...parsed,
        v5: {
          ...createEmptyState().v5,
          ...(parsed.v5 ?? {}),
        },
        aki: {
          ...createEmptyState().aki,
          ...(parsed.aki ?? {}),
        },
      };
    } catch {
      this.state = createEmptyState();
    }
  }

  private async save(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }
}
