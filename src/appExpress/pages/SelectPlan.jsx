import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, ArrowRight } from 'lucide-react';

export default function SelectPlan() {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePlanId, setActivePlanId] = useState(null);
  const navigate = useNavigate();

  // Detectar retorno de pago aprobado desde Mercado Pago al registrarse/seleccionar plan
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
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/express/pos');
        } catch (err) {
          console.error('Error al activar plan tras el pago:', err);
        }
      };
      activatePaidPlan();
    }
  }, [storeId, navigate]);

  // Cargar los planes desde la colección ExpressPlanes en Firebase
  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'ExpressPlanes'));
        const plansList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordenar por precio ascendente
        plansList.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        if (isMounted) {
          setPlans(plansList);
        }
      } catch (error) {
        console.error('Error al cargar planes:', error);
      }
    };
    fetchPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  // Seleccionar plan e iniciar pasarela de pagos con Mercado Pago o asignar gratis
  const handleSelectPlan = async (planId) => {
    if (!storeId) {
      alert('Sesión no detectada. Inicia sesión nuevamente.');
      navigate('/login');
      return;
    }

    const selectedPlanObj = plans.find(p => p.id === planId);
    if (!selectedPlanObj) return;

    setActivePlanId(planId);

    // Si el plan es gratuito ($0), se asigna de inmediato
    if (Number(selectedPlanObj.price) <= 0) {
      try {
        setLoading(true);
        const storeRef = doc(db, 'stores', storeId);
        await updateDoc(storeRef, {
          plan: planId,
          status: true,
          updatedAt: new Date().toISOString()
        });
        navigate('/express/pos');
      } catch (error) {
        console.error('Error al asignar el plan gratuito:', error);
        alert('Hubo un error al seleccionar el plan.');
      } finally {
        setLoading(false);
        setActivePlanId(null);
      }
      return;
    }

    // Si el plan tiene costo, procesamos el pago con Mercado Pago
    try {
      setLoading(true);
      const mpToken = import.meta.env.VITE_MP_ACCESS_TOKEN;
      const targetUrl = `${window.location.origin}/express/select-plan`;

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
              title: `Suscripción ${selectedPlanObj.name || 'Plan'} - Valhalla Express`,
              unit_price: Number(selectedPlanObj.price),
              quantity: 1,
              currency_id: 'ARS'
            }
          ],
          external_reference: planId,
          back_urls: {
            success: targetUrl,
            failure: targetUrl,
            pending: targetUrl
          },
          auto_return: 'approved'
        })
      });

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.error('Respuesta de Mercado Pago:', data);
        alert('No se pudo generar el link de pago. Verifica tu VITE_MP_ACCESS_TOKEN en el archivo .env');
        setLoading(false);
        setActivePlanId(null);
      }
    } catch (error) {
      console.error('Error al conectar con Mercado Pago:', error);
      alert('Hubo un error al conectar con la pasarela de pagos.');
      setLoading(false);
      setActivePlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-center">
      <div className="max-w-5xl w-full space-y-6 sm:space-y-8 text-center">
        
        {/* Encabezado */}
        <div className="space-y-2 sm:space-y-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-100">
            Selecciona el plan para tu comercio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Elige el nivel que mejor se adapte al volumen de tu inventario y red de sucursales. Podrás actualizarlo en cualquier momento.
          </p>
        </div>

        {/* Grilla de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 text-left items-stretch">
          {plans.map((plan) => {
            const isFeatured = Number(plan.price || 0) > 0 && plan.maxBranches > 1;
            const isProcessingThis = loading && activePlanId === plan.id;

            return (
              <div 
                key={plan.id}
                className={`bg-gray-900/90 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all relative shadow-xl backdrop-blur-sm ${
                  isFeatured 
                    ? 'border-emerald-500/50 shadow-emerald-500/5' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    Recomendado
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
                      {plan.name}
                    </span>
                    <div className="mt-3.5 flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-gray-100 font-mono tracking-tight">
                        ${Number(plan.price || 0).toLocaleString('es-AR')}
                      </span>
                      <span className="text-xs text-slate-400">/mes</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300 border-t border-gray-800 pt-3.5 leading-relaxed">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-gray-100 font-semibold">
                          {plan.maxCategories === -1 ? 'Categorías ilimitadas' : `${plan.maxCategories} categorías`}
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-gray-100 font-semibold">
                          {plan.maxProductsPerCategory === -1 ? 'Productos ilimitados' : `${plan.maxProductsPerCategory} productos`}
                        </strong> por categoría
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Hasta <strong className="text-gray-100 font-semibold">{plan.maxBranches} {plan.maxBranches === 1 ? 'sucursal' : 'sucursales'}</strong>
                      </span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading}
                  className={`mt-6 w-full py-2.5 sm:py-3 px-4 active:scale-95 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md ${
                    Number(plan.price || 0) > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <span>
                    {isProcessingThis 
                      ? 'Procesando...' 
                      : Number(plan.price || 0) > 0 
                        ? 'Contratar con Mercado Pago' 
                        : 'Elegir Plan Gratuito'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}