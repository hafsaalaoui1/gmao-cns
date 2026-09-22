import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* AuthProvider gère l'utilisateur */}
    <AuthProvider>
      {/* ThemeProvider enveloppe App pour donner accès au thème partout */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);