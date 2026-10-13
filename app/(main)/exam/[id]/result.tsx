import { Stack, useLocalSearchParams } from 'expo-router';
import ExamResultScreen from '@/src/screens/ExamResultScreen';

export default function ExamResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ animation: 'fade' }} />
      <ExamResultScreen examId={id} />
    </>
  );
}
