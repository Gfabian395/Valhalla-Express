import { Barcode, CheckCircle2 } from 'lucide-react';

export default function ProductScanner({
  searchTerm,
  setSearchTerm,
  handleKeyDown,
  allProductsCount = 0
}) {
  return (
    <div className="w-full lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-5 sm:p-8 flex flex-col justify-center min-h-35 lg:h-[75vh] shadow-sm">
      
      <div className="max-w-md mx-auto w-full space-y-4 sm:space-y-6 text-center">
        
        {/* Ícono de Escáner */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 border border-green-200 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto text-green-600 shadow-xs">
          <Barcode className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Título y Descripción */}
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-gray-900">
            Escáner de Caja (POS)
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            Pasa el producto por la lectora de código de barras o escribe el SKU y presiona{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-green-700 font-mono text-[11px] font-semibold">
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
            className="w-full bg-gray-50 border-2 border-green-600/60 focus:border-green-600 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 font-mono text-center focus:outline-none focus:ring-2 focus:ring-green-600/20 shadow-xs transition"
            autoFocus
          />
        </div>

        {/* Estado de sincronización */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-gray-500 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
          <span>
            Sistema sincronizado (
            <strong className="text-gray-900">{allProductsCount}</strong> productos en inventario)
          </span>
        </div>

      </div>

    </div>
  );
}