import { X, Printer } from 'lucide-react';

export default function ShelfLabelsModal({ products = [], onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      
      {/* Estilos CSS inyectados para impresión limpia de etiquetas en hoja estándar */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-labels, #printable-labels * {
            visibility: visible;
          }
          #printable-labels {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            padding: 10mm !important;
            margin: 0 !important;
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
          }
          .print-label-card {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1px dashed #64748b !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-t-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabecera del Modal (Oculta al imprimir) */}
        <div className="p-3.5 sm:p-4 border-b border-gray-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Printer className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-gray-100 tracking-tight truncate">
              Precios para Góndola (Cenefa Estándar)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vista previa de etiquetas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40 scrollbar-thin scrollbar-thumb-gray-800">
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Vista previa de cenefas para góndola (~7cm x 3cm). Formato preparado para imprimir y recortar directamente.
          </p>

          {products.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-gray-800 rounded-xl">
              No hay productos seleccionados para generar etiquetas.
            </div>
          ) : (
            <div id="printable-labels" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {products.map((prod) => (
                <div 
                  key={prod.id} 
                  className="print-label-card bg-white text-slate-950 p-2.5 rounded-lg border border-dashed border-slate-300 flex flex-col justify-between shadow-sm min-h-[95px]"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                    <span className="truncate pr-1">{prod.categoryName || 'Comercio'}</span>
                    <span className="font-mono shrink-0">SKU: {prod.sku || '---'}</span>
                  </div>

                  <h4 className="text-xs font-bold leading-snug line-clamp-2 my-1 text-slate-900 text-center">
                    {prod.name}
                  </h4>

                  <div className="text-center bg-slate-100 rounded py-0.5 mt-auto border border-slate-200/60">
                    <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                      ${Number(prod.price || 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones inferiores (Ocultas al imprimir) */}
        <div className="p-3.5 sm:p-4 border-t border-gray-800 bg-gray-900/90 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold rounded-xl transition border border-slate-700/60"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={products.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Etiquetas</span>
          </button>
        </div>

      </div>
    </div>
  );
}