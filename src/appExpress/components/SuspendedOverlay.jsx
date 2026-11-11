import { RefreshCw, MessageSquare, Clock } from 'lucide-react';

export default function SuspendedOverlay({ storeId, onCheckStatus }) {
  const handleWhatsAppSupport = () => {
    const adminPhone = "5491159781434"; 
    const msg = `Hola! Ya realicé el registro de mi comercio en Valhalla Express (UID: ${storeId || 'N/A'}). ¿Podrías verificar el estado y activar la cuenta por favor?`;
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 max-w-lg w-full text-center space-y-6 shadow-xl relative overflow-hidden">
        
        {/* Resplandor decorativo de fondo suave */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ícono animado con pulso */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-yellow-50 border border-yellow-200 rounded-3xl flex items-center justify-center text-yellow-600 shadow-xs">
          <div className="absolute inset-0 rounded-3xl bg-yellow-400/10 animate-ping opacity-25" />
          <Clock className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse text-yellow-600" />
        </div>

        {/* Encabezado y Explicación */}
        <div className="space-y-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            MODO DE ESPERA / ACTIVACIÓN MANUAL
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            ¡Tu tienda está casi lista en Valhalla!
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            Hemos recibido los datos de tu comercio correctamente. Nuestro equipo está validando tu alta de forma manual para garantizarte el acceso total a la caja y existencias.
          </p>
        </div>

        {/* Ficha de Estado Técnico */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left font-mono text-xs text-gray-600 space-y-2.5 relative z-10 shadow-2xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">ID de Comercio (UID):</span>
            <span className="text-green-700 font-semibold truncate max-w-50 sm:max-w-xs bg-white px-2 py-0.5 rounded border border-gray-200">
              {storeId || '---'}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-200 pt-2">
            <span className="text-gray-400">Estado en Sistema:</span>
            <span className="text-yellow-700 font-bold uppercase tracking-wider text-[11px] bg-yellow-50 px-2.5 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-600" /> Pendiente de Aprobación
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-3 pt-2 relative z-10">
          {onCheckStatus && (
            <button
              type="button"
              onClick={onCheckStatus}
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin-slow" />
              <span>Verificar si ya fui activado</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleWhatsAppSupport}
            className="w-full py-3.5 px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 border border-gray-200 shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-green-600 shrink-0" />
            <span>Avisar de inmediato por WhatsApp</span>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 font-mono tracking-wide pt-1">
          Valhalla Express • Control absoluto de altas y suscripciones
        </p>

      </div>
    </div>
  );
}