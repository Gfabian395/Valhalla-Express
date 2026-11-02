import { AlertTriangle, PhoneCall } from 'lucide-react';

export default function SuspendedOverlay({ storeId }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-lg w-full text-center space-y-5 sm:space-y-6 shadow-2xl shadow-red-950/40">
        
        {/* Ícono de Alerta */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 border border-red-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Encabezado y Explicación */}
        <div className="space-y-2">
          <h2 className="text-base sm:text-xl font-bold text-gray-100 tracking-tight">
            Suscripción Anulada / Cuenta Suspendida
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            Tu comercio se encuentra inactivo. Tenés un plazo de{' '}
            <strong className="text-amber-400 font-semibold">60 días</strong> para reactivar la cuenta
            sin perder tus datos de clientes, categorías y productos. Pasado ese tiempo, los registros se eliminarán de forma permanente.
          </p>
        </div>

        {/* Ficha de Estado Técnico */}
        <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-gray-800 text-left font-mono text-xs text-slate-400 space-y-1.5">
          <div className="flex justify-between items-center">
            <span>ID de Comercio:</span>
            <span className="text-slate-200 font-semibold truncate max-w-[190px] sm:max-w-none">
              {storeId || '---'}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-800/60 pt-1.5">
            <span>Estado:</span>
            <span className="text-red-400 font-bold uppercase tracking-wider text-[11px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
              Suspendido
            </span>
          </div>
        </div>

        {/* Bloque de Contacto */}
        <div className="space-y-3 pt-1">
          <p className="text-xs text-slate-400">
            Para reactivar el servicio de inmediato y restablecer las funciones de caja, comunicate con soporte técnico:
          </p>
          <a
            href="tel:+5491159781434"
            className="w-full py-3 px-4 bg-red-500 hover:bg-red-400 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span>Contactar Soporte: +54 9 11 5978-1434</span>
          </a>
        </div>

      </div>
    </div>
  );
}