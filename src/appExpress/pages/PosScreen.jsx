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
        console.error('Error al cargar sucursales:', error);
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
        console.error('Error al cargar productos de la sucursal:', error);
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
        console.error('Error al cargar datos auxiliares:', error);
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
          console.error("Error al buscar en Firestore:", err);
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
      console.error('Error al guardar ticket pendiente:', error);
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
      console.error('Error al eliminar ticket pendiente:', error);
    }
  };

  const handleCheckout = async () => {
    if (!Array.isArray(cart) || cart.length === 0 || !storeId) return;
    if (numericCash > 0 && numericCash < cartTotal) {
      alert('El monto con el que abona es menor al total a pagar.');
      return;
    }

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

      setSuccessMsg('¡Venta cobrada con éxito y stock actualizado en la sucursal!');
      setCart([]);
      setCashGiven('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error('Error al cobrar:', error);
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
      console.error('Error al registrar fiado:', error);
      alert('Hubo un error al procesar el fiado.');
    }
  };

  const handleShareCatalog = async () => {
    if (!storeId) return;
    const catalogUrl = `${window.location.origin}/tienda/${storeId}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(catalogUrl);
        alert('¡Enlace del catálogo copiado al portapapeles! Ya puedes compartirlo.');
      } else {
        window.prompt('Copia el siguiente enlace:', catalogUrl);
      }
    } catch {
      window.prompt('Copia el siguiente enlace:', catalogUrl);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-gray-100">
      
      {/* Barra Superior de Control de Sucursal y Acciones */}
      <div className="bg-gray-900/90 border border-gray-800 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-950 border border-gray-800 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-gray-100 tracking-tight leading-tight">
              Punto de Venta (Caja)
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium">
              Operando en sucursal activa
            </p>
          </div>
        </div>

        {/* Acciones en línea compacta */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/express/ventas-dia')}
            className="py-2 px-3 bg-slate-950/80 hover:bg-slate-800 border border-gray-800 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            title="Ver ventas del día"
          >
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Ventas del Día</span>
          </button>

          <button
            type="button"
            onClick={handleShareCatalog}
            disabled={!storeId}
            className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
            title="Copiar enlace del catálogo"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Compartir Catálogo</span>
          </button>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 bg-slate-950/80 border border-gray-800 rounded-xl px-2.5 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Local:</span>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="w-full sm:w-auto bg-transparent text-xs font-semibold text-gray-100 focus:outline-none cursor-pointer py-1"
            >
              <option value="main" className="bg-slate-900 text-gray-100">Sucursal Principal</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id} className="bg-slate-900 text-gray-100">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Banner de Confirmación */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl sm:rounded-2xl text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grilla Principal: Escáner y Carrito */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
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

      {/* Modal: Producto por Peso */}
      {showWeightModal && weightProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-t-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Producto por Kilo</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-100">{weightProduct.name}</h4>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">
                  Precio: ${Number(weightProduct.price).toLocaleString('es-AR')} /kg
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">
                  Cantidad a Pesar:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder={weightUnit === 'grams' ? "Ej: 250 (g)" : "Ej: 0.250 (kg)"}
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmWeightSale(); }}
                    className="flex-1 bg-slate-950 border border-gray-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <select
                    value={weightUnit}
                    onChange={e => setWeightUnit(e.target.value)}
                    className="bg-slate-950 border border-gray-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="grams">Gramos (g)</option>
                    <option value="kg">Kilos (kg)</option>
                  </select>
                </div>
              </div>

              {weightInput && !isNaN(weightInput) && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Subtotal a cobrar:</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    ${(Number(weightProduct.price) * (weightUnit === 'grams' ? Number(weightInput) / 1000 : Number(weightInput))).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowWeightModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWeightSale}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Fiado */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-t-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Registrar Venta a Fiado</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona el cliente a quien se le cargará el monto de{' '}
                <strong className="text-emerald-400 font-mono font-bold">${cartTotal.toLocaleString('es-AR')}</strong>:
              </p>

              {customersList.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-dashed border-gray-800 rounded-xl text-center text-xs text-slate-500">
                  No hay clientes registrados en la libreta de fiados.
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition cursor-pointer"
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {customersList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - Deuda: ${Number(c.debt || 0).toLocaleString('es-AR')}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCheckoutCredit}
                disabled={!selectedCustomerId || cart.length === 0}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition"
              >
                Confirmar Fiado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cuentas en Espera */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-t-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-2">
                <PauseCircle className="w-4 h-4" />
                <span>Tickets en Espera</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cart.length > 0 && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <p className="text-xs text-slate-400">Pausar el carrito actual:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Identificador (ej: Cliente Mostrador)"
                    value={ticketName}
                    onChange={e => setTicketName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleSavePendingTicket}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition shrink-0"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
              <p className="text-xs text-slate-400 font-medium">Tickets pausados:</p>
              {pendingTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-gray-800 rounded-xl">
                  No hay tickets guardados en espera.
                </div>
              ) : (
                pendingTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-slate-950/70 border border-gray-800 p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-200 truncate">{ticket.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ticket.items.length} ítems •{' '}
                        <strong className="text-emerald-400 font-bold">
                          ${ticket.total.toLocaleString('es-AR')}
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => { handleRestoreTicket(ticket); setShowPendingModal(false); }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Recuperar</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowPendingModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}