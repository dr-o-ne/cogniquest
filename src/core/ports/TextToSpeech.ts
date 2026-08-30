/**
 * The speech port: the teacher's voice. Implemented by the Windows system
 * synthesiser through the Web Speech API, local voices only (offline, P5).
 */
export interface TextToSpeech {
  readonly isReady: boolean
  speak(text: string, signal?: AbortSignal): Promise<void>
  stop(): void
}
