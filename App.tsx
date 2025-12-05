
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RideProvider } from './contexts/RideContext';
import { ToastProvider } from './contexts/ToastContext'; // Importado
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { UserRole } from './types';

const AppContent = () => {
  const { isAuthenticated, user } = useAuth();
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Roteamento Prioritário de Admin
  // Se o usuário é ADMIN, ele DEVE ir para o dashboard, independente do hash (exceto logout)
  if (isAuthenticated && user?.role === UserRole.ADMIN) {
      return <AdminDashboard />;
  }

  // Rota explícita via Hash (apenas se já estiver logado, caso contrário cai no login)
  if (isAuthenticated && currentHash === '#admin' && user?.role === UserRole.ADMIN) {
      return <AdminDashboard />;
  }

  // Login Screen
  if (!isAuthenticated || currentHash === '#login') {
    return <Login />;
  }

  // Default App Screen (Passenger/Driver)
  return <Home />;
};

const App = () => {
  return (
    <ToastProvider> 
      <AuthProvider>
        <RideProvider>
          <AppContent />
        </RideProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
