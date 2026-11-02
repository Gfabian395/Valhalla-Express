import { Barcode, CheckCircle2 } from 'lucide-react';

export default function ProductScanner({
  searchTerm,
  setSearchTerm,
  handleKeyDown,
  allProductsCount = 0
}) {
  return (
    <div className="w-full lg:col-span-7 bg-gray-900/90 border border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col justify-center min-h-35 lg:h-[75vh] shadow-xl backdrop-blur-sm">
      
      <div className="max-w-md mx-auto w-full space-y-4 sm:space-y-6 text-center">
        
        {/* Ícono de Escáner */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 border border-gray-800 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
          <Barcode className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Título y Descripción */}
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-gray-100">
            Escáner de Caja (POS)
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Pasa el producto por la lectora de código de barras o escribe el SKU y presiona{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-gray-700 rounded text-emerald-400 font-mono text-[11px] font-semibold">
              Enter
            </kbd>{' '}
            para agregarlo al carrito.
          </p>
        </div>

        {/* Input de captura para pistola lectora */}
        <div className="relative">
          <input
            type="text"
            placeholder="Escanea el código de barras aquí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm text-gray-100 placeholder-slate-500 font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-lg shadow-emerald-500/10 transition"
            autoFocus
          />
        </div>

        {/* Estado de sincronización */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span>
            Sistema sincronizado (
            <strong className="text-gray-200">{allProductsCount}</strong> productos en inventario)
          </span>
        </div>

      </div>

    </div>
  );
}