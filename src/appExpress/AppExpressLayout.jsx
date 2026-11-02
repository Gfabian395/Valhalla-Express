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

    let isMounted = true;

    const checkStoreStatus = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (isMounted && storeSnap.exists()) {
          const data = storeSnap.data();
          setStoreStatus(data.status !== undefined ? data.status : true);
        }
      } catch (error) {
        console.error('Error al verificar estado de la tienda:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkStoreStatus();

    return () => {
      isMounted = false;
    };
  }, [storeId, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span>Cargando sistema comercial...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col relative antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 🛑 BLOQUEO TOTAL: Si el status es false, se tapa toda la pantalla e impide usar el sistema */}
      {!storeStatus && <SuspendedOverlay storeId={storeId} />}

      {/* Menú de Navegación superior */}
      <NavAdmin />

      {/* Contenedor Principal donde se montan las pantallas hijas */}
      <main className="flex-1 w-full pb-8">
        <Outlet />
      </main>

    </div>
  );
}