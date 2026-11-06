import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Users, DollarSign, Plus, AlertCircle, Search, Clock, Trash2 } from 'lucide-react';

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

  const [planName, setPlanName] = useState('Plan');
  const [maxCustomersLimit, setMaxCustomersLimit] = useState(5); // Límite por defecto

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStoreId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Cargar clientes desde la colección unificada 'comercios' y límites del plan desde 'express_planes'
  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;
    const fetchCustomersAndPlan = async () => {
      try {
        // 1. Cargar clientes desde la ruta unificada de comercios
        const snap = await getDocs(collection(db, 'comercios', storeId, 'customers'));
        const loadedCustomers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 2. Obtener datos del comercio para conocer su plan seleccionado
        const storeRef = doc(db, 'comercios', storeId);
        const storeSnap = await getDoc(storeRef);
        const storeData = storeSnap.exists() ? storeSnap.data() : {};
        
        let planKey = storeData.plan || storeData.planSeleccionado || 'basico';
        if (planKey === 'plan_basico') planKey = 'basico';

        // 3. Consultar los límites en la colección 'express_planes'
        const planRef = doc(db, 'express_planes', planKey);
        const planSnap = await getDoc(planRef);
        const planData = planSnap.exists() ? planSnap.data() : { maxClientesFiado: 5, nombre: 'Plan Básico' };

        // Lectura flexible del límite de clientes desde el plan de Firestore
        const limit = Number(planData.maxClientesFiado ?? planData.maxCustomers ?? 5);

        if (isMounted) {
          setCustomers(loadedCustomers);
          setPlanName(planData.nombre || planData.name || 'Plan');
          setMaxCustomersLimit(limit);
        }
      } catch (error) {
        console.error('Error al cargar clientes y plan:', error);
      }
    };

    fetchCustomersAndPlan();
    return () => { isMounted = false; };
  }, [storeId, refreshKey]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const calculateDaysElapsed = (dateString) => {
    if (!dateString) return 0;
    const start = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays - 1 <= 0 ? 0 : diffDays - 1;
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const cleanName = clientName.trim();
    if (!cleanName || !storeId) return;

    setErrorMsg('');
    setLoading(true);

    try {
      // 🛑 VALIDACIÓN ESTRICTA DE LÍMITE DE CLIENTES PARA FIADO
      if (maxCustomersLimit !== -1 && customers.length >= maxCustomersLimit) {
        setErrorMsg(`Has alcanzado el límite de ${maxCustomersLimit} clientes permitidos para fiado en tu ${planName}.`);
        setLoading(false);
        return;
      }

      const currentDate = new Date().toISOString();
      const newCustomerData = {
        name: cleanName,
        phone: clientPhone.trim() || '---',
        debt: Number(initialDebt || 0),
        createdAt: currentDate,
        lastDebtDate: currentDate
      };

      const docRef = await addDoc(collection(db, 'comercios', storeId, 'customers'), newCustomerData);
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

  const handlePayDebt = async (customerId, currentDebt) => {
    if (!storeId) return;
    const paymentStr = prompt('Ingrese el monto que abona el cliente:');
    if (!paymentStr) return;
    const payment = Number(paymentStr);
    if (isNaN(payment) || payment <= 0) return;

    const newDebt = Math.max(0, currentDebt - payment);

    try {
      if (newDebt === 0) {
        if (window.confirm('¡La deuda ha sido saldada por completo! ¿Desea eliminar el registro del cliente del librito?')) {
          await deleteDoc(doc(db, 'comercios', storeId, 'customers', customerId));
          setCustomers((prev) => prev.filter((c) => c.id !== customerId));
          return;
        }
      }

      const currentDate = new Date().toISOString();
      await updateDoc(doc(db, 'comercios', storeId, 'customers', customerId), {
        debt: newDebt,
        lastDebtDate: currentDate
      });

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, debt: newDebt, lastDebtDate: currentDate } : c))
      );
    } catch (error) {
      console.error('Error al registrar pago:', error);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!storeId || !window.confirm('¿Está seguro de eliminar este cliente de la libreta?')) return;
    try {
      await deleteDoc(doc(db, 'comercios', storeId, 'customers', customerId));
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
    }
  };

  const totalDebt = customers.reduce((sum, c) => sum + Number(c.debt || 0), 0);
  const isAtLimit = maxCustomersLimit !== -1 && customers.length >= maxCustomersLimit;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-gray-800">
      
      {/* Cabecera y Métricas */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-green-600 shrink-0" />
            <span>Control de Fiados &amp; Créditos</span>
          </h1>
          <p className="text-xs text-gray-500">
            Libreta digital de clientes frecuentes, cuentas corrientes y cobros.
          </p>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
          <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-center sm:text-left font-mono">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Clientes Fiado</span>
            <div className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
              <strong className="text-green-600">{customers.length}</strong>
              <span className="text-gray-400 font-normal"> / {maxCustomersLimit === -1 ? '∞' : maxCustomersLimit}</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-center sm:text-right font-mono">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Deuda Acumulada</span>
            <span className="text-sm sm:text-base font-black text-amber-600 tracking-tight block mt-0.5">
              ${totalDebt.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Formulario Nuevo Fiado */}
        <div className="lg:col-span-4 bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Registrar Nuevo Fiado</h2>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddCustomer} className="space-y-3.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Nombre del Cliente</label>
              <input
                type="text"
                placeholder={isAtLimit ? "Límite del plan alcanzado" : "Ej: Juan Pérez"}
                value={clientName}
                disabled={isAtLimit}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Teléfono / Contacto</label>
              <input
                type="text"
                placeholder="Ej: 1155443322"
                value={clientPhone}
                disabled={isAtLimit}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                Deuda Inicial ($) <span className="text-gray-400 lowercase">[opcional]</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={initialDebt}
                disabled={isAtLimit}
                onChange={(e) => setInitialDebt(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !clientName.trim() || isAtLimit}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAtLimit ? 'Límite de Clientes Alcanzado' : 'Agregar a la Libreta'}</span>
            </button>
          </form>
        </div>

        {/* Listado de Clientes y Deudas */}
        <div className="lg:col-span-8 bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">Libreta de Clientes ({filteredCustomers.length})</h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
              No se encontraron clientes registrados en la libreta.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400">
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Teléfono</th>
                    <th className="py-3 px-3">Antigüedad Deuda</th>
                    <th className="py-3 px-3">Deuda Actual</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredCustomers.map((client) => {
                    const days = calculateDaysElapsed(client.lastDebtDate || client.createdAt);
                    return (
                      <tr key={client.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-gray-900">{client.name}</td>
                        <td className="py-3.5 px-3 font-mono text-gray-500">{client.phone}</td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {days} {days === 1 ? 'día' : 'días'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold font-mono text-amber-600">
                          ${Number(client.debt || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePayDebt(client.id, client.debt)}
                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-semibold rounded-xl transition inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                            title="Registrar pago o saldar deuda"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Registrar Pago</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(client.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-xl hover:bg-gray-100 transition cursor-pointer inline-flex items-center"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}