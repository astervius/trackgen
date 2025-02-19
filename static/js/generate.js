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
            currentMap: null
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
        this.preloadMaps();

        this.setupEventListeners();
    }

    preloadMaps() {
        const preloadCache = new Map();

        Object.entries(this.config.mapUrls).forEach(([key, url]) => {
            const img = new Image();
            img.src = url;
            preloadCache.set(key, img);
        });

        this.preloadCache = preloadCache;
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
        this.hideLoader();
        this.updateStatus('success');

        Array.from(this.elements.mapSelector.options)
            .filter(opt => opt.value.startsWith('blob:') && !this.customMapURLs.has(opt.value))
            .forEach(opt => opt.remove());
    }

    handleMapError(error) {
        console.error('Yikes. Something went wrong.', error);
        this.hideLoader();
        this.updateStatus('error');
    }

    loadMap(size) {
        const mapUrl = this.getMapUrl(size);
        if (mapUrl !== this.state.currentMap) {
            this.state.currentMap = mapUrl;
            this.blueMarble.src = mapUrl;
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
            let lat = FULL_HEIGHT / 2 - ((tmpLat % 90) * (point.latitude.endsWith("S") ? -1 : 1) * FULL_HEIGHT) / 180;
            let lng = FULL_WIDTH / 2 - ((tmpLong % 180) * (point.longitude.endsWith("E") ? -1 : 1) * FULL_WIDTH) / 360;

            if (Math.floor(tmpLat / 90) % 2 === 1) lat -= FULL_HEIGHT / 2;
            if (Math.floor(tmpLong / 180) % 2 === 1) lng -= FULL_WIDTH / 2;

            return { ...point, latitude: lat, longitude: lng };
        });

        let [minLat, maxLat, minLng, maxLng] = processedData.reduce(
            ([minL, maxL, minLn, maxLn], { latitude, longitude }) => [
                Math.min(minL, latitude),
                Math.max(maxL, latitude),
                Math.min(minLn, longitude),
                Math.max(maxLn, longitude),
            ],
            [Infinity, -Infinity, Infinity, -Infinity]
        );

        let top = minLat - (FULL_HEIGHT * 5) / 180;
        let bottom = maxLat + (FULL_HEIGHT * 5) / 180;
        let left = minLng - (FULL_WIDTH * 5) / 360;
        let right = maxLng + (FULL_WIDTH * 5) / 360;

        if (right - left < (FULL_HEIGHT * 45) / 180) {
            const padding = ((FULL_HEIGHT * 45) / 180 - (right - left)) / 2;
            left -= padding;
            right += padding;
        }

        if (right - left < bottom - top) {
            const padding = ((bottom - top) - (right - left)) / 2;
            left -= padding;
            right += padding;
        }

        if (bottom - top < (right - left) / 1.618033988749894) {
            const padding = ((right - left) / 1.618033988749894 - (bottom - top)) / 2;
            top -= padding;
            bottom += padding;
        }

        left = Math.max(0, left);
        right = Math.min(FULL_WIDTH, right);
        top = Math.max(0, top);
        bottom = Math.min(FULL_HEIGHT, bottom);

        const width = right - left;
        const height = bottom - top;

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(
            mapManager.blueMarble,
            left, top,
            width, height,
            0, 0,
            width, height
        );

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
        ctx.beginPath();
        Object.values(namedTracks).forEach(track => {
            if (track.length < 1) return;
            ctx.moveTo(track[0].longitude, track[0].latitude);
            track.slice(1).forEach(p => ctx.lineTo(p.longitude, p.latitude));
        });
        ctx.stroke();

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

                switch (shape) {
                    case 'triangle':
                        const side = DOT_SIZE * Math.sqrt(3);
                        const bis = side * (Math.sqrt(3) / 2);
                        ctx.moveTo(x, y - (2 * bis) / 3);
                        ctx.lineTo(x - side / 2, y + bis / 3);
                        ctx.lineTo(x + side / 2, y + bis / 3);
                        ctx.closePath();
                        break;

                    case 'square':
                        const size = DOT_SIZE / Math.sqrt(2);
                        ctx.rect(x - size, y - size, 2 * size, 2 * size);
                        break;

                    case 'circle':
                        ctx.arc(x, y, DOT_SIZE, 0, 2 * Math.PI);
                        break;
                }

                ctx.fill();
            });
        });

        output.src = canvas.toDataURL();
        loader.classList.add("hidden");
        closeButton.classList.remove("hidden");
        output.classList.remove("hidden");
    }).catch((error) => {
        console.error("Error generating map:", error);
        loader.classList.add("hidden");
    });
}