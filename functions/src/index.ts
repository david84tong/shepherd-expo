//import { appLog } from '~/app/helper/helper';
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// This function will run every day at 8:00 AM UTC.
// You can change the schedule by modifying the string below.
// See: https://firebase.google.com/docs/functions/schedule-functions
export const sendDailyVerseUpdate = functions.pubsub
  .schedule("every day 08:00")
  .onRun(async (context) => {
    console.log("Running daily verse update function...");

    //
    // --- 1. Determine the Verse of the Day ---
    //
    // In the future, you can add logic here to fetch a specific
    // verse from your Firestore database based on the date.
    // For now, we will use a placeholder.
    const verseReference = "John 11:35";
    console.log(`Determined verse of the day: ${verseReference}`);

    //
    // --- 2. Construct the Silent Push Notification ---
    //
    // This is a "silent" notification. It will not be shown to the user.
    // The 'content-available: "1"' flag tells iOS to wake up our app
    // in the background to perform a task.
    const payload = {
      // The `apns` key is specific to Apple Push Notification service
      apns: {
        payload: {
          aps: {
            "content-available": 1,
          },
        },
      },
      // We send the verse reference in the data payload so the app
      // knows what to fetch.
      data: {
        verseReference: verseReference,
      },
      // We send this to a "topic" that all users will be subscribed to.
      topic: "daily-verse",
    };

    //
    // --- 3. Send the Notification ---
    //
    try {
      console.log("Sending silent push notification to topic 'daily-verse'...");
      await admin.messaging().send(payload);
      console.log("Successfully sent message.");
      return null;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  });

// Cloud function to send nudge notifications between prayer buddies
export const sendPrayerBuddyNudge = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { targetUserId } = data;
  const senderUserId = context.auth.uid;

  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required');
  }

  try {
    // Get sender and target user documents
    const [senderDoc, targetDoc] = await Promise.all([
      admin.firestore().collection('users').doc(senderUserId).get(),
      admin.firestore().collection('users').doc(targetUserId).get()
    ]);

    if (!senderDoc.exists || !targetDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const senderData = senderDoc.data();
    const targetData = targetDoc.data();

    // Verify they are friends
    const friendship = await admin.firestore()
      .collection('friends')
      .where('userId', '==', senderUserId)
      .where('friendId', '==', targetUserId)
      .where('status', '==', 'accepted')
      .get();

    const reverseFriendship = await admin.firestore()
      .collection('friends')
      .where('userId', '==', targetUserId)
      .where('friendId', '==', senderUserId)
      .where('status', '==', 'accepted')
      .get();

    if (friendship.empty && reverseFriendship.empty) {
      throw new functions.https.HttpsError('permission-denied', 'Users are not friends');
    }

    // Check if target user has FCM token
    if (!targetData?.fcmToken) {
      throw new functions.https.HttpsError('unavailable', 'Target user has no notification token');
    }

    // Construct the notification
    const payload = {
      token: targetData.fcmToken,
      notification: {
        title: '🐑 Prayer Buddy Nudge',
        body: `${senderData?.displayName || senderData?.username || 'Your prayer buddy'} sent you a gentle nudge to join them in prayer!`,
      },
      data: {
        type: 'prayer_buddy_nudge',
        senderUserId: senderUserId,
        senderName: senderData?.displayName || senderData?.username || 'Prayer Buddy',
        timestamp: Date.now().toString(),
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#F7B500',
          sound: 'default',
          channelId: 'prayer-buddy-nudges',
        },
      },
    };

    // Send the notification
    await admin.messaging().send(payload);

    // Log the nudge for analytics
    console.log(`Prayer buddy nudge sent from ${senderUserId} to ${targetUserId}`);

    return {
      success: true,
      message: 'Nudge sent successfully',
    };
  } catch (error) {
    console.error('Error sending prayer buddy nudge:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send nudge');
  }
});