import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function PlanLimitsBadge({ type = 'categories', categoryId = null }) {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [usage, setUsage] = useState({ current: 0, max: 0, planName: 'Plan' });
  const [loading, setLoading] = useState(true);

  // Mapeo semántico para plurales legibles en español
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

        // 1. Obtener plan actual de la tienda
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        const planKey = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

        // 2. Obtener límites asociados al plan
        const planRef = doc(db, 'ExpressPlanes', planKey);
        const planSnap = await getDoc(planRef);

        if (!planSnap.exists()) {
          if (isMounted) setLoading(false);
          return;
        }

        const planData = planSnap.data();
        let currentCount = 0;
        let maxLimit = 0;

        if (type === 'categories') {
          maxLimit = Number(planData.maxCategories ?? 0);
          const catSnap = await getDocs(collection(db, 'stores', storeId, 'categories'));
          currentCount = catSnap.size;
        } else if (type === 'products' && categoryId) {
          maxLimit = Number(planData.maxProductsPerCategory ?? 0);
          const prodSnap = await getDocs(collection(db, 'stores', storeId, 'categories', categoryId, 'products'));
          currentCount = prodSnap.size;
        } else if (type === 'branches') {
          maxLimit = Number(planData.maxBranches ?? 0);
          const branchSnap = await getDocs(collection(db, 'stores', storeId, 'branches'));
          currentCount = branchSnap.size;
        }

        if (isMounted) {
          setUsage({
            current: currentCount,
            max: maxLimit,
            planName: planData.name || 'Plan'
          });
        }
      } catch (error) {
        console.error('Error al calcular límites del plan:', error);
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
      <div className="h-7 w-32 bg-slate-900 border border-gray-800 rounded-lg animate-pulse" />
    );
  }

  const isUnlimited = usage.max === -1;
  const isAtLimit = !isUnlimited && usage.current >= usage.max;
  const isNearLimit = !isUnlimited && !isAtLimit && usage.max > 0 && usage.current / usage.max >= 0.8;

  // Estado visual del badge según consumo del cupo
  const getBadgeStyle = () => {
    if (isAtLimit) {
      return 'bg-red-500/10 border-red-500/30 text-red-300';
    }
    if (isNearLimit) {
      return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
    }
    return 'bg-slate-950/80 border-gray-800 text-slate-300';
  };

  const getIcon = () => {
    if (isAtLimit) {
      return <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    }
    if (isNearLimit) {
      return <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  const getNumberColor = () => {
    if (isAtLimit) return 'text-red-400';
    if (isNearLimit) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div
      className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 transition-colors ${getBadgeStyle()}`}
    >
      {getIcon()}

      <span className="truncate">
        <span className="font-semibold text-gray-200">{usage.planName}:</span>{' '}
        <strong className={`font-mono font-bold ${getNumberColor()}`}>
          {usage.current}
        </strong>{' '}
        <span className="text-slate-500 font-mono">/</span>{' '}
        <span className="font-mono text-slate-400">{isUnlimited ? '∞' : usage.max}</span>{' '}
        <span className="text-slate-400 font-normal">{typeLabels[type] || type}</span>
      </span>
    </div>
  );
}