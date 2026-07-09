import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Helper: Send direct push notification to specific user
async function sendToUser(
  userId: string,
  title: string,
  body: string,
  dataPayload: Record<string, string> = {}
) {
  const userDoc = await db.collection("users").document(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data();
  const fcmToken = userData?.fcmToken;

  if (fcmToken) {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...dataPayload,
      },
    };

    try {
      await admin.messaging().send(message);
      // Log to database notifications feed
      await db.collection("notifications").add({
        userId,
        title,
        body,
        type: dataPayload.type || "general",
        payload: dataPayload,
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      console.error(`Failed to send notification to user ${userId}:`, err);
    }
  }
}

// Helper: Send broadcast to FCM topic (district / crop)
async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  dataPayload: Record<string, string> = {}
) {
  const message: admin.messaging.TopicMessage = {
    topic,
    notification: { title, body },
    data: {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      ...dataPayload,
    },
  };

  try {
    await admin.messaging().send(message);
  } catch (err) {
    console.error(`Failed to send broadcast to topic ${topic}:`, err);
  }
}

// 1. Market Price Updated Trigger
export const onMarketPriceUpdate = functions.firestore
  .document("market_prices/{priceId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (!newData || !oldData) return;

    const currentPrice = newData.price;
    const yesterdayPrice = oldData.price;
    const district = newData.district;
    const cropName = newData.cropName || newData.vegetableName;

    const diffPct = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;

    if (Math.abs(diffPct) >= 10) {
      const isIncrease = diffPct > 0;
      const title = isIncrease ? `📈 ${cropName} Price Surge!` : `📉 ${cropName} Price Drop!`;
      const body = isIncrease
        ? `${cropName} reached ₹${currentPrice}/kg in ${district}. Best time to sell!`
        : `${cropName} dropped to ₹${currentPrice}/kg in ${district}. Wait before selling.`;

      await sendToTopic(
        `district_${district.toLowerCase().replace(" ", "_")}`,
        title,
        body,
        {
          type: "market_prices",
          cropName,
          district,
          price: currentPrice.toString(),
        }
      );
    }
  });

// 2. Weather Alert Trigger
export const onWeatherAlertCreated = functions.firestore
  .document("weather_alerts/{alertId}")
  .onCreate(async (snap, context) => {
    const alertData = snap.data();
    if (!alertData) return;

    const { district, severity, message, type } = alertData;
    const emoji = severity === "severe" ? "🚨" : "⚠️";
    const title = `${emoji} Weather Warning: ${type}`;

    await sendToTopic(
      `district_${district.toLowerCase().replace(" ", "_")}`,
      title,
      message,
      {
        type: "weather",
        severity,
        district,
      }
    );
  });

// 3. Disease Prediction Completed Trigger
export const onDiseasePredictionCompleted = functions.firestore
  .document("disease_reports/{reportId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (!newData || !oldData) return;

    if (oldData.status !== "completed" && newData.status === "completed") {
      const { userId, cropName, diseaseName, severity } = newData;
      const emoji = severity === "high" ? "🚨" : "🔍";
      const title = `${emoji} Crop Disease Scan Completed`;
      const body = severity === "high"
        ? `Immediate action required: ${diseaseName} detected on your ${cropName}!`
        : `Scan complete: ${diseaseName} detected on your ${cropName}. Open to see treatment details.`;

      await sendToUser(userId, title, body, {
        type: "disease_reports",
        reportId: context.params.reportId,
      });
    }
  });

// 4. AI Planner Completed Trigger
export const onAiPlannerCompleted = functions.firestore
  .document("ai_planner/{planId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (!newData || !oldData) return;

    if (oldData.status !== "completed" && newData.status === "completed") {
      const { userId, cropName } = newData;
      const title = "✅ AI Crop Plan Ready";
      const body = `Your custom AI-generated schedule for ${cropName} is complete! Tap to view details.`;

      await sendToUser(userId, title, body, {
        type: "ai_planner",
        planId: context.params.planId,
      });
    }
  });

// 5. Loan Status Changed Trigger
export const onLoanStatusChanged = functions.firestore
  .document("loanApplications/{loanId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (!newData || !oldData) return;

    if (oldData.status !== newData.status) {
      const { userId, amount, status, bank, referenceNumber } = newData;
      let title = "Agro Loan Status Update";
      let body = `Your loan request status changed to ${status}.`;

      if (status === "approved") {
        title = "🎉 Loan Approved!";
        body = `Congratulations! Your loan of ₹${amount} from ${bank} is approved. Reference: ${referenceNumber}`;
      } else if (status === "rejected") {
        title = "❌ Loan Application Update";
        body = `We regret to inform you that your loan application has been rejected. Tap to review why.`;
      }

      await sendToUser(userId, title, body, {
        type: "loan_status",
        loanId: context.params.loanId,
        status,
      });
    }
  });

// 6. Government Scheme Trigger
export const onSchemeAdded = functions.firestore
  .document("government_schemes/{schemeId}")
  .onCreate(async (snap, context) => {
    const schemeData = snap.data();
    if (!schemeData) return;

    const { title, description, category } = schemeData;
    const alertTitle = `🆕 New Scheme: ${title}`;

    await sendToTopic("all_users", alertTitle, description, {
      type: "government_schemes",
      schemeId: context.params.schemeId,
      category,
    });
  });

// 7. Breaking News Trigger
export const onNewsAdded = functions.firestore
  .document("breaking_news/{newsId}")
  .onCreate(async (snap, context) => {
    const newsData = snap.data();
    if (!newsData) return;

    const { title, summary } = newsData;

    await sendToTopic("all_users", `📰 Breaking News: ${title}`, summary, {
      type: "breaking_news",
      newsId: context.params.newsId,
    });
  });

// 8. User Inactivity Cron Job (Runs daily to find users inactive > 24 hours)
export const checkUserInactivity = functions.pubsub
  .schedule("0 18 * * *")
  .onRun(async (context) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const snapshot = await db
      .collection("users")
      .where("lastActive", "<", admin.firestore.Timestamp.fromDate(cutoff))
      .get();

    const promises: Promise<void>[] = [];
    snapshot.forEach((doc) => {
      const userId = doc.id;
      const title = "🤖 AI Agro Assistant";
      const body = "Need help with fertilizer selection or crop rotation? Chat with your AI Agro Assistant now!";
      promises.push(
        sendToUser(userId, title, body, {
          type: "ai_chat",
        })
      );
    });

    await Promise.all(promises);
  });
