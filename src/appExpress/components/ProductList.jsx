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
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar actualización del badge

  // Cargar productos de la categoría seleccionada
  useEffect(() => {
    if (!storeId || !categoryId) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      try {
        const prodRef = collection(db, 'stores', storeId, 'categories', categoryId, 'products');
        const snap = await getDocs(prodRef);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };

    fetchProducts();
  }, [storeId, categoryId, refreshKey]);

  // Crear producto validando estrictamente el límite del plan en Firebase
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || !categoryId || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Validar límite de productos por categoría según ExpressPlanes en Firebase
      const validation = await canCreateProduct(storeId, categoryId);
      if (!validation.allowed) {
        setErrorMsg(validation.message);
        setLoading(false);
        return; // ⛔ Bloquea si supera el límite de productos por categoría
      }

      // 2. Guardar en Firestore
      const newProductData = {
        name: prodName.trim(),
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
      setRefreshKey(prev => prev + 1); // Refresca el contador del badge
      
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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-full shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-wide text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" /> 
            Productos de: <span className="text-emerald-400">{categoryName || 'Selecciona una categoría'}</span>
          </h2>
        </div>
        
        {/* Contadores y Límites en la cabecera */}
        <div className="flex items-center gap-3">
          {categoryId && <PlanLimitsBadge key={refreshKey} type="products" categoryId={categoryId} />}
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
            Total: {products.length}
          </span>
        </div>
      </div>

      {/* Alerta de error o límite de plan */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario de carga rápida */}
      {categoryId ? (
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={prodName}
            onChange={e => setProdName(e.target.value)}
            className="sm:col-span-4 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            placeholder="Precio ($)"
            value={prodPrice}
            onChange={e => setProdPrice(e.target.value)}
            className="sm:col-span-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            placeholder="Stock"
            value={prodStock}
            onChange={e => setProdStock(e.target.value)}
            className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="SKU / Código"
            value={prodSku}
            onChange={e => setProdSku(e.target.value)}
            className="sm:col-span-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-12 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 mt-1"
          >
            <Plus className="w-4 h-4" /> Agregar Producto al Stock
          </button>
        </form>
      ) : (
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-center text-xs text-slate-500 mb-4">
          Selecciona una categoría a la izquierda para poder cargar productos.
        </div>
      )}

      {/* Tabla de Productos */}
      <div className="overflow-y-auto flex-1 pr-1">
        {!categoryId ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Esperando selección de categoría...
          </div>
        ) : products.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No hay productos cargados en esta categoría.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <th className="py-2 px-3">Producto</th>
                <th className="py-2 px-3">SKU</th>
                <th className="py-2 px-3">Stock</th>
                <th className="py-2 px-3">Precio</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-950/40 transition">
                  <td className="py-3 px-3 font-bold text-slate-100">{prod.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{prod.sku}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${prod.stock > 5 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'}`}>
                      {prod.stock} un.
                    </span>
                  </td>
                  <td className="py-3 px-3 font-black text-emerald-400">${Number(prod.price).toLocaleString('es-AR')}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}