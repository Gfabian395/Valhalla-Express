import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Users, DollarSign, Plus, AlertCircle, Search } from 'lucide-react';

export default function CustomersCredit() {
  const [storeId, setStoreId] = useState(auth.currentUser ? auth.currentUser.uid : null);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [initialDebt, setInitialDebt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Cargar clientes fiados de la tienda
  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;
    const fetchCustomers = async () => {
      try {
        const snap = await getDocs(collection(db, 'stores', storeId, 'customers'));
        if (isMounted) {
          setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error('Error al cargar clientes:', error);
      }
    };

    fetchCustomers();

    return () => {
      isMounted = false;
    };
  }, [storeId, refreshKey]);

  // Filtrar clientes
  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  // Registrar nuevo cliente fiado con validación de cupo
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const cleanName = clientName.trim();
    if (!cleanName || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const storeRef = doc(db, 'stores', storeId);
      const storeSnap = await getDoc(storeRef);
      const planKey = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

      const planRef = doc(db, 'ExpressPlanes', planKey);
      const planSnap = await getDoc(planRef);

      if (planSnap.exists()) {
        const planData = planSnap.data();
        const maxCustomersLimit = planData.maxCustomers !== undefined ? planData.maxCustomers : 10;

        if (maxCustomersLimit !== -1 && customers.length >= maxCustomersLimit) {
          setErrorMsg(
            `Has alcanzado el límite de ${maxCustomersLimit} clientes permitidos para fiado en tu ${planData.name || 'plan actual'}.`
          );
          setLoading(false);
          return;
        }
      }

      const newCustomerData = {
        name: cleanName,
        phone: clientPhone.trim() || '---',
        debt: Number(initialDebt || 0),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'stores', storeId, 'customers'), newCustomerData);
      setCustomers((prev) => [...prev, { id: docRef.id, ...newCustomerData }]);
      setRefreshKey((prev) => prev + 1);

      setClientName('');
      setClientPhone('');
      setInitialDebt('');
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      setErrorMsg('No se pudo registrar el cliente.');
    } finally {
      setLoading(false);
    }
  };

  // Registrar pago o abono a la deuda
  const handlePayDebt = async (customerId, currentDebt) => {
    if (!storeId) return;
    const paymentStr = prompt('Ingrese el monto que abona el cliente:');
    if (!paymentStr) return;
    const payment = Number(paymentStr);
    if (isNaN(payment) || payment <= 0) return;

    const newDebt = Math.max(0, currentDebt - payment);

    try {
      await updateDoc(doc(db, 'stores', storeId, 'customers', customerId), {
        debt: newDebt
      });

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, debt: newDebt } : c))
      );
    } catch (error) {
      console.error('Error al registrar pago:', error);
    }
  };

  const totalDebt = customers.reduce((sum, c) => sum + Number(c.debt || 0), 0);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-gray-100">
      
      {/* Cabecera y Métricas */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0" />
            <span>Control de Fiados &amp; Créditos</span>
          </h1>
          <p className="text-xs text-slate-400">
            Libreta digital de clientes frecuentes, cuentas corrientes y cobros.
          </p>
        </div>

        {/* Tarjetas de Métricas en Mobile / Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="bg-slate-950/80 border border-gray-800 px-3.5 py-2.5 rounded-xl text-center sm:text-left font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Clientes Fiado
            </span>
            <div className="text-sm sm:text-base font-bold text-gray-100 mt-0.5">
              <strong className="text-emerald-400">{customers.length}</strong>
              <span className="text-slate-500 font-normal"> / 10</span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-gray-800 px-3.5 py-2.5 rounded-xl text-center sm:text-right font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Deuda Acumulada
            </span>
            <span className="text-sm sm:text-base font-black text-amber-400 tracking-tight block mt-0.5">
              ${totalDebt.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        {/* Formulario Nuevo Fiado */}
        <div className="lg:col-span-4 bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3.5 shadow-xl backdrop-blur-sm">
          <h2 className="text-sm sm:text-base font-bold text-gray-100">
            Registrar Nuevo Fiado
          </h2>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddCustomer} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Nombre del Cliente
              </label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Teléfono / Contacto
              </label>
              <input
                type="text"
                placeholder="Ej: 1155443322"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Deuda Inicial ($) <span className="text-slate-500 lowercase">[opcional]</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={initialDebt}
                onChange={(e) => setInitialDebt(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !clientName.trim()}
              className="w-full py-2.5 sm:py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 mt-1"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar a la Libreta</span>
            </button>
          </form>
        </div>

        {/* Listado de Clientes y Deudas */}
        <div className="lg:col-span-8 bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-100">
              Libreta de Clientes ({filteredCustomers.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-gray-800/60 rounded-xl">
              No se encontraron clientes registrados en la libreta.
            </div>
          ) : (
            <>
              {/* Formato Cards en Smartphone */}
              <div className="space-y-2.5 md:hidden">
                {filteredCustomers.map((client) => (
                  <div
                    key={client.id}
                    className="bg-slate-950/70 border border-gray-800/80 p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-semibold text-gray-100 truncate">
                        {client.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {client.phone || 'Sin teléfono'}
                      </div>
                      <div className="text-sm font-bold text-amber-400 font-mono pt-0.5">
                        ${Number(client.debt || 0).toLocaleString('es-AR')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePayDebt(client.id, client.debt)}
                      className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition flex items-center gap-1 shrink-0"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Cobrar</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Formato Tabla en Pantallas Grandes */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-[11px] uppercase font-bold text-slate-400">
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Teléfono</th>
                      <th className="py-2.5 px-3">Deuda Actual</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-xs">
                    {filteredCustomers.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-gray-100">{client.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{client.phone}</td>
                        <td className="py-3 px-3 font-bold font-mono text-amber-400">
                          ${Number(client.debt || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handlePayDebt(client.id, client.debt)}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl transition inline-flex items-center gap-1 active:scale-95"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Registrar Pago</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
}