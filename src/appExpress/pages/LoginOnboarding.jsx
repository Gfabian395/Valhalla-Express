import { useState, useEffect } from 'react';
import { auth, db } from '../../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Send, Zap, Check, Building2, MapPin, Phone } from 'lucide-react';

const ADMIN_WHATSAPP_NUMBER = '5491159781434';

export default function LoginOnboarding() {
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plansList, setPlansList] = useState([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const snap = await getDocs(collection(db, 'express_planes'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => Number(a.precio || a.price || 0) - Number(b.precio || b.price || 0));
        if (list.length > 0) {
          setPlansList(list);
          setSelectedPlan(list[0].id);
        }
      } catch (err) {
        console.error('Error al cargar planes desde express_planes:', err);
        setErrorMsg('Error al cargar los planes comerciales.');
      }
    };
    fetchPlans();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      setUser(loggedUser);
      
      // Prellenamos el nombre del titular con el de Google si está vacío
      if (loggedUser.displayName && !ownerName) {
        setOwnerName(loggedUser.displayName);
      }

      const storeRef = doc(db, 'comercios', loggedUser.uid);
      const storeSnap = await getDoc(storeRef);

      if (storeSnap.exists()) {
        const data = storeSnap.data();
        // 🔴 Validamos estrictamente por status tal como en Service
        if (data.status === true) {
          navigate('/express/pos');
        } else {
          setNeedsOnboarding(true);
        }
      } else {
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Error en login con Google:', error);
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
    if (digits.startsWith('0')) digits = digits.substring(1);
    return `+549${digits}`;
  };

  const handleRegisterStore = async (e) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerName.trim() || !user || !selectedPlan) {
      setErrorMsg('Por favor, completa todos los campos requeridos y selecciona un plan.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const formattedPhone = formatPhoneNumber(storePhone);

      const chosenPlanObj = plansList.find(p => p.id === selectedPlan);
      const planNameDisplay = chosenPlanObj ? (chosenPlanObj.nombre || chosenPlanObj.name || selectedPlan) : selectedPlan;
      const planPrice = Number(chosenPlanObj?.precio || chosenPlanObj?.price || 0);
      const planMaintenance = Number(chosenPlanObj?.mantenimiento_mensual || 0);

      // 🔴 Estructura unificada idéntica a Service (sin campo 'activo', usando 'status')[cite: 7]
      const initialStoreData = {
        ownerUid: user.uid,
        name: storeName.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: user.email || '',
        phone: formattedPhone,
        address: storeAddress.trim() || '---',
        planId: selectedPlan,
        planName: planNameDisplay,
        planPrice: planPrice,
        planMaintenance: planMaintenance,
        workshopConfigured: true,
        status: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'comercios', user.uid), initialStoreData, { merge: true });

      const message = `🚨 *REGISTRO PENDIENTE DE PAGO - VALHALLA EXPRESS*\n\n` +
        `🏪 *Comercio:* ${storeName.trim()}\n` +
        `👤 *Titular:* ${ownerName.trim()}\n` +
        `📱 *WhatsApp Local:* ${formattedPhone}\n` +
        `💎 *Plan Elegido:* ${planNameDisplay}\n` +
        `💵 *Pago Único de Alta:* $${planPrice.toLocaleString('es-AR')}\n` +
        `🔄 *Mantenimiento Mensual:* $${planMaintenance.toLocaleString('es-AR')}\n` +
        `🆔 *ID Comercio:* ${user.uid}\n\n` +
        `El comercio ha completado su registro y aguarda validación para activar su cuenta.`;

      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      navigate('/express/pos');
    } catch (error) {
      console.error('Error al registrar la tienda:', error);
      setErrorMsg('Hubo un error al registrar el comercio en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-sm space-y-6">

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
              Punto de Venta y Gestión Comercial
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
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
              ¡Hola, <strong className="text-gray-900">{user?.displayName}</strong>! Configura los datos de tu comercio y elige tu plan por <strong className="text-green-600">única vez</strong>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Nombre del Comercio *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: Autoservicio Don Luis"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Nombre y Apellido del Titular *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: Fabián González"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">WhatsApp de Contacto *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: 1155443322"
                    value={storePhone}
                    onChange={e => setStorePhone(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Dirección / Localidad</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: Av. Mitre 2500"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Selecciona tu Plan deseado <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 gap-3">
                {plansList.map(plan => {
                  const isSelected = selectedPlan === plan.id;
                  const planTitle = plan.nombre || plan.name || plan.id;
                  const planPrice = Number(plan.precio || plan.price || 0);
                  const planMaintenance = Number(plan.mantenimiento_mensual || 0);
                  const maxCat = plan.maxCategorias ?? 60;
                  const maxProd = plan.maxProductosPorCat ?? 250;
                  const maxFiado = plan.maxClientesFiado ?? 300;
                  const totalProd = (maxCat * maxProd).toLocaleString('es-AR');

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-green-50/80 border-green-600 ring-2 ring-green-600/20 shadow-xs' 
                          : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-2">
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

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                          <span className="text-gray-900 font-bold">Alta: ${planPrice.toLocaleString('es-AR')}</span>
                          <span className="text-gray-600">Mantenimiento: ${planMaintenance.toLocaleString('es-AR')}/mes</span>
                        </div>

                        <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60 flex flex-wrap gap-x-3">
                          <span>Categorías: <strong className="text-gray-900">{maxCat}</strong></span>
                          <span>Productos/Cat: <strong className="text-gray-900">{maxProd}</strong></span>
                          <span className="text-green-600 font-bold">(Total: {totalProd})</span>
                          <span>Clientes Fiados: <strong className="text-gray-900">{maxFiado}</strong></span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !storeName.trim() || !ownerName.trim() || !selectedPlan}
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>{loading ? 'Registrando tienda...' : 'Registrar y Solicitar Activación 🚀'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}