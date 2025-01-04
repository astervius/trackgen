const appPrefix = 'TrackGen';
const appVersion = 'v1.0.8';
const cacheName = `${appPrefix}-${appVersion}`;
const foldersToCache = ['media', 'js', 'css'];
const additionalCache = ['/', 'manifest.json', 'index.html'];

let filesToCache = [];

async function generateFilesToCache() {
    filesToCache = [];

    for (const folder of foldersToCache) {
        try {
            const response = await fetch(`/${folder}/`);
            if (!response.ok) {
                console.error(`Failed to fetch ${folder} folder: ${response.statusText}`);
                continue;
            }
            const folderFiles = await response.text();
            const regex = /href="([^"]+\.(png|jpg|jpeg|jxl|webp|js|css))"/g;
            let match;

            while ((match = regex.exec(folderFiles)) !== null) {
                if (match[1] !== 'bg16383.webp') {
                    filesToCache.push(`/${folder}/${match[1]}`);
                }
            }
        } catch (error) {
            console.error(`Error fetching files from ${folder}:`, error);
        }
    }

    filesToCache.push(...additionalCache);
    return filesToCache;
}

function isCachable(request) {
    const url = new URL(request.url);
    return filesToCache && url.origin === location.origin && filesToCache.includes(url.pathname);
}

async function cacheFirstWithRefresh(request) {
    try {
        const fetchResponsePromise = fetch(request).then(async networkResponse => {
            if (networkResponse.ok) {
                const cache = await caches.open(cacheName);
                cache.put(request, networkResponse.clone());
            }
            console.log(`Fetched URL ${request.url} from network.`);
            return networkResponse;
        });

        return Promise.race([
            fetchResponsePromise,
            caches.match(request)
        ]);
    } catch (error) {
        console.error(`Failed to fetch ${request.url} from cache or network.`);
        throw error;
    }
}

self.addEventListener('install', event => {
    event.waitUntil(
        generateFilesToCache().then(files => {
            return caches.open(cacheName).then(cache => {
                return cache.addAll(files);
            });
        }).catch(error => {
            console.error('Failed to generate files to cache:', error);
        })
    );
});

self.addEventListener("fetch", async (event) => {
    const request = event.request;

    if (isCachable(request)) {
        event.respondWith(cacheFirstWithRefresh(request));
    } else {
        event.respondWith(fetch(request));
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => {
                    return name.startsWith(appPrefix) && name !== cacheName;
                }).map(name => {
                    return caches.delete(name);
                })
            );
        })
    );
});
