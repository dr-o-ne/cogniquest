import type { TextToSpeech } from '@/core/ports'

/**
 * A teacher who says nothing at all.
 *
 * The voice is being replaced (**O2**), so the old one is unplugged rather
 * than torn out. The battle loop still asks for every line it always asked
 * for — the question, «I did not catch that», the answer after a mistake —
 * and this drops all of them on the floor. Which is what the port is for
 * (**A3**): the loop above it never learns that nobody is listening.
 *
 * Plugging a voice back in is one line in `useBattle.ts`, plus the
 * `tts.prepare()` that went with `WebSpeechTts` — that class is still here,
 * unused, as the worked example of what an implementation looks like.
 *
 * `isReady` is false on purpose. Nothing is ready to speak, and anything that
 * asks before speaking should be told so rather than told a comfortable lie.
 */
export class SilentTeacher implements TextToSpeech {
  readonly isReady = false

  async speak(): Promise<void> {}

  stop(): void {}
}
