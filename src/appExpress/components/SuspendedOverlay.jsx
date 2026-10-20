import { AlertTriangle, PhoneCall } from 'lucide-react';

export default function SuspendedOverlay({ storeId }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase text-slate-100 tracking-wide">
            Suscripción Anulada / Cuenta Suspendida
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tu comercio se encuentra inactivo. Tienes un plazo de <strong className="text-emerald-400">60 días</strong> para reactivar la cuenta sin perder tus datos de clientes, categorías y productos. Pasado ese tiempo, la base de datos será eliminada permanentemente.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left font-mono text-[11px] text-slate-400 space-y-1">
          <div>ID de Comercio: <span className="text-emerald-400">{storeId || '---'}</span></div>
          <div>Estado: <span className="text-red-400 font-bold uppercase">Suspendido</span></div>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs text-slate-400">
            Para reactivar el servicio inmediatamente y recuperar el acceso total, comunícate con soporte técnico:
          </p>
          <a
            href="tel:1159781434"
            className="w-full py-3 bg-red-500 hover:bg-red-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            <PhoneCall className="w-4 h-4" /> Contactar Soporte: 1159781434
          </a>
        </div>

      </div>
    </div>
  );
}