// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     addResourcesToCache([
//       "/sw-test/",
//       "/sw-test/index.html",
//       "/sw-test/style.css",
//       "/sw-test/app.js",
//       "/sw-test/image-list.js",
//       "/sw-test/star-wars-logo.jpg",
//       "/sw-test/gallery/bountyHunters.jpg",
//       "/sw-test/gallery/myLittleVader.jpg",
//       "/sw-test/gallery/snowTroopers.jpg",
//     ])
//   );
// });
const putInCache = async (request, response) => {
  const cache = await caches.open("v1");
  await cache.put(request, response);
}

const cacheFirst = async (request) => {
  const shouldExport = new URL(request.url).searchParams.get('exportwindow') || null;
  const responseFromCache = await caches.match(request);
  if (responseFromCache) {
    return responseFromCache;
  }
  const responseFromNetwork = await fetch(request);
  if (shouldExport) {
    const text = `${await responseFromNetwork.clone().text()};;;\n\nexport default window.${shouldExport}`
    let newResponse = new Response(text, {
      headers: responseFromNetwork.headers
    })
    // putInCache(request, responseFromNetwork.clone())
    return newResponse;
  } else {
    putInCache(request, responseFromNetwork.clone())
    return responseFromNetwork;  
  }
};

self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).origin === 'https://unpkg.com') {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(fetch(event.request));
  }
});