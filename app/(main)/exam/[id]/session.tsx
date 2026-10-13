import { Stack, useLocalSearchParams } from 'expo-router';
import ExamSessionScreen from '@/src/screens/ExamSessionScreen';

export default function ExamSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      {/* Kaydırarak geri dönülmez; çıkış yalnızca Pause penceresinden */}
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <ExamSessionScreen examId={id} />
    </>
  );
}
