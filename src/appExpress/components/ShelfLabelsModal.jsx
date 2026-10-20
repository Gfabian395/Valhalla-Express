import { X, Printer } from 'lucide-react';

export default function ShelfLabelsModal({ products = [], onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      
      {/* Estilos CSS inyectados para impresión limpia de góndola */}
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
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-label-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabecera del Modal (No se imprime) */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-lg font-black uppercase text-emerald-400 flex items-center gap-2">
            <Printer className="w-5 h-5" /> Impresión de Precios para Góndola (Tamaño Estándar)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido / Vista previa de etiquetas */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/50">
          <p className="text-xs text-slate-400 mb-4">
            Vista previa de etiquetas con medida de cenefa estándar (aprox. 7cm x 3cm). Listas para recortar y colocar en góndola.
          </p>

          {/* Contenedor exclusivo para impresión */}
          <div id="printable-labels" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {products.map((prod) => (
              <div 
                key={prod.id} 
                className="print-label-card bg-white text-slate-950 p-2 rounded-lg border border-dashed border-slate-400 flex flex-col justify-between shadow-xs"
                style={{ width: '100%', height: '85px', boxSizing: 'border-box' }}
              >
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-0.5">
                  <span className="truncate">{prod.categoryName || 'Supermercado'}</span>
                  <span className="font-mono">SKU: {prod.sku || '---'}</span>
                </div>

                <h4 className="text-xs font-black leading-tight line-clamp-2 my-0.5 text-slate-900 text-center">
                  {prod.name}
                </h4>

                <div className="text-center bg-slate-100 rounded py-0.5 mt-auto">
                  <span className="text-base font-black text-emerald-700 tracking-tight">
                    ${Number(prod.price || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie de acciones (No se imprime) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimir Etiquetas
          </button>
        </div>

      </div>
    </div>
  );
}