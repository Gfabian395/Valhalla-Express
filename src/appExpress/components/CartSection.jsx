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
  return (
    <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-[72vh]">
      
      {/* Cabecera del Carrito */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <h2 className="text-base font-black uppercase tracking-wide text-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" /> Carrito Actual
        </h2>
        <button
          onClick={onShowPendingModal}
          className="relative px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
        >
          <PauseCircle className="w-4 h-4" /> En Espera
        </button>
      </div>

      {/* Lista de Ítems */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-2 mb-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
            <ShoppingCart className="w-8 h-8 text-slate-700" />
            <p>El carrito está vacío. Escanea o selecciona productos.</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                <span className="text-xs font-black text-emerald-400">
                  ${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                <button onClick={() => updateQty(item.id, -1)} className="text-slate-400 hover:text-white">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold font-mono w-5 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="text-slate-400 hover:text-white">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totales, Abona con y Vuelto */}
      <div className="border-t border-slate-800 pt-3 space-y-2.5">
        <div className="flex justify-between items-center text-base font-black text-slate-100">
          <span>TOTAL A PAGAR:</span>
          <span className="text-emerald-400 text-xl">${cartTotal.toLocaleString('es-AR')}</span>
        </div>

        {/* Input Abona con & Cálculo de Vuelto (Etiqueta corregida) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Abona con ($)</label>
            <input
              type="number"
              placeholder="0"
              value={cashGiven}
              onChange={e => setCashGiven(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div className="text-right flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Vuelto</span>
            <span className="text-base font-black text-amber-400 font-mono">
              ${changeDue.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onShowPendingModal}
            disabled={cart.length === 0}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
          >
            <PauseCircle className="w-4 h-4 text-amber-400" /> En Espera
          </button>
          <button
            onClick={onShowCreditModal}
            disabled={cart.length === 0}
            className="py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1"
          >
            <Users className="w-4 h-4" /> Dar Fiado
          </button>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
          >
            Cobrar
          </button>
        </div>
      </div>

    </div>
  );
}