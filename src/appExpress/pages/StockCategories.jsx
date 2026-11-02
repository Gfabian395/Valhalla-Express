import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { canCreateProduct } from '../services/planValidation';
import CategoryList from '../components/CategoryList';
import ShelfLabelsModal from '../components/ShelfLabelsModal';
import PlanLimitsBadge from '../components/PlanLimitsBadge';
import { Package, Plus, Printer, Trash2, AlertCircle, LogIn, X, Save, Building2, Scale, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StockCategories() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);

  // Estados para sucursales
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('main');

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [products, setProducts] = useState([]);

  // Estados del formulario de producto
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodIsWeight, setProdIsWeight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados para el Modal de Edición de Producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editIsWeight, setEditIsWeight] = useState(false);

  // Modal de impresión de etiquetas para góndola
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Cargar sucursales registradas
  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchBranches = async () => {
      try {
        const snap = await getDocs(collection(db, 'stores', storeId, 'branches'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (isMounted) {
          setBranches(list);
        }
      } catch (error) {
        console.error('Error al cargar sucursales:', error);
      }
    };

    fetchBranches();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // Limpiar selección de categoría al cambiar de sucursal
  useEffect(() => {
    setSelectedCategoryId(null);
    setSelectedCategoryName('');
    setProducts([]);
  }, [selectedBranchId]);

  // Cargar productos de la categoría seleccionada
  useEffect(() => {
    if (!storeId || !selectedCategoryId) {
      setProducts([]);
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const prodRef =
          selectedBranchId === 'main'
            ? collection(db, 'stores', storeId, 'categories', selectedCategoryId, 'products')
            : collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products');

        const snap = await getDocs(prodRef);
        if (isMounted) {
          setProducts(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              categoryName: selectedCategoryName
            }))
          );
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [storeId, selectedBranchId, selectedCategoryId, selectedCategoryName, refreshKey]);

  // Agregar nuevo producto validando el cupo del plan
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const cleanName = prodName.trim();
    if (!cleanName || !prodPrice || !selectedCategoryId || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const validation = await canCreateProduct(
        storeId,
        selectedCategoryId,
        selectedBranchId === 'main' ? null : selectedBranchId
      );

      if (!validation.allowed) {
        setErrorMsg(validation.message);
        setLoading(false);
        return;
      }

      const newProductData = {
        name: cleanName,
        price: Number(prodPrice),
        stock: prodIsWeight ? 0 : Number(prodStock || 0),
        sku: prodSku.trim() || '---',
        isWeightBased: prodIsWeight,
        createdAt: new Date().toISOString()
      };

      const targetCollection =
        selectedBranchId === 'main'
          ? collection(db, 'stores', storeId, 'categories', selectedCategoryId, 'products')
          : collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products');

      const docRef = await addDoc(targetCollection, newProductData);

      setProducts((prev) => [
        ...prev,
        { id: docRef.id, ...newProductData, categoryName: selectedCategoryName }
      ]);
      setRefreshKey((prev) => prev + 1);

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
    setEditStock(prod.isWeightBased ? '' : prod.stock ?? '');
    setEditSku(prod.sku || '');
    setEditIsWeight(prod.isWeightBased || false);
  };

  // Guardar cambios del producto editado
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !storeId || !selectedCategoryId) return;

    setLoading(true);
    try {
      const prodRef =
        selectedBranchId === 'main'
          ? doc(db, 'stores', storeId, 'categories', selectedCategoryId, 'products', editingProduct.id)
          : doc(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products', editingProduct.id);

      const updatedData = {
        name: editName.trim(),
        price: Number(editPrice),
        stock: editIsWeight ? 0 : Number(editStock || 0),
        sku: editSku.trim() || '---',
        isWeightBased: editIsWeight
      };

      await updateDoc(prodRef, updatedData);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, ...updatedData, categoryName: selectedCategoryName }
            : p
        )
      );
      setEditingProduct(null);
      setRefreshKey((prev) => prev + 1);
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
      const prodRef =
        selectedBranchId === 'main'
          ? doc(db, 'stores', storeId, 'categories', selectedCategoryId, 'products', prodId)
          : doc(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', selectedCategoryId, 'products', prodId);

      await deleteDoc(prodRef);
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  if (!storeId) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4 text-gray-100">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-100">Sesión no detectada</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Debes iniciar sesión con tu cuenta de Google para administrar el inventario.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-500/20"
        >
          <LogIn className="w-4 h-4" />
          <span>Ir a Iniciar Sesión</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-gray-100 relative">
      
      {/* Selector de Sucursal Activa */}
      <div className="bg-gray-900/90 border border-gray-800 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-950 border border-gray-800 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-gray-100 tracking-tight leading-tight">
              Inventario &amp; Stock
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium">
              Administrando sucursal seleccionada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-950/80 border border-gray-800 rounded-xl px-3 py-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Local:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full sm:w-60 bg-transparent text-xs font-semibold text-gray-100 focus:outline-none cursor-pointer py-0.5"
          >
            <option value="main" className="bg-slate-900 text-gray-100">Sucursal Principal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id} className="bg-slate-900 text-gray-100">
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cabecera Principal y Acción de Impresión */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0" />
            <span>Control de Stock &amp; Góndolas</span>
          </h1>
          <p className="text-xs text-slate-400">
            Administra categorías, existencias e imprime cenefas de precio en la sucursal activa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPrintModal(true)}
          disabled={products.length === 0}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Góndola ({products.length})</span>
        </button>
      </div>

      {/* Grilla Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        {/* Columna Categorías */}
        <div className="lg:col-span-4 w-full">
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
        <div className="lg:col-span-8 w-full bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col h-auto min-h-35 lg:h-[75vh] shadow-xl backdrop-blur-sm">
          
          {/* Cabecera de Categoría Seleccionada */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-800/80 mb-4">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-100 truncate">
                Productos de:{' '}
                <span className="text-emerald-400 font-semibold">
                  {selectedCategoryName || 'Selecciona una categoría'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {selectedCategoryId && (
                <PlanLimitsBadge key={refreshKey} type="products" categoryId={selectedCategoryId} />
              )}
              <span className="text-[11px] sm:text-xs bg-slate-950/80 text-slate-300 border border-gray-800 px-2.5 py-1 rounded-lg font-mono">
                Total: <strong className="text-gray-100">{products.length}</strong>
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          {/* Formulario de Alta Rápida de Producto */}
          {selectedCategoryId ? (
            <form
              onSubmit={handleAddProduct}
              className="space-y-3 mb-4 bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-gray-800"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  placeholder="Nombre del producto (ej: Jamón Cocido)"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="sm:col-span-4 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={prodIsWeight ? 'Precio Kilo ($/kg)' : 'Precio ($)'}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="sm:col-span-3 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={prodIsWeight ? 'No exige stock' : 'Stock inicial'}
                  value={prodIsWeight ? '' : prodStock}
                  disabled={prodIsWeight}
                  onChange={(e) => setProdStock(e.target.value)}
                  className={`sm:col-span-2 border rounded-xl px-3 py-2 text-xs font-mono transition focus:outline-none ${
                    prodIsWeight
                      ? 'bg-slate-900/40 border-gray-800/40 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-900 border-gray-800 text-gray-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="SKU / Código"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="sm:col-span-3 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Checkbox Venta por Kilo */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prodIsWeight}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setProdIsWeight(checked);
                      if (checked) setProdStock('');
                    }}
                    className="w-4 h-4 rounded border-gray-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Venta por peso (Kilo / Gramos - Sin control rígido de stock)</span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !prodName.trim() || !prodPrice}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Producto al Stock</span>
              </button>
            </form>
          ) : (
            <div className="p-4 bg-slate-950/40 border border-gray-800 rounded-xl text-center text-xs text-slate-400 mb-4">
              Selecciona una categoría a la izquierda para cargar y gestionar productos.
            </div>
          )}

          {/* Listado de Productos */}
          <div className="overflow-y-auto flex-1 pr-1 min-h-35 scrollbar-thin scrollbar-thumb-gray-800">
            {!selectedCategoryId ? (
              <div className="h-full min-h-35 flex items-center justify-center text-xs text-slate-500 border border-dashed border-gray-800/60 rounded-xl p-4">
                Esperando selección de categoría...
              </div>
            ) : products.length === 0 ? (
              <div className="h-full min-h-35 flex items-center justify-center text-xs text-slate-500 border border-dashed border-gray-800/60 rounded-xl p-4">
                No hay productos cargados en esta categoría para esta sucursal.
              </div>
            ) : (
              <>
                {/* Vista Smartphone (Cards apiladas) */}
                <div className="space-y-2 md:hidden">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-slate-950/70 border border-gray-800/80 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-semibold text-gray-100 truncate flex items-center gap-1.5">
                          <span className="truncate">{prod.name}</span>
                          {prod.isWeightBased && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono shrink-0">
                              Kg
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span>SKU: {prod.sku}</span>
                          <span>•</span>
                          <span className={prod.isWeightBased || prod.stock > 5 ? 'text-emerald-400' : 'text-red-400'}>
                            {prod.isWeightBased ? 'Por Kilo' : `${prod.stock} un.`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          ${Number(prod.price || 0).toLocaleString('es-AR')}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-900 transition"
                          title="Editar producto"
                          aria-label="Editar producto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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

                {/* Vista Tablet / Escritorio (Tabla) */}
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
                      {products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-gray-100">
                            <span className="align-middle">{prod.name}</span>
                            {prod.isWeightBased && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ml-2 align-middle">
                                <Scale className="w-3 h-3" /> Por Kilo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">{prod.sku}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                                prod.isWeightBased || prod.stock > 5
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                              {prod.isWeightBased ? 'Sin límite (Peso)' : `${prod.stock} un.`}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-emerald-400">
                            ${Number(prod.price || 0).toLocaleString('es-AR')}{' '}
                            {prod.isWeightBased && (
                              <span className="text-[10px] text-slate-400 font-normal">/kg</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 transition rounded-lg hover:bg-slate-800"
                              title="Editar Producto y Stock"
                              aria-label="Editar Producto y Stock"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* Modal de Impresión de Góndola */}
      {showPrintModal && (
        <ShelfLabelsModal
          products={products}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Modal Flotante de Edición */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-t-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full relative shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Editar Producto &amp; Stock</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Stock Disponible
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editIsWeight ? '' : editStock}
                    disabled={editIsWeight}
                    onChange={(e) => setEditStock(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono transition focus:outline-none ${
                      editIsWeight
                        ? 'bg-slate-950/40 border-gray-800/40 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-950 border-gray-800 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  SKU / Código
                </label>
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={editIsWeight}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditIsWeight(checked);
                    if (checked) setEditStock('');
                  }}
                  className="w-4 h-4 rounded border-gray-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Venta por peso (Kilo / Gramos)</span>
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}