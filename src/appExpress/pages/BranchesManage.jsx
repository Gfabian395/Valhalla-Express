import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Building, Plus, MapPin, AlertCircle, Lock, Trash2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BranchesManage() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para el plan y los límites
  const [planName, setPlanName] = useState('');
  const [maxBranches, setMaxBranches] = useState(1);

  // Escuchar cambios de autenticación para asegurar el storeId
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

  // Cargar sucursales y el límite exacto según el plan en Firebase
  useEffect(() => {
    if (!storeId) return;
    const fetchBranchesAndPlan = async () => {
      try {
        // 1. Obtener sucursales secundarias creadas en la subcolección
        const snap = await getDocs(collection(db, 'stores', storeId, 'branches'));
        const loadedBranches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBranches(loadedBranches);

        // 2. Obtener plan actual de la tienda
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        const currentPlanKey = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

        // 3. Consultar los límites en ExpressPlanes
        const planRef = doc(db, 'ExpressPlanes', currentPlanKey);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          setPlanName(planSnap.data().name || currentPlanKey);
          setMaxBranches(planSnap.data().maxBranches ?? 1);
        }
      } catch (error) {
        console.error('Error al cargar sucursales y plan:', error);
      }
    };
    fetchBranchesAndPlan();
  }, [storeId]);

  // Total de sucursales actuales = 1 (Principal) + cantidad de locales adicionales en la subcolección
  const totalStoresCount = 1 + branches.length;
  const isLimitReached = totalStoresCount >= maxBranches;

  // Cuántas sucursales adicionales permite el plan (ej: si maxBranches es 2, permite 1 adicional)
  const allowedAdditionalBranches = Math.max(0, maxBranches - 1);

  // Registrar nueva sucursal
  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!branchName.trim() || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      if (totalStoresCount >= maxBranches) {
        setErrorMsg(`Has alcanzado el límite máximo de ${maxBranches} sucursales permitidas para tu plan ${planName}. Elimina alguna sucursal excedente o actualiza tu plan.`);
        setLoading(false);
        return;
      }

      const newBranchData = {
        name: branchName.trim(),
        address: branchAddress.trim() || '---',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'stores', storeId, 'branches'), newBranchData);
      setBranches([...branches, { id: docRef.id, ...newBranchData }]);
      
      setBranchName('');
      setBranchAddress('');
    } catch (error) {
      console.error('Error al crear sucursal:', error);
      setErrorMsg('No se pudo registrar la sucursal.');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar sucursal (permite depurar los excedentes)
  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta sucursal?')) return;

    try {
      await deleteDoc(doc(db, 'stores', storeId, 'branches', branchId));
      setBranches(prev => prev.filter(b => b.id !== branchId));
    } catch (error) {
      console.error('Error al eliminar sucursal:', error);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto">
      
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-100 flex items-center gap-3">
            <Building className="w-7 h-7 text-emerald-400" /> Administración de Sucursales
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestiona los locales de tu red de supermercados según los límites de tu plan activo.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl font-mono">
            Plan: <strong className="text-emerald-400">{planName || 'Cargando...'}</strong>
          </span>
          <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl font-mono">
            Total Sucursales: <strong className="text-emerald-400">{totalStoresCount} / {maxBranches}</strong>
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/50 border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Alerta si hay exceso de sucursales por bajada de plan */}
      {totalStoresCount > maxBranches && (
        <div className="bg-red-950/40 border border-red-500/40 p-5 rounded-3xl flex items-center gap-4 text-red-300">
          <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" />
          <div className="space-y-1 text-xs">
            <h2 className="font-black uppercase tracking-wide text-red-400">Exceso de sucursales detectado</h2>
            <p>
              Tu plan actual ({planName}) permite un máximo de <strong>{maxBranches}</strong> sucursales, pero posees <strong>{totalStoresCount}</strong> activas. Las sucursales excedentes se encuentran <strong>suspendidas</strong> hasta que actualices tu plan o elimines las sobrantes.
            </p>
          </div>
        </div>
      )}

      {/* Aviso si el plan es básico (1 sola sucursal) */}
      {maxBranches <= 1 && branches.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-emerald-400 tracking-wide">Límite del Plan Básico</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tu plan actual incluye únicamente 1 sucursal (la principal). Actualiza a un plan superior para abrir locales adicionales.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/express/config')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            Cambiar de Plan
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Formulario de Alta de Sucursal */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 relative">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-100">Abrir Nueva Sucursal</h2>

          <form onSubmit={handleAddBranch} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nombre del Local</label>
              <input
                type="text"
                placeholder="Ej: Sucursal Centro #2"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                disabled={isLimitReached}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dirección</label>
              <input
                type="text"
                placeholder="Ej: Av. España 1230"
                value={branchAddress}
                onChange={e => setBranchAddress(e.target.value)}
                disabled={isLimitReached}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={loading || isLimitReached}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Plus className="w-4 h-4" /> Registrar Sucursal
            </button>
          </form>
        </div>

        {/* Listado de Sucursales con control de exceso */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-100">Tus Locales Activos</h2>

          <div className="space-y-3 max-h-87.5 overflow-y-auto pr-1">
            {/* Sucursal Principal fija (siempre activa) */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-400" /> Sucursal Principal (Registrada)
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Local base de operaciones de la cuenta.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                Principal
              </span>
            </div>

            {/* Sucursales adicionales (Evaluando si superan el límite actual) */}
            {branches.map((branch, index) => {
              const isExceeded = index >= allowedAdditionalBranches;

              return (
                <div 
                  key={branch.id} 
                  className={`border p-4 rounded-2xl flex items-center justify-between transition ${
                    isExceeded 
                      ? 'bg-red-950/40 border-red-500/40' 
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Building className={`w-4 h-4 ${isExceeded ? 'text-red-400' : 'text-emerald-400'}`} /> {branch.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {branch.address}
                    </p>
                    {isExceeded && (
                      <span className="text-[10px] text-red-400 font-bold block pt-1">
                        ⚠️ Suspendido por exceder el límite de tu plan actual ({maxBranches} locales máx.)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                      isExceeded 
                        ? 'bg-red-950 text-red-400 border-red-500/30' 
                        : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {isExceeded ? 'Suspendida' : 'Activa'}
                    </span>

                    <button
                      onClick={() => handleDeleteBranch(branch.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition rounded-xl bg-slate-900 border border-slate-800 shadow-sm"
                      title="Eliminar Local"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}