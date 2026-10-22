import { useLocalSearchParams } from 'expo-router';
import CertificateScreen from '@/src/screens/CertificateScreen';

export default function CertificateRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CertificateScreen sessionId={id} />;
}
