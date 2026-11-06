import { ShoppingCart, PauseCircle, Users, Plus, Minus } from 'lucide-react';

export default function CartSection({
  cart = [],
  updateQty,
  cartTotal = 0,
  cashGiven,
  setCashGiven,
  changeDue = 0,
  onShowPendingModal,
  onShowCreditModal,
  onCheckout
}) {
  const isCartEmpty = cart.length === 0;

  return (
    <div className="w-full lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 flex flex-col h-auto min-h-112.5 lg:h-[75vh] shadow-sm">
      
      {/* Cabecera del Carrito */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-3">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600" />
          <span>Carrito Actual</span>
          {cart.length > 0 && (
            <span className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full">
              {cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0)} items
            </span>
          )}
        </h2>

        <button
          type="button"
          onClick={onShowPendingModal}
          className="px-2.5 sm:px-3 py-1.5 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <PauseCircle className="w-4 h-4 text-yellow-600" />
          <span>En Espera</span>
        </button>
      </div>

      {/* Lista de Ítems */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-2 mb-3 min-h-40 max-h-75 lg:max-h-none scrollbar-thin scrollbar-thumb-gray-200">
        {isCartEmpty ? (
          <div className="h-full min-h-40 flex flex-col items-center justify-center text-center p-4 text-xs text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-2xl">
            <ShoppingCart className="w-8 h-8 text-gray-300" />
            <p>El carrito está vacío.<br />Escanea o agrega productos desde el catálogo.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 border border-gray-200/80 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-gray-300 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                  {item.name}
                </h4>
                <div className="text-xs font-mono font-bold text-green-600">
                  ${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}
                </div>
              </div>

              {/* Control de Cantidad */}
              <div className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-200 px-1.5 py-1 rounded-xl shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, -1)}
                  className="p-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition active:scale-90 cursor-pointer"
                  aria-label="Restar unidad"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-bold font-mono min-w-5 text-center text-gray-900">
                  {item.qty}
                </span>

                <button
                  type="button"
                  onClick={() => updateQty(item.id, 1)}
                  className="p-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition active:scale-90 cursor-pointer"
                  aria-label="Sumar unidad"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totales, Abona con y Vuelto */}
      <div className="border-t border-gray-100 pt-3 space-y-3 mt-auto">
        
        {/* Total a pagar */}
        <div className="flex justify-between items-baseline px-1">
          <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">
            Total a Pagar
          </span>
          <span className="text-xl sm:text-2xl font-black text-green-600 font-mono tracking-tight">
            ${cartTotal.toLocaleString('es-AR')}
          </span>
        </div>

        {/* Panel Calculador de Vuelto */}
        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
              Abona con ($)
            </label>
            <input
              type="number"
              placeholder="0"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition"
            />
          </div>

          <div className="text-right flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">
              Vuelto
            </span>
            <span
              className={`text-sm sm:text-base font-black font-mono truncate ${
                changeDue < 0 ? 'text-red-500' : 'text-amber-600'
              }`}
            >
              ${changeDue.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Botonera de Cobro y Acciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={onShowPendingModal}
            disabled={isCartEmpty}
            className="py-2.5 px-2 bg-gray-100 hover:bg-gray-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-gray-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-gray-200 cursor-pointer"
          >
            <PauseCircle className="w-4 h-4 text-yellow-600 shrink-0" />
            <span className="truncate">En Espera</span>
          </button>

          <button
            type="button"
            onClick={onShowCreditModal}
            disabled={isCartEmpty}
            className="py-2.5 px-2 bg-yellow-400 hover:bg-yellow-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Dar Fiado</span>
          </button>

          <button
            type="button"
            onClick={onCheckout}
            disabled={isCartEmpty}
            className="py-2.5 px-3 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
          >
            Cobrar
          </button>
        </div>

      </div>

    </div>
  );
}