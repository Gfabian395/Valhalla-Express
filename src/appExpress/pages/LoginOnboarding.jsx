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
        // Si ya tiene tienda pero nunca eligió un plan, lo mandamos a elegir plan
        if (!storeData.plan) {
          navigate('/express/select-plan');
        } else {
          // Ya tiene tienda y plan configurado, directo al POS
          navigate('/express/pos');
        }
      } else {
        // Usuario nuevo: mostrar formulario de registro de tienda por única vez
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
    
    // Si ya empieza con '+', lo dejamos tal cual
    if (cleaned.startsWith('+')) return cleaned;

    // Si introduce un número local (ej: 1155443322 o 011...), le agregamos +549
    // Quitamos ceros iniciales de área si los tuviera y espacios/guiones
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
        phone: formattedPhone, // Teléfono formateado correctamente con +549
        address: storeAddress.trim() || '---',
        slug: slug,
        plan: null, // Se asignará en la siguiente pantalla de selección de plan
        status: true,
        createdAt: new Date().toISOString(),
        ownerEmail: user.email,
        ownerUid: user.uid
      };

      // Guardar en la colección stores usando el UID de Google como ID único del comercio
      await setDoc(doc(db, 'stores', user.uid), initialStoreData);

      // Redirigir a la pantalla de selección de plan
      navigate('/express/select-plan');
    } catch (error) {
      console.error('Error al registrar la tienda:', error);
      setErrorMsg('Hubo un error al registrar el comercio en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
        
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)] p-2">
            <img 
              src="/Express.png" 
              alt="Valhalla Express Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-slate-100 font-mono">
              VALHALLA EXPRESS
            </h1>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">
              POS MULTI-COMERCIO SAAS
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!needsOnboarding ? (
          <div className="space-y-4 pt-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> {loading ? 'Autenticando...' : 'Iniciar Sesión con Google'}
            </button>
            <p className="text-[10px] text-slate-500 text-center font-mono">
              Accede de forma segura con tu cuenta de Google para administrar tu supermercado.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegisterStore} className="space-y-4">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 leading-relaxed font-mono">
              ¡Hola, <strong className="text-emerald-400">{user?.displayName}</strong>! Configura los datos de tu supermercado por <strong>única vez</strong> (el nombre no se podrá modificar después).
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 font-mono">Nombre del Supermercado</label>
              <input
                type="text"
                placeholder="Ej: Supermercado Don Pepe"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 font-mono">Teléfono de Contacto (WhatsApp)</label>
              <input
                type="text"
                placeholder="Ej: 1155443322"
                value={storePhone}
                onChange={e => setStorePhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[9px] text-slate-500 mt-1 block font-mono">Se guardará automáticamente con formato internacional (+549).</span>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 font-mono">Dirección / Localidad</label>
              <input
                type="text"
                placeholder="Ej: Asunción 456"
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition flex items-center justify-center gap-2 font-mono"
            >
              {loading ? 'Registrando tienda...' : 'Continuar a Selección de Plan'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}