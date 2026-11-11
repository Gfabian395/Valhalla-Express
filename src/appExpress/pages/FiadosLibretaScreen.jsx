import { useState, useEffect, useMemo } from 'react';
import { BookOpen, UserPlus, DollarSign, CheckCircle, Search, Phone, MapPin, Trash2, AlertCircle } from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, doc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function FiadosLibretaScreen() {
  const [clientesFiado, setClientesFiado] = useState([]);
  const [maxClientesLimit, setMaxClientesLimit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: ''
  });

  // Cargar límites del plan y clientes desde Firestore
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      const user = auth.currentUser;
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg('');

      try {
        // 1. Obtener datos del comercio para conocer su plan (soporta planId unificado o variantes previas)
        const comercioRef = doc(db, 'comercios', user.uid);
        const comercioSnap = await getDoc(comercioRef);
        let planKey = 'basico'; // Plan por defecto seguro

        if (comercioSnap.exists()) {
          const comercioData = comercioSnap.data();
          planKey = comercioData.planId || comercioData.planSeleccionado || comercioData.plan || 'basico';
          if (typeof planKey === 'string') {
            planKey = planKey.toLowerCase().replace('plan_', '').trim();
          }
        }

        // 2. Consultar los límites en 'express_planes'
        let planRef = doc(db, 'express_planes', planKey);
        let planSnap = await getDoc(planRef);

        if (!planSnap.exists()) {
          const allPlansSnap = await getDocs(collection(db, 'express_planes'));
          if (!allPlansSnap.empty) {
            const found = allPlansSnap.docs.find(d => d.id.toLowerCase().includes(planKey) || planKey.includes(d.id.toLowerCase()));
            planSnap = found || allPlansSnap.docs[0];
          }
        }

        if (planSnap && planSnap.exists()) {
          const planData = planSnap.data();
          // 🔴 Robustez en la lectura del límite de clientes fiados
          const limit = Number(
            planData.maxClientesFiado ?? 
            planData.maximo_clientes ?? 
            planData.maxClients ?? 300
          );
          if (isMounted) setMaxClientesLimit(limit);
        }

        // 3. Cargar clientes desde la subcolección estricta: comercios/{storeId}/clients
        const clientsRef = collection(db, `comercios/${user.uid}/clients`);
        const querySnapshot = await getDocs(clientsRef);

        if (isMounted) {
          const loaded = [];
          querySnapshot.forEach((docSnap) => {
            loaded.push({ id: docSnap.id, ...docSnap.data() });
          });
          loaded.sort((a, b) => (a.nombre || a.name || '').localeCompare(b.nombre || b.name || ''));
          setClientesFiado(loaded);
        }
      } catch (error) {
        console.error('Error al sincronizar clientes:', error);
        if (isMounted) setErrorMsg('No se pudo cargar la libreta de clientes.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const nombreTrim = nuevoCliente.nombre.trim();
    if (!nombreTrim) return;

    // Validar límite del plan (-1 significa ilimitado)
    if (maxClientesLimit !== null && maxClientesLimit !== -1 && clientesFiado.length >= maxClientesLimit) {
      setErrorMsg(`Has alcanzado el límite de ${maxClientesLimit} clientes permitidos por tu plan actual.`);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg('Debes iniciar sesión.');
      return;
    }

    setSaving(true);
    try {
      const clientData = {
        nombre: nombreTrim,
        telefono: nuevoCliente.telefono.trim() || '---',
        direccion: nuevoCliente.direccion.trim() || '---',
        saldoDeuda: 0,
        createdAt: serverTimestamp()
      };

      const clientsRef = collection(db, `comercios/${user.uid}/clients`);
      const docRef = await addDoc(clientsRef, clientData);
      const created = { id: docRef.id, ...clientData };

      setClientesFiado((prev) => [created, ...prev]);
      setNuevoCliente({ nombre: '', telefono: '', direccion: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setErrorMsg('No se pudo guardar el cliente en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarCliente = async (clientId) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente de la libreta?')) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, `comercios/${user.uid}/clients`, clientId));
      setClientesFiado((prev) => prev.filter(c => c.id !== clientId));
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      setErrorMsg('No se pudo eliminar el cliente.');
    }
  };

  const clientesFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clientesFiado;
    return clientesFiltradosState = clientesFiado.filter(c => 
      (c.nombre || c.name || '').toLowerCase().includes(term) || 
      (c.telefono || '').includes(term)
    );
  }, [clientesFiado, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto text-gray-800">
      
      {/* Cabecera con Badge Contador y Límite del Plan */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Gestión de Clientes y Libreta de Fiados
              </h1>
              {/* 🏷️ Badge Contador de Clientes vs Límite del Plan */}
              <span className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                Clientes: <strong className="font-black">{clientesFiado.length}</strong> / {maxClientesLimit !== null ? (maxClientesLimit === -1 ? '∞' : maxClientesLimit) : '...'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Directorio de clientes del comercio y control de cuentas corrientes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setErrorMsg(''); setIsModalOpen(true); }}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="bg-white border border-gray-200 p-3.5 rounded-2xl shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 ml-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cliente por nombre o teléfono..."
          className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      {/* Listado de Clientes */}
      {loading ? (
        <div className="text-center py-20 text-xs text-gray-400 font-mono">Sincronizando libreta de clientes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente) => {
              const deudaActual = Number(cliente.saldoDeuda || cliente.monto || 0);

              return (
                <div key={cliente.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition hover:border-gray-300">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-gray-900 uppercase truncate pr-2">{cliente.nombre || cliente.name}</h3>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg font-mono shrink-0 border ${
                        deudaActual > 0 
                          ? 'text-red-600 bg-red-50 border-red-200' 
                          : 'text-green-600 bg-green-50 border-green-200'
                      }`}>
                        Debe: ${deudaActual.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{cliente.telefono || 'Sin teléfono'}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{cliente.direccion || 'Sin dirección'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEliminarCliente(cliente.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 bg-white border border-dashed border-gray-200 rounded-3xl">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2 opacity-80" />
              <p className="text-gray-600 text-xs font-bold">No se encontraron clientes registrados en este comercio.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal para Registrar Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-black tracking-widest text-green-600 uppercase bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                Directorio
              </span>
              <h3 className="text-lg font-black text-gray-900 tracking-tight mt-2">Registrar Nuevo Cliente</h3>
            </div>

            <form onSubmit={handleCrearCliente} className="space-y-4 text-xs font-bold text-gray-700">
              <div>
                <label className="block uppercase tracking-wider mb-1.5 text-[10px] text-gray-500">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-normal focus:bg-white focus:border-green-600 outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1.5 text-[10px] text-gray-500">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                  placeholder="Ej: 1123456789"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-normal focus:bg-white focus:border-green-600 outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1.5 text-[10px] text-gray-500">Dirección</label>
                <input
                  type="text"
                  value={nuevoCliente.direccion}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, direccion: e.target.value})}
                  placeholder="Ej: Calle Falsa 123"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-normal focus:bg-white focus:border-green-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-2xl text-xs font-bold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-sm cursor-pointer transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cliente 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}