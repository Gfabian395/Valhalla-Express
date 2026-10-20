import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ShieldAlert } from 'lucide-react';

export default function PlanLimitsBadge({ type = 'categories', categoryId = null }) {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [usage, setUsage] = useState({ current: 0, max: 0, planName: 'Plan' });

  useEffect(() => {
    if (!storeId) return;
    const fetchUsageAndLimits = async () => {
      try {
        // 1. Obtener plan de la tienda
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        const planKey = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

        // 2. Obtener límites del plan en ExpressPlanes
        const planRef = doc(db, 'ExpressPlanes', planKey);
        const planSnap = await getDoc(planRef);
        if (!planSnap.exists()) return;
        const planData = planSnap.data();

        let currentCount = 0;
        let maxLimit = 0;

        if (type === 'categories') {
          maxLimit = planData.maxCategories;
          const catSnap = await getDocs(collection(db, 'stores', storeId, 'categories'));
          currentCount = catSnap.size;
        } else if (type === 'products' && categoryId) {
          maxLimit = planData.maxProductsPerCategory;
          const prodSnap = await getDocs(collection(db, 'stores', storeId, 'categories', categoryId, 'products'));
          currentCount = prodSnap.size;
        } else if (type === 'branches') {
          maxLimit = planData.maxBranches;
          const branchSnap = await getDocs(collection(db, 'stores', storeId, 'branches'));
          currentCount = branchSnap.size;
        }

        setUsage({
          current: currentCount,
          max: maxLimit,
          planName: planData.name
        });
      } catch (error) {
        console.error('Error al calcular límites:', error);
      }
    };
    fetchUsageAndLimits();
  }, [storeId, type, categoryId]);

  const isUnlimited = usage.max === -1;
  const isNearLimit = !isUnlimited && usage.current >= usage.max;

  return (
    <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 font-mono ${isNearLimit ? 'bg-red-950/40 border-red-500/40 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
      <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>
        {usage.planName}: <strong className="text-emerald-400">{usage.current}</strong> / {isUnlimited ? '∞' : usage.max} {type}
      </span>
    </div>
  );
}