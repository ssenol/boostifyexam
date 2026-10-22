import { useLocalSearchParams } from 'expo-router';
import ExamIntroScreen from '@/src/screens/ExamIntroScreen';

export default function ExamIntro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExamIntroScreen assignmentId={id} />;
}
