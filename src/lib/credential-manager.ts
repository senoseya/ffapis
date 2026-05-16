import fs from 'fs';
import type { Credential } from '@/types';
import { getErrorMessage } from '@/types';
import { resolveProjectFile } from './resolve-path';

interface UsageEntry {
  used_guests: Record<string, string>;
  total_likes: number;
}

/**
 * Manages a pool of guest credentials for a specific Free Fire region.
 * Tracks usage to prevent reusing the same guest account on the same target.
 */
export class CredentialManager {
  public region: string;
  private pool: Credential[] = [];
  private currentIndex = 0;
  private usageData: Record<string, UsageEntry> = {};

  /**
   * @param region - Region code whose credential YAML file will be loaded.
   */
  constructor(region: string) {
    this.region = region;
    this._loadPool();
  }

  private _loadPool(): void {
    const filePath = resolveProjectFile(`config/credentials/${this.region}.yaml`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let currentAccount: Credential | null = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- uid:')) {
          if (currentAccount) {
            this.pool.push(currentAccount);
          }
          const uidMatch = trimmed.match(/uid:\s*"([^"]+)"/);
          currentAccount = { uid: uidMatch ? uidMatch[1] : '', password: '' };
        } else if (trimmed.startsWith('password:') && currentAccount) {
          const pwdMatch = trimmed.match(/password:\s*"([^"]+)"/);
          if (pwdMatch) {
            currentAccount.password = pwdMatch[1];
          }
        }
      }

      if (currentAccount && currentAccount.password) {
        this.pool.push(currentAccount);
      }

      console.log(`[CredentialManager] Loaded ${this.pool.length} accounts for ${this.region}`);
    } catch (error) {
      console.error(`[CredentialManager] Failed to load credentials for ${this.region}:`, getErrorMessage(error));
      this.pool = [];
    }
  }

  isUsedForTarget(targetUid: string, guestUid: string): boolean {
    if (!this.usageData[targetUid]) return false;
    return this.usageData[targetUid].used_guests[guestUid] !== undefined;
  }

  markUsed(targetUid: string, guestUid: string): void {
    if (!this.usageData[targetUid]) {
      this.usageData[targetUid] = { used_guests: {}, total_likes: 0 };
    }
    this.usageData[targetUid].used_guests[guestUid] = new Date().toISOString();
    this.usageData[targetUid].total_likes = Object.keys(this.usageData[targetUid].used_guests).length;
  }

  getRandomCredential(): Credential | null {
    if (this.pool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.pool.length);
    return this.pool[randomIndex];
  }

  getNextCredential(): Credential | null {
    if (this.pool.length === 0) return null;
    const cred = this.pool[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.pool.length;
    return cred;
  }

  getNextForTarget(targetUid: string): Credential | null {
    const available = this.pool.filter(acc => !this.isUsedForTarget(targetUid, acc.uid));
    if (available.length === 0) return null;
    return available[0];
  }

  getMultipleForTarget(targetUid: string, count: number): Credential[] {
    const available = this.pool.filter(acc => !this.isUsedForTarget(targetUid, acc.uid));
    return available.slice(0, count);
  }

  getAvailableCount(targetUid: string): number {
    return this.pool.filter(acc => !this.isUsedForTarget(targetUid, acc.uid)).length;
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  clearUsage(targetUid?: string): void {
    if (targetUid) {
      delete this.usageData[targetUid];
    } else {
      this.usageData = {};
    }
  }
}
