import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { PauseCircle, PlayCircle, Users, CheckCircle2, Building2, Scale, X, DollarSign, Share2 } from 'lucide-react';
import ProductScanner from '../components/ProductScanner';
import CartSection from '../components/CartSection';

export default function PosScreen() {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('main');

  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [ticketName, setTicketName] = useState('');
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [cashGiven, setCashGiven] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [weightInput, setWeightInput] = useState(''); 
  const [weightUnit, setWeightUnit] = useState('grams');

  useEffect(() => {
    if (!storeId) return;
    const fetchBranches = async () => {
      try {
        const snap = await getDocs(collection(db, 'stores', storeId, 'branches'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBranches(list);
      } catch (error) {
        console.error('❌ [POS] Error al cargar sucursales:', error);
      }
    };
    fetchBranches();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    const fetchProductsByBranch = async () => {
      try {
        let productsList = [];
        
        if (selectedBranchId === 'main') {
          const catSnap = await getDocs(collection(db, 'stores', storeId, 'categories'));
          for (const catDoc of catSnap.docs) {
            const prodSnap = await getDocs(collection(db, 'stores', storeId, 'categories', catDoc.id, 'products'));
            prodSnap.forEach(prodDoc => {
              const data = prodDoc.data();
              productsList.push({ 
                id: prodDoc.id, 
                branchId: 'main',
                categoryId: catDoc.id, 
                name: data.name || 'Sin nombre',
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                sku: data.sku ? String(data.sku).trim() : '---',
                isWeightBased: data.isWeightBased || false
              });
            });
          }
        } else {
          const catSnap = await getDocs(collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories'));
          for (const catDoc of catSnap.docs) {
            const prodSnap = await getDocs(collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', catDoc.id, 'products'));
            prodSnap.forEach(prodDoc => {
              const data = prodDoc.data();
              productsList.push({ 
                id: prodDoc.id, 
                branchId: selectedBranchId,
                categoryId: catDoc.id, 
                name: data.name || 'Sin nombre',
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                sku: data.sku ? String(data.sku).trim() : '---',
                isWeightBased: data.isWeightBased || false
              });
            });
          }
        }
        
        setAllProducts(productsList);
        setCart([]);
      } catch (error) {
        console.error('❌ [POS] Error al cargar productos de la sucursal:', error);
      }
    };
    fetchProductsByBranch();
  }, [storeId, selectedBranchId, successMsg]);

  useEffect(() => {
    if (!storeId) return;
    const fetchData = async () => {
      try {
        const ticketsSnap = await getDocs(collection(db, 'stores', storeId, 'pendingTickets'));
        setPendingTickets(ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const custSnap = await getDocs(collection(db, 'stores', storeId, 'customers'));
        setCustomersList(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('❌ [POS] Error al cargar datos auxiliares:', error);
      }
    };
    fetchData();
  }, [storeId]);

  const handleProductSelection = (product) => {
    if (product.isWeightBased) {
      setWeightProduct(product);
      setWeightInput('');
      setWeightUnit('grams');
      setShowWeightModal(true);
    } else {
      addToCartDirectly(product, 1);
    }
  };

  const addToCartDirectly = (product, quantity) => {
    const cleanPrice = Number(product.price) || 0;
    const cleanStock = Number(product.stock) || 0;

    setCart(prevCart => {
      const cartArray = Array.isArray(prevCart) ? prevCart : [];
      const existing = cartArray.find(item => item.id === product.id);
      const currentQtyInCart = existing ? existing.qty : 0;

      if (!product.isWeightBased && currentQtyInCart + quantity > cleanStock) {
        alert('No hay suficiente stock disponible para este producto en esta sucursal.');
        return cartArray;
      }

      if (existing) {
        return cartArray.map(item => 
          item.id === product.id ? { ...item, qty: Number((item.qty + quantity).toFixed(3)) } : item
        );
      }
      return [...cartArray, { ...product, price: cleanPrice, stock: cleanStock, qty: quantity }];
    });
  };

  const handleConfirmWeightSale = () => {
    if (!weightProduct || !weightInput) return;

    const numericInput = Number(weightInput);
    if (isNaN(numericInput) || numericInput <= 0) {
      alert('Ingresa un peso válido.');
      return;
    }

    const weightInKg = weightUnit === 'grams' ? numericInput / 1000 : numericInput;

    addToCartDirectly(weightProduct, weightInKg);
    setShowWeightModal(false);
    setWeightProduct(null);
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchTerm.trim().toLowerCase();
      if (!query) return;

      let foundProduct = allProducts.find(p => {
        const pSku = p.sku ? String(p.sku).trim().toLowerCase() : '';
        const pName = p.name ? String(p.name).trim().toLowerCase() : '';
        return pSku === query || pName.includes(query);
      });

      if (!foundProduct && storeId) {
        try {
          const categoriesPath = selectedBranchId === 'main' 
            ? collection(db, 'stores', storeId, 'categories')
            : collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories');

          const catSnap = await getDocs(categoriesPath);
          for (const catDoc of catSnap.docs) {
            const productsPath = selectedBranchId === 'main'
              ? collection(db, 'stores', storeId, 'categories', catDoc.id, 'products')
              : collection(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', catDoc.id, 'products');

            const prodSnap = await getDocs(productsPath);
            prodSnap.forEach(prodDoc => {
              const data = prodDoc.data();
              const pSku = data.sku ? String(data.sku).trim().toLowerCase() : '';
              const pName = data.name ? String(data.name).trim().toLowerCase() : '';
              if (pSku === query || pName.includes(query)) {
                foundProduct = { 
                  id: prodDoc.id, 
                  branchId: selectedBranchId,
                  categoryId: catDoc.id, 
                  name: data.name || 'Sin nombre',
                  price: Number(data.price) || 0,
                  stock: Number(data.stock) || 0,
                  sku: data.sku ? String(data.sku).trim() : '---',
                  isWeightBased: data.isWeightBased || false
                };
              }
            });
          }
        } catch (err) {
          console.error("❌ [POS EMERGENCIA] Error al buscar en Firestore:", err);
        }
      }

      if (foundProduct) {
        handleProductSelection(foundProduct);
        setSearchTerm('');
      } else {
        alert('Producto no encontrado con ese código o nombre en esta sucursal.');
        setSearchTerm('');
      }
    }
  };

  const updateQty = (id, delta) => {
    setCart(prevCart => {
      const cartArray = Array.isArray(prevCart) ? prevCart : [];
      return cartArray.map(item => {
        if (item.id === id) {
          const step = item.isWeightBased ? 0.1 : 1; 
          const newQty = Number((item.qty + (delta * step)).toFixed(3));
          if (!item.isWeightBased && newQty > item.stock) {
            alert('Supera el stock disponible.');
            return item;
          }
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartTotal = Array.isArray(cart) ? cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0) : 0;
  const numericCash = Number(cashGiven) || 0;
  const changeDue = numericCash > cartTotal ? numericCash - cartTotal : 0;

  const handleSavePendingTicket = async () => {
    if (!Array.isArray(cart) || cart.length === 0 || !storeId) return;
    try {
      const ticketData = {
        name: ticketName.trim() || `Cliente (${new Date().toLocaleTimeString()})`,
        branchId: selectedBranchId,
        items: cart,
        total: cartTotal,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'stores', storeId, 'pendingTickets'), ticketData);
      setPendingTickets([...pendingTickets, { id: docRef.id, ...ticketData }]);
      setCart([]);
      setTicketName('');
      setShowPendingModal(false);
    } catch (error) {
      console.error('❌ [POS] Error al guardar ticket pendiente:', error);
    }
  };

  const handleRestoreTicket = async (ticket) => {
    if (!storeId) return;
    if (ticket.branchId && ticket.branchId !== selectedBranchId) {
      alert('Este ticket pertenece a otra sucursal. Cambia de sucursal para recuperarlo.');
      return;
    }
    setCart(ticket.items);
    try {
      await deleteDoc(doc(db, 'stores', storeId, 'pendingTickets', ticket.id));
      setPendingTickets(pendingTickets.filter(t => t.id !== ticket.id));
    } catch (error) {
      console.error('❌ [POS] Error al eliminar ticket pendiente:', error);
    }
  };

  const handleCheckout = async () => {
    if (!Array.isArray(cart) || cart.length === 0 || !storeId) return;
    if (numericCash > 0 && numericCash < cartTotal) {
      alert('El monto con el que abona es menor al total a pagar.');
      return;
    }

    // Copiamos el carrito actual antes de vaciarlo para registrar la venta detallada
    const currentCartSnapshot = [...cart];
    const currentTotal = cartTotal;

    try {
      for (const item of cart) {
        let productRef;
        if (selectedBranchId === 'main') {
          productRef = doc(db, 'stores', storeId, 'categories', item.categoryId, 'products', item.id);
        } else {
          productRef = doc(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', item.categoryId, 'products', item.id);
        }

        if (!item.isWeightBased) {
          const newStock = Math.max(0, Number((item.stock - item.qty).toFixed(3)));
          await updateDoc(productRef, { stock: newStock });
        }
      }

      // 📥 REGISTRAR VENTA AUTOMÁTICAMENTE CON DETALLE EN VENTAS DEL DÍA
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('valhalla_sales_date');
      let currentSales = [];

      if (savedDate === today) {
        const existing = localStorage.getItem('valhalla_daily_sales');
        if (existing) currentSales = JSON.parse(existing);
      } else {
        localStorage.setItem('valhalla_sales_date', today);
      }

      const newSaleRecord = {
        id: Date.now(),
        total: currentTotal,
        itemsCount: currentCartSnapshot.reduce((sum, item) => sum + item.qty, 0),
        items: currentCartSnapshot, // Guardado correcto y detallado
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      currentSales.push(newSaleRecord);
      localStorage.setItem('valhalla_daily_sales', JSON.stringify(currentSales));
      // ----------------------------------------------------

      setSuccessMsg('¡Venta cobrada con éxito y stock actualizado en la sucursal!');
      setCart([]);
      setCashGiven('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error('❌ [POS] Error al cobrar:', error);
      alert('Hubo un error al procesar el cobro.');
    }
  };

  const handleCheckoutCredit = async () => {
    if (!Array.isArray(cart) || cart.length === 0 || !storeId || !selectedCustomerId) {
      alert('Selecciona un cliente de la libreta para registrar el fiado.');
      return;
    }

    const currentCartSnapshot = [...cart];
    const currentTotal = cartTotal;

    try {
      const customerRef = doc(db, 'stores', storeId, 'customers', selectedCustomerId);
      const customerSnap = await getDoc(customerRef);

      if (!customerSnap.exists()) {
        alert('El cliente seleccionado ya no existe.');
        return;
      }

      const currentDebt = Number(customerSnap.data().debt) || 0;
      await updateDoc(customerRef, { debt: currentDebt + currentTotal });

      for (const item of cart) {
        let productRef;
        if (selectedBranchId === 'main') {
          productRef = doc(db, 'stores', storeId, 'categories', item.categoryId, 'products', item.id);
        } else {
          productRef = doc(db, 'stores', storeId, 'branches', selectedBranchId, 'categories', item.categoryId, 'products', item.id);
        }

        if (!item.isWeightBased) {
          const newStock = Math.max(0, Number((item.stock - item.qty).toFixed(3)));
          await updateDoc(productRef, { stock: newStock });
        }
      }

      // REGISTRAR FIADO EN VENTAS DEL DÍA
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('valhalla_sales_date');
      let currentSales = [];

      if (savedDate === today) {
        const existing = localStorage.getItem('valhalla_daily_sales');
        if (existing) currentSales = JSON.parse(existing);
      } else {
        localStorage.setItem('valhalla_sales_date', today);
      }

      const newSaleRecord = {
        id: Date.now(),
        total: currentTotal,
        itemsCount: currentCartSnapshot.reduce((sum, item) => sum + item.qty, 0),
        items: currentCartSnapshot,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      currentSales.push(newSaleRecord);
      localStorage.setItem('valhalla_daily_sales', JSON.stringify(currentSales));

      setSuccessMsg('¡Fiado registrado con éxito a la cuenta del cliente!');
      setCart([]);
      setSelectedCustomerId('');
      setShowCreditModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error('❌ [POS] Error al registrar fiado:', error);
      alert('Hubo un error al procesar el fiado.');
    }
  };

  // Función para compartir el link del catálogo público
  const handleShareCatalog = () => {
    if (!storeId) return;
    const catalogUrl = `${window.location.origin}/tienda/${storeId}`;
    navigator.clipboard.writeText(catalogUrl);
    alert('¡Enlace del catálogo copiado al portapapeles! Ya puedes pegarlo y compartirlo por WhatsApp.');
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Selector de Sucursal, Ventas del Día y Compartir Catálogo */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase font-black tracking-wider text-slate-400">Punto de Venta (Caja)</h2>
            <p className="text-sm font-black text-emerald-400">Operando en sucursal activa</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={() => navigate('/express/ventas-dia')}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition flex items-center gap-2"
            title="Ver resumen y ventas del día"
          >
            <DollarSign className="w-4 h-4" /> Ventas del Día
          </button>

          <button
            onClick={handleShareCatalog}
            disabled={!storeId}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            title="Copiar enlace del catálogo para WhatsApp"
          >
            <Share2 className="w-4 h-4" /> Compartir Catálogo
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400">Local:</span>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="main">📍 Sucursal Principal</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  📍 {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950 border border-emerald-500/50 rounded-2xl text-emerald-400 text-sm font-bold flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-6 h-6" /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ProductScanner
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleKeyDown={handleKeyDown}
          allProductsCount={allProducts.length}
        />

        <CartSection
          cart={cart}
          updateQty={updateQty}
          cartTotal={cartTotal}
          cashGiven={cashGiven}
          setCashGiven={setCashGiven}
          changeDue={changeDue}
          onShowPendingModal={() => setShowPendingModal(true)}
          onShowCreditModal={() => setShowCreditModal(true)}
          onCheckout={handleCheckout}
        />
      </div>

      {showWeightModal && weightProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wide text-emerald-400 flex items-center gap-2">
                <Scale className="w-5 h-5" /> Producto por Kilo
              </h3>
              <button onClick={() => setShowWeightModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-base font-bold text-slate-100">{weightProduct.name}</h4>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">
                  Precio por Kilo: ${Number(weightProduct.price).toLocaleString('es-AR')} /kg
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Cantidad a Pesar:</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder={weightUnit === 'grams' ? "Ej: 250 (gramos)" : "Ej: 0.250 (kg)"}
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmWeightSale(); }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={weightUnit}
                    onChange={e => setWeightUnit(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-300 focus:outline-none"
                  >
                    <option value="grams">Gramos (g)</option>
                    <option value="kg">Kilos (kg)</option>
                  </select>
                </div>
              </div>

              {weightInput && !isNaN(weightInput) && (
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Subtotal a cobrar:</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    ${(Number(weightProduct.price) * (weightUnit === 'grams' ? Number(weightInput) / 1000 : Number(weightInput))).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowWeightModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmWeightSale}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-5">
            <h3 className="text-lg font-black uppercase text-amber-400 flex items-center gap-2">
              <Users className="w-5 h-5" /> Registrar Venta a Fiado
            </h3>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Selecciona el cliente de la libreta a quien se le cargará la deuda de <strong className="text-emerald-400">${cartTotal.toLocaleString('es-AR')}</strong>:
              </p>

              {customersList.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500">
                  No hay clientes agendados en la sección de Fiados.
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {customersList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tel: {c.phone}) - Deuda actual: ${Number(c.debt || 0).toLocaleString('es-AR')}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckoutCredit}
                disabled={!selectedCustomerId || cart.length === 0}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                Confirmar Fiado
              </button>
            </div>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 max-w-lg w-full relative shadow-2xl space-y-5">
            <h3 className="text-lg font-black uppercase text-amber-400 flex items-center gap-2">
              <PauseCircle className="w-5 h-5" /> Cuentas en Espera / Tickets Pendientes
            </h3>

            {cart.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">Pausar el carrito actual:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del cliente o caja (ej: Juan Pérez)"
                    value={ticketName}
                    onChange={e => setTicketName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleSavePendingTicket}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs text-slate-400 font-medium">Tickets guardados previamente:</p>
              {pendingTickets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay tickets pendientes guardados.</p>
              ) : (
                pendingTickets.map(ticket => (
                  <div key={ticket.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{ticket.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ticket.items.length} ítems — Total: <strong className="text-emerald-400">${ticket.total.toLocaleString('es-AR')}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => { handleRestoreTicket(ticket); setShowPendingModal(false); }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1"
                    >
                      <PlayCircle className="w-4 h-4" /> Recuperar
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowPendingModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}