import { Barcode, CheckCircle2 } from 'lucide-react';

export default function ProductScanner({
  searchTerm,
  setSearchTerm,
  handleKeyDown,
  allProductsCount = 0
}) {
  return (
    <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center h-[72vh]">
      
      <div className="max-w-md mx-auto w-full space-y-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Barcode className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-wide text-slate-100">
            Escáner de Caja (POS)
          </h2>
          <p className="text-xs text-slate-400">
            Pasa el producto por la lectora de código de barras o escribe el SKU y presiona <strong className="text-emerald-400">Enter</strong> para agregarlo al carrito.
          </p>
        </div>

        {/* Input único optimizado para pistola lectora */}
        <div className="relative">
          <input
            type="text"
            placeholder="Escanea el código de barras aquí..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-950 border-2 border-emerald-500/50 rounded-2xl px-5 py-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-400 font-mono text-center shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Sistema sincronizado ({allProductsCount} productos en inventario)</span>
        </div>
      </div>

    </div>
  );
}