import { useState, useEffect } from 'react';
import { auth, db } from '../../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Send, Zap, Check, Building2, MapPin, Phone } from 'lucide-react';

export default function LoginOnboarding() {
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null); // <- Inicialmente null para forzar elección
  const [plansList, setPlansList] = useState([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Cargar los planes disponibles desde 'express_planes'
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log('[ONBOARDING] 🔄 Cargando planes desde express_planes...');
        const snap = await getDocs(collection(db, 'express_planes'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => Number(a.precio || a.price || 0) - Number(b.precio || b.price || 0));
        if (list.length > 0) {
          console.log('[ONBOARDING] ✅ Planes cargados con éxito:', list);
          setPlansList(list);
        }
      } catch (err) {
        console.error('[ONBOARDING] ❌ Error al cargar planes (Revisar Reglas de Firestore):', err);
        setErrorMsg('Error al cargar los planes comerciales. Verifica los permisos en Firestore.');
      }
    };
    fetchPlans();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      console.log('[ONBOARDING] 🚀 ETAPA 1: Iniciando autenticación con Google...');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      setUser(loggedUser);
      console.log('[ONBOARDING] ✅ ETAPA 1 Exitosa - Usuario autenticado:', { uid: loggedUser.uid, email: loggedUser.email });

      console.log('[ONBOARDING] 🔍 Verificando si el comercio ya existe en Firestore...');
      const storeRef = doc(db, 'comercios', loggedUser.uid);
      const storeSnap = await getDoc(storeRef);

      if (storeSnap.exists()) {
        console.log('[ONBOARDING] 📂 Comercio encontrado en Firestore. Redirigiendo a /express/pos...');
        navigate('/express/pos');
      } else {
        console.log('[ONBOARDING] 📝 Comercio no encontrado. Abriendo formulario de Onboarding...');
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('[ONBOARDING] ❌ Error en login con Google:', error);
      setErrorMsg('No se pudo iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone) => {
    const cleaned = phone.trim();
    if (!cleaned || cleaned === '---') return '---';
    if (cleaned.startsWith('+')) return cleaned;

    let digits = cleaned.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    return `+549${digits}`;
  };

  const handleRegisterStore = async (e) => {
    e.preventDefault();
    if (!storeName.trim() || !user) return;

    // Validación obligatoria de selección de plan
    if (!selectedPlan) {
      setErrorMsg('Por favor, selecciona un plan para continuar.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      console.log('[ONBOARDING] 🏪 ETAPA 2: Registrando datos del comercio...');
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const formattedPhone = formatPhoneNumber(storePhone);

      const chosenPlanObj = plansList.find(p => p.id === selectedPlan);
      const planNameDisplay = chosenPlanObj ? (chosenPlanObj.nombre || chosenPlanObj.name || selectedPlan) : selectedPlan;
      console.log(`[ONBOARDING] 📦 ETAPA 3: Plan seleccionado -> ID: "${selectedPlan}", Nombre: "${planNameDisplay}"`);

      const initialStoreData = {
        uid: user.uid,
        name: storeName.trim(),
        phone: formattedPhone,
        address: storeAddress.trim() || '---',
        slug: slug,
        planSeleccionado: selectedPlan,
        activo: false, 
        createdAt: new Date().toISOString(),
        ownerEmail: user.email,
        ownerUid: user.uid
      };

      console.log('[ONBOARDING] 💾 Guardando documento en la colección "comercios" de Firestore...', initialStoreData);
      await setDoc(doc(db, 'comercios', user.uid), initialStoreData);
      console.log('[ONBOARDING] ✅ Comercio guardado con éxito.');

      console.log('[ONBOARDING] 💬 ETAPA 4: Generando enlace y abriendo WhatsApp para notificación de alta...');
      const adminPhone = "5491159781434"; 
      const message = `🚀 *NUEVO REGISTRO - VALHALLA EXPRESS*\n\n` +
        `🏪 *Local:* ${storeName.trim()}\n` +
        `📦 *Plan Solicitado:* ${planNameDisplay}\n` +
        `📍 *Dirección:* ${storeAddress.trim() || 'No especificada'}\n` +
        `📱 *WhatsApp:* ${formattedPhone}\n` +
        `🆔 *UID:* ${user.uid}\n\n` +
        `_Solicito activación de cuenta._`;

      const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      console.log('[ONBOARDING] ✅ WhatsApp abierto correctamente. Redirigiendo a /express/pos...');

      navigate('/express/pos');
    } catch (error) {
      console.error('[ONBOARDING] ❌ Error al registrar la tienda:', error);
      setErrorMsg('Hubo un error al registrar el comercio en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-sm space-y-6">

        {/* Identidad de Marca */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center mx-auto overflow-hidden shadow-xs p-2.5">
            <img
              src="/Express.png"
              alt="Valhalla Express Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              VALHALLA EXPRESS
            </h1>
            <p className="text-[11px] sm:text-xs text-green-600 font-bold uppercase tracking-wider mt-0.5">
              Multi-Comercio
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {!needsOnboarding ? (
          <div className="space-y-4 pt-1 max-w-md mx-auto text-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{loading ? 'Autenticando...' : 'Iniciar Sesión con Google'}</span>
            </button>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Accede de forma segura con tu cuenta de Google para administrar tu comercio.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegisterStore} className="space-y-5">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600 leading-relaxed">
              ¡Hola, <strong className="text-gray-900">{user?.displayName}</strong>! Configura los datos de tu comercio y elige tu plan por <strong className="text-amber-600">única vez</strong> (el nombre comercial no se podrá modificar luego).
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre del Comercio */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Nombre del Comercio
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: Supermercado Don Pepe"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
              </div>

              {/* Teléfono WhatsApp */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  WhatsApp de Contacto
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: 1155443322"
                    value={storePhone}
                    onChange={e => setStorePhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                Dirección / Localidad
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ej: Asunción 456"
                  value={storeAddress}
                  onChange={e => setStoreAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
              </div>
            </div>

            {/* Tarjetas Interactivas de Selección de Planes */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Selecciona tu Plan deseado <span className="text-red-500">*</span>
              </label>

              {plansList.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center">
                  ⚠️ No se pudieron cargar los planes. Verifica las reglas de Firestore para la colección <code className="font-mono font-bold">express_planes</code>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plansList.map(plan => {
                    const isSelected = selectedPlan === plan.id;
                    const planTitle = plan.nombre || plan.name || plan.id;
                    const planPrice = Number(plan.precio || plan.price || 0);
                    const maxCat = plan.maxCategorias ?? plan.maxCategories ?? 15;
                    const maxProd = plan.maxProductosPorCat ?? plan.maxProductsPerCategory ?? 30;
                    const maxBr = plan.maxBranches ?? 1;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-green-50/80 border-green-600 ring-2 ring-green-600/20 shadow-xs' 
                            : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-900 uppercase">
                              {planTitle}
                            </span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-3" />}
                            </div>
                          </div>

                          <div className="text-sm font-black font-mono text-green-600">
                            ${planPrice.toLocaleString('es-AR')} <span className="text-[10px] text-gray-400 font-normal">/mes</span>
                          </div>

                          <ul className="text-[10px] text-gray-500 space-y-0.5 pt-1.5 border-t border-gray-200/60 font-mono">
                            <li>• {maxCat === -1 ? 'Categorías ilimitadas' : `${maxCat} categorías`}</li>
                            <li>• {maxProd === -1 ? 'Productos ilimitados' : `${maxProd} prods/cat`}</li>
                            <li>• {maxBr} {maxBr === 1 ? 'sucursal' : 'sucursales'}</li>
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !storeName.trim() || !selectedPlan}
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>{loading ? 'Registrando tienda...' : 'Registrar y Solicitar Activación'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}