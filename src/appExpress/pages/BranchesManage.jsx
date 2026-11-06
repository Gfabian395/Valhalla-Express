import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Store, ShieldCheck, Zap, PhoneCall, Check, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BranchesManage() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);
  const [storeData, setStoreData] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchStoreAndPlan = async () => {
      try {
        const storeRef = doc(db, 'comercios', storeId);
        const storeSnap = await getDoc(storeRef);

        if (storeSnap.exists() && isMounted) {
          const data = storeSnap.data();
          setStoreData(data);
          const planKey = data.plan || data.planSeleccionado || 'basico';

          const planRef = doc(db, 'ExpressPlanes', planKey);
          const planSnap = await getDoc(planRef);
          if (planSnap.exists()) {
            setPlanDetails(planSnap.data());
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del comercio:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStoreAndPlan();
    return () => { isMounted = false; };
  }, [storeId]);

  const handleRequestUpgrade = (planName) => {
    const adminPhone = "5491159781434";
    const msg = `🚀 *SOLICITUD DE CAMBIO DE PLAN - VALHALLA EXPRESS*\n\n🏪 *Comercio:* ${storeData?.name || 'N/A'}\n🆔 *UID:* ${storeId}\n📦 *Plan deseado:* ${planName}`;
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-green-700 font-medium text-sm bg-gray-50">
        Cargando información del comercio...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto text-gray-800">
      
      {/* Cabecera */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Store className="w-7 h-7 text-green-600 shrink-0" />
            <span>Mi Comercio &amp; Suscripción</span>
          </h1>
          <p className="text-xs text-gray-500">
            Administra el estado de tu cuenta y los beneficios de tu plan actual.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 text-xs px-3.5 py-2 rounded-2xl font-mono text-green-800 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse" />
          <span>Estado: <strong>Activo</strong></span>
        </div>
      </div>

      {/* Tarjeta de Plan Actual */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-mono">
              Plan Contratado
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">
              {planDetails?.name || storeData?.plan || 'Plan Básico'}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-green-600 font-mono">
              ${Number(planDetails?.price || 15000).toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-gray-400 block uppercase">Mensuales</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600 pt-2">
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between">
            <span>Límite de Categorías:</span>
            <strong className="text-gray-900 font-mono">{planDetails?.maxCategories === -1 ? 'Ilimitadas' : planDetails?.maxCategories || 15}</strong>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between">
            <span>Productos por Categoría:</span>
            <strong className="text-gray-900 font-mono">{planDetails?.maxProductsPerCategory === -1 ? 'Ilimitados' : planDetails?.maxProductsPerCategory || 30}</strong>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between">
            <span>Clientes Fiado Máximos:</span>
            <strong className="text-gray-900 font-mono">{planDetails?.maxCustomers || 10}</strong>
          </div>
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between">
            <span>Soporte Asistido:</span>
            <strong className="text-green-700 font-mono">WhatsApp Directo</strong>
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="button"
            onClick={() => handleRequestUpgrade('Plan Experto / Superior')}
            className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>Solicitar Mejora de Plan</span>
          </button>
        </div>
      </div>

    </div>
  );
}