import { Injectable } from '@nestjs/common';

/**
 * 统一的 AI 辅助服务（§11.8）。
 * - 若配置了 AI_PROVIDER + AI_API_KEY，调用 OpenAI 兼容的 /chat/completions 接口做文本生成；
 * - 未配置（默认/离线）时 `llm()` 返回 null，由各业务模块用确定性启发式产出，
 *   从而保证「无外部依赖也能跑、有密钥则增强」且 AI 产出均属辅助、需人工复核。
 *
 * 环境变量：
 *   AI_PROVIDER = openai | dashscope | ... （兼容 /chat/completions 的提供商）
 *   AI_API_KEY  = sk-xxx
 *   AI_BASE_URL = https://api.openai.com/v1 （默认）
 *   AI_MODEL    = gpt-4o-mini （默认）
 */
@Injectable()
export class AiService {
  private readonly provider = process.env.AI_PROVIDER || '';
  private readonly apiKey = process.env.AI_API_KEY || '';
  private readonly baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  private readonly model = process.env.AI_MODEL || 'gpt-4o-mini';

  /** 是否具备可用的 LLM 能力（供模块判断是否需要回退启发式） */
  get enabled(): boolean {
    return !!this.provider && !!this.apiKey;
  }

  /**
   * 调用 LLM 生成文本。失败/未配置时返回 null（不抛错），调用方须用启发式兜底。
   * 所有 AI 产出仅作辅助建议，业务侧必须人工复核后落库。
   */
  async llm(system: string, user: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: opts?.temperature ?? 0.3,
          max_tokens: opts?.maxTokens ?? 800,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!resp.ok) return null;
      const data: any = await resp.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  /** 便捷：把 LLM 文本解析为按行/分段数组 */
  static splitLines(text: string | null): string[] {
    if (!text) return [];
    return text
      .split(/\n+/)
      .map((s) => s.replace(/^[\s\d.\-–—、]+/, '').trim())
      .filter(Boolean);
  }
}
