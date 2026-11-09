import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginOnboarding from './appExpress/pages/LoginOnboarding';
import AppExpressLayout from './appExpress/AppExpressLayout';
import PosScreen from './appExpress/pages/PosScreen';
import StockCategories from './appExpress/pages/StockCategories';
import SettingsStore from './appExpress/pages/SettingsStore';
import PublicCatalog from './appExpress/pages/PublicCatalog';
import DailySalesScreen from './appExpress/components/DailySalesScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginOnboarding />} />
        <Route path="/tienda/:storeId" element={<PublicCatalog />} />

        <Route path="/express" element={<AppExpressLayout />}>
          <Route path="pos" element={<PosScreen />} />
          <Route path="stock" element={<StockCategories />} />
          <Route path="ventas-dia" element={<DailySalesScreen />} />
          <Route path="config" element={<SettingsStore />} />
          {/* Ruta agregada para solucionar el error de fiados */}
          <Route path="fiados" element={<PosScreen />} /> 
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;