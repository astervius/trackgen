function catToColour(cat = -999, accessible = true) {
    const colorMap = new Map([
        [-999, "#C0C0C0"],
        [-2, accessible ? "#6ec1ea" : "#5EBAFF"],
        [-1, accessible ? "#4dffff" : "#00FAF4"],
        [1, accessible ? "#ffffD9" : "#FFFFCC"],
        [2, accessible ? "#ffd98c" : "#FFE775"],
        [3, accessible ? "#ff9e59" : "#FFC140"],
        [4, accessible ? "#ff738a" : "#FF8F20"],
        [5, accessible ? "#a188fc" : "#FF6060"],
    ]);
    return colorMap.get(cat) || "#C0C0C0";
}

document.querySelector("#close").addEventListener("click", () => {
    document.querySelector("#image-container").classList.add("hidden");
    if (mapManager) {
        mapManager.hideLoader();
        mapManager.state.loading = false;
    }
});

class MapManager {
    constructor() {
        this.config = {
            mapUrls: {
                "xlarge": "static/media/bg16383.webp",
                "large-nxtgen": "static/media/bg21600-nxtgen.jpg",
                "large": "static/media/bg12000.jpg",
                "blkmar": "static/media/bg13500-blkmar.jpg",
                "normal": "static/media/bg8192.png",
            },
            selectors: {
                mapIndicator: "#map-indicator",
                loader: "#map-indicator .loader",
                statusIcon: "#map-indicator ion-icon",
                buttons: ".generate",
                mapSelector: "#map-selector"
            },
            states: {
                success: "#70c542"
            }
        };

        this.state = {
            loaded: false,
            loading: false,
            currentMap: null,
            mapCache: new Map()
        };

        this.elements = {
            loader: document.querySelector(this.config.selectors.loader),
            buttons: document.querySelectorAll(this.config.selectors.buttons),
            mapSelector: document.getElementById(this.config.selectors.mapSelector.slice(1)),
            statusIcon: document.querySelector(this.config.selectors.statusIcon)
        };

        this.blueMarble = new Image();
        this.blueMarble.crossOrigin = "anonymous";

        this.customMapURLs = new Set();

        this.handleMapChange = this.handleMapChange.bind(this);
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.handleMapLoad = this.handleMapLoad.bind(this);
        this.handleMapError = this.handleMapError.bind(this);

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.mapSelector.addEventListener('change', this.handleMapChange);

        this.elements.buttons.forEach(button => {
            button.addEventListener("click", () => {
                this.handleButtonClick(button.dataset.size);
            });
        });

        this.blueMarble.addEventListener('load', this.handleMapLoad);
        this.blueMarble.addEventListener('error', this.handleMapError);

        const customUpload = document.getElementById('custom-map-upload');
        if (customUpload) {
            customUpload.addEventListener('change', (e) => this.handleCustomMapUpload(e));
        }
    }

    handleCustomMapUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            event.target.value = '';
            return;
        }

        this.clearCustomMaps();

        const objectURL = URL.createObjectURL(file);
        this.customMapURLs.add(objectURL);

        const option = new Option(file.name, objectURL);
        this.elements.mapSelector.add(option);
        this.elements.mapSelector.value = objectURL;

        this.config.mapUrls[objectURL] = objectURL;
        this.loadMap(objectURL);
    }

    clearCustomMaps() {
        Array.from(this.elements.mapSelector.options)
            .filter(opt => this.customMapURLs.has(opt.value))
            .forEach(opt => opt.remove());

        this.customMapURLs.forEach(url => URL.revokeObjectURL(url));
        this.customMapURLs.clear();
    }

    handleMapChange() {
        const size = document.querySelector(this.config.selectors.buttons).dataset.size;
        this.loadMap(size);
    }

    handleButtonClick(size) {
        this.loadMap(size);
        this.showLoader();
    }

    handleMapLoad() {
        this.state.loaded = true;
        this.state.loading = false;
        this.hideLoader();
        this.updateStatus('success');

        Array.from(this.elements.mapSelector.options)
            .filter(opt => opt.value.startsWith('blob:') && !this.customMapURLs.has(opt.value))
            .forEach(opt => opt.remove());
    }

    handleMapError(error) {
        this.state.loading = false;
        console.error('Yikes. Something went wrong.', error);
        this.hideLoader();
        this.updateStatus('error');
    }

    loadMap(size) {
        const mapUrl = this.getMapUrl(size);

        if (mapUrl !== this.state.currentMap) {
            this.state.loaded = false;
            this.state.loading = true;
            this.state.currentMap = mapUrl;

            if (this.state.mapCache.has(mapUrl)) {
                this.blueMarble = this.state.mapCache.get(mapUrl);
                this.state.loaded = true;
                this.state.loading = false;
                this.hideLoader();
                this.updateStatus('success');
            } else {
                this.showLoader();
                this.blueMarble = new Image();
                this.blueMarble.crossOrigin = "anonymous";
                this.blueMarble.addEventListener('load', this.handleMapLoad);
                this.blueMarble.addEventListener('error', this.handleMapError);
                this.blueMarble.src = mapUrl;

                this.state.mapCache.set(mapUrl, this.blueMarble);
            }
        }
    }

    getMapUrl(size) {
        const { selectedIndex, options } = this.elements.mapSelector;
        const mapType = options[selectedIndex].value;
        return this.config.mapUrls[mapType] || this.config.mapUrls[size];
    }

    showLoader() {
        this.elements.loader.style.display = "block";
    }

    hideLoader() {
        this.elements.loader.style.display = "none";
    }

    updateStatus(status) {
        const color = status === 'success' ? this.config.states.success : 'red';
        this.elements.statusIcon.style.color = color;
    }
}

// Usage
const mapManager = new MapManager();

function normalizeLongitude(lng) {
    return ((lng + 180) % 360 + 360) % 360 - 180;
}

function createMap(data, accessible) {
    const output = document.querySelector("#output");
    const loader = document.querySelector("#loader");
    const closeButton = document.querySelector("#close");
    const imageContainer = document.querySelector("#image-container");
    const smallerDotsCheckbox = document.getElementById("smaller-dots");

    closeButton.classList.add("hidden");
    output.classList.add("hidden");
    loader.classList.remove("hidden");
    imageContainer.classList.remove("hidden");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    new Promise((resolve) => {
        const checkLoaded = () => {
            if (mapManager.state.loaded) {
                resolve();
            } else {
                setTimeout(checkLoaded, 100);
            }
        };
        checkLoaded();
    }).then(() => {
        const FULL_WIDTH = mapManager.blueMarble.width;
        const FULL_HEIGHT = mapManager.blueMarble.height;

        const DOT_SIZE = (() => {
            let size = (0.29890625 / 360) * FULL_WIDTH;
            if (smallerDotsCheckbox.checked) {
                size *= 2.35 / Math.PI;
            }
            return size;
        })();
        const LINE_SIZE = (() => {
            let size = (0.09 / 360) * FULL_WIDTH;
            if (smallerDotsCheckbox.checked) {
                size *= 1.5 / Math.PI;
            }
            return size;
        })();

        const processedData = data.map((point) => {
            const tmpLat = Number(point.latitude.slice(0, -1));
            const tmpLong = Number(point.longitude.slice(0, -1));
            const normLong = normalizeLongitude(tmpLong * (point.longitude.endsWith("E") ? 1 : -1));
            let lat = FULL_HEIGHT / 2 - ((tmpLat % 90) * (point.latitude.endsWith("S") ? -1 : 1) * FULL_HEIGHT) / 180;
            let lng = (normLong + 180) / 360 * FULL_WIDTH;

            if (Math.floor(tmpLat / 90) % 2 === 1) lat -= FULL_HEIGHT / 2;

            return { ...point, latitude: lat, longitude: lng, rawLongitude: normLong };
        });

        let minLat = Infinity, maxLat = -Infinity;
        let minRawLng = Infinity, maxRawLng = -Infinity;
        processedData.forEach(({ latitude, rawLongitude }) => {
            minLat = Math.min(minLat, latitude);
            maxLat = Math.max(maxLat, latitude);
            minRawLng = Math.min(minRawLng, rawLongitude);
            maxRawLng = Math.max(maxRawLng, rawLongitude);
        });

        const lngSpan = maxRawLng - minRawLng;
        const crossesIDL = lngSpan > 180;

        let centerLng, left, right, top, bottom;
        if (crossesIDL) {
            let sumLng = 0;
            processedData.forEach(p => {
                let lng = p.rawLongitude;
                if (lng - minRawLng > 180) lng -= 360;
                sumLng += lng;
            });
            centerLng = normalizeLongitude(sumLng / processedData.length);
            let centerX = (centerLng + 180) / 360 * FULL_WIDTH;

            const maxLngDist = Math.max(
                ...processedData.map(p => {
                    let delta = normalizeLongitude(p.rawLongitude - centerLng);
                    return Math.abs(delta) * FULL_WIDTH / 360;
                }),
                (FULL_HEIGHT * 45) / 180 / 2
            );

            left = centerX - maxLngDist - (FULL_WIDTH * 5) / 360;
            right = centerX + maxLngDist + (FULL_WIDTH * 5) / 360;
        } else {
            centerLng = (minRawLng + maxRawLng) / 2;
            left = (minRawLng + 180) / 360 * FULL_WIDTH - (FULL_WIDTH * 5) / 360;
            right = (maxRawLng + 180) / 360 * FULL_WIDTH + (FULL_WIDTH * 5) / 360;
        }

        top = minLat - (FULL_HEIGHT * 5) / 180;
        bottom = maxLat + (FULL_HEIGHT * 5) / 180;

        let width = right - left;
        let height = bottom - top;

        const minWidth = (FULL_HEIGHT * 45) / 180;
        if (width < minWidth) {
            const padding = (minWidth - width) / 2;
            left -= padding;
            right += padding;
            width = right - left;
        }

        if (width < height) {
            const padding = (height - width) / 2;
            left -= padding;
            right += padding;
            width = right - left;
        }

        if (height < width / 1.618033988749894) {
            const padding = (width / 1.618033988749894 - height) / 2;
            top -= padding;
            bottom += padding;
            height = bottom - top;
        }

        canvas.width = width;
        canvas.height = height;

        const mapWidth = FULL_WIDTH;
        let mapStartX = Math.floor(left / mapWidth) * mapWidth;
        while (mapStartX > left - mapWidth) mapStartX -= mapWidth;
        for (let offsetX = mapStartX; offsetX < right + mapWidth; offsetX += mapWidth) {
            const srcX = (offsetX % mapWidth + mapWidth) % mapWidth;
            const destX = offsetX - left;
            const drawWidth = Math.min(mapWidth - srcX, right - offsetX);
            if (drawWidth > 0 && destX < width) {
                ctx.drawImage(
                    mapManager.blueMarble,
                    srcX, top,
                    drawWidth, height,
                    destX, 0,
                    drawWidth, height
                );
            }
        }

        const adjustedData = processedData.map(p => ({
            ...p,
            latitude: p.latitude - top,
            longitude: p.longitude - left
        }));
        const namedTracks = adjustedData.reduce((acc, point) => {
            (acc[point.name] ??= []).push(point);
            return acc;
        }, {});

        ctx.lineWidth = LINE_SIZE;
        ctx.strokeStyle = "white";
        Object.values(namedTracks).forEach(track => {
            if (track.length < 1) return;

            track.forEach((point, index) => {
                ctx.beginPath();
                let prevX = point.longitude;
                let prevY = point.latitude;

                if (index === 0) {
                    ctx.moveTo(prevX, prevY);
                    return;
                }

                const prevPoint = track[index - 1];
                let currX = prevX;
                let currY = prevY;
                let rawDx = normalizeLongitude(point.rawLongitude - prevPoint.rawLongitude);

                if (Math.abs(rawDx) > 180) {
                    rawDx = rawDx > 0 ? rawDx - 360 : rawDx + 360;
                }

                currX = prevPoint.longitude + (rawDx * FULL_WIDTH / 360);

                ctx.moveTo(prevPoint.longitude, prevPoint.latitude);
                ctx.lineTo(currX, currY);

                if (crossesIDL) {
                    if (currX < 0) {
                        ctx.moveTo(prevPoint.longitude + FULL_WIDTH, prevPoint.latitude);
                        ctx.lineTo(currX + FULL_WIDTH, currY);
                    } else if (currX > width) {
                        ctx.moveTo(prevPoint.longitude - FULL_WIDTH, prevPoint.latitude);
                        ctx.lineTo(currX - FULL_WIDTH, currY);
                    }
                }

                ctx.stroke();
            });
        });

        const pointGroups = adjustedData.reduce((map, point) => {
            const key = `${catToColour(point.category, accessible)}|${point.shape}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(point);
            return map;
        }, new Map());

        pointGroups.forEach((points, key) => {
            const [color, shape] = key.split('|');
            ctx.fillStyle = color;

            points.forEach(({ longitude: x, latitude: y }) => {
                ctx.beginPath();

                const drawShape = (drawX) => {
                    switch (shape) {
                        case 'triangle':
                            const side = DOT_SIZE * Math.sqrt(3);
                            const bis = side * (Math.sqrt(3) / 2);
                            ctx.moveTo(drawX, y - (2 * bis) / 3);
                            ctx.lineTo(drawX - side / 2, y + bis / 3);
                            ctx.lineTo(drawX + side / 2, y + bis / 3);
                            ctx.closePath();
                            break;
                        case 'square':
                            const size = DOT_SIZE / Math.sqrt(2);
                            ctx.rect(drawX - size, y - size, 2 * size, 2 * size);
                            break;
                        case 'circle':
                            ctx.arc(drawX, y, DOT_SIZE, 0, 2 * Math.PI);
                            break;
                    }
                    ctx.fill();
                };

                drawShape(x);
                if (crossesIDL && (x - FULL_WIDTH >= 0 || x + FULL_WIDTH < width)) {
                    drawShape(x - FULL_WIDTH);
                    drawShape(x + FULL_WIDTH);
                }
            });
        });

        output.src = canvas.toDataURL();
        loader.classList.add("hidden");
        closeButton.classList.remove("hidden");
        output.classList.remove("hidden");

        // if map generation is successful, hide the loader icon
        mapManager.hideLoader();
        mapManager.state.loading = false;
    }).catch((error) => {
        console.error("Error generating map:", error);
        loader.classList.add("hidden");

        mapManager.hideLoader();
        mapManager.state.loading = false;
    });
}