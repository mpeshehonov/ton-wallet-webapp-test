import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider, useWallet } from './hooks';
import WelcomeScreen from './screens/WelcomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import SendScreen from './screens/SendScreen';

function AppRoutes() {
  const { wallet, loading } = useWallet();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="app-text-muted">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <Routes>
        <Route path="*" element={<WelcomeScreen />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/receive" element={<ReceiveScreen />} />
      <Route path="/send" element={<SendScreen />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <AppRoutes />
      </WalletProvider>
    </BrowserRouter>
  );
}
