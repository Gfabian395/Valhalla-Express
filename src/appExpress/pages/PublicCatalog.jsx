import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ShoppingBag, MessageCircle, Plus, Minus, Store, Scale, X } from 'lucide-react';

export default function PublicCatalog() {
  const { storeId } = useParams();
  
  const [storeInfo, setStoreInfo] = useState({ name: 'Mi Comercio', phone: '' });
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Modal para peso
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState('grams');

  // Datos para pedido
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // 1. Cargar información del comercio
  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchStore = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (isMounted && storeSnap.exists()) {
          setStoreInfo(storeSnap.data());
        }
      } catch (error) {
        console.error('Error al cargar datos del comercio:', error);
      }
    };
    fetchStore();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // 2. Cargar categorías públicas
  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'stores', storeId, 'categories'));
        const list = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (isMounted) {
          setCategories(list);
          if (list.length > 0) {
            setSelectedCategoryId(list[0].id);
          }
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      }
    };
    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // 3. Cargar productos de la categoría seleccionada
  useEffect(() => {
    if (!storeId || !selectedCategoryId) {
      setProducts([]);
      return;
    }
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const prodSnap = await getDocs(collection(db, 'stores', storeId, 'categories', selectedCategoryId, 'products'));
        if (isMounted) {
          setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [storeId, selectedCategoryId]);

  const addToCart = (product, qty) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: Number((item.qty + qty).toFixed(3)) } : item
        );
      }
      return [...prev, { ...product, qty }];
    });
  };

  const handleProductClick = (product) => {
    if (product.isWeightBased) {
      setWeightProduct(product);
      setWeightInput('');
      setWeightUnit('grams');
      setShowWeightModal(true);
    } else {
      addToCart(product, 1);
    }
  };

  const handleConfirmWeight = () => {
    if (!weightProduct || !weightInput) return;
    const num = Number(weightInput);
    if (isNaN(num) || num <= 0) {
      alert('Ingresa un peso válido.');
      return;
    }
    const weightInKg = weightUnit === 'grams' ? num / 1000 : num;
    addToCart(weightProduct, weightInKg);
    setShowWeightModal(false);
    setWeightProduct(null);
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const step = item.isWeightBased ? 0.1 : 1;
        const newQty = Number((item.qty + (delta * step)).toFixed(3));
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);

  // Enviar pedido por WhatsApp sanitizado y codificado
  const sendWhatsAppOrder = () => {
    if (cart.length === 0) {
      alert('Tu carrito está vacío.');
      return;
    }
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre para coordinar el envío.');
      return;
    }

    const rawPhone = storeInfo.phone ? String(storeInfo.phone).replace(/\D/g, '') : '';
    const phone = rawPhone || '5491100000000';

    let message = `*¡Hola! Quiero hacer un pedido:*\n`;
    message += `👤 *Cliente:* ${customerName.trim()}\n`;
    if (customerAddress.trim()) message += `📍 *Dirección:* ${customerAddress.trim()}\n`;
    message += `\n*Detalle del pedido:*\n`;

    cart.forEach(item => {
      const subtotal = Number(item.price || 0) * Number(item.qty || 0);
      const unitLabel = item.isWeightBased ? 'kg' : 'un.';
      message += `- ${item.qty} ${unitLabel} de ${item.name} ($${subtotal.toLocaleString('es-AR')})\n`;
    });

    message += `\n*Total a Pagar:* $${cartTotal.toLocaleString('es-AR')}`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-3.5 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Encabezado del Comercio */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-950 border border-gray-800 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-gray-100">
                {storeInfo.name}
              </h1>
              <p className="text-xs text-slate-400">
                Catálogo digital oficial • Pedidos directos por WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Categorías (Pestañas horizontales fluidas) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-800">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategoryId === cat.id 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20' 
                  : 'bg-slate-900/80 border border-gray-800 text-slate-300 hover:text-white hover:border-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Listado de Productos */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-xs sm:text-sm font-bold text-gray-200">
              Productos Disponibles
            </h2>
            
            {products.length === 0 ? (
              <div className="p-8 bg-gray-900/80 border border-dashed border-gray-800 rounded-2xl sm:rounded-3xl text-center text-xs text-slate-500">
                No hay productos disponibles en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {products.map(prod => (
                  <div 
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className="bg-gray-900/90 border border-gray-800 hover:border-emerald-500/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all flex flex-col justify-between shadow-lg shadow-black/20 space-y-3 group active:scale-[0.99]"
                  >
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-100 group-hover:text-emerald-300 transition-colors">
                        {prod.name}
                      </h3>
                      {prod.isWeightBased && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 mt-1.5 font-mono">
                          <Scale className="w-3 h-3" /> Venta por Kilo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                      <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                        ${Number(prod.price || 0).toLocaleString('es-AR')}
                        {prod.isWeightBased && <span className="text-[10px] text-slate-400 font-normal ml-0.5">/kg</span>}
                      </span>
                      <button 
                        type="button" 
                        aria-label={`Agregar ${prod.name} al carrito`}
                        className="p-1.5 sm:p-2 bg-slate-950 border border-gray-800 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrito de Pedido Público */}
          <div className="lg:col-span-5 bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl backdrop-blur-sm lg:sticky lg:top-20">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <h3 className="text-xs sm:text-sm font-bold text-gray-100 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Tu Pedido</span>
                </h3>
                <span className="text-[11px] bg-slate-950/80 text-slate-300 border border-gray-800 px-2.5 py-0.5 rounded-full font-mono">
                  {cart.length} items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-gray-800 rounded-xl">
                  Selecciona productos para armar tu lista de compras.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                  {cart.map(item => (
                    <div 
                      key={item.id} 
                      className="bg-slate-950/70 p-2.5 sm:p-3 rounded-xl border border-gray-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-gray-200 truncate">{item.name}</h4>
                        <span className="text-[11px] text-emerald-400 font-mono block">
                          {item.qty} {item.isWeightBased ? 'kg' : 'un.'} • ${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-gray-800 px-1 py-0.5 rounded-lg">
                        <button 
                          type="button" 
                          onClick={() => updateCartQty(item.id, -1)} 
                          className="p-1 text-slate-400 hover:text-white rounded transition"
                          aria-label="Restar unidad"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold px-1 text-gray-100">{item.qty}</span>
                        <button 
                          type="button" 
                          onClick={() => updateCartQty(item.id, 1)} 
                          className="p-1 text-slate-400 hover:text-white rounded transition"
                          aria-label="Sumar unidad"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario y Confirmación por WhatsApp */}
            <div className="space-y-3 pt-3 border-t border-gray-800/90">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tu Nombre y Apellido *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <input
                  type="text"
                  placeholder="Dirección o punto de entrega (opcional)"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado:</span>
                <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">
                  ${cartTotal.toLocaleString('es-AR')}
                </span>
              </div>

              <button
                type="button"
                onClick={sendWhatsAppOrder}
                disabled={cart.length === 0}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Pedir por WhatsApp</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Modal para calcular peso en catálogo público */}
      {showWeightModal && weightProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-t-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Seleccionar Peso</span>
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
                  Precio por Kilo: ${Number(weightProduct.price || 0).toLocaleString('es-AR')} /kg
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">
                  ¿Cuánto deseas llevar?
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder={weightUnit === 'grams' ? "Ej: 250 (g)" : "Ej: 0.250 (kg)"}
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmWeight(); }}
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
                onClick={handleConfirmWeight}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}