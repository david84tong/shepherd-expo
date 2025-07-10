import { appLog } from '~/app/helper/helper';
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// This function will run every day at 8:00 AM UTC.
// You can change the schedule by modifying the string below.
// See: https://firebase.google.com/docs/functions/schedule-functions
export const sendDailyVerseUpdate = functions.pubsub
  .schedule("every day 08:00")
  .onRun(async (context) => {
    appLog("Running daily verse update function...");

    //
    // --- 1. Determine the Verse of the Day ---
    //
    // In the future, you can add logic here to fetch a specific
    // verse from your Firestore database based on the date.
    // For now, we will use a placeholder.
    const verseReference = "John 11:35";
    appLog(`Determined verse of the day: ${verseReference}`);

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
      appLog("Sending silent push notification to topic 'daily-verse'...");
      await admin.messaging().send(payload);
      appLog("Successfully sent message.");
      return null;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  });