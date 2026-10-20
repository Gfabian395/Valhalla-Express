import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { canCreateProduct } from '../services/planValidation';
import CategoryList from '../components/CategoryList';
import ShelfLabelsModal from '../components/ShelfLabelsModal';
import PlanLimitsBadge from '../components/PlanLimitsBadge';
import { Package, Plus, Printer, Trash2, AlertCircle, LogIn, X, Save, Building2, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StockCategories() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);

  // Estados para sucursales
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('main'); // 'main' para la sucursal principal

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [products, setProducts] = useState([]);
  
  // Estados del formulario de producto (con isWeightBased individual)
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodIsWeight, setProdIsWeight] = useState(false); // ⚖️ Checkbox para venta por kilo por producto
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Para actualizar el badge en tiempo real

  // Estados para el Modal Flotante de Edición de Producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editIsWeight, setEditIsWeight] = useState(false);

  // Modal de impresión de góndola
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setStoreId(user.uid);
      } else {
        setStoreId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cargar lista de sucursales disponibles
  useEffect(() => {
    if (!storeId) return;
    const fetchBranches = async () => {
      try {
        const snap = await getDocs(collection(db, 'stores', storeId, 'branches'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBranches(list);
      } catch (error) {
        console.error('Error al cargar sucursales:', error);
      }
    };
    fetchBranches();
  }, [storeId]);

  // Limpiar categoría seleccionada al cambiar de sucursal
  useEffect(() => {
    setSelectedCategoryId(null);
    setSelectedCategoryName('');
    setProducts([]);
  }, [selectedBranchId]);

  // Cargar productos de la categoría seleccionada según la sucursal activa
  useEffect(() => {
    if (!storeId || !selectedCategoryId) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      try {
        let prodRef;
        if (selectedBranchId === 'main') {
          prodRef = collection(db, 'stores', storeId, 'categories', selectedCategoryId, 'products');
        } else {
          prodRef = collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products');
        }

        const snap = await getDocs(prodRef);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data(), categoryName: selectedCategoryName })));
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };

    fetchProducts();
  }, [storeId, selectedBranchId, selectedCategoryId, selectedCategoryName, refreshKey]);

  // Crear producto validando estrictamente el límite por categoría
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || !selectedCategoryId || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const validation = await canCreateProduct(storeId, selectedCategoryId, selectedBranchId === 'main' ? null : selectedBranchId);
      if (!validation.allowed) {
        setErrorMsg(validation.message);
        setLoading(false);
        return; 
      }

      const newProductData = {
        name: prodName.trim(),
        price: Number(prodPrice),
        stock: prodIsWeight ? 0 : Number(prodStock || 0), // Si es por peso, stock en 0 libre
        sku: prodSku.trim() || '---',
        isWeightBased: prodIsWeight, // ⚖️ Guardado directo en el documento del producto
        createdAt: new Date().toISOString()
      };

      let targetCollection;
      if (selectedBranchId === 'main') {
        targetCollection = collection(db, 'stores', storeId, 'categories', selectedCategoryId, 'products');
      } else {
        targetCollection = collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products');
      }

      const docRef = await addDoc(targetCollection, newProductData);

      setProducts(prev => [...prev, { id: docRef.id, ...newProductData, categoryName: selectedCategoryName }]);
      setRefreshKey(prev => prev + 1);
      
      // Limpiar formulario
      setProdName('');
      setProdPrice('');
      setProdStock('');
      setProdSku('');
      setProdIsWeight(false);
    } catch (error) {
      console.error('Error al agregar producto:', error);
      setErrorMsg('Hubo un error al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de edición
  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setEditName(prod.name || '');
    setEditPrice(prod.price || '');
    setEditStock(prod.isWeightBased ? '' : (prod.stock || ''));
    setEditSku(prod.sku || '');
    setEditIsWeight(prod.isWeightBased || false);
  };

  // Guardar cambios del producto editado
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !storeId || !selectedCategoryId) return;

    setLoading(true);
    try {
      let prodRef;
      if (selectedBranchId === 'main') {
        prodRef = doc(db, 'stores', storeId, 'categories', selectedCategoryId, 'products', editingProduct.id);
      } else {
        prodRef = doc(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products', editingProduct.id);
      }

      const updatedData = {
        name: editName.trim(),
        price: Number(editPrice),
        stock: editIsWeight ? 0 : Number(editStock || 0),
        sku: editSku.trim() || '---',
        isWeightBased: editIsWeight
      };

      await updateDoc(prodRef, updatedData);

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...updatedData, categoryName: selectedCategoryName } : p));
      setEditingProduct(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      alert('No se pudo actualizar el producto.');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (prodId) => {
    if (!storeId || !selectedCategoryId) return;
    if (!window.confirm('¿Eliminar este producto del stock?')) return;
    try {
      let prodRef;
      if (selectedBranchId === 'main') {
        prodRef = doc(db, 'stores', storeId, 'categories', selectedCategoryId, 'products', prodId);
      } else {
        prodRef = doc(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products', prodId);
      }

      await deleteDoc(prodRef);
      setProducts(prev => prev.filter(p => p.id !== prodId));
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  if (!storeId) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase text-slate-100">Sesión no detectada</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Debes iniciar sesión con tu cuenta de Google para administrar el stock de tu comercio.
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" /> Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto relative">
      
      {/* Selector de Sucursal Activa */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase font-black tracking-wider text-slate-400">Inventario &amp; Stock</h2>
            <p className="text-sm font-black text-emerald-400">Administrando sucursal seleccionada</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase text-slate-400">Local:</span>
          <select
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            className="flex-1 sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="main">📍 Sucursal Principal</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                📍 {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cabecera de la Pantalla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-100 flex items-center gap-3">
            <Package className="w-7 h-7 text-emerald-400" /> Control de Stock &amp; Góndolas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra tus categorías, productos y genera precios rápidos para imprimir en la sucursal activa.
          </p>
        </div>

        <button
          onClick={() => setShowPrintModal(true)}
          disabled={products.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
        >
          <Printer className="w-4 h-4" /> Imprimir Precios de Góndola ({products.length})
        </button>
      </div>

      {/* Contenido Principal en Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Categorías */}
        <div className="lg:col-span-4 h-162.5">
          <CategoryList 
            storeId={storeId}
            branchId={selectedBranchId === 'main' ? null : selectedBranchId}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id, name) => {
              setSelectedCategoryId(id);
              setSelectedCategoryName(name);
            }}
          />
        </div>

        {/* Columna Productos y Stock */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-162.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-wide text-slate-100">
                Productos de: <span className="text-emerald-400">{selectedCategoryName || 'Selecciona una categoría'}</span>
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedCategoryId && <PlanLimitsBadge key={refreshKey} type="products" categoryId={selectedCategoryId} />}
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
                Total: {products.length}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {selectedCategoryId ? (
            <form onSubmit={handleAddProduct} className="space-y-3 mb-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Nombre del producto (ej: Jamón Cocido)"
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  className="sm:col-span-4 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={prodIsWeight ? "Precio por Kilo ($/kg)" : "Precio ($)"}
                  value={prodPrice}
                  onChange={e => setProdPrice(e.target.value)}
                  className="sm:col-span-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={prodIsWeight ? "No requiere stock" : "Stock unidades"}
                  value={prodIsWeight ? '' : prodStock}
                  disabled={prodIsWeight}
                  onChange={e => setProdStock(e.target.value)}
                  className={`sm:col-span-2 border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    prodIsWeight 
                      ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed' 
                      : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="SKU / Código"
                  value={prodSku}
                  onChange={e => setProdSku(e.target.value)}
                  className="sm:col-span-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* ⚖️ Checkbox de Venta por Kilo */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prodIsWeight}
                    onChange={e => {
                      const checked = e.target.checked;
                      setProdIsWeight(checked);
                      if (checked) setProdStock(''); // Limpia el stock al activar
                    }}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" /> Venta por peso (Se vende por Kilo / Gramos - No exige stock)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2"
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
            {!selectedCategoryId ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Esperando selección de categoría...
              </div>
            ) : products.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No hay productos cargados en esta categoría para esta sucursal.
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
                      <td className="py-3 px-3 font-bold text-slate-100">
                        {prod.name}
                        {prod.isWeightBased && (
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 mt-0.5 ml-2">
                            <Scale className="w-3 h-3" /> Por Kilo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">{prod.sku}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          {prod.isWeightBased ? 'Sin límite (Peso)' : `${prod.stock} un.`}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-400">
                        ${Number(prod.price).toLocaleString('es-AR')} {prod.isWeightBased && <span className="text-[10px] text-slate-400 font-normal">/kg</span>}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-500 hover:text-emerald-400 transition rounded-lg"
                          title="Editar Producto y Stock"
                        >
                          <i className='bx bx-edit text-base'></i>
                        </button>
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
      </div>

      {/* Modal de Impresión de Etiquetas */}
      {showPrintModal && (
        <ShelfLabelsModal
          products={products}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* MODAL FLOTANTE DE EDICIÓN */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wide text-emerald-400 flex items-center gap-2">
                <i className='bx bx-edit text-lg'></i> Editar Producto &amp; Stock
              </h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Precio ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stock Disponible</label>
                  <input
                    type="number"
                    step="any"
                    value={editIsWeight ? '' : editStock}
                    disabled={editIsWeight}
                    onChange={e => setEditStock(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none ${
                      editIsWeight 
                        ? 'bg-slate-950/40 border-slate-800/50 text-slate-600 cursor-not-allowed' 
                        : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">SKU / Código</label>
                <input
                  type="text"
                  value={editSku}
                  onChange={e => setEditSku(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* ⚖️ Checkbox de Venta por Kilo en Edición */}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={editIsWeight}
                  onChange={e => {
                    const checked = e.target.checked;
                    setEditIsWeight(checked);
                    if (checked) setEditStock('');
                  }}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" /> Venta por peso (Kilo / Gramos)
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}