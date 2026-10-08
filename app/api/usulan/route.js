import { tangani } from '../../../src/server/api'
import { usulkanNilai } from '../../../src/server/pengajuan'

/* Dosen mengirim usulan nilai untuk kelasnya. */
export const POST = (request) => tangani(request, ['dosen'], usulkanNilai)
