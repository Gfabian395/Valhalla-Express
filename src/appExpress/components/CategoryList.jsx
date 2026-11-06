import { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import PlanLimitsBadge from './PlanLimitsBadge';
import { Layers, Plus, Trash2, ChevronRight, AlertCircle, Edit3 } from 'lucide-react';

export default function CategoryList({ storeId, onSelectCategory, selectedCategoryId }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [maxCategoriesAllowed, setMaxCategoriesAllowed] = useState(15);
  const [planName, setPlanName] = useState('Plan');

  // Referencia unificada a la subcolección dentro de la colección 'comercios'
  const getCategoriesCollectionRef = useCallback(() => {
    return collection(db, 'comercios', storeId, 'categories');
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const storeRef = doc(db, 'comercios', storeId);
        const storeSnap = await getDoc(storeRef);
        const storeData = storeSnap.exists() ? storeSnap.data() : {};
        let planKey = storeData.plan || storeData.planSeleccionado || 'basico';
        if (planKey === 'plan_basico') planKey = 'basico';

        const planRef = doc(db, 'express_planes', planKey);
        const planSnap = await getDoc(planRef);
        const planData = planSnap.exists() ? planSnap.data() : { maxCategorias: 15, nombre: 'Plan Básico' };
        
        const limit = Number(planData.maxCategorias ?? planData.maxCategories ?? 15);
        if (isMounted) {
          setMaxCategoriesAllowed(limit);
          setPlanName(planData.nombre || planData.name || 'Plan');
        }

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
        console.error('Error al cargar categorías y límites:', error);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [storeId, selectedCategoryId, onSelectCategory, refreshKey, getCategoriesCollectionRef]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      if (maxCategoriesAllowed !== -1 && categories.length >= maxCategoriesAllowed) {
        setErrorMsg(`Has alcanzado el límite de ${maxCategoriesAllowed} categorías permitidas para tu ${planName}.`);
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

  const handleEditCategory = async (catId, currentName, e) => {
    e.stopPropagation();
    const updatedName = prompt('Editar nombre de la categoría:', currentName);
    if (!updatedName || !updatedName.trim() || updatedName.trim() === currentName) return;

    try {
      const catRef = doc(db, 'comercios', storeId, 'categories', catId);
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

  const handleDeleteCategory = async (catId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de eliminar esta categoría y sus productos?')) return;

    try {
      const catRef = doc(db, 'comercios', storeId, 'categories', catId);
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

  const isAtLimit = maxCategoriesAllowed !== -1 && categories.length >= maxCategoriesAllowed;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 flex flex-col h-auto min-h-35 lg:h-[75vh] shadow-sm">
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-5 h-5 text-green-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight truncate">
            Categorías
          </h2>
        </div>
        <div className="shrink-0">
          <PlanLimitsBadge key={refreshKey} type="categories" />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleCreateCategory} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder={isAtLimit ? "Límite del plan alcanzado" : "Nueva categoría..."}
          value={newCategoryName}
          disabled={isAtLimit}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={loading || !newCategoryName.trim() || isAtLimit}
          className="p-2 sm:px-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white rounded-xl transition flex items-center justify-center font-bold shrink-0 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>

      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 min-h-35 max-h-35 lg:max-h-none scrollbar-thin scrollbar-thumb-gray-200">
        {categories.length === 0 ? (
          <div className="h-full min-h-35 flex items-center justify-center text-center p-4 border border-dashed border-gray-200 rounded-2xl">
            <p className="text-xs text-gray-400">No hay categorías cargadas.</p>
          </div>
        ) : (
          categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id, cat.name)}
                className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-green-50 border-green-300 text-green-800 font-semibold shadow-2xs'
                    : 'bg-gray-50/70 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-xs sm:text-sm truncate pr-2 select-none">{cat.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleEditCategory(cat.id, cat.name, e)}
                    className="p-1 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-200/60 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCategory(cat.id, e)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-200/60 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}