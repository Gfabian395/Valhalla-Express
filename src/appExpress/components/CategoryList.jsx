import { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { canCreateCategory } from '../services/planValidation';
import PlanLimitsBadge from './PlanLimitsBadge';
import { Layers, Plus, Trash2, ChevronRight, AlertCircle, Edit3 } from 'lucide-react';

export default function CategoryList({ storeId, branchId, onSelectCategory, selectedCategoryId }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Función auxiliar para obtener la referencia de la colección según la sucursal activa
  const getCategoriesCollectionRef = useCallback(() => {
    if (!branchId || branchId === 'main') {
      return collection(db, 'stores', storeId, 'categories');
    }
    return collection(db, 'stores', storeId, 'branches', branchId, 'categories');
  }, [storeId, branchId]);

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(getCategoriesCollectionRef());
        if (!isMounted) return;

        const cats = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setCategories(cats);

        if (cats.length > 0 && !selectedCategoryId) {
          onSelectCategory(cats[0].id, cats[0].name);
        } else if (cats.length === 0) {
          onSelectCategory(null, '');
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [storeId, branchId, selectedCategoryId, onSelectCategory, refreshKey, getCategoriesCollectionRef]);

  // CREAR CATEGORÍA
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const validation = await canCreateCategory(storeId);
      if (!validation.allowed) {
        setErrorMsg(validation.message);
        setLoading(false);
        return;
      }

      const docRef = await addDoc(getCategoriesCollectionRef(), {
        name: cleanName,
        createdAt: new Date().toISOString()
      });

      const newCat = { id: docRef.id, name: cleanName };
      setCategories(prev => [...prev, newCat]);
      setNewCategoryName('');
      setRefreshKey(prev => prev + 1);

      if (!selectedCategoryId) {
        onSelectCategory(newCat.id, newCat.name);
      }
    } catch (error) {
      console.error('Error al crear categoría:', error);
      setErrorMsg('No se pudo crear la categoría.');
    } finally {
      setLoading(false);
    }
  };

  // EDITAR CATEGORÍA
  const handleEditCategory = async (catId, currentName, e) => {
    e.stopPropagation();
    const updatedName = prompt('Editar nombre de la categoría:', currentName);
    if (!updatedName || !updatedName.trim() || updatedName.trim() === currentName) return;

    try {
      const catRef = (!branchId || branchId === 'main')
        ? doc(db, 'stores', storeId, 'categories', catId)
        : doc(db, 'stores', storeId, 'branches', branchId, 'categories', catId);

      await updateDoc(catRef, { name: updatedName.trim() });

      setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: updatedName.trim() } : c));
      if (selectedCategoryId === catId) {
        onSelectCategory(catId, updatedName.trim());
      }
    } catch (error) {
      console.error('Error al editar categoría:', error);
      alert('No se pudo actualizar la categoría.');
    }
  };

  // ELIMINAR CATEGORÍA
  const handleDeleteCategory = async (catId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de eliminar esta categoría y sus productos?')) return;

    try {
      const catRef = (!branchId || branchId === 'main')
        ? doc(db, 'stores', storeId, 'categories', catId)
        : doc(db, 'stores', storeId, 'branches', branchId, 'categories', catId);

      await deleteDoc(catRef);
      setCategories(prev => prev.filter(c => c.id !== catId));
      setRefreshKey(prev => prev + 1);
      if (selectedCategoryId === catId) {
        onSelectCategory(null, '');
      }
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
    }
  };

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col h-auto min-h-35 lg:h-[75vh] shadow-xl backdrop-blur-sm">
      
      {/* Cabecera de Categorías */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-800/80 mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-5 h-5 text-emerald-500 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-gray-100 tracking-tight truncate">
            Categorías
          </h2>
        </div>
        <div className="shrink-0">
          <PlanLimitsBadge key={refreshKey} type="categories" />
        </div>
      </div>

      {/* Mensaje de Error */}
      {errorMsg && (
        <div className="mb-3 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Alta Rápida */}
      <form onSubmit={handleCreateCategory} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Nueva categoría..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1 min-w-0 bg-slate-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
        />
        <button
          type="submit"
          disabled={loading || !newCategoryName.trim()}
          className="p-2 sm:px-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-slate-950 rounded-xl transition flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20"
          title="Agregar categoría"
          aria-label="Agregar categoría"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>

      {/* Lista de Categorías */}
      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 min-h-35 max-h-35 lg:max-h-none scrollbar-thin scrollbar-thumb-gray-800">
        {categories.length === 0 ? (
          <div className="h-full min-h-35 flex items-center justify-center text-center p-4 border border-dashed border-gray-800/60 rounded-xl">
            <p className="text-xs text-slate-500">
              No hay categorías cargadas en esta sucursal.
            </p>
          </div>
        ) : (
          categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id, cat.name)}
                className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold'
                    : 'bg-slate-950/60 border-gray-800/80 text-gray-300 hover:border-gray-700 hover:bg-slate-950/90'
                }`}
              >
                <span className="text-xs sm:text-sm truncate pr-2 select-none">
                  {cat.name}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleEditCategory(cat.id, cat.name, e)}
                    className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-900 transition"
                    title="Editar categoría"
                    aria-label="Editar categoría"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteCategory(cat.id, e)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition"
                    title="Eliminar categoría"
                    aria-label="Eliminar categoría"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <ChevronRight
                    className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                      isSelected ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}