/**
 * The speech recognition port. Implemented by vosk-browser in
 * src/adapters/speech. The core knows nothing of WASM, models or microphones.
 */
export interface SpeechRecognizer {
  /** Load the model. Slow, done once at startup. */
  load(): Promise<void>
  readonly isReady: boolean
  /**
   * Listen for one answer. Stops itself on silence.
   * @param grammar the closed list of expected words (A5, T4)
   * @returns the recognised text, or null when nothing was caught
   */
  listenOnce(grammar: readonly string[], signal: AbortSignal): Promise<string | null>
}
