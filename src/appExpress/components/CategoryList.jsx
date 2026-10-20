import { useState, useEffect } from 'react';
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
  const getCategoriesCollectionRef = () => {
    if (!branchId || branchId === 'main') {
      return collection(db, 'stores', storeId, 'categories');
    } else {
      return collection(db, 'stores', storeId, 'branches', branchId, 'categories');
    }
  };

  useEffect(() => {
    if (!storeId) return;
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(getCategoriesCollectionRef());
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
  }, [storeId, branchId, selectedCategoryId, onSelectCategory, refreshKey]);

  // CREAR CATEGORÍA
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !storeId) return;

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
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString()
      });

      const newCat = { id: docRef.id, name: newCategoryName.trim() };
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
      let catRef;
      if (!branchId || branchId === 'main') {
        catRef = doc(db, 'stores', storeId, 'categories', catId);
      } else {
        catRef = doc(db, 'stores', storeId, 'branches', branchId, 'categories', catId);
      }

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
      let catRef;
      if (!branchId || branchId === 'main') {
        catRef = doc(db, 'stores', storeId, 'categories', catId);
      } else {
        catRef = doc(db, 'stores', storeId, 'branches', branchId, 'categories', catId);
      }

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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-black uppercase tracking-wide text-slate-100">Categorías</h2>
        </div>
        <PlanLimitsBadge key={refreshKey} type="categories" />
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nueva categoría..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl transition flex items-center justify-center font-bold"
          title="Agregar categoría"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {categories.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No hay categorías cargadas en esta sucursal.</p>
        ) : (
          categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id, cat.name)}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                  isSelected 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold truncate">{cat.name}</span>
                <div className="flex items-center gap-1">
                  {/* Botón Editar con ícono nativo de Lucide */}
                  <button
                    onClick={(e) => handleEditCategory(cat.id, cat.name, e)}
                    className="p-1.5 text-slate-500 hover:text-emerald-400 transition rounded-lg"
                    title="Editar Categoría"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteCategory(cat.id, e)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}