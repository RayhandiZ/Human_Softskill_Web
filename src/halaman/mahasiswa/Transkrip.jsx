import IsiTranskrip from "./bagian/IsiTranskrip";
import { useStudent } from "./MahasiswaLayout";

export default function Transkrip() {
  return <IsiTranskrip student={useStudent()} />;
}
