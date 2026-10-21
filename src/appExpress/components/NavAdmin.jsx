import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Store, Building2, ExternalLink, DollarSign, Share2, Menu, X } from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function NavAdmin() {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [storeName, setStoreName] = useState('Cargando comercio...');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const superTitleFont = { fontFamily: "'Caesar Dressing', cursive" };

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
    setIsMobileMenuOpen(false);
  };

  const handleShareCatalog = () => {
    if (!storeId) return;
    const catalogUrl = `${window.location.origin}/tienda/${storeId}`;
    navigator.clipboard.writeText(catalogUrl);
    alert('¡Enlace del catálogo copiado al portapapeles! Ya puedes compartirlo por WhatsApp.');
    setIsMobileMenuOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
      isActive
        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
        : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-emerald-400 border border-slate-800/80'
    }`;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Caesar+Dressing&display=swap" rel="stylesheet" />

      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo / Nombre del comercio */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span 
                className="text-emerald-400 text-base sm:text-lg tracking-wider uppercase drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] block leading-tight"
                style={superTitleFont}
              >
                {storeName}
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest block">
                Multi-Comercio
              </span>
            </div>
          </div>

          {/* Menú de Navegación para Escritorio (Desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <nav className="flex items-center gap-1.5">
              <NavLink to="/express/pos" className={linkClass}>
                <ShoppingCart className="w-4 h-4" /> Caja
              </NavLink>
              
              <NavLink to="/express/stock" className={linkClass}>
                <Package className="w-4 h-4" /> Existencias
              </NavLink>

              <NavLink to="/express/ventas-dia" className={linkClass}>
                <DollarSign className="w-4 h-4" /> Ventas del Día
              </NavLink>
              
              <NavLink to="/express/fiados" className={linkClass}>
                <Users className="w-4 h-4" /> Fiados
              </NavLink>
              
              <NavLink to="/express/config" className={linkClass}>
                <Store className="w-4 h-4" /> Configuración
              </NavLink>
            </nav>

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
              <button
                onClick={handleShareCatalog}
                disabled={!storeId}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-md"
                title="Copiar URL del catálogo para WhatsApp"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>

              <button
                onClick={handleOpenCatalog}
                disabled={!storeId}
                className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                title="Abrir catálogo público en una pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" /> Ver catálogo
              </button>
            </div>
          </div>

          {/* Botón Hamburguesa para Celulares y Tablets (Mobile) */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 bg-slate-950 border border-slate-800 text-slate-200 hover:text-emerald-400 rounded-xl transition shadow-md"
              aria-label="Abrir menú de navegación"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-emerald-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Menú Desplegable Móvil */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1.5">
              <NavLink 
                to="/express/pos" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={linkClass}
              >
                <ShoppingCart className="w-4 h-4" /> Caja
              </NavLink>
              
              <NavLink 
                to="/express/stock" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={linkClass}
              >
                <Package className="w-4 h-4" /> Existencias
              </NavLink>

              <NavLink 
                to="/express/ventas-dia" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={linkClass}
              >
                <DollarSign className="w-4 h-4" /> Ventas del Día
              </NavLink>
              
              <NavLink 
                to="/express/fiados" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={linkClass}
              >
                <Users className="w-4 h-4" /> Fiados
              </NavLink>
              
              <NavLink 
                to="/express/config" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={linkClass}
              >
                <Store className="w-4 h-4" /> Configuración
              </NavLink>
            </nav>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={handleShareCatalog}
                disabled={!storeId}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>

              <button
                onClick={handleOpenCatalog}
                disabled={!storeId}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <ExternalLink className="w-4 h-4" /> Ver catálogo
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}