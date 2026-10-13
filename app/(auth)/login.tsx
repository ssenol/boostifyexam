import { Redirect } from 'expo-router';
import LoginScreen from '@/src/screens/LoginScreen';
import { useAppSelector } from '@/src/store/hooks';
import { selectIsAuthenticated } from '@/src/store/slices/authSlice';

export default function Login() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <LoginScreen />;
}
