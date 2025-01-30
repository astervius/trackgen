const SPEED_CONVERSION = {
    mph: 1.151,
    kph: 1.852,
    kt: 1
};

const SUCCESS_MESSAGES = {
    export: 'Data successfully exported',
    download: 'Storm data downloaded',
    import: 'Data successfully imported'
};

// for speed conversions
function convertSpeed(speed, fromUnit, toUnit = 'knots') {
    if (!speed) return speed;
    if (fromUnit === toUnit) return speed;

    if (toUnit === 'knots') {
        return Math.round(speed / SPEED_CONVERSION[fromUnit]);
    } else {
        return Math.round(speed * SPEED_CONVERSION[toUnit]);
    }
}

// to safely get the selected value
function getSelectedValue(element, attribute = 'data-selected') {
    return element?.getAttribute(attribute)?.replace('°', '') || '';
}

// ta-da! the main export function
function exportData() {
    try {
        const points = Array.from(document.querySelectorAll("#inputs .point"))
            .map(point => {
                const els = {
                    latInput: point.querySelector("input.latitude"),
                    lonInput: point.querySelector("input.longitude"),
                    speedInput: point.querySelector("input.speed"),
                    latSelect: point.querySelector("select.latitude"),
                    lonSelect: point.querySelector("select.longitude"),
                    speedSelect: point.querySelector("select.speed"),
                    stageElement: point.querySelector(".stage"),
                    nameElement: point.querySelector(".name")
                };

                const speed = parseFloat(els.speedInput.value);
                const unit = getSelectedValue(els.speedSelect, 'data-selected');

                return {
                    name: els.nameElement.value?.trim(),
                    latitude: els.latInput.value + getSelectedValue(els.latSelect),
                    longitude: els.lonInput.value + getSelectedValue(els.lonSelect),
                    speed: convertSpeed(speed, unit),
                    stage: els.stageElement.value || els.stageElement.getAttribute("data-selected")
                };
            });

        console.log(SUCCESS_MESSAGES.export, points);
        return points;
    } catch (error) {
        console.error('Zamn! Error exporting data:', error);
        throw new Error('Failed to export data. Please check the input values.');
    }
}

// download the track data
async function downloadTrackData(format = 'json') {
    try {
        const stormName = document.querySelector(".name").value?.trim() || 'storm_data';
        const data = exportData();

        // validate the data before creating a blob
        if (!Array.isArray(data) || !data.length) {
            throw new Error('No valid data to export');
        }

        let content;
        let fileExtension;
        let mimeType;

        if (format === 'hurdat') {
            content = generateHURDATString(data);
            fileExtension = 'txt';
            mimeType = 'text/plain';
        } else {
            const shouldCompress = document.querySelector("#compress-json")?.checked;
            content = JSON.stringify(data, null, shouldCompress ? 0 : 2);
            fileExtension = 'json';
            mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        try {
            const a = document.createElement("a");
            a.href = url;
            a.download = `${stormName}.${fileExtension}`;
            a.click();
            console.log(SUCCESS_MESSAGES.download);
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Zamn! Error downloading data:', error);
        alert('Failed to download data. Please try again.');
    }
}

// basic import functionality
async function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.addEventListener("change", async () => {
        try {
            const file = input.files?.[0];
            if (!file) return;

            const data = await readFileAsJSON(file);
            if (validateImportData(data)) {
                await importPoints(data);
                console.log(SUCCESS_MESSAGES.import, data);
            }
        } catch (error) {
            console.error('Zamn! Error importing data:', error);
            alert('Failed to import data. Please check the file format.');
        }
    });

    input.click();
}

// read our file as JSON
function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                resolve(JSON.parse(reader.result));
            } catch (error) {
                reject(new Error('Invalid JSON format'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// so we can validate the imported data
function validateImportData(data) {
    if (!Array.isArray(data) || !data.length) {
        throw new Error('Invalid data format');
    }

    const requiredFields = ['name', 'latitude', 'longitude', 'speed', 'stage'];
    data.forEach((point, index) => {
        requiredFields.forEach(field => {
            if (!(field in point)) {
                throw new Error(`Missing ${field} in point ${index + 1}`);
            }
        });
    });

    return true;
}

// import the points into the form
async function importPoints(data) {
    const inputs = document.querySelector("#inputs");
    let newInputs = document.querySelector(".point");

    function populatePoint(pointData, pointElement) {
        // storm name
        pointElement.querySelector(".name").value = pointData.name;

        // latitude and longitude
        const latInput = pointElement.querySelector("input.latitude");
        const latSelect = pointElement.querySelector("select.latitude");
        const lat = pointData.latitude;
        latInput.value = lat.replace(/[NS]$/, '');
        latSelect.selectedIndex = lat.endsWith('S') ? 1 : 0;
        latSelect.setAttribute("data-selected", lat.slice(-1));

        const lonInput = pointElement.querySelector("input.longitude");
        const lonSelect = pointElement.querySelector("select.longitude");
        const lon = pointData.longitude;
        lonInput.value = lon.replace(/[EW]$/, '');
        lonSelect.selectedIndex = lon.endsWith('W') ? 1 : 0;
        lonSelect.setAttribute("data-selected", lon.slice(-1));

        // storm speed
        const speedInput = pointElement.querySelector("input.speed");
        const speedSelect = pointElement.querySelector("select.speed");
        const unit = getSelectedValue(speedSelect);
        speedInput.value = convertSpeed(pointData.speed, 'knots', unit);

        // storm category
        const stageSelect = pointElement.querySelector(".stage");
        stageSelect.value = pointData.stage;
        stageSelect.setAttribute("data-selected", pointData.stage);

        if (typeof handle_removal === 'function') {
            handle_removal(pointElement.querySelector(".remove"));
        }
    }

    // first point
    populatePoint(data[0], newInputs);

    // remaining points
    const fragment = document.createDocumentFragment();
    for (let i = 1; i < data.length; i++) {
        const clonedInputs = newInputs.cloneNode(true);
        populatePoint(data[i], clonedInputs);
        fragment.appendChild(clonedInputs);
    }
    inputs.appendChild(fragment);

    // scroll to the last point
    const lastPoint = inputs.lastElementChild;
    if (lastPoint) {
        lastPoint.scrollIntoView({ behavior: 'smooth' });
    }
}

document.querySelector("#export-data")?.addEventListener("click", () => {
    const options = document.querySelector("#export-options");
    options.classList.toggle("show");
});

document.querySelector("#export-standard")?.addEventListener("click", async () => {
    const options = document.querySelector("#export-options");
    options.classList.remove("show");
    await downloadTrackData('json');
});

document.querySelector("#export-hurdat")?.addEventListener("click", async () => {
    const options = document.querySelector("#export-options");
    options.classList.remove("show");
    await downloadTrackData('hurdat');
});

document.querySelector("#import-data")?.addEventListener("click", importData);