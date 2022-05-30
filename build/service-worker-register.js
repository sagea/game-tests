

export async function setup () {
  await navigator.serviceWorker.register(
    '/service-worker.js',
    {
      scope: '/',
    }
  );
  return await navigator.serviceWorker.ready;
}