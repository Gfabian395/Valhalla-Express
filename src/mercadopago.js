const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference } = require("mercadopago");

// Inicializar admin de Firebase si aún no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configura tu Access Token de Mercado Pago utilizando los secretos de Firebase Functions
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

exports.createPreference = onRequest(async (req, res) => {
  // Permitir CORS
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const { storeId, planId } = req.body;

    if (!storeId || !planId) {
      return res.status(400).json({ error: "Faltan datos obligatorios (storeId o planId)" });
    }

    // 1. Buscar los detalles del plan en Firestore para saber el precio real
    const planSnap = await admin.firestore().collection("ExpressPlanes").doc(planId).get();
    if (!planSnap.exists) {
      return res.status(404).json({ error: "El plan seleccionado no existe" });
    }

    const planData = planSnap.data();

    // 2. Crear la preferencia de pago en Mercado Pago
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            title: `Suscripción ${planData.name} - ValhallaExpress`,
            unit_price: Number(planData.price),
            quantity: 1,
            currency_id: "ARS"
          }
        ],
        back_urls: {
          success: "https://tuDominio.com/express/config?status=success",
          failure: "https://tuDominio.com/express/config?status=failure",
          pending: "https://tuDominio.com/express/config?status=pending"
        },
        auto_return: "approved",
        metadata: {
          store_id: storeId,
          plan_id: planId
        }
      }
    });

    // 3. Retornar el link de pago (init_point) al frontend
    return res.status(200).json({ init_point: result.init_point });

  } catch (error) {
    console.error("Error al crear preferencia de Mercado Pago:", error);
    return res.status(500).json({ error: "Error interno al procesar el pago" });
  }
});