declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  function sendNotification(
    subscription: PushSubscription,
    payload: string
  ): Promise<{ statusCode: number; body: string }>;

  export { setVapidDetails, sendNotification, PushSubscription };
}
