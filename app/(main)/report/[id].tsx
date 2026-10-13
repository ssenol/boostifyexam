import { useLocalSearchParams } from 'expo-router';
import ReportScreen from '@/src/screens/ReportScreen';

export default function Report() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  return <ReportScreen examId={id} from={from === 'result' ? 'result' : 'assign'} />;
}
