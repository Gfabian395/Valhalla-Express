import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Función para verificar si la tienda puede crear una nueva categoría (sumando todas las sucursales)
export async function canCreateCategory(storeId) {
  try {
    const storeRef = doc(db, 'stores', storeId);
    const storeSnap = await getDoc(storeRef);
    
    const planId = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

    const planRef = doc(db, 'ExpressPlanes', planId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) return { allowed: false, message: 'Plan no encontrado.' };
    const planLimits = planSnap.data();

    // Si es ilimitado (-1)
    if (planLimits.maxCategories === -1) return { allowed: true };

    // 1. Contar categorías de la sucursal/local principal
    const mainCategoriesRef = collection(db, 'stores', storeId, 'categories');
    const mainCategoriesSnap = await getDocs(mainCategoriesRef);
    let totalCategoriesCount = mainCategoriesSnap.size;

    // 2. Obtener todas las sucursales adicionales de la tienda
    const branchesRef = collection(db, 'stores', storeId, 'branches');
    const branchesSnap = await getDocs(branchesRef);

    // 3. Sumar las categorías de cada sucursal adicional
    for (const branchDoc of branchesSnap.docs) {
      const branchCategoriesRef = collection(db, 'stores', storeId, 'branches', branchDoc.id, 'categories');
      const branchCategoriesSnap = await getDocs(branchCategoriesRef);
      totalCategoriesCount += branchCategoriesSnap.size;
    }

    // 4. Validar contra el límite total global del plan
    if (totalCategoriesCount >= planLimits.maxCategories) {
      return {
        allowed: false,
        message: `Has alcanzado el límite global de ${planLimits.maxCategories} categorías permitidas para tu ${planLimits.name}. Actualiza tu plan para crear más.`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error al verificar límite global de categorías:', error);
    return { allowed: false, message: 'Error al comprobar límites.' };
  }
}

// Función para verificar si la tienda puede crear un producto en una categoría y sucursal específica
export async function canCreateProduct(storeId, categoryId, branchId = null) {
  try {
    const storeRef = doc(db, 'stores', storeId);
    const storeSnap = await getDoc(storeRef);
    
    const planId = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

    const planRef = doc(db, 'ExpressPlanes', planId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) return { allowed: false, message: 'Plan no encontrado.' };
    const planLimits = planSnap.data();

    // Si es ilimitado (-1)
    if (planLimits.maxProductsPerCategory === -1) return { allowed: true };

    // Construir la referencia dependiendo de si es la sucursal principal o una sucursal adicional
    let productsRef;
    if (branchId) {
      productsRef = collection(db, 'stores', storeId, 'branches', branchId, 'categories', categoryId, 'products');
    } else {
      productsRef = collection(db, 'stores', storeId, 'categories', categoryId, 'products');
    }

    const productsSnap = await getDocs(productsRef);
    
    if (productsSnap.size >= planLimits.maxProductsPerCategory) {
      return {
        allowed: false,
        message: `Has alcanzado el límite de ${planLimits.maxProductsPerCategory} productos para esta categoría en tu ${planLimits.name}.`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error al verificar límite de productos:', error);
    return { allowed: false, message: 'Error al comprobar límites de productos.' };
  }
}