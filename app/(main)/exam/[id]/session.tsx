import { Stack, useLocalSearchParams } from 'expo-router';
import ExamSessionScreen from '@/src/screens/ExamSessionScreen';

export default function ExamSession() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  return (
    <>
      {/* Kaydırarak geri dönülmez; çıkış yalnızca Pause penceresinden */}
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <ExamSessionScreen assignmentId={id} title={title} />
    </>
  );
}
