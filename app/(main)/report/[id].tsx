import { useLocalSearchParams } from 'expo-router';
import ReportScreen from '@/src/screens/ReportScreen';

export default function Report() {
  // id: sessionId
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  return <ReportScreen sessionId={id} from={from === 'result' ? 'result' : 'assign'} />;
}
