import { Redirect } from 'expo-router';
import WelcomeScreen from '@/src/screens/WelcomeScreen';
import { useAppSelector } from '@/src/store/hooks';
import { selectIsAuthenticated } from '@/src/store/slices/authSlice';

export default function Welcome() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // SSO linkiyle bu ekrandayken giriş yapılırsa doğrudan ana ekrana geçilir
  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <WelcomeScreen />;
}
