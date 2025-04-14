import PusherServer from 'pusher';

// Ensure environment variables are loaded
const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

let pusherServer: PusherServer | null = null;

if (!appId || !key || !secret || !cluster) {
  console.warn('⚠️ Pusher environment variables are not set! Real-time updates will not work.');
  console.warn('Required variables: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER');
} else {
  try {
    pusherServer = new PusherServer({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    console.log('✅ Pusher server initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Pusher server:', error);
  }
}

export { pusherServer };
