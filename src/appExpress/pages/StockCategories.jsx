import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import CategoryList from '../components/CategoryList';
import ShelfLabelsModal from '../components/ShelfLabelsModal';
import PlanLimitsBadge from '../components/PlanLimitsBadge';
import { Package, Plus, Printer, Trash2, AlertCircle, LogIn, X, Save, Scale, Edit3, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StockCategories() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [products, setProducts] = useState([]);

  // Estados del formulario de producto
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodImage, setProdImage] = useState('');
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
  const [editImage, setEditImage] = useState('');
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

  // Cargar productos de la categoría seleccionada (Ruta unificada: comercios/{storeId}/categories/{categoryId}/products)
  useEffect(() => {
    if (!storeId || !selectedCategoryId) {
      setProducts([]);
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const prodRef = collection(db, 'comercios', storeId, 'categories', selectedCategoryId, 'products');
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
  }, [storeId, selectedCategoryId, selectedCategoryName, refreshKey]);

  // Función para convertir imagen local a Base64
  const handleImageChange = (e, isEditing = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEditing) {
        setEditImage(reader.result);
      } else {
        setProdImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Agregar nuevo producto
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const cleanName = prodName.trim();
    if (!cleanName || !prodPrice || !selectedCategoryId || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const newProductData = {
        name: cleanName,
        price: Number(prodPrice),
        stock: prodIsWeight ? 0 : Number(prodStock || 0),
        sku: prodSku.trim() || '---',
        imageUrl: prodImage || '',
        isWeightBased: prodIsWeight,
        createdAt: new Date().toISOString()
      };

      const targetCollection = collection(db, 'comercios', storeId, 'categories', selectedCategoryId, 'products');
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
      setProdImage('');
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
    setEditImage(prod.imageUrl || '');
    setEditIsWeight(prod.isWeightBased || false);
  };

  // Guardar cambios del producto editado
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !storeId || !selectedCategoryId) return;

    setLoading(true);
    try {
      const prodRef = doc(db, 'comercios', storeId, 'categories', selectedCategoryId, 'products', editingProduct.id);

      const updatedData = {
        name: editName.trim(),
        price: Number(editPrice),
        stock: editIsWeight ? 0 : Number(editStock || 0),
        sku: editSku.trim() || '---',
        imageUrl: editImage || '',
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
      const prodRef = doc(db, 'comercios', storeId, 'categories', selectedCategoryId, 'products', prodId);
      await deleteDoc(prodRef);
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  if (!storeId) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4 text-gray-800 bg-gray-50">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Sesión no detectada</h2>
          <p className="text-xs text-gray-500 max-w-sm">
            Debes iniciar sesión con tu cuenta de Google para administrar el inventario.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Ir a Iniciar Sesión</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-gray-800 relative">
      
      {/* Cabecera Principal y Acción de Impresión */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-green-600 shrink-0" />
            <span>Control de Stock &amp; Góndolas</span>
          </h1>
          <p className="text-xs text-gray-500">
            Administra categorías, existencias e imprime cenefas de precio de tu comercio.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPrintModal(true)}
          disabled={products.length === 0}
          className="w-full sm:w-auto px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Góndola ({products.length})</span>
        </button>
      </div>

      {/* Grilla Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Categorías */}
        <div className="lg:col-span-4 w-full">
          <CategoryList
            storeId={storeId}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id, name) => {
              setSelectedCategoryId(id);
              setSelectedCategoryName(name);
            }}
          />
        </div>

        {/* Columna Productos y Stock */}
        <div className="lg:col-span-8 w-full bg-white border border-gray-200 rounded-3xl p-6 flex flex-col h-auto min-h-35 lg:h-[75vh] shadow-sm">
          
          {/* Cabecera de Categoría Seleccionada */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100 mb-4">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                Productos de:{' '}
                <span className="text-green-600 font-semibold">
                  {selectedCategoryName || 'Selecciona una categoría'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {selectedCategoryId && (
                <PlanLimitsBadge key={refreshKey} type="products" categoryId={selectedCategoryId} />
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

          {/* Formulario de Alta Rápida de Producto con Selector de Archivos */}
          {selectedCategoryId ? (
            <form
              onSubmit={handleAddProduct}
              className="space-y-3.5 mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-200"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  placeholder="Nombre del producto (ej: Yerba Mate)"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="sm:col-span-4 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={prodIsWeight ? 'Precio Kilo ($/kg)' : 'Precio ($)'}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="sm:col-span-3 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={prodIsWeight ? 'No exige stock' : 'Stock inicial'}
                  value={prodIsWeight ? '' : prodStock}
                  disabled={prodIsWeight}
                  onChange={(e) => setProdStock(e.target.value)}
                  className={`sm:col-span-2 border rounded-xl px-3.5 py-2 text-xs font-mono transition focus:outline-none ${
                    prodIsWeight
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-600 focus:ring-1 focus:ring-green-600'
                  }`}
                />
                <input
                  type="text"
                  placeholder="SKU / Código"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="sm:col-span-3 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
              </div>

              {/* Selector de Imagen desde la Galería */}
              <div className="flex items-center gap-3 bg-white border border-gray-200 p-2 rounded-xl">
                <div className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                  {prodImage ? (
                    <img src={prodImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] uppercase font-bold text-gray-400">Imagen del producto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, false)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                  />
                </div>
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
                    className="w-4 h-4 rounded border-gray-300 bg-white text-green-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px] font-medium text-gray-700 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-green-600" />
                    <span>Venta por peso (Kilo / Gramos - Sin control rígido de stock)</span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !prodName.trim() || !prodPrice}
                className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Producto al Stock</span>
              </button>
            </form>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-500 mb-4">
              Selecciona una categoría a la izquierda para cargar y gestionar productos.
            </div>
          )}

          {/* Listado de Productos */}
          <div className="overflow-y-auto flex-1 pr-1 min-h-35 scrollbar-thin scrollbar-thumb-gray-200">
            {!selectedCategoryId ? (
              <div className="h-full min-h-35 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl p-4">
                Esperando selección de categoría...
              </div>
            ) : products.length === 0 ? (
              <div className="h-full min-h-35 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl p-4">
                No hay productos cargados en esta categoría.
              </div>
            ) : (
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400">
                      <th className="py-3 px-3">Imagen</th>
                      <th className="py-3 px-3">Producto</th>
                      <th className="py-3 px-3">SKU</th>
                      <th className="py-3 px-3">Stock</th>
                      <th className="py-3 px-3">Precio</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3 w-12">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 object-cover rounded-xl border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-gray-900">
                          <span className="align-middle">{prod.name}</span>
                          {prod.isWeightBased && (
                            <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ml-2 align-middle">
                              <Scale className="w-3 h-3" /> Por Kilo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-gray-500">{prod.sku}</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                              prod.isWeightBased || prod.stock > 5
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                            }`}
                          >
                            {prod.isWeightBased ? 'Sin límite (Peso)' : `${prod.stock} un.`}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold font-mono text-green-600">
                          ${Number(prod.price || 0).toLocaleString('es-AR')}{' '}
                          {prod.isWeightBased && (
                            <span className="text-[10px] text-gray-400 font-normal">/kg</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 text-gray-400 hover:text-green-600 transition rounded-lg hover:bg-gray-100 cursor-pointer"
                            title="Editar Producto y Stock"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-gray-100 cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* Modal Flotante de Edición con Galería Local */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-200 text-gray-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full relative shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-green-600" />
                <span>Editar Producto &amp; Stock</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
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
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-green-600 focus:ring-1 focus:ring-green-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  SKU / Código
                </label>
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
              </div>

              {/* Selector de Imagen local en Edición */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-2 rounded-xl">
                <div className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                  {editImage ? (
                    <img src={editImage} alt="Preview Edit" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] uppercase font-bold text-gray-400">Cambiar imagen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, true)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                  />
                </div>
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
                  className="w-4 h-4 rounded border-gray-300 bg-white text-green-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-gray-700 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-green-600" />
                  <span>Venta por peso (Kilo / Gramos)</span>
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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