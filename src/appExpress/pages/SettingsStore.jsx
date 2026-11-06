import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { Store, Shield, CheckCircle2, Save, Lock, Zap, Check, Copy, AlertTriangle, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsStore() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [currentPlan, setCurrentPlan] = useState('basico');
  const [planDetails, setPlanDetails] = useState(null);
  const [storeStatus, setStoreStatus] = useState(true);

  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Cargar configuración del comercio desde la colección unificada 'comercios' y planes desde 'express_planes'
  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchStoreSettingsAndPlans = async () => {
      try {
        const storeRef = doc(db, 'comercios', storeId);
        const storeSnap = await getDoc(storeRef);

        let planKey = 'basico';
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          if (isMounted) {
            setStoreName(data.name || data.nombreLocal || '');
            setStorePhone(data.phone || data.whatsapp || '');
            setStoreAddress(data.address || '');
            setStoreStatus(data.activo !== undefined ? data.activo : true);
          }
          planKey = data.plan || data.planSeleccionado || 'basico';
          if (planKey === 'plan_basico') planKey = 'basico';
          if (isMounted) setCurrentPlan(planKey);
        }

        const plansSnap = await getDocs(collection(db, 'express_planes'));
        const plansList = plansSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        plansList.sort((a, b) => Number(a.precio || a.price || 0) - Number(b.precio || b.price || 0));

        if (isMounted) {
          setAllPlans(plansList);
          const currentPlanObj = plansList.find((p) => p.id === planKey) || plansList[0];
          if (currentPlanObj) {
            setPlanDetails(currentPlanObj);
          }
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      }
    };

    fetchStoreSettingsAndPlans();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);
    setSuccessMsg('');

    try {
      const storeRef = doc(db, 'comercios', storeId);
      await updateDoc(storeRef, {
        phone: storePhone.trim(),
        whatsapp: storePhone.trim(),
        address: storeAddress.trim()
      });

      setSuccessMsg('¡Configuración guardada correctamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Hubo un error al guardar los cambios.');
    } finally {
      setLoading(false);
    }
  };

  // Solicitar cambio de plan con validación anti-fraude (Downgrade)
  const handleChangePlan = async (selectedPlanId) => {
    const selectedPlanObj = allPlans.find((p) => p.id === selectedPlanId);
    if (!selectedPlanObj || !storeId) return;

    try {
      const catSnap = await getDocs(collection(db, 'comercios', storeId, 'categories'));
      const currentCategoriesCount = catSnap.size;
      const newPlanMaxCategories = Number(selectedPlanObj.maxCategorias ?? selectedPlanObj.maxCategories ?? 5);

      if (newPlanMaxCategories !== -1 && currentCategoriesCount > newPlanMaxCategories) {
        alert(
          `⚠️ No puedes cambiar al plan "${selectedPlanObj.nombre || selectedPlanObj.name}".\n\n` +
          `Actualmente tienes ${currentCategoriesCount} categorías creadas, y el límite de este plan es de ${newPlanMaxCategories}.\n\n` +
          `Por favor, elimina al menos ${currentCategoriesCount - newPlanMaxCategories} categorías antes de solicitar este cambio.`
        );
        return;
      }

      const planName = selectedPlanObj.nombre || selectedPlanObj.name || selectedPlanId;
      const adminPhone = "5491159781434"; // Tu número personal de WhatsApp

      const message = `🔄 *SOLICITUD DE CAMBIO DE PLAN - VALHALLA EXPRESS*\n\n` +
        `🏪 *Comercio:* ${storeName}\n` +
        `🆔 *UID:* ${storeId}\n` +
        `📦 *Nuevo Plan Solicitado:* ${planName}\n\n` +
        `_Deseo actualizar mi suscripción._`;

      const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error al validar cambio de plan:', error);
      alert('Hubo un error al validar los límites de tu inventario.');
    }
  };

  const copyStoreIdToClipboard = async () => {
    if (!storeId) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(storeId);
      } else {
        window.prompt('Copiá el ID de tu comercio:', storeId);
      }
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      window.prompt('Copiá el ID de tu comercio:', storeId);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto text-gray-800">
      
      {/* Cabecera y Banner ID */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Store className="w-7 h-7 text-green-600 shrink-0" />
            <span>Configuración del Comercio</span>
          </h1>
          <p className="text-xs text-gray-500">
            Administra los datos generales de tu supermercado y tu suscripción activa.
          </p>
        </div>

        {/* ID de Comercio Compacto */}
        <div className="w-full sm:w-auto bg-gray-50 border border-gray-200 p-3 sm:px-4 sm:py-2.5 rounded-2xl flex items-center justify-between sm:justify-start gap-3">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">
              ID de Comercio (UID)
            </span>
            <span className="text-xs font-mono text-gray-700 font-semibold truncate max-w-47.5 sm:max-w-48 block">
              {storeId || '---'}
            </span>
          </div>
          <button
            type="button"
            onClick={copyStoreIdToClipboard}
            className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-xl transition border border-gray-200 shrink-0 cursor-pointer"
            title="Copiar ID de Comercio"
            aria-label="Copiar ID de Comercio"
          >
            {copiedId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Banner de Confirmación */}
      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Alerta de Cuenta Suspendida */}
      {!storeStatus && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-3xl space-y-3">
          <div className="flex items-center gap-2.5 text-red-700 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>Cuenta Suspendida / Plazo de reactivación activo</span>
          </div>
          <p className="text-xs text-red-600 leading-relaxed">
            Tu comercio se encuentra inactivo. Para restablecer el servicio y actualizar tu plan, comunicate con soporte técnico:
          </p>
          <div className="pt-0.5">
            <a
              href="tel:+5491159781434"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Contactar al +54 9 11 5978-1434</span>
            </a>
          </div>
        </div>
      )}

      {/* Formulario: Datos Maestros del Negocio */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl space-y-4 shadow-sm">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 pb-3 border-b border-gray-100">
          Datos Maestros del Negocio
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">
                Nombre del Supermercado
              </label>
              <span className="text-[10px] text-amber-600 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> Configurado por única vez
              </span>
            </div>
            <input
              type="text"
              value={storeName}
              disabled
              placeholder="Cargando..."
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-500 cursor-not-allowed select-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                Teléfono de Contacto (WhatsApp)
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                Dirección / Localidad
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>

      {/* Estado de Suscripción y Cambio de Plan */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl space-y-5 shadow-sm">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <span>Suscripción y Cambio de Plan</span>
        </h2>

        {/* Resumen del Plan Actual */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full font-mono">
              Plan Activo
            </span>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              {planDetails ? (planDetails.nombre || planDetails.name) : 'Cargando plan...'}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Límites actuales: {(planDetails?.maxCategorias ?? planDetails?.maxCategories) === -1 ? 'Categorías ilimitadas' : `${planDetails?.maxCategorias ?? planDetails?.maxCategories ?? 5} categorías`} y {(planDetails?.maxClientesFiado ?? planDetails?.maxCustomers) === -1 ? 'clientes ilimitados' : `${planDetails?.maxClientesFiado ?? planDetails?.maxCustomers ?? 5} clientes de fiado`}.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xl sm:text-2xl font-black text-green-600 font-mono tracking-tight block">
              ${Number(planDetails?.precio || planDetails?.price || 0).toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-semibold block">
              Mensuales
            </span>
          </div>
        </div>

        {/* Selector de Planes */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Gestionar Plan (Contacto por WhatsApp)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {allPlans.map((plan) => {
              const isSelected = currentPlan === plan.id;
              const planTitle = plan.nombre || plan.name || plan.id;
              const planPrice = Number(plan.precio || plan.price || 0);
              const maxCat = plan.maxCategorias ?? plan.maxCategories ?? 5;
              const maxProd = plan.maxProductosPorCat ?? plan.maxProductsPerCategory ?? 10;
              const maxCli = plan.maxClientesFiado ?? plan.maxCustomers ?? 5;

              return (
                <div 
                  key={plan.id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    isSelected 
                      ? 'bg-green-50/70 border-green-300 shadow-xs' 
                      : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase text-gray-900 tracking-wide">
                        {planTitle}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-green-600 text-white font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold font-mono text-green-600">
                      ${planPrice.toLocaleString('es-AR')} <span className="text-[10px] text-gray-400 font-normal">/mes</span>
                    </div>
                    <ul className="text-[11px] text-gray-500 space-y-1 pt-2 border-t border-gray-200 leading-relaxed">
                      <li>{maxCat === -1 ? 'Categorías ilimitadas' : `${maxCat} categorías`}</li>
                      <li>{maxProd === -1 ? 'Productos ilimitados' : `${maxProd} prods/cat`}</li>
                      <li>{maxCli === -1 ? 'Clientes ilimitados' : `${maxCli} clientes de fiado`}</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={isSelected || loading}
                    className={`mt-4 w-full py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer ${
                      isSelected 
                        ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white active:scale-95 shadow-xs'
                    }`}
                  >
                    {isSelected ? 'Plan Actual' : 'Solicitar Plan por WhatsApp'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}