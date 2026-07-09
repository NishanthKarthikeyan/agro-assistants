import OneSignal from 'react-onesignal';
import toast from 'react-hot-toast';

let oneSignalInitialized = false;

export const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || appId === 'YOUR_ONESIGNAL_APP_ID') {
    console.log('OneSignal App ID is not set. Using browser HTML5 Notification API for client-side alerts.');
    // Request local notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return;
  }

  try {
    await OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
      welcomeNotification: {
        disable: false,
        title: 'AI Agro Assistant',
        message: 'Welcome to AI Agro Assistant! You will receive live updates.'
      },
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: 'push',
              autoPrompt: true,
              text: {
                actionMessage: 'We would like to show you real-time updates for crop disease predictions and price alerts.',
                acceptButton: 'Allow',
                cancelButton: 'Maybe Later'
              },
              delay: {
                pageViews: 1,
                timeDelay: 5
              }
            }
          ]
        }
      }
    });
    oneSignalInitialized = true;
    console.log('OneSignal initialized successfully.');
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
  }
};

export const loginOneSignalUser = async (uid) => {
  if (oneSignalInitialized) {
    try {
      await OneSignal.login(uid);
      console.log(`User ${uid} logged into OneSignal`);
    } catch (e) {
      console.warn('OneSignal login failed:', e);
    }
  }
};

export const logoutOneSignalUser = async () => {
  if (oneSignalInitialized) {
    try {
      await OneSignal.logout();
    } catch (e) {
      console.warn('OneSignal logout failed:', e);
    }
  }
};

// Send / display a notification instantly
export const triggerNotification = (title, body) => {
  // 1. Show dynamic in-app toast notification
  toast(body, {
    icon: '🔔',
    duration: 5000,
    style: {
      borderRadius: '16px',
      background: '#1e293b',
      color: '#fff',
      fontWeight: '600',
    }
  });

  // 2. Browser native push notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌿</text></svg>'
      });
    } catch (e) {
      console.warn('Native notification failed, service worker fallback needed:', e);
      // Fallback via Service Worker registration
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌿</text></svg>'
        });
      });
    }
  }
};
