/**
 * Ollama Client Wrapper
 * 
 * Handles communication with Ollama for RAG queries.
 * This is a thin wrapper - no business logic here.
 */

export interface OllamaConfig {
  baseUrl?: string;        // Default: http://localhost:11434
  model?: string;          // Default: llama3
  timeout?: number;        // Default: 30000ms
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama3";
    this.timeout = config.timeout || 30000;
  }

  /**
   * Generate response from Ollama
   * @param prompt - The prompt to send
   * @param systemPrompt - Optional system prompt
   * @returns Ollama response
   */
  async generate(
    prompt: string,
    systemPrompt?: string
  ): Promise<OllamaResponse> {
    const url = `${this.baseUrl}/api/generate`;
    
    const body: any = {
      model: this.model,
      prompt: prompt,
      stream: false,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as OllamaResponse;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(`Ollama request timeout after ${this.timeout}ms`);
      }
      throw new Error(`Failed to query Ollama: ${error.message}`);
    }
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error: any) {
      throw new Error(`Failed to list Ollama models: ${error.message}`);
    }
  }
}
