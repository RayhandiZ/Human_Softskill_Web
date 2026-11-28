import { tangani } from '../../../src/server/api'
import { tanyaAsisten } from '../../../src/server/asisten'

/* Asisten VIBE untuk mahasiswa dan dosen: pertanyaan masuk, jawaban dialirkan baris demi baris (NDJSON). Logikanya di
   src/server/asisten.js; lihat README.md › Asisten VIBE. */
export const POST = (request) => tangani(request, ['student', 'dosen'], tanyaAsisten)
