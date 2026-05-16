import { FreeFireAPI } from './api';
import { LikeAPI } from './like';
import { getToolByName } from './ai-tools';
import type { SearchResult, PlayerProfile, ProcessedPlayerItems, PlayerStats, RegisterResult, LikeResult } from '@/types';

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIToolCallResult {
  tool_call_id: string;
  role: 'tool';
  name: string;
  content: string;
}

export interface AIHandlerOptions {
  region?: string;
}

export class FreeFireAIToolHandler {
  private api: FreeFireAPI;
  private likeApi: LikeAPI;

  constructor(options: AIHandlerOptions = {}) {
    this.api = new FreeFireAPI(options.region || null);
    this.likeApi = new LikeAPI();
  }

  async execute(toolCall: AIToolCall): Promise<AIToolCallResult> {
    const tool = getToolByName(toolCall.function.name);
    if (!tool) {
      return this._buildResult(toolCall, `Error: Unknown tool "${toolCall.function.name}"`);
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      return this._buildResult(toolCall, 'Error: Invalid JSON in tool arguments');
    }

    try {
      const result = await this._dispatch(toolCall.function.name, args);
      return this._buildResult(toolCall, JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this._buildResult(toolCall, `Error: ${message}`);
    }
  }

  async executeMany(toolCalls: AIToolCall[]): Promise<AIToolCallResult[]> {
    const results: AIToolCallResult[] = [];
    for (const call of toolCalls) {
      results.push(await this.execute(call));
    }
    return results;
  }

  private async _dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'search_player': {
        const keyword = String(args.keyword);
        const results = await this.api.searchAccount(keyword);
        return results.map((r: SearchResult) => ({
          accountid: r.accountid,
          nickname: r.nickname,
          level: r.level
        }));
      }

      case 'get_player_profile': {
        const profile = await this.api.getPlayerProfile(String(args.uid));
        return this._sanitizeProfile(profile);
      }

      case 'get_player_items': {
        const items = await this.api.getPlayerItems(String(args.uid));
        return items;
      }

      case 'get_player_stats': {
        const stats = await this.api.getPlayerStats(
          String(args.uid),
          (args.mode as 'br' | 'cs') || 'br',
          (args.matchType as 'career' | 'ranked' | 'normal') || 'career'
        );
        return stats;
      }

      case 'send_likes': {
        const result = await this.likeApi.sendLikes(
          String(args.targetUid),
          String(args.region),
          args.likeCount ? Number(args.likeCount) : 100
        );
        return this._sanitizeLikeResult(result);
      }

      case 'register_account': {
        const result = await this.api.register(
          String(args.region),
          args.nickname ? String(args.nickname) : null
        );
        return this._sanitizeRegisterResult(result);
      }

      default:
        throw new Error(`Tool "${name}" is not implemented`);
    }
  }

  private _buildResult(toolCall: AIToolCall, content: string): AIToolCallResult {
    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      name: toolCall.function.name,
      content
    };
  }

  private _sanitizeProfile(profile: PlayerProfile): Record<string, unknown> {
    return {
      basicinfo: profile.basicinfo,
      claninfo: profile.claninfo || null,
      petinfo: profile.petinfo
        ? {
            id: profile.petinfo.id,
            name: profile.petinfo.name,
            level: profile.petinfo.level
          }
        : null,
      profileinfo: profile.profileinfo
    };
  }

  private _sanitizeLikeResult(result: LikeResult): Record<string, unknown> {
    return {
      success: result.success,
      successCount: result.successCount,
      failedCount: result.failedCount,
      remainingGuests: result.remainingGuests,
      message: result.message
    };
  }

  private _sanitizeRegisterResult(result: RegisterResult): Record<string, unknown> {
    return {
      uid: result.uid,
      region: result.region,
      nickname: result.nickname
    };
  }
}
