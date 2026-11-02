import { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginOnboarding() {
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      setUser(loggedUser);

      // Verificar si ya tiene tienda registrada en Firestore usando su UID
      const storeRef = doc(db, 'stores', loggedUser.uid);
      const storeSnap = await getDoc(storeRef);

      if (storeSnap.exists()) {
        const storeData = storeSnap.data();
        if (!storeData.plan) {
          navigate('/express/select-plan');
        } else {
          navigate('/express/pos');
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

  // Función auxiliar para formatear el teléfono con +549 automáticamente si es local
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

    try {
      setLoading(true);
      setErrorMsg('');

      const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const formattedPhone = formatPhoneNumber(storePhone);

      const initialStoreData = {
        name: storeName.trim(),
        phone: formattedPhone,
        address: storeAddress.trim() || '---',
        slug: slug,
        plan: null,
        status: true,
        createdAt: new Date().toISOString(),
        ownerEmail: user.email,
        ownerUid: user.uid
      };

      await setDoc(doc(db, 'stores', user.uid), initialStoreData);
      navigate('/express/select-plan');
    } catch (error) {
      console.error('Error al registrar la tienda:', error);
      setErrorMsg('Hubo un error al registrar el comercio en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex items-center justify-center p-4">
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-sm space-y-6">

        {/* Identidad de Marca */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-slate-950 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto overflow-hidden shadow-lg shadow-emerald-500/10 p-2.5">
            <img
              src="/Express.png"
              alt="Valhalla Express Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-100">
              VALHALLA EXPRESS
            </h1>
            <p className="text-[11px] sm:text-xs text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
              POS Multi-Comercio
            </p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {!needsOnboarding ? (
          <div className="space-y-4 pt-1">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 sm:py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{loading ? 'Autenticando...' : 'Iniciar Sesión con Google'}</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Accede de forma segura con tu cuenta de Google para administrar tu supermercado.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegisterStore} className="space-y-3.5">
            <div className="p-3 bg-slate-950/80 border border-gray-800 rounded-xl text-xs text-slate-300 leading-relaxed">
              ¡Hola, <strong className="text-gray-100">{user?.displayName}</strong>! Configura los datos de tu supermercado por <strong className="text-amber-400">única vez</strong> (el nombre comercial no se podrá modificar luego).
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Nombre del Supermercado
              </label>
              <input
                type="text"
                placeholder="Ej: Supermercado Don Pepe"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Teléfono de Contacto (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="Ej: 1155443322"
                value={storePhone}
                onChange={e => setStorePhone(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Se guardará automáticamente con prefijo internacional (+549).
              </span>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Dirección / Localidad
              </label>
              <input
                type="text"
                placeholder="Ej: Asunción 456"
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !storeName.trim()}
              className="w-full py-3 sm:py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 mt-1"
            >
              {loading ? 'Registrando tienda...' : 'Continuar a Selección de Plan'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}