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
      if (user) {
        setStoreId(user.uid);
      } else {
        setStoreId(null);
      }
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
    const fetchStoreSettingsAndPlans = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);

        let planKey = 'basico';
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          setStoreName(data.name || '');
          setStorePhone(data.phone || '');
          setStoreAddress(data.address || '');
          setStoreStatus(data.status !== undefined ? data.status : true);
          planKey = data.plan || 'basico';
          setCurrentPlan(planKey);
        }

        const plansSnap = await getDocs(collection(db, 'ExpressPlanes'));
        const plansList = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        plansList.sort((a, b) => a.price - b.price);
        setAllPlans(plansList);

        const currentPlanObj = plansList.find(p => p.id === planKey) || plansList[0];
        if (currentPlanObj) {
          setPlanDetails(currentPlanObj);
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      }
    };
    fetchStoreSettingsAndPlans();
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
    
    const selectedPlanObj = allPlans.find(p => p.id === newPlanId);
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
      
      // Usamos una URL base estandarizada para desarrollo
      const targetUrl = `${window.location.origin}/express/config`;

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mpToken}`
        },
        body: JSON.stringify({
          items: [
            {
              id: selectedPlanObj.id,
              title: `Suscripcion Plan ${selectedPlanObj.name} ValhallaExpress`,
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
          // Nota: Al quitar 'auto_return', evitamos que Mercado Pago rechace los entornos locales de localhost.
        })
      });

      const data = await response.json();
      console.log('Respuesta de Mercado Pago:', data);

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

  const copyStoreIdToClipboard = () => {
    if (!storeId) return;
    navigator.clipboard.writeText(storeId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-100 flex items-center gap-3">
            <Store className="w-7 h-7 text-emerald-400" /> Configuración del Comercio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra los datos generales de tu supermercado y gestiona tu plan de suscripción contratado.
          </p>
        </div>

        {/* Tarjeta de ID Único de Comercio */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">ID Único de Comercio</span>
            <span className="text-xs font-mono text-emerald-400 font-bold truncate max-w-40 block">{storeId}</span>
          </div>
          <button
            onClick={copyStoreIdToClipboard}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800"
            title="Copiar ID de Comercio"
          >
            {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950 border border-emerald-500/50 rounded-2xl text-emerald-400 text-sm font-bold flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-6 h-6" /> {successMsg}
        </div>
      )}

      {/* Alerta de Estado Suspendido en Configuración */}
      {!storeStatus && (
        <div className="p-5 bg-red-950/60 border border-red-500/50 rounded-3xl space-y-3 shadow-2xl">
          <div className="flex items-center gap-3 text-red-400 font-black text-sm uppercase">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <span>Cuenta Suspendida / Plazo de 60 días activo</span>
          </div>
          <p className="text-xs text-red-200/80 leading-relaxed">
            Tu comercio se encuentra inactivo. Tienes un plazo de 60 días para reactivar sin perder tus datos. Para hacerlo, comunícate al soporte técnico al <strong className="text-white">1159781434</strong>:
          </p>
          <div className="pt-1">
            <a
              href="tel:1159781434"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-slate-950 font-black text-xs uppercase rounded-xl transition shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              <PhoneCall className="w-4 h-4" /> Contactar al 1159781434
            </a>
          </div>
        </div>
      )}

      {/* Acceso a Gestión de Sucursales condicionado al plan */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-slate-100">Gestión de Sucursales</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {planDetails?.maxBranches === 1 
                ? 'Tu plan actual permite 1 sucursal principal.' 
                : `Administra tus puntos de venta (${planDetails?.maxBranches} permitidas).`}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/express/branches')}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-slate-700"
        >
          Administrar <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Formulario de Datos del Negocio */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5">
        <h2 className="text-base font-black uppercase tracking-wide text-slate-100 pb-3 border-b border-slate-800">
          Datos Maestros del Negocio
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Nombre del Supermercado</label>
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Configurado por única vez
              </span>
            </div>
            <input
              type="text"
              value={storeName}
              disabled={true}
              placeholder="Cargando..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500 cursor-not-allowed select-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Teléfono de Contacto</label>
              <input
                type="text"
                value={storePhone}
                onChange={e => setStorePhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dirección / Sucursal</label>
              <input
                type="text"
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      {/* Estado de Suscripción y Cambio de Planes */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6">
        <h2 className="text-base font-black uppercase tracking-wide text-slate-100 pb-3 border-b border-slate-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Suscripción y Cambio de Plan
        </h2>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              Plan Activo
            </span>
            <h3 className="text-xl font-black text-slate-100 mt-2">
              {planDetails ? planDetails.name : 'Cargando plan...'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Límites actuales: {planDetails?.maxCategories === -1 ? 'Categorías ilimitadas' : `${planDetails?.maxCategories} categorías`} y {planDetails?.maxProductsPerCategory === -1 ? 'productos ilimitados' : `${planDetails?.maxProductsPerCategory} productos por categoría`}.
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400">
              ${Number(planDetails?.price || 0).toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-slate-500 block uppercase">Mensuales</span>
          </div>
        </div>

        {/* Selector de Planes Disponibles */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" /> Pagar Suscripción (Mercado Pago)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allPlans.map((plan) => {
              const isSelected = currentPlan === plan.id;
              return (
                <div 
                  key={plan.id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between transition ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-slate-100">{plan.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-black text-emerald-400">
                      ${Number(plan.price || 0).toLocaleString('es-AR')} <span className="text-[10px] text-slate-400 font-normal">/mes</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1 pt-2 border-t border-slate-800/80">
                      <li>{plan.maxCategories === -1 ? 'Categorías ilimitadas' : `${plan.maxCategories} categorías`}</li>
                      <li>{plan.maxProductsPerCategory === -1 ? 'Productos ilimitados' : `${plan.maxProductsPerCategory} prods/cat`}</li>
                      <li>Hasta {plan.maxBranches} sucursales</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={isSelected || loading}
                    className={`mt-4 w-full py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                      isSelected 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    }`}
                  >
                    {isSelected ? 'Plan Actual' : 'Pagar con Mercado Pago'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zona de peligro: Anular suscripción */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase">Zona de baja</h4>
            <p className="text-[11px] text-slate-400">Anular tu suscripción suspenderá el acceso operativo del comercio.</p>
          </div>
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={loading || !storeStatus}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition flex items-center gap-2"
          >
            <PowerOff className="w-4 h-4" /> Anular Suscripción
          </button>
        </div>

      </div>

      {/* MODAL ATRACTIVO DE ADVERTENCIA DE BAJA */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 text-slate-100 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black uppercase text-red-400">
                ¿Desea anular suscripción por su cuenta?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                En caso de arrepentirse tiene <strong className="text-emerald-400">60 días</strong> para reactivar el comercio sin perder datos de clientes, categorías y productos. Pasado ese tiempo se elimina la base de datos.
              </p>
              <p className="text-[11px] text-slate-400 font-bold pt-1">
                Para reactivar comuníquese al sistema al <span className="text-emerald-400 font-mono">1159781434</span>.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCancelSubscription}
                disabled={loading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Sí, Anular Baja
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}