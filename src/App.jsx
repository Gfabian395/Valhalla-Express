import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginOnboarding from './appExpress/pages/LoginOnboarding';
import SelectPlan from './appExpress/pages/SelectPlan';
import AppExpressLayout from './appExpress/AppExpressLayout';
import PosScreen from './appExpress/pages/PosScreen';
import StockCategories from './appExpress/pages/StockCategories';
import CustomersCredit from './appExpress/pages/CustomersCredit';
import SettingsStore from './appExpress/pages/SettingsStore';
import BranchesManage from './appExpress/pages/BranchesManage';
import PublicCatalog from './appExpress/pages/PublicCatalog';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirección inicial hacia el Login con Google */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Pantalla de Autenticación y Registro inicial de tienda */}
        <Route path="/login" element={<LoginOnboarding />} />

        {/* 🌐 RUTA PÚBLICA DEL CATÁLOGO PARA WHATSAPP (Ubicada fuera de rutas protegidas o layouts de admin) */}
        <Route path="/tienda/:storeId" element={<PublicCatalog />} />

        {/* Pantalla de Selección de Plan (Paso posterior al registro inicial) */}
        <Route path="/express/select-plan" element={<SelectPlan />} />

        {/* El Layout Padre del Sistema POS con el Menú Superior y Bloqueo por Suspensión */}
        <Route path="/express" element={<AppExpressLayout />}>
          <Route path="pos" element={<PosScreen />} />
          <Route path="stock" element={<StockCategories />} />
          <Route path="fiados" element={<CustomersCredit />} />
          <Route path="config" element={<SettingsStore />} />
          <Route path="branches" element={<BranchesManage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;