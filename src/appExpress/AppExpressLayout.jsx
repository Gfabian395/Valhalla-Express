import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import NavAdmin from './components/NavAdmin';
import SuspendedOverlay from './components/SuspendedOverlay';

export default function AppExpressLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);
  const [storeStatus, setStoreStatus] = useState(true);
  const [loading, setLoading] = useState(true);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setStoreId(user.uid);
      } else {
        setStoreId(null);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Función para verificar el estado en Firestore (permite reintentar desde el botón de la pantalla de espera)
  const checkStoreStatus = useCallback(async () => {
    if (!storeId) return false;
    try {
      const storeRef = doc(db, 'comercios', storeId);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        const data = storeSnap.data();
        const isActive = data.activo !== undefined ? data.activo : false;
        setStoreStatus(isActive);
        return isActive;
      } else {
        setStoreStatus(false);
        return false;
      }
    } catch (error) {
      console.error('Error al verificar estado de la tienda:', error);
      return false;
    }
  }, [storeId]);

  // Verificar automáticamente al cargar o cambiar de ruta
  useEffect(() => {
    let isMounted = true;
    const verifyStatus = async () => {
      if (!storeId) return;
      setLoading(true);
      await checkStoreStatus();
      if (isMounted) {
        setLoading(false);
      }
    };

    verifyStatus();

    return () => {
      isMounted = false;
    };
  }, [storeId, location.pathname, checkStoreStatus]);

  // Handler para el botón de verificar estado en la pantalla de espera
  const handleCheckStatusFromOverlay = async () => {
    const active = await checkStoreStatus();
    if (active) {
      alert('¡Cuenta activada con éxito! Bienvenido a Valhalla Express.');
      window.location.reload(); // Recarga para entrar de lleno al sistema
    } else {
      alert('La cuenta aún sigue pendiente de aprobación por el administrador.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-gray-500 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-green-600/20 border-t-green-600 rounded-full animate-spin" />
        <span>Cargando sistema comercial...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col relative antialiased selection:bg-green-600 selection:text-white">
      
      {/* 🛑 BLOQUEO TOTAL: Si 'activo' es false, se muestra la pantalla de espera interactiva */}
      {!storeStatus && (
        <SuspendedOverlay storeId={storeId} onCheckStatus={handleCheckStatusFromOverlay} />
      )}

      {/* Menú de Navegación superior */}
      <NavAdmin />

      {/* Contenedor Principal donde se montan las pantallas hijas */}
      <main className="flex-1 w-full pb-8">
        <Outlet />
      </main>

    </div>
  );
}