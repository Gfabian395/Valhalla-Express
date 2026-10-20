const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

admin.initializeApp();

// 1. CREAR PREFERENCIA DE PAGO (Link de Checkout Pro)
exports.createPreference = onRequest(
  { secrets: ["MP_ACCESS_TOKEN"], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    try {
      const { storeId, planId, originUrl } = req.body;

      if (!storeId || !planId) {
        return res.status(400).json({ error: "Faltan datos obligatorios (storeId o planId)" });
      }

      // Buscar detalles del plan en Firestore
      const planSnap = await admin.firestore().collection("ExpressPlanes").doc(planId).get();
      if (!planSnap.exists) {
        return res.status(404).json({ error: "El plan seleccionado no existe" });
      }

      const planData = planSnap.data();
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const preference = new Preference(client);

      const baseUrl = originUrl || "http://localhost:5173";

      const result = await preference.create({
        body: {
          items: [
            {
              id: planId,
              title: `Suscripción Plan ${planData.name} - ValhallaExpress`,
              unit_price: Number(planData.price),
              quantity: 1,
              currency_id: "ARS",
            },
          ],
          back_urls: {
            success: `${baseUrl}/express/config?payment=success`,
            failure: `${baseUrl}/express/config?payment=failure`,
            pending: `${baseUrl}/express/config?payment=pending`,
          },
          auto_return: "approved",
          metadata: {
            store_id: storeId,
            plan_id: planId,
          },
        },
      });

      return res.status(200).json({ init_point: result.init_point });
    } catch (error) {
      console.error("Error al crear preferencia de Mercado Pago:", error);
      return res.status(500).json({ error: "Error interno al procesar el pago" });
    }
  }
);

// 2. WEBHOOK: ESCUCHAR PAGO APROBADO Y ACTUALIZAR PLAN EN FIRESTORE
exports.mercadoPagoWebhook = onRequest(
  { secrets: ["MP_ACCESS_TOKEN"], cors: true },
  async (req, res) => {
    try {
      const paymentId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
      const type = req.body?.type || req.query?.type || req.query?.topic;

      if (type === "payment" && paymentId) {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo.status === "approved") {
          const storeId = paymentInfo.metadata?.store_id;
          const planId = paymentInfo.metadata?.plan_id;

          if (storeId && planId) {
            await admin.firestore().collection("stores").doc(storeId).update({
              plan: planId,
              status: true,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      return res.status(200).send("OK");
    } catch (error) {
      console.error("Error en Webhook de Mercado Pago:", error);
      return res.status(500).send("Error");
    }
  }
);