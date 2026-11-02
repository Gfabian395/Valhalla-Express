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

  // Estados para el plan y límites
  const [planName, setPlanName] = useState('');
  const [maxBranches, setMaxBranches] = useState(1);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Cargar sucursales y configuración del plan
  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;

    const fetchBranchesAndPlan = async () => {
      try {
        // 1. Obtener sucursales secundarias
        const snap = await getDocs(collection(db, 'stores', storeId, 'branches'));
        const loadedBranches = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Obtener plan actual de la tienda
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        const currentPlanKey = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

        // 3. Consultar límites en ExpressPlanes
        const planRef = doc(db, 'ExpressPlanes', currentPlanKey);
        const planSnap = await getDoc(planRef);

        if (isMounted) {
          setBranches(loadedBranches);
          if (planSnap.exists()) {
            setPlanName(planSnap.data().name || currentPlanKey);
            setMaxBranches(planSnap.data().maxBranches ?? 1);
          }
        }
      } catch (error) {
        console.error('Error al cargar sucursales y plan:', error);
      }
    };

    fetchBranchesAndPlan();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // Total de sucursales actuales: 1 principal + adicionales
  const totalStoresCount = 1 + branches.length;
  const isLimitReached = totalStoresCount >= maxBranches;
  const allowedAdditionalBranches = Math.max(0, maxBranches - 1);

  // Registrar nueva sucursal
  const handleAddBranch = async (e) => {
    e.preventDefault();
    const cleanName = branchName.trim();
    if (!cleanName || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      if (totalStoresCount >= maxBranches) {
        setErrorMsg(`Has alcanzado el límite máximo de ${maxBranches} sucursales permitidas para tu plan ${planName}.`);
        setLoading(false);
        return;
      }

      const newBranchData = {
        name: cleanName,
        address: branchAddress.trim() || '---',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'stores', storeId, 'branches'), newBranchData);
      setBranches(prev => [...prev, { id: docRef.id, ...newBranchData }]);

      setBranchName('');
      setBranchAddress('');
    } catch (error) {
      console.error('Error al crear sucursal:', error);
      setErrorMsg('No se pudo registrar la sucursal.');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar sucursal
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
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto text-gray-100">
      
      {/* Cabecera y Resumen de Plan */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <Building className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0" />
            <span>Administración de Sucursales</span>
          </h1>
          <p className="text-xs text-slate-400">
            Gestiona los locales de tu red según el cupo contratado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="bg-slate-950/80 border border-gray-800 text-xs px-3 py-1.5 rounded-xl font-mono">
            <span className="text-slate-400">Plan:</span>{' '}
            <strong className="text-emerald-400">{planName || 'Cargando...'}</strong>
          </div>
          <div className="bg-slate-950/80 border border-gray-800 text-xs px-3 py-1.5 rounded-xl font-mono">
            <span className="text-slate-400">Locales:</span>{' '}
            <strong className="text-emerald-400 font-bold">{totalStoresCount} / {maxBranches}</strong>
          </div>
        </div>
      </div>

      {/* Alerta de Error */}
      {errorMsg && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl sm:rounded-2xl text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* Alerta por Exceso de Sucursales */}
      {totalStoresCount > maxBranches && (
        <div className="bg-red-950/30 border border-red-500/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-start sm:items-center gap-3 sm:gap-4 text-red-300">
          <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="space-y-1 text-xs">
            <h2 className="font-bold text-red-300 text-sm">Exceso de sucursales detectado</h2>
            <p className="text-red-300/90 leading-relaxed">
              Tu plan ({planName}) permite hasta <strong>{maxBranches}</strong> locales, pero tienes <strong>{totalStoresCount}</strong> registrados. Las sucursales excedentes se encuentran inactivas hasta regularizar la cuenta.
            </p>
          </div>
        </div>
      )}

      {/* Banner Informativo para Plan Básico */}
      {maxBranches <= 1 && branches.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-100">Límite del Plan Básico</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tu plan actual incluye únicamente 1 sucursal (la principal). Pasa a un plan superior para habilitar más locales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/express/config')}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition shrink-0 shadow-md shadow-emerald-500/20"
          >
            Ver Planes
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Formulario de Alta de Sucursal */}
        <div className="md:col-span-5 bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl backdrop-blur-sm">
          <h2 className="text-sm sm:text-base font-bold text-gray-100">
            Abrir Nueva Sucursal
          </h2>

          <form onSubmit={handleAddBranch} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Nombre del Local
              </label>
              <input
                type="text"
                placeholder="Ej: Sucursal Centro #2"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                disabled={isLimitReached}
                required
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Dirección
              </label>
              <input
                type="text"
                placeholder="Ej: Av. España 1230"
                value={branchAddress}
                onChange={e => setBranchAddress(e.target.value)}
                disabled={isLimitReached}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || isLimitReached || !branchName.trim()}
              className="w-full py-2.5 sm:py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Sucursal</span>
            </button>
          </form>
        </div>

        {/* Listado de Sucursales */}
        <div className="md:col-span-7 bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3.5 shadow-xl backdrop-blur-sm">
          <h2 className="text-sm sm:text-base font-bold text-gray-100">
            Tus Locales Activos
          </h2>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
            {/* Sucursal Principal */}
            <div className="bg-slate-950/70 border border-gray-800/80 p-3 sm:p-4 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2 truncate">
                  <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Sucursal Principal (Registrada)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Local base de operaciones de la cuenta.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                Principal
              </span>
            </div>

            {/* Sucursales Secundarias */}
            {branches.map((branch, index) => {
              const isExceeded = index >= allowedAdditionalBranches;

              return (
                <div 
                  key={branch.id} 
                  className={`border p-3 sm:p-4 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isExceeded 
                      ? 'bg-red-950/20 border-red-500/30' 
                      : 'bg-slate-950/70 border-gray-800/80'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2 truncate">
                      <Building className={`w-4 h-4 shrink-0 ${isExceeded ? 'text-red-400' : 'text-emerald-400'}`} />
                      <span className="truncate">{branch.name}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </p>
                    {isExceeded && (
                      <span className="text-[10px] text-red-400 font-medium block">
                        Excede el límite del plan ({maxBranches} locales máx.)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isExceeded 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {isExceeded ? 'Inactiva' : 'Activa'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(branch.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition"
                      title="Eliminar Local"
                      aria-label="Eliminar Local"
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