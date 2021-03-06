const staticCacheName = 'UltimateCurrencyConverter-static-v4';

const filesToCache = [
  '/',
  './index.html',
  './assets/js/appcontroller.js',
  './assets/js/tweak.js',
  './assets/js/bootstrap.js',
  './assets/js/bootstrap.min.js',
  './assets/css/ux.css',
  './assets/css/minified.css',
  './assets/css/bootstrap.css',
  './assets/css/bootstrap.min.css'
];

self.addEventListener('install', function(event) {
    console.log('Installing service worker.');
    event.waitUntil(
      caches.open(staticCacheName).then(function(cache) {
        console.log('service worker installed successfully.');
        return cache.addAll(filesToCache);
      }).catch(error => console.log('install '+error))
    );
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  self.addEventListener('activate', function(event) {
    console.log('service worker activated successfully');
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.filter(function(cacheName) {
             // console.log(cacheName);
            return cacheName.startsWith('UltimateCurrencyConverter-') && staticCacheName !== cacheName;
          }).map(function(cacheName) {
            if(staticCacheName !== cacheName){
                return caches.delete(cacheName);
                //console.log(cacheName);
            }
          })
        );
      }).catch(error => console.log(error))
    );
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  self.addEventListener('fetch', function(event) {
    let requestUrl = new URL(event.request.url);
    
    // loading the index page from cache when wizard at on the browser.
    if (requestUrl.origin === location.origin) {
      if (requestUrl.pathname === '/') {
        caches.match(event.request).then(response => {
          if (response) {
            // respond with the index page skeleton in cache
             event.respondWith(caches.match('/index.html'));
             return;
          }
        });
      }
    }
   
    // responding to any other request on the page.
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(error => {
        return error;
      })
    );

  });