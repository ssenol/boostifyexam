import { Stack, useLocalSearchParams } from 'expo-router';
import ExamResultScreen from '@/src/screens/ExamResultScreen';

export default function ExamResult() {
  // id: assignmentId (rota), sessionId: biten deneme
  const { sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  return (
    <>
      <Stack.Screen options={{ animation: 'fade' }} />
      <ExamResultScreen sessionId={sessionId} />
    </>
  );
}
