import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { canCreateProduct } from '../services/planValidation';
import PlanLimitsBadge from './PlanLimitsBadge';
import { Package, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function ProductList({ storeId, categoryId, categoryName }) {
  const [products, setProducts] = useState([]);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Cargar productos de la categoría seleccionada
  useEffect(() => {
    if (!storeId || !categoryId) {
      setProducts([]);
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const prodRef = collection(db, 'stores', storeId, 'categories', categoryId, 'products');
        const snap = await getDocs(prodRef);
        if (isMounted) {
          setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [storeId, categoryId, refreshKey]);

  // Crear producto validando límite del plan en Firebase
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const cleanName = prodName.trim();
    if (!cleanName || !prodPrice || !categoryId || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const validation = await canCreateProduct(storeId, categoryId);
      if (!validation.allowed) {
        setErrorMsg(validation.message);
        setLoading(false);
        return;
      }

      const newProductData = {
        name: cleanName,
        price: Number(prodPrice),
        stock: Number(prodStock || 0),
        sku: prodSku.trim() || '---',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(
        collection(db, 'stores', storeId, 'categories', categoryId, 'products'),
        newProductData
      );

      setProducts(prev => [...prev, { id: docRef.id, ...newProductData }]);
      setRefreshKey(prev => prev + 1);

      // Limpiar formulario
      setProdName('');
      setProdPrice('');
      setProdStock('');
      setProdSku('');
    } catch (error) {
      console.error('Error al agregar producto:', error);
      setErrorMsg('Hubo un error al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm('¿Eliminar este producto del stock?')) return;
    try {
      await deleteDoc(doc(db, 'stores', storeId, 'categories', categoryId, 'products', prodId));
      setProducts(prev => prev.filter(p => p.id !== prodId));
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col h-auto min-h-[460px] lg:h-[75vh] shadow-xl backdrop-blur-sm">
      
      {/* Cabecera y Contadores */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-800/80 mb-4">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2 truncate">
            <Package className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="truncate">
              Productos de:{' '}
              <span className="text-emerald-400 font-semibold">
                {categoryName || 'Selecciona una categoría'}
              </span>
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {categoryId && (
            <PlanLimitsBadge key={refreshKey} type="products" categoryId={categoryId} />
          )}
          <span className="text-[11px] sm:text-xs bg-slate-950/80 text-slate-300 border border-gray-800 px-2.5 py-1 rounded-lg font-mono">
            Total: <strong className="text-gray-100">{products.length}</strong>
          </span>
        </div>
      </div>

      {/* Alerta de Error */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Carga Rápida */}
      {categoryId ? (
        <form
          onSubmit={handleAddProduct}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-4 bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-gray-800"
        >
          <input
            type="text"
            placeholder="Nombre del producto"
            value={prodName}
            onChange={e => setProdName(e.target.value)}
            className="sm:col-span-4 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          <input
            type="number"
            placeholder="Precio ($)"
            value={prodPrice}
            onChange={e => setProdPrice(e.target.value)}
            className="sm:col-span-3 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          <input
            type="number"
            placeholder="Stock inicial"
            value={prodStock}
            onChange={e => setProdStock(e.target.value)}
            className="sm:col-span-2 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          <input
            type="text"
            placeholder="SKU / Código"
            value={prodSku}
            onChange={e => setProdSku(e.target.value)}
            className="sm:col-span-3 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={loading || !prodName.trim() || !prodPrice}
            className="sm:col-span-12 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 mt-0.5 shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto al Stock</span>
          </button>
        </form>
      ) : (
        <div className="p-4 bg-slate-950/40 border border-gray-800 rounded-xl text-center text-xs text-slate-400 mb-4">
          Selecciona una categoría para cargar y gestionar sus productos.
        </div>
      )}

      {/* Contenedor de Productos: Cards en Mobile, Tabla en Desktop */}
      <div className="overflow-y-auto flex-1 pr-1 min-h-[160px] scrollbar-thin scrollbar-thumb-gray-800">
        {!categoryId ? (
          <div className="h-full min-h-[160px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-gray-800/60 rounded-xl p-4">
            Esperando selección de categoría...
          </div>
        ) : products.length === 0 ? (
          <div className="h-full min-h-[160px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-gray-800/60 rounded-xl p-4">
            No hay productos cargados en esta categoría.
          </div>
        ) : (
          <>
            {/* Vista Smartphone (Cards apiladas) */}
            <div className="space-y-2 md:hidden">
              {products.map(prod => (
                <div
                  key={prod.id}
                  className="bg-slate-950/70 border border-gray-800/80 p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs font-semibold text-gray-100 truncate">
                      {prod.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>SKU: {prod.sku}</span>
                      <span>•</span>
                      <span className={prod.stock > 5 ? 'text-emerald-400' : 'text-red-400'}>
                        {prod.stock} un.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      ${Number(prod.price || 0).toLocaleString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition"
                      title="Eliminar producto"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista PC / Tablet (Tabla Clásica) */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-[11px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Stock</th>
                    <th className="py-2.5 px-3">Precio</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-xs">
                  {products.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-100">{prod.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{prod.sku}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                            prod.stock > 5
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {prod.stock} un.
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-emerald-400">
                        ${Number(prod.price || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-slate-800"
                          title="Eliminar producto"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
}