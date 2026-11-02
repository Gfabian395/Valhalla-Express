import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { Store, Shield, CheckCircle2, Save, Lock, Zap, Check, Copy, AlertTriangle, PhoneCall, PowerOff, Building2, ArrowRight } from 'lucide-react';
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
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Detectar retorno de pago aprobado desde Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('collection_status') || params.get('status') || params.get('payment');
    const paidPlan = params.get('external_reference');

    if ((status === 'approved' || status === 'success') && paidPlan && storeId) {
      const activatePaidPlan = async () => {
        try {
          const storeRef = doc(db, 'stores', storeId);
          await updateDoc(storeRef, {
            plan: paidPlan,
            status: true,
            updatedAt: new Date().toISOString()
          });
          setCurrentPlan(paidPlan);
          setStoreStatus(true);
          setSuccessMsg('¡Pago acreditado y plan actualizado con éxito!');
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Error al activar plan tras el pago:', err);
        }
      };
      activatePaidPlan();
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchStoreSettingsAndPlans = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);

        let planKey = 'basico';
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          if (isMounted) {
            setStoreName(data.name || '');
            setStorePhone(data.phone || '');
            setStoreAddress(data.address || '');
            setStoreStatus(data.status !== undefined ? data.status : true);
          }
          planKey = data.plan || 'basico';
          if (isMounted) setCurrentPlan(planKey);
        }

        const plansSnap = await getDocs(collection(db, 'ExpressPlanes'));
        const plansList = plansSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        plansList.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));

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
      const storeRef = doc(db, 'stores', storeId);
      await updateDoc(storeRef, {
        phone: storePhone.trim(),
        address: storeAddress.trim()
      });

      setSuccessMsg('¡Configuración guardada correctamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (newPlanId) => {
    if (!storeId || newPlanId === currentPlan) return;

    const selectedPlanObj = allPlans.find((p) => p.id === newPlanId);
    if (!selectedPlanObj) return;

    if (Number(selectedPlanObj.price) <= 0) {
      try {
        setLoading(true);
        const storeRef = doc(db, 'stores', storeId);
        await updateDoc(storeRef, { plan: newPlanId, updatedAt: new Date().toISOString() });
        setCurrentPlan(newPlanId);
        setPlanDetails(selectedPlanObj);
        setSuccessMsg('¡Plan actualizado con éxito!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (error) {
        console.error('Error al cambiar de plan:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const mpToken = import.meta.env.VITE_MP_ACCESS_TOKEN;
      const targetUrl = `${window.location.origin}/express/config`;

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mpToken}`
        },
        body: JSON.stringify({
          items: [
            {
              id: selectedPlanObj.id,
              title: `Suscripción ${selectedPlanObj.name || 'Plan'} - Valhalla Express`,
              unit_price: Number(selectedPlanObj.price),
              quantity: 1,
              currency_id: 'ARS'
            }
          ],
          external_reference: newPlanId,
          back_urls: {
            success: targetUrl,
            failure: targetUrl,
            pending: targetUrl
          }
        })
      });

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.error('Detalle del error de MP:', data);
        alert('Error de MP: ' + (data.message || JSON.stringify(data)));
        setLoading(false);
      }
    } catch (error) {
      console.error('Error al conectar con Mercado Pago:', error);
      alert('Hubo un error de red al conectar con la pasarela de pagos.');
      setLoading(false);
    }
  };

  const confirmCancelSubscription = async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      const storeRef = doc(db, 'stores', storeId);
      await updateDoc(storeRef, {
        status: false,
        suspendedAt: new Date().toISOString()
      });
      setStoreStatus(false);
      setShowCancelModal(false);
      setSuccessMsg('Suscripción anulada correctamente.');
    } catch (error) {
      console.error('Error al anular suscripción:', error);
      alert('Hubo un error al procesar la baja.');
    } finally {
      setLoading(false);
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
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-4xl mx-auto text-gray-100">
      
      {/* Cabecera y Banner ID */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <Store className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0" />
            <span>Configuración del Comercio</span>
          </h1>
          <p className="text-xs text-slate-400">
            Administra los datos generales de tu supermercado y tu suscripción activa.
          </p>
        </div>

        {/* ID de Comercio Compacto */}
        <div className="w-full sm:w-auto bg-slate-950/80 border border-gray-800 p-2.5 sm:px-3 sm:py-2 rounded-xl flex items-center justify-between sm:justify-start gap-3">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              ID de Comercio
            </span>
            <span className="text-xs font-mono text-slate-200 font-semibold truncate max-w-[190px] sm:max-w-48 block">
              {storeId || '---'}
            </span>
          </div>
          <button
            type="button"
            onClick={copyStoreIdToClipboard}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition border border-gray-800 shrink-0"
            title="Copiar ID de Comercio"
            aria-label="Copiar ID de Comercio"
          >
            {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Banner de Confirmación */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl sm:rounded-2xl text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Alerta de Cuenta Suspendida */}
      {!storeStatus && (
        <div className="p-4 sm:p-5 bg-red-950/30 border border-red-500/30 rounded-2xl sm:rounded-3xl space-y-3">
          <div className="flex items-center gap-2.5 text-red-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <span>Cuenta Suspendida / Plazo de 60 días activo</span>
          </div>
          <p className="text-xs text-red-200/80 leading-relaxed">
            Tu comercio se encuentra inactivo. Tienes un plazo de 60 días para reactivar sin perder tus datos. Para restablecer el servicio, comunicate con soporte técnico:
          </p>
          <div className="pt-0.5">
            <a
              href="tel:+5491159781434"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-500 hover:bg-red-400 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-red-500/20"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Contactar al +54 9 11 5978-1434</span>
            </a>
          </div>
        </div>
      )}

      {/* Tarjeta: Gestión de Sucursales */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-950 border border-gray-800 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-100">
              Gestión de Sucursales
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {planDetails?.maxBranches === 1 
                ? 'Tu plan actual permite 1 sucursal principal.' 
                : `Administra tus puntos de venta (${planDetails?.maxBranches} permitidas).`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/express/branches')}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700/60 shrink-0"
        >
          <span>Administrar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Formulario: Datos Maestros del Negocio */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm sm:text-base font-bold text-gray-100 pb-3 border-b border-gray-800/80">
          Datos Maestros del Negocio
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">
                Nombre del Supermercado
              </label>
              <span className="text-[10px] text-amber-400 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> Configurado por única vez
              </span>
            </div>
            <input
              type="text"
              value={storeName}
              disabled
              placeholder="Cargando..."
              className="w-full bg-slate-950/70 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed select-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Dirección / Sucursal
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>

      {/* Estado de Suscripción y Cambio de Plan */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-5 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm sm:text-base font-bold text-gray-100 pb-3 border-b border-gray-800/80 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          <span>Suscripción y Cambio de Plan</span>
        </h2>

        {/* Resumen del Plan Actual */}
        <div className="bg-slate-950/80 border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              Plan Activo
            </span>
            <h3 className="text-base sm:text-lg font-bold text-gray-100">
              {planDetails ? planDetails.name : 'Cargando plan...'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Límites actuales: {planDetails?.maxCategories === -1 ? 'Categorías ilimitadas' : `${planDetails?.maxCategories} categorías`} y {planDetails?.maxProductsPerCategory === -1 ? 'productos ilimitados' : `${planDetails?.maxProductsPerCategory} prods/cat`}.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight block">
              ${Number(planDetails?.price || 0).toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Mensuales
            </span>
          </div>
        </div>

        {/* Selector de Planes */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Pagar Suscripción (Mercado Pago)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {allPlans.map((plan) => {
              const isSelected = currentPlan === plan.id;
              return (
                <div 
                  key={plan.id}
                  className={`border rounded-xl sm:rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10' 
                      : 'bg-slate-950/70 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase text-gray-100 tracking-wide">
                        {plan.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      ${Number(plan.price || 0).toLocaleString('es-AR')} <span className="text-[10px] text-slate-400 font-normal">/mes</span>
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-gray-800/80 leading-relaxed">
                      <li>{plan.maxCategories === -1 ? 'Categorías ilimitadas' : `${plan.maxCategories} categorías`}</li>
                      <li>{plan.maxProductsPerCategory === -1 ? 'Productos ilimitados' : `${plan.maxProductsPerCategory} prods/cat`}</li>
                      <li>Hasta {plan.maxBranches} {plan.maxBranches === 1 ? 'sucursal' : 'sucursales'}</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={isSelected || loading}
                    className={`mt-4 w-full py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                      isSelected 
                        ? 'bg-slate-900 border border-gray-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    {isSelected ? 'Plan Actual' : 'Pagar con Mercado Pago'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zona de Peligro: Anular Suscripción */}
        <div className="pt-3 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase">Zona de baja</h4>
            <p className="text-[11px] text-slate-400">
              Anular tu suscripción suspenderá el acceso operativo de tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={loading || !storeStatus}
            className="w-full sm:w-auto px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 border border-red-500/30 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <PowerOff className="w-4 h-4" />
            <span>Anular Suscripción</span>
          </button>
        </div>
      </div>

      {/* Modal de Advertencia de Baja */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-red-500/30 text-gray-100 rounded-t-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full relative shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-red-400">
                ¿Desea anular la suscripción de su comercio?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                En caso de arrepentirse, dispone de <strong className="text-amber-400">60 días</strong> para reactivar la cuenta sin perder sus datos de inventario y clientes. Pasado ese lapso, la información se eliminará permanentemente.
              </p>
              <p className="text-[11px] text-slate-400 font-medium pt-0.5">
                Para reactivar comuníquese con soporte al <span className="text-slate-200 font-mono font-bold">+54 9 11 5978-1434</span>.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCancelSubscription}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-red-500/20"
              >
                Confirmar Baja
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}