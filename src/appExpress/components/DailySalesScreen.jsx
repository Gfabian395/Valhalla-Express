import { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { DollarSign, Trash2, Send, Calendar, AlertCircle, Printer } from 'lucide-react';

export default function DailySalesScreen() {
  const storeId = auth.currentUser ? auth.currentUser.uid : null;
  const [sales, setSales] = useState([]);
  const [storePhone, setStorePhone] = useState('');
  const [storeName, setStoreName] = useState('ValhallaExpress');

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Cargar el teléfono y el nombre del comercio desde Firestore
  useEffect(() => {
    if (!storeId) return;
    const fetchStoreData = async () => {
      try {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          if (data.phone) {
            const cleanPhone = data.phone.replace(/\D/g, '');
            setStorePhone(cleanPhone);
          }
          if (data.name) {
            setStoreName(data.name);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del comercio:', error);
      }
    };
    fetchStoreData();
  }, [storeId]);

  // Cargar las ventas del día desde el localStorage
  useEffect(() => {
    const savedDate = localStorage.getItem('valhalla_sales_date');
    const savedSales = localStorage.getItem('valhalla_daily_sales');
    const today = getTodayDate();

    if (savedDate === today && savedSales) {
      try {
        setSales(JSON.parse(savedSales));
      } catch (e) {
        console.error('Error al parsear ventas del día', e);
      }
    } else {
      localStorage.setItem('valhalla_sales_date', today);
      localStorage.setItem('valhalla_daily_sales', JSON.stringify([]));
      setSales([]);
    }
  }, []);

  const saveToLocalStorage = (newSales) => {
    const today = getTodayDate();
    localStorage.setItem('valhalla_sales_date', today);
    localStorage.setItem('valhalla_daily_sales', JSON.stringify(newSales));
    setSales(newSales);
  };

  const handleDeleteSale = (id) => {
    const updatedSales = sales.filter(s => s.id !== id);
    saveToLocalStorage(updatedSales);
  };

  const totalDaySales = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);

  // Enviar informe detallado tipo ticket por WhatsApp
  const sendWhatsAppReport = () => {
    if (sales.length === 0) {
      alert('No hay ventas registradas en el día de hoy.');
      return;
    }

    if (!storePhone) {
      alert('No se encontró un número de teléfono configurado para este comercio.');
      return;
    }

    let message = `📊 *INFORME DE VENTAS - ${storeName}* 📊%0A`;
    message += `📅 *Fecha:* ${new Date().toLocaleDateString()}%0A`;
    message += `-----------------------------------%0A%0A`;

    sales.forEach((sale, index) => {
      message += `🔹 *Ticket #${index + 1}* [${sale.time}]%0A`;
      
      if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
        sale.items.forEach(item => {
          const subtotal = Number(item.price) * Number(item.qty);
          message += `   ▪️ ${item.qty} ${item.isWeightBased ? 'kg' : 'un.'} x ${item.name} ($${subtotal.toLocaleString('es-AR')})%0A`;
        });
      } else {
        message += `   ▪️ Venta general sin detalle de ítems%0A`;
      }
      
      message += `   👉 *Subtotal:* $${Number(sale.total).toLocaleString('es-AR')}%0A%0A`;
    });

    message += `-----------------------------------%0A`;
    message += `💰 *TOTAL RECAUDADO HOY: $${totalDaySales.toLocaleString('es-AR')}*`;

    const url = `https://wa.me/${storePhone}?text=${message}`;
    window.open(url, '_blank');
  };

  // Imprimir informe detallado
  const handlePrintReport = () => {
    if (sales.length === 0) {
      alert('No hay ventas para imprimir en el día de hoy.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cierre de Caja - ${storeName}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; max-width: 400px; margin: auto; }
            h2, h4 { text-align: center; margin: 5px 0; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            .ticket { margin-bottom: 15px; }
            .flex { display: flex; justify-content: space-between; }
            .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 15px; }
          </style>
        </head>
        <body>
          <h2>${storeName}</h2>
          <h4>INFORME DE VENTAS DEL DÍA</h4>
          <p style="text-align: center; font-size: 12px;">Fecha: ${new Date().toLocaleDateString()}</p>
          <div class="divider"></div>
          
          ${sales.map((sale, index) => `
            <div class="ticket">
              <div class="flex">
                <strong>Ticket #${index + 1}</strong>
                <span>[${sale.time}]</span>
              </div>
              <div style="font-size: 12px; margin-top: 4px;">
                ${sale.items && sale.items.map(item => `
                  <div class="flex">
                    <span>${item.qty} ${item.isWeightBased ? 'kg' : 'un.'} ${item.name}</span>
                    <span>$${(Number(item.price) * Number(item.qty)).toLocaleString('es-AR')}</span>
                  </div>
                `).join('')}
              </div>
              <div class="flex" style="font-size: 13px; font-weight: bold; margin-top: 4px;">
                <span>Subtotal:</span>
                <span>$${Number(sale.total).toLocaleString('es-AR')}</span>
              </div>
            </div>
            <div class="divider"></div>
          `).join('')}

          <div class="total">
            TOTAL CAJA HOY: $${totalDaySales.toLocaleString('es-AR')}
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto text-slate-100">
      
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-100 flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" /> Ventas del Día (Caja)
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Registro automático de cobros en el POS (se reinicia a las 00:00 hs)
          </p>
        </div>

        {/* Tarjeta de Total Recaudado */}
        <div className="bg-slate-950 border border-slate-800 px-5 py-3 rounded-2xl text-right">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Recaudado Hoy</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            ${totalDaySales.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Listado y Botones de Acción (WhatsApp e Imprimir) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-200">Tickets Cobrados ({sales.length})</h2>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrintReport}
              disabled={sales.length === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-2 border border-slate-700 shadow-md"
            >
              <Printer className="w-4 h-4" /> Imprimir Ventas
            </button>

            <button
              onClick={sendWhatsAppReport}
              disabled={sales.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" /> Enviar a WhatsApp
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6 text-slate-600" />
              <span>Aún no se han registrado cobros en caja el día de hoy.</span>
            </div>
          ) : (
            sales.map((sale, index) => (
              <div 
                key={sale.id}
                className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl space-y-2 transition hover:border-slate-700"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-400">Ticket #{index + 1}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({sale.time})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      ${Number(sale.total).toLocaleString('es-AR')}
                    </span>
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-slate-900"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detalle de productos dentro del ticket */}
                <div className="space-y-1 pt-1">
                  {sale.items && sale.items.map((item, idx) => (
                    <div key={idx} className="text-[11px] text-slate-400 flex justify-between font-mono">
                      <span>• {item.qty} {item.isWeightBased ? 'kg' : 'un.'} {item.name}</span>
                      <span>${(Number(item.price) * Number(item.qty)).toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}