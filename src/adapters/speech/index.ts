import { publicUrl } from '@/assets'

export { VoskRecognizer } from './VoskRecognizer'
export { WebSpeechTts } from './WebSpeechTts'

/** Where the model sits. Put there by `npm run fetch-model`. */
export const RUSSIAN_MODEL_URL = publicUrl('/models/vosk-model-small-ru-0.22.tar.gz')
