import type { User } from '../../lib/types';
import { isOidcConfigured } from '../../lib/auth';
import LoginScreenOidc from './LoginScreenOidc';
import LoginScreenLocal from './LoginScreenLocal';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export default function LoginScreen(props: LoginScreenProps) {
  if (isOidcConfigured()) {
    return <LoginScreenOidc {...props} />;
  }
  return <LoginScreenLocal {...props} />;
}
