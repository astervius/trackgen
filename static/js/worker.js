self.onmessage = async function (e) {
    const { url } = e.data;

    try {
        // checking from cache first
        const cache = await caches.open('map-cache');
        let response = await cache.match(url);

        if (!response) {
            // if not in cache, fetch from network
            response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // store in cache
            await cache.put(url, response.clone());
        }

        const blob = await response.blob();
        const blueMarble = await createImageBitmap(blob);

        self.postMessage({
            status: 'success',
            blueMarble: blueMarble
        }, [blueMarble]);
    } catch (error) {
        self.postMessage({
            status: 'error',
            error: error.message || 'Zamn! Something went wrong.'
        });
    }
};
