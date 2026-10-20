import { useState, useEffect } from 'react';
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

  // Verificar en Firestore si la tienda está activa (status: true) o suspendida (status: false)
  useEffect(() => {
    if (!storeId) return;
    const checkStoreStatus = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          setStoreStatus(data.status !== undefined ? data.status : true);
        }
      } catch (error) {
        console.error('Error al verificar estado de la tienda:', error);
      } finally {
        setLoading(false);
      }
    };
    checkStoreStatus();
  }, [storeId, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-mono text-xs">
        Cargando sistema comercial...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      
      {/* 🛑 BLOQUEO TOTAL: Si el status es false, se tapa toda la pantalla e impide usar el sistema */}
      {!storeStatus && <SuspendedOverlay storeId={storeId} />}

      {/* El Menú de Navegación fijo arriba */}
      <NavAdmin />

      {/* El Contenedor Padre donde cambian las pantallas hijas según la ruta */}
      <main className="flex-1">
        <Outlet />
      </main>

    </div>
  );
}