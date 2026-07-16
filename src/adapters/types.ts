import type { AgentSpec } from '../core/events.js';

/**
 * The adapter contract. An adapter turns one vendor CLI into this shape;
 * nothing outside src/adapters knows vendor specifics. Both current adapters
 * are turn-oriented: the orchestrator hands the agent a prompt, the adapter
 * streams normalized happenings, and resolves when the agent yields.
 */

export type AdapterEvent =
  | { kind: 'native-session'; nativeSessionId: string }
  | { kind: 'assistant-text'; text: string }
  | { kind: 'tool-use'; tool: string; summary: string }
  | { kind: 'file-change'; path: string; change: 'created' | 'modified' | 'deleted' }
  | { kind: 'raw'; payload: unknown };

export interface TurnResult {
  outcome: 'ok' | 'error' | 'interrupted';
  /** The agent's final message for the turn. */
  finalText: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    costUsd?: number;
  };
  error?: string;
}

export interface StartTurnOptions {
  prompt: string;
  /**
   * Vendor session/thread id. When `resumeExisting` is true the adapter
   * resumes it; otherwise it starts a new session (adapters that support
   * caller-chosen ids use the given one, others report theirs via the
   * 'native-session' event).
   */
  nativeSessionId?: string;
  resumeExisting?: boolean;
  onEvent: (e: AdapterEvent) => void;
}

export interface AgentAdapter {
  readonly spec: AgentSpec;
  /** Run one turn to completion. Must be safe to call again after interrupt(). */
  runTurn(opts: StartTurnOptions): Promise<TurnResult>;
  /** Abort the in-flight turn, if any. runTurn resolves with 'interrupted'. */
  interrupt(): void;
  /** True while a turn is in flight. */
  busy(): boolean;
  dispose(): void;
}
