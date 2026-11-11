import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
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

  useEffect(() => {
    if (!storeId || !categoryId) {
      setProducts([]);
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const prodRef = collection(db, 'comercios', storeId, 'categories', categoryId, 'products');
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const cleanName = prodName.trim();
    if (!cleanName || !prodPrice || !categoryId || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const storeRef = doc(db, 'comercios', storeId);
      const storeSnap = await getDoc(storeRef);
      const storeData = storeSnap.exists() ? storeSnap.data() : {};
      let planKey = storeData.plan || storeData.planSeleccionado || 'basico';
      if (planKey === 'plan_basico') planKey = 'basico';

      const planSnap = await getDoc(doc(db, 'express_planes', planKey));
      const planData = planSnap.exists() ? planSnap.data() : { maxProductosPorCat: 30 };
      const maxProducts = Number(planData.maxProductosPorCat ?? 30);

      if (maxProducts !== -1 && products.length >= maxProducts) {
        setErrorMsg(`Has alcanzado el límite de ${maxProducts} productos permitidos por categoría para tu plan.`);
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
        collection(db, 'comercios', storeId, 'categories', categoryId, 'products'),
        newProductData
      );

      setProducts(prev => [...prev, { id: docRef.id, ...newProductData }]);
      setRefreshKey(prev => prev + 1);

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

  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm('¿Eliminar este producto del stock?')) return;
    try {
      await deleteDoc(doc(db, 'comercios', storeId, 'categories', categoryId, 'products', prodId));
      setProducts(prev => prev.filter(p => p.id !== prodId));
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 flex flex-col h-auto min-h-35 lg:h-[75vh] shadow-sm">
      
      {/* Cabecera y Contadores */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100 mb-4">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 truncate">
            <Package className="w-5 h-5 text-green-600 shrink-0" />
            <span className="truncate">
              Productos de:{' '}
              <span className="text-green-600 font-semibold">
                {categoryName || 'Selecciona una categoría'}
              </span>
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {categoryId && (
            <PlanLimitsBadge key={refreshKey} type="products" categoryId={categoryId} />
          )}
          <span className="text-[11px] sm:text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-xl font-mono">
            Total: <strong className="text-gray-900">{products.length}</strong>
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Carga Rápida */}
      {categoryId ? (
        <form
          onSubmit={handleAddProduct}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-4 bg-gray-50 p-3.5 sm:p-4 rounded-2xl border border-gray-200"
        >
          <input
            type="text"
            placeholder="Nombre del producto"
            value={prodName}
            onChange={e => setProdName(e.target.value)}
            className="sm:col-span-4 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
          />
          <input
            type="number"
            placeholder="Precio ($)"
            value={prodPrice}
            onChange={e => setProdPrice(e.target.value)}
            className="sm:col-span-3 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
          />
          <input
            type="number"
            placeholder="Stock inicial"
            value={prodStock}
            onChange={e => setProdStock(e.target.value)}
            className="sm:col-span-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
          />
          <input
            type="text"
            placeholder="SKU / Código"
            value={prodSku}
            onChange={e => setProdSku(e.target.value)}
            className="sm:col-span-3 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
          />
          <button
            type="submit"
            disabled={loading || !prodName.trim() || !prodPrice}
            className="sm:col-span-12 py-2.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 mt-0.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto al Stock</span>
          </button>
        </form>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-500 mb-4">
          Selecciona una categoría para cargar y gestionar sus productos.
        </div>
      )}

      {/* Contenedor de Productos */}
      <div className="overflow-y-auto flex-1 pr-1 min-h-40 scrollbar-thin scrollbar-thumb-gray-200">
        {!categoryId ? (
          <div className="h-full min-h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl p-4">
            Esperando selección de categoría...
          </div>
        ) : products.length === 0 ? (
          <div className="h-full min-h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl p-4">
            No hay productos cargados en esta categoría.
          </div>
        ) : (
          <>
            {/* Vista Smartphone */}
            <div className="space-y-2 md:hidden">
              {products.map(prod => (
                <div
                  key={prod.id}
                  className="bg-gray-50 border border-gray-200/80 p-3 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs font-semibold text-gray-900 truncate">
                      {prod.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                      <span>SKU: {prod.sku}</span>
                      <span>•</span>
                      <span className={prod.stock > 5 ? 'text-green-600' : 'text-red-500'}>
                        {prod.stock} un.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-green-600 font-mono">
                      ${Number(prod.price || 0).toLocaleString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-200/60 transition cursor-pointer"
                      title="Eliminar producto"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista PC / Tablet */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400">
                    <th className="py-3 px-3">Producto</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Precio</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {products.map(prod => (
                    <tr key={prod.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-gray-900">{prod.name}</td>
                      <td className="py-3.5 px-3 font-mono text-gray-500">{prod.sku}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                            prod.stock > 5
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}
                        >
                          {prod.stock} un.
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold font-mono text-green-600">
                        ${Number(prod.price || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-gray-100 cursor-pointer"
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