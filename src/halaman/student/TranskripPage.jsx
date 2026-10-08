import Transkrip from './Transkrip'
import { useStudent } from './StudentLayout'

export default function TranskripPage() {
  return <Transkrip student={useStudent()} />
}
