import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ShoppingBag, MessageCircle, Plus, Minus, Store, Phone, CheckCircle2, Scale, X } from 'lucide-react';

export default function PublicCatalog() {
  const { storeId } = useParams();
  
  const [storeInfo, setStoreInfo] = useState({ name: 'Mi Comercio', phone: '' });
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Modal para peso (si el producto se vende por kilo)
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState('grams');

  // Datos para finalizar pedido por WhatsApp
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // 1. Cargar información del comercio y su teléfono de WhatsApp
  useEffect(() => {
    if (!storeId) return;
    const fetchStore = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          setStoreInfo(storeSnap.data());
        }
      } catch (error) {
        console.error('Error al cargar datos del comercio:', error);
      }
    };
    fetchStore();
  }, [storeId]);

  // 2. Cargar categorías públicas
  useEffect(() => {
    if (!storeId) return;
    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'stores', storeId, 'categories'));
        const list = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories(list);
        if (list.length > 0) {
          setSelectedCategoryId(list[0].id);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      }
    };
    fetchCategories();
  }, [storeId]);

  // 3. Cargar productos de la categoría seleccionada
  useEffect(() => {
    if (!storeId || !selectedCategoryId) {
      setProducts([]);
      return;
    }
    const fetchProducts = async () => {
      try {
        const prodSnap = await getDocs(collection(db, 'stores', storeId, 'categories', selectedCategoryId, 'products'));
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    fetchProducts();
  }, [storeId, selectedCategoryId]);

  // Manejo de productos al hacer clic (si es por peso abre modal, si es por unidad suma directo)
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

  // Enviar pedido por WhatsApp
  const sendWhatsAppOrder = () => {
    if (cart.length === 0) {
      alert('Tu carrito está vacío.');
      return;
    }
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre para el envío.');
      return;
    }

    const phone = storeInfo.phone || '5491100000000'; // Número del comercio configurado
    let message = `*¡Hola! Quiero hacer un pedido:*%0A`;
    message += `👤 *Cliente:* ${customerName.trim()}%0A`;
    if (customerAddress.trim()) message += `📍 *Dirección:* ${customerAddress.trim()}%0A`;
    message += `%0A*Detalle del pedido:*%0A`;

    cart.forEach(item => {
      const subtotal = Number(item.price) * Number(item.qty);
      const unitLabel = item.isWeightBased ? 'kg' : 'un.';
      message += `- ${item.qty} ${unitLabel} de ${item.name} ($${subtotal.toLocaleString('es-AR')})%0A`;
    });

    message += `%0A*Total a Pagar: $${cartTotal.toLocaleString('es-AR')}*`;

    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado del Comercio */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide text-slate-100">{storeInfo.name}</h1>
              <p className="text-xs text-slate-400">Catálogo digital oficial • Pedidos rápidos por WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Categorías (Tabs de navegación) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition ${
                selectedCategoryId === cat.id 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Listado de Productos */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Productos Disponibles</h2>
            
            {products.length === 0 ? (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center text-xs text-slate-500">
                No hay productos en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(prod => (
                  <div 
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between shadow-md space-y-3"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{prod.name}</h3>
                      {prod.isWeightBased && (
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 mt-1">
                          <Scale className="w-3 h-3" /> Venta por Kilo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        ${Number(prod.price).toLocaleString('es-AR')} {prod.isWeightBased && <span className="text-[10px] text-slate-400 font-normal">/kg</span>}
                      </span>
                      <button className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-slate-950 transition">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrito de Pedido */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl h-fit">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-100 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Tu Pedido
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                  {cart.length} ítems
                </span>
              </div>

              {cart.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Selecciona productos para armar tu pedido.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{item.name}</h4>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {item.qty} {item.isWeightBased ? 'kg' : 'un.'} x ${Number(item.price).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateCartQty(item.id, -1)} className="p-1 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
                          <Minus className="w-3 h-3" />
                        </button>
                        <button onClick={() => updateCartQty(item.id, 1)} className="p-1 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tu Nombre y Apellido *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Dirección de envío (opcional)"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  ${cartTotal.toLocaleString('es-AR')}
                </span>
              </div>

              <button
                onClick={sendWhatsAppOrder}
                disabled={cart.length === 0}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Pedido por WhatsApp
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Modal para ingresar peso (gramos / kilos) en el catálogo público */}
      {showWeightModal && weightProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wide text-emerald-400 flex items-center gap-2">
                <Scale className="w-5 h-5" /> Seleccionar Peso
              </h3>
              <button onClick={() => setShowWeightModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-base font-bold text-slate-100">{weightProduct.name}</h4>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">
                  Precio: ${Number(weightProduct.price).toLocaleString('es-AR')} /kg
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">¿Cuánto deseas llevar?</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder={weightUnit === 'grams' ? "Ej: 250 (gramos)" : "Ej: 0.250 (kg)"}
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmWeight(); }}
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
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowWeightModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmWeight}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition"
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