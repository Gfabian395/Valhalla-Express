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

  // Cargar el teléfono y el nombre del comercio desde la colección unificada 'comercios'
  useEffect(() => {
    if (!storeId) return;
    const fetchStoreData = async () => {
      try {
        const storeRef = doc(db, 'comercios', storeId);
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

  // Cargar las ventas del día desde el localStorage de forma local
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
    const updatedSales = sales.filter((s) => s.id !== id);
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

    let message = `📊 *INFORME DE VENTAS - ${storeName}*\n`;
    message += `📅 *Fecha:* ${new Date().toLocaleDateString('es-AR')}\n`;
    message += `-----------------------------------\n\n`;

    sales.forEach((sale, index) => {
      message += `🔹 *Ticket #${index + 1}* [${sale.time || '--:--'}]\n`;

      if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const subtotal = Number(item.price || 0) * Number(item.qty || 0);
          message += `   ▪️ ${item.qty} ${item.isWeightBased ? 'kg' : 'un.'} x ${item.name} ($${subtotal.toLocaleString('es-AR')})\n`;
        });
      } else {
        message += `   ▪️ Venta general sin detalle de ítems\n`;
      }

      message += `   👉 *Subtotal:* $${Number(sale.total || 0).toLocaleString('es-AR')}\n\n`;
    });

    message += `-----------------------------------\n`;
    message += `💰 *TOTAL RECAUDADO HOY: $${totalDaySales.toLocaleString('es-AR')}*`;

    const url = `https://wa.me/${storePhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Imprimir informe detallado localmente
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
          <meta charset="UTF-8" />
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
          <p style="text-align: center; font-size: 12px;">Fecha: ${new Date().toLocaleDateString('es-AR')}</p>
          <div class="divider"></div>
          
          ${sales
            .map(
              (sale, index) => `
            <div class="ticket">
              <div class="flex">
                <strong>Ticket #${index + 1}</strong>
                <span>[${sale.time || '--:--'}]</span>
              </div>
              <div style="font-size: 12px; margin-top: 4px;">
                ${
                  sale.items && sale.items.length > 0
                    ? sale.items
                        .map(
                          (item) => `
                      <div class="flex">
                        <span>${item.qty} ${item.isWeightBased ? 'kg' : 'un.'} ${item.name}</span>
                        <span>$${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}</span>
                      </div>
                    `
                        )
                        .join('')
                    : '<div>Venta general sin detalle</div>'
                }
              </div>
              <div class="flex" style="font-size: 13px; font-weight: bold; margin-top: 4px;">
                <span>Subtotal:</span>
                <span>$${Number(sale.total || 0).toLocaleString('es-AR')}</span>
              </div>
            </div>
            <div class="divider"></div>
          `
            )
            .join('')}

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto text-gray-800">
      
      {/* Cabecera y Resumen de Caja */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-green-600 shrink-0" />
            <span>Ventas del Día (Caja)</span>
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span>Registro local en navegador (reinicio automático diario)</span>
          </p>
        </div>

        {/* Tarjeta de Total Recaudado */}
        <div className="w-full sm:w-auto bg-gray-50 border border-gray-200 px-5 py-3 rounded-2xl text-left sm:text-right">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
            Total Recaudado Hoy
          </span>
          <span className="text-xl sm:text-2xl font-black text-green-600 font-mono tracking-tight">
            ${totalDaySales.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Listado y Acciones */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-3">
          <h2 className="text-sm font-bold text-gray-900">
            Tickets Cobrados ({sales.length})
          </h2>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={sales.length === 0}
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-gray-200 cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0 text-gray-500" />
              <span className="truncate">Imprimir Ventas</span>
            </button>

            <button
              type="button"
              onClick={sendWhatsAppReport}
              disabled={sales.length === 0}
              className="py-2.5 px-3 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">Enviar WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Scroll de tickets */}
        <div className="space-y-3 max-h-75 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
          {sales.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200 rounded-2xl">
              <AlertCircle className="w-6 h-6 text-gray-300" />
              <span>Aún no se han registrado cobros en caja el día de hoy.</span>
            </div>
          ) : (
            sales.map((sale, index) => (
              <div
                key={sale.id}
                className="bg-gray-50 border border-gray-200/80 p-4 rounded-2xl space-y-2.5 transition hover:border-gray-300"
              >
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      Ticket #{index + 1}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      ({sale.time || '--:--'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-green-600 font-mono">
                      ${Number(sale.total || 0).toLocaleString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSale(sale.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-200/60 transition cursor-pointer"
                      title="Eliminar ticket"
                      aria-label="Eliminar ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detalle de ítems */}
                <div className="space-y-1 pt-0.5">
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-gray-600 flex justify-between font-mono leading-relaxed"
                      >
                        <span className="truncate pr-2">
                          {item.qty} {item.isWeightBased ? 'kg' : 'un.'} {item.name}
                        </span>
                        <span className="shrink-0 text-gray-900 font-medium">
                          ${(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">
                      Venta general sin detalle de ítems
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}