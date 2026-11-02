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
    <div className="w-full lg:col-span-5 bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col h-auto min-h-[450px] lg:h-[75vh] shadow-xl backdrop-blur-sm">
      
      {/* Cabecera del Carrito */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-800/80 mb-3">
        <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-500" />
          <span>Carrito Actual</span>
          {cart.length > 0 && (
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0)} items
            </span>
          )}
        </h2>

        <button
          onClick={onShowPendingModal}
          className="px-2.5 sm:px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 active:scale-95"
        >
          <PauseCircle className="w-4 h-4" />
          <span>En Espera</span>
        </button>
      </div>

      {/* Lista de Ítems */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-2 mb-3 min-h-[160px] max-h-[300px] lg:max-h-none scrollbar-thin scrollbar-thumb-gray-800">
        {isCartEmpty ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-4 text-xs text-slate-500 space-y-2 border border-dashed border-gray-800/60 rounded-xl">
            <ShoppingCart className="w-8 h-8 text-slate-700" />
            <p>El carrito está vacío.<br />Escanea o agrega productos desde el catálogo.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/70 border border-gray-800/80 p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-3 hover:border-gray-700/80 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-200 truncate">
                  {item.name}
                </h4>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  ${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}
                </div>
              </div>

              {/* Control de Cantidad */}
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-900 border border-gray-800 px-1.5 py-1 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, -1)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition active:scale-90"
                  aria-label="Restar unidad"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-bold font-mono min-w-[20px] text-center text-gray-100">
                  {item.qty}
                </span>

                <button
                  type="button"
                  onClick={() => updateQty(item.id, 1)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition active:scale-90"
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
      <div className="border-t border-gray-800/90 pt-3 space-y-3 mt-auto">
        
        {/* Total a pagar */}
        <div className="flex justify-between items-baseline px-1">
          <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
            Total a Pagar
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
            ${cartTotal.toLocaleString('es-AR')}
          </span>
        </div>

        {/* Panel Calculador de Vuelto */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3 rounded-xl border border-gray-800">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Abona con ($)
            </label>
            <input
              type="number"
              placeholder="0"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              className="w-full bg-slate-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="text-right flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Vuelto
            </span>
            <span
              className={`text-sm sm:text-base font-black font-mono truncate ${
                changeDue < 0 ? 'text-red-400' : 'text-amber-400'
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
            className="py-2.5 px-2 bg-slate-800/90 hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700/50"
          >
            <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">En Espera</span>
          </button>

          <button
            type="button"
            onClick={onShowCreditModal}
            disabled={isCartEmpty}
            className="py-2.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Dar Fiado</span>
          </button>

          <button
            type="button"
            onClick={onCheckout}
            disabled={isCartEmpty}
            className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            Cobrar
          </button>
        </div>

      </div>

    </div>
  );
}