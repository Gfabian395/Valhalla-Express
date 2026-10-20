import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, Zap } from 'lucide-react';

export default function SelectPlan() {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
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
          // Redirigir al sistema principal (Caja / POS)
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
    const fetchPlans = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'ExpressPlanes'));
        const plansList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordenar lógicamente por precio
        plansList.sort((a, b) => a.price - b.price);
        setPlans(plansList);
      } catch (error) {
        console.error('Error al cargar planes:', error);
      }
    };
    fetchPlans();
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
      }
      return;
    }

    // Si el plan tiene costo, procesamos el pago con Mercado Pago
    try {
      setLoading(true);
      const mpToken = import.meta.env.VITE_MP_ACCESS_TOKEN;
      const targetUrl = `${window.location.origin}/express/select-plan`; // Ruta actual para capturar el retorno

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
              title: `Suscripción Plan ${selectedPlanObj.name} - ValhallaExpress`,
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
          }
        })
      });

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.error('Respuesta de Mercado Pago:', data);
        alert('No se pudo generar el link de pago. Verifica tu VITE_MP_ACCESS_TOKEN en el archivo .env');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error al conectar con Mercado Pago:', error);
      alert('Hubo un error al conectar con la pasarela de pagos.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-5xl w-full space-y-8 text-center">
        
        <div className="space-y-3">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-slate-100">
            Selecciona el plan para tu supermercado
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Elige el nivel que mejor se adapte a tu volumen de inventario y cantidad de sucursales. Puedes actualizarlo cuando desees.
          </p>
        </div>

        {/* Grilla de Planes leídos de ExpressPlanes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 flex flex-col justify-between transition shadow-xl relative group"
            >
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    {plan.name}
                  </span>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-100">
                      ${Number(plan.price || 0).toLocaleString('es-AR')}
                    </span>
                    <span className="text-xs text-slate-400 uppercase">/mes</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>{plan.maxCategories === -1 ? 'Categorías ilimitadas' : `${plan.maxCategories} categorías`}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>{plan.maxProductsPerCategory === -1 ? 'Productos ilimitados' : `${plan.maxProductsPerCategory} productos`}</strong> por categoría</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Hasta <strong>{plan.maxBranches} {plan.maxBranches === 1 ? 'sucursal' : 'sucursales'}</strong></span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading}
                className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
              >
                {loading ? 'Procesando...' : Number(plan.price || 0) > 0 ? 'Pagar con Mercado Pago' : 'Elegir Plan Gratuito'}
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}