import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import PlanLimitsBadge from '../components/PlanLimitsBadge';
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
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar actualización del badge

  // Escuchar cambios de autenticación de forma reactiva
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setStoreId(user.uid);
      } else {
        setStoreId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cargar clientes fiados de la tienda
  useEffect(() => {
    if (!storeId) return;
    const fetchCustomers = async () => {
      try {
        const snap = await getDocs(collection(db, 'stores', storeId, 'customers'));
        setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error al cargar clientes:', error);
      }
    };
    fetchCustomers();
  }, [storeId, refreshKey]);

  // Filtrar clientes
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  // Registrar nuevo cliente fiado validando estrictamente el límite máximo (tope de 10)
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Obtener el plan de la tienda
      const storeRef = doc(db, 'stores', storeId);
      const storeSnap = await getDoc(storeRef);
      const planKey = storeSnap.exists() && storeSnap.data().plan ? storeSnap.data().plan : 'basico';

      // 2. Obtener límites desde ExpressPlanes en Firebase
      const planRef = doc(db, 'ExpressPlanes', planKey);
      const planSnap = await getDoc(planRef);

      if (planSnap.exists()) {
        const planData = planSnap.data();
        
        // Tope máximo de 10 clientes para fiado (o lee planData.maxCustomers si lo agregas en Firebase)
        const maxCustomersLimit = planData.maxCustomers !== undefined ? planData.maxCustomers : 10;

        if (maxCustomersLimit !== -1 && customers.length >= maxCustomersLimit) {
          setErrorMsg(`Has alcanzado el límite de ${maxCustomersLimit} clientes permitidos para fiado en tu ${planData.name}. Actualiza tu plan para registrar más.`);
          setLoading(false);
          return; // ⛔ Bloquea si supera el tope de 10
        }
      }

      const newCustomerData = {
        name: clientName.trim(),
        phone: clientPhone.trim() || '---',
        debt: Number(initialDebt || 0),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'stores', storeId, 'customers'), newCustomerData);
      setCustomers([...customers, { id: docRef.id, ...newCustomerData }]);
      setRefreshKey(prev => prev + 1); // Refresca el contador
      
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

      setCustomers(customers.map(c => c.id === customerId ? { ...c, debt: newDebt } : c));
    } catch (error) {
      console.error('Error al registrar pago:', error);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-100 flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-400" /> Control de Fiados &amp; Créditos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Libreta digital de clientes frecuentes, control de cuentas corrientes y registro de pagos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {/* Badge de Límite de Clientes */}
          <div className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 font-mono bg-slate-950 border-slate-800 text-slate-300">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Clientes Fiado: <strong className="text-emerald-400">{customers.length}</strong> / 10
            </span>
          </div>

          <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Deuda Total Acumulada</span>
            <span className="text-lg font-black text-amber-400">
              ${customers.reduce((sum, c) => sum + (c.debt || 0), 0).toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Formulario nuevo cliente */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-100">Registrar Nuevo Fiado</h2>
          
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddCustomer} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nombre del Cliente</label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Teléfono / Contacto</label>
              <input
                type="text"
                placeholder="Ej: 1155443322"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Deuda Inicial ($) [Opcional]</label>
              <input
                type="number"
                placeholder="0"
                value={initialDebt}
                onChange={e => setInitialDebt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" /> Agregar a la Libreta
            </button>
          </form>
        </div>

        {/* Listado de Clientes y Deudas */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h2 className="text-base font-black uppercase tracking-wide text-slate-100">Libreta de Clientes</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredCustomers.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No hay clientes registrados en la libreta de fiados.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3">Teléfono</th>
                    <th className="py-2 px-3">Deuda Actual</th>
                    <th className="py-2 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredCustomers.map(client => (
                    <tr key={client.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-3 px-3 font-bold text-slate-100">{client.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{client.phone}</td>
                      <td className="py-3 px-3 font-black text-amber-400">
                        ${Number(client.debt || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handlePayDebt(client.id, client.debt)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl transition flex items-center gap-1 ml-auto"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Registrar Pago
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}