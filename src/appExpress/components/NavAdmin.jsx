import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Store, Building2, ExternalLink, DollarSign, Share2, Menu, X } from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function NavAdmin() {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [storeName, setStoreName] = useState('Cargando comercio...');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;
    const fetchStoreName = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (isMounted) {
          if (storeSnap.exists() && storeSnap.data().name) {
            setStoreName(storeSnap.data().name);
          } else {
            setStoreName('Mi Supermercado');
          }
        }
      } catch (error) {
        console.error('Error al obtener el nombre del comercio:', error);
        if (isMounted) {
          setStoreName('Mi Supermercado');
        }
      }
    };

    fetchStoreName();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  const handleOpenCatalog = () => {
    if (!storeId) return;
    const catalogUrl = `/tienda/${storeId}`;
    window.open(catalogUrl, '_blank');
    setIsMobileMenuOpen(false);
  };

  const handleShareCatalog = async () => {
    if (!storeId) return;
    const catalogUrl = `${window.location.origin}/tienda/${storeId}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(catalogUrl);
        alert('¡Enlace del catálogo copiado al portapapeles! Ya podés compartirlo.');
      } else {
        window.prompt('Copiá el siguiente enlace de tu catálogo:', catalogUrl);
      }
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      window.prompt('Copiá el siguiente enlace de tu catálogo:', catalogUrl);
    }

    setIsMobileMenuOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
      isActive
        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
        : 'text-slate-400 hover:text-gray-100 hover:bg-slate-800/60'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
      isActive
        ? 'bg-emerald-500 text-slate-950 font-bold'
        : 'bg-slate-950/60 text-slate-300 hover:bg-slate-900 border border-gray-800/80'
    }`;

  return (
    <header className="bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 px-3.5 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Identidad del Comercio */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 border border-gray-800 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-gray-100 text-sm sm:text-base font-bold tracking-tight block truncate leading-tight">
              {storeName}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Multi-Comercio
            </span>
          </div>
        </div>

        {/* Navegación Desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-slate-900/80 border border-gray-800 p-1 rounded-2xl">
            <NavLink to="/express/pos" className={linkClass}>
              <ShoppingCart className="w-4 h-4" />
              <span>Caja</span>
            </NavLink>

            <NavLink to="/express/stock" className={linkClass}>
              <Package className="w-4 h-4" />
              <span>Existencias</span>
            </NavLink>

            <NavLink to="/express/ventas-dia" className={linkClass}>
              <DollarSign className="w-4 h-4" />
              <span>Ventas del Día</span>
            </NavLink>

            <NavLink to="/express/fiados" className={linkClass}>
              <Users className="w-4 h-4" />
              <span>Fiados</span>
            </NavLink>

            <NavLink to="/express/config" className={linkClass}>
              <Store className="w-4 h-4" />
              <span>Configuración</span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-800">
            <button
              type="button"
              onClick={handleShareCatalog}
              disabled={!storeId}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-300 border border-gray-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              title="Copiar URL del catálogo para WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCatalog}
              disabled={!storeId}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              title="Abrir catálogo público en una pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver catálogo</span>
            </button>
          </div>
        </div>

        {/* Botón Hamburguesa Móvil */}
        <div className="flex lg:hidden items-center">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-slate-900 border border-gray-800 text-slate-200 hover:text-emerald-400 rounded-xl transition"
            aria-label="Abrir menú de navegación"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Menú Desplegable Móvil */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-gray-800/80 space-y-3">
          <nav className="flex flex-col gap-1.5">
            <NavLink
              to="/express/pos"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Caja</span>
            </NavLink>

            <NavLink
              to="/express/stock"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <Package className="w-4 h-4" />
              <span>Existencias</span>
            </NavLink>

            <NavLink
              to="/express/ventas-dia"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <DollarSign className="w-4 h-4" />
              <span>Ventas del Día</span>
            </NavLink>

            <NavLink
              to="/express/fiados"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <Users className="w-4 h-4" />
              <span>Fiados</span>
            </NavLink>

            <NavLink
              to="/express/config"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <Store className="w-4 h-4" />
              <span>Configuración</span>
            </NavLink>
          </nav>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
            <button
              type="button"
              onClick={handleShareCatalog}
              disabled={!storeId}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-gray-800 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCatalog}
              disabled={!storeId}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver catálogo</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}