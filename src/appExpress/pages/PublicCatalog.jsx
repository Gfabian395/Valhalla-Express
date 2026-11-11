import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ShoppingBag, MessageCircle, Plus, Minus, Store, Scale, X, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function PublicCatalog() {
  const { storeId } = useParams();
  
  const [storeInfo, setStoreInfo] = useState({ name: 'Supermercado', phone: '' });
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState('grams');

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchStore = async () => {
      try {
        const storeRef = doc(db, 'comercios', storeId);
        const storeSnap = await getDoc(storeRef);

        if (isMounted && storeSnap.exists()) {
          const data = storeSnap.data();
          setStoreInfo({
            name: data.name || data.nombreLocal || 'Supermercado',
            phone: data.phone || data.whatsapp || ''
          });
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

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'comercios', storeId, 'categories'));
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

  useEffect(() => {
    if (!storeId || !selectedCategoryId) {
      setProducts([]);
      return;
    }
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const prodSnap = await getDocs(collection(db, 'comercios', storeId, 'categories', selectedCategoryId, 'products'));
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
    const phone = rawPhone || '5491159781434';

    let message = `🚨 *NUEVO PEDIDO - VALHALLA EXPRESS*\n\n`;
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
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-linear-to-r from-green-700 to-green-600 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-white shrink-0 backdrop-blur-sm">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" /> Catálogo en Línea
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {storeInfo.name}
              </h1>
              <p className="text-xs text-green-100 font-medium">
                Aprovechá las mejores ofertas. Hacé tu pedido directo por WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-200">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                selectedCategoryId === cat.id 
                  ? 'bg-green-600 text-white shadow-sm scale-105' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-8 space-y-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-1">
              Góndola de Ofertas
            </h2>
            
            {products.length === 0 ? (
              <div className="p-12 bg-white border border-dashed border-gray-200 rounded-3xl text-center text-xs text-gray-400">
                No hay productos disponibles en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(prod => (
                  <div 
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className="bg-white border border-gray-200 hover:border-green-500 rounded-3xl p-4 cursor-pointer transition-all flex flex-col justify-between shadow-sm hover:shadow-md group relative overflow-hidden"
                  >
                    <div className="w-full h-36 bg-gray-50 rounded-2xl overflow-hidden mb-3 border border-gray-100 flex items-center justify-center relative">
                      {prod.imageUrl ? (
                        <img 
                          src={prod.imageUrl} 
                          alt={prod.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="text-gray-300 flex flex-col items-center gap-1">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-[10px] font-mono">Sin imagen</span>
                        </div>
                      )}
                      {prod.isWeightBased && (
                        <span className="absolute top-2 right-2 text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold shadow-xs font-mono">
                          Peso
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mb-3">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-sm sm:text-base font-black text-green-600 font-mono tracking-tight block">
                          ${Number(prod.price || 0).toLocaleString('es-AR')}
                        </span>
                        {prod.isWeightBased && <span className="text-[10px] text-gray-400 font-medium">precio por kg</span>}
                      </div>
                      <button 
                        type="button" 
                        aria-label={`Agregar ${prod.name} al carrito`}
                        className="p-2.5 bg-green-50 text-green-700 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm lg:sticky lg:top-6">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-green-600" />
                  <span>Tu Carrito</span>
                </h3>
                <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {cart.length} ítems
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                  Tocá cualquier producto de la góndola para agregarlo a tu pedido.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                  {cart.map(item => (
                    <div 
                      key={item.id} 
                      className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-gray-900 truncate">{item.name}</h4>
                        <span className="text-[11px] text-green-600 font-mono font-bold block">
                          {item.qty} {item.isWeightBased ? 'kg' : 'un.'} • ${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 bg-white border border-gray-200 px-1.5 py-1 rounded-xl shadow-2xs">
                        <button 
                          type="button" 
                          onClick={() => updateCartQty(item.id, -1)} 
                          className="p-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          aria-label="Restar unidad"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold px-1 text-gray-900">{item.qty}</span>
                        <button 
                          type="button" 
                          onClick={() => updateCartQty(item.id, 1)} 
                          className="p-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition cursor-pointer"
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

            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tu Nombre y Apellido *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
                <input
                  type="text"
                  placeholder="Dirección o punto de entrega (opcional)"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                />
              </div>

              <div className="flex items-baseline justify-between px-1 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase">Total Estimado:</span>
                <span className="text-lg font-black text-green-600 font-mono tracking-tight">
                  ${cartTotal.toLocaleString('es-AR')}
                </span>
              </div>

              <button
                type="button"
                onClick={sendWhatsAppOrder}
                disabled={cart.length === 0}
                className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Enviar Pedido por WhatsApp</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {showWeightModal && weightProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-200 text-gray-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full relative shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-green-600" />
                <span>Seleccionar Peso</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowWeightModal(false)} 
                className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{weightProduct.name}</h4>
                <p className="text-xs text-green-600 font-mono mt-0.5">
                  Precio por Kilo: ${Number(weightProduct.price || 0).toLocaleString('es-AR')} /kg
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500 block">
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
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
                  />
                  <select
                    value={weightUnit}
                    onChange={e => setWeightUnit(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
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
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWeight}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
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