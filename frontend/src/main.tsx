import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './app/App.tsx';
import { buildAuthProviderProps, logOidcConfigInDev } from './lib/cognito.ts';
import './styles/index.css';

logOidcConfigInDev();
const oidcConfig = buildAuthProviderProps();
const root = createRoot(document.getElementById('root')!);

if (oidcConfig) {
  root.render(
    <StrictMode>
      <AuthProvider {...oidcConfig}>
        <App />
      </AuthProvider>
    </StrictMode>
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
