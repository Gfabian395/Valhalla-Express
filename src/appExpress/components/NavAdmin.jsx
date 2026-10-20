import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Store, Building2, ExternalLink } from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function NavAdmin() {
  // Obtener el storeId de forma dinámica usando el UID del usuario logueado con Google
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [storeName, setStoreName] = useState('Cargando comercio...');
  
  const superTitleFont = { fontFamily: "'Caesar Dressing', cursive" };

  // Obtener el nombre real del comercio desde Firestore en tiempo real
  useEffect(() => {
    if (!storeId) return;
    const fetchStoreName = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists() && storeSnap.data().name) {
          setStoreName(storeSnap.data().name);
        } else {
          setStoreName('Mi Supermercado');
        }
      } catch (error) {
        console.error('Error al obtener el nombre del comercio:', error);
        setStoreName('Mi Supermercado');
      }
    };
    fetchStoreName();
  }, [storeId]);

  const handleOpenCatalog = () => {
    if (!storeId) return;
    const catalogUrl = `/tienda/${storeId}`;
    window.open(catalogUrl, '_blank');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
      isActive
        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105'
        : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-emerald-400 border border-slate-800/80'
    }`;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Caesar+Dressing&display=swap" rel="stylesheet" />

      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Nombre del comercio dinámico (SaaS) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span 
                className="text-emerald-400 text-lg md:text-xl tracking-wider uppercase drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] block"
                style={superTitleFont}
              >
                {storeName}
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest block -mt-1">
                POS Multi-Comercio SaaS
              </span>
            </div>
          </div>

          {/* Menú de Navegación y Botón Ver Catálogo */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <nav className="flex items-center gap-2 flex-wrap justify-center">
              <NavLink to="/express/pos" className={linkClass}>
                <ShoppingCart className="w-4 h-4" /> Caja
              </NavLink>
              
              <NavLink to="/express/stock" className={linkClass}>
                <Package className="w-4 h-4" /> Existencias
              </NavLink>
              
              <NavLink to="/express/fiados" className={linkClass}>
                <Users className="w-4 h-4" /> Fiados
              </NavLink>
              
              <NavLink to="/express/config" className={linkClass}>
                <Store className="w-4 h-4" /> Configuración
              </NavLink>
            </nav>

            {/* Botón Ver Mi Catálogo con estilo verde neón */}
            <button
              onClick={handleOpenCatalog}
              disabled={!storeId}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              title="Abrir catálogo público en una pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" /> Ver mi catálogo
            </button>
          </div>

        </div>
      </header>
    </>
  );
}