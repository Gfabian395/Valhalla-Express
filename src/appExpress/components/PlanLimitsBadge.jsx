import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function PlanLimitsBadge({ type = 'categories', categoryId = null }) {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [usage, setUsage] = useState({ current: 0, max: 0, planName: 'Plan' });
  const [loading, setLoading] = useState(true);

  const typeLabels = {
    categories: 'categorías',
    products: 'productos',
    branches: 'sucursales'
  };

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchUsageAndLimits = async () => {
      try {
        setLoading(true);

        // 1. Obtener datos del comercio en 'comercios'
        const storeRef = doc(db, 'comercios', storeId);
        const storeSnap = await getDoc(storeRef);
        const storeData = storeSnap.exists() ? storeSnap.data() : {};
        
        console.log('[BADGE] 🏪 Datos del comercio encontrados:', storeData);

        // Extraer la clave del plan con múltiples alternativas de nombres de campos
        let planKey = storeData.plan || storeData.planSeleccionado || storeData.planId || 'basico';
        if (typeof planKey === 'string') {
          planKey = planKey.toLowerCase().replace('plan_', '').trim();
        }
        console.log('[BADGE] 🔑 Clave de plan normalizada:', planKey);

        // 2. Buscar el plan en 'express_planes'
        let planRef = doc(db, 'express_planes', planKey);
        let planSnap = await getDoc(planRef);

        // Si no existe con esa clave, intentamos buscar el primer plan disponible en la colección como emergencia
        if (!planSnap.exists()) {
          console.warn(`[BADGE] ⚠️ El plan "${planKey}" no existe en 'express_planes'. Buscando fallback...`);
          const allPlansSnap = await getDocs(collection(db, 'express_planes'));
          if (!allPlansSnap.empty) {
            // Intentar buscar uno que coincida parcialmente o tomar el primero
            const found = allPlansSnap.docs.find(d => d.id.toLowerCase().includes(planKey) || planKey.includes(d.id.toLowerCase()));
            planSnap = found || allPlansSnap.docs[0];
          }
        }

        const planData = planSnap && planSnap.exists ? planSnap.data() : { maxCategorias: 15, maxProductosPorCat: 30, nombre: 'Plan Básico' };
        console.log('[BADGE] 📦 Datos del plan obtenidos:', planData);
        
        let currentCount = 0;
        let maxLimit = 0;

        if (type === 'categories') {
          maxLimit = Number(
            planData.maxCategorias ?? 
            planData.maxCategories ?? 
            planData.limiteCategorias ?? 15
          );
          const catSnap = await getDocs(collection(db, 'comercios', storeId, 'categories'));
          currentCount = catSnap.size;
        } else if (type === 'products' && categoryId) {
          maxLimit = Number(
            planData.maxProductosPorCat ?? 
            planData.maxProductsPerCategory ?? 
            planData.limiteProductos ?? 30
          );
          const prodSnap = await getDocs(collection(db, 'comercios', storeId, 'categories', categoryId, 'products'));
          currentCount = prodSnap.size;
        }

        console.log(`[BADGE] ✅ Conteo actual: ${currentCount} / Límite máximo: ${maxLimit}`);

        if (isMounted) {
          setUsage({
            current: currentCount,
            max: maxLimit,
            planName: planData.nombre || planData.name || 'Plan'
          });
        }
      } catch (error) {
        console.error('[BADGE] ❌ Error al calcular límites del plan:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsageAndLimits();

    return () => {
      isMounted = false;
    };
  }, [storeId, type, categoryId]);

  if (loading) {
    return (
      <div className="h-7 w-32 bg-gray-100 border border-gray-200 rounded-xl animate-pulse" />
    );
  }

  const isUnlimited = usage.max === -1;
  const isAtLimit = !isUnlimited && usage.current >= usage.max;
  const isNearLimit = !isUnlimited && !isAtLimit && usage.max > 0 && usage.current / usage.max >= 0.8;

  const getBadgeStyle = () => {
    if (isAtLimit) return 'bg-red-50 border-red-200 text-red-700';
    if (isNearLimit) return 'bg-amber-50 border-amber-200 text-amber-800';
    return 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const getIcon = () => {
    if (isAtLimit) return <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    if (isNearLimit) return <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    return <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />;
  };

  const getNumberColor = () => {
    if (isAtLimit) return 'text-red-600 font-bold';
    if (isNearLimit) return 'text-amber-600 font-bold';
    return 'text-green-600 font-bold';
  };

  return (
    <div className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 transition-colors ${getBadgeStyle()}`}>
      {getIcon()}
      <span className="truncate">
        <span className="font-semibold text-gray-900">{usage.planName}:</span>{' '}
        <strong className={`font-mono ${getNumberColor()}`}>{usage.current}</strong>{' '}
        <span className="text-gray-400 font-mono">/</span>{' '}
        <span className="font-mono text-gray-600">{isUnlimited ? '∞' : usage.max}</span>{' '}
        <span className="text-gray-500 font-normal">{typeLabels[type] || type}</span>
      </span>
    </div>
  );
}