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
    if (!speed || fromUnit === toUnit) return speed;

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
            const normalizedData = normalizeImportData(data);

            if (normalizedData.length === 1) {
                // if single track, import directly
                if (validateImportData(normalizedData[0])) {
                    await importPoints(normalizedData[0]);
                    console.log(SUCCESS_MESSAGES.import, normalizedData[0]);
                }
            } else if (normalizedData.length > 1) {
                // if multiple tracks, show selector
                showTrackSelector(normalizedData);
            }
        } catch (error) {
            console.error('Zamn! Error importing data:', error);
            alert('Failed to import data. Please check the file format; it should be a valid JSON file.');
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

// normalize the imported data to a standard format
function normalizeImportData(data) {
    // new format - multiple tracks
    if (data && data.tracks && Array.isArray(data.tracks)) {
        return data.tracks;
    }
    // old format - single array
    else if (Array.isArray(data)) {
        return [data];
    }

    throw new Error('Invalid data format: expected an array or an object with a "tracks" property.');
}

// so we can validate the imported data
function validateImportData(data) {
    if (!Array.isArray(data) || !data.length) {
        throw new Error('Invalid data: expected a non-empty array');
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

// show track selector when multiple tracks are found
function showTrackSelector(tracks) {
    const existingSelector = document.getElementById('track-selector-container');
    if (existingSelector) {
        existingSelector.remove();
    }

    // selector container
    const container = document.createElement('div');
    container.id = 'track-selector-container';
    container.style.cssText = 'background: color-mix(in srgb, #fff 90%, var(--background-1)); border-radius: .2rem; box-shadow: 0 0 10px rgba(0,0,0,0.3);' +
        'left: 50%; padding: 1rem; max-height: 80%; max-width: 80%; overflow-y: auto;' +
        'position: fixed; top: 50%; transform: translate(-50%, -50%); z-index: 1000;';

    // header
    const header = document.createElement('h3');
    header.textContent = 'Select track to import';
    header.style.fontWeight = 'normal';
    header.style.fontFamily = 'cursive';
    header.style.margin = '0 0 .75rem 0';
    container.appendChild(header);

    // track options
    tracks.forEach((track, index) => {
        const trackOption = document.createElement('div');
        trackOption.style.cssText = 'border: .1rem solid rgb(221, 221, 221); border: .1rem solid rgb(221, 221, 221); border-radius: .1rem; ' +
            'cursor: pointer; display: flex; font-family: cursive; justify-content: space-between; margin: .1rem 0; padding: .5rem; ';

        // track info
        const trackInfo = document.createElement('div');
        const trackName = track[0]?.name || `Track ${index + 1}`;
        trackInfo.textContent = `${trackName} (${track.length} points)`;
        trackOption.appendChild(trackInfo);

        // import button
        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import';
        importBtn.style.cssText = 'background: #4CAF50; border: none; border-radius: .2rem;' +
            'color: #fff; cursor: pointer; padding: .1rem .4rem';
        importBtn.onclick = async (e) => {
            e.stopPropagation();
            container.remove();
            if (validateImportData(track)) {
                await importPoints(track);
                console.log(SUCCESS_MESSAGES.import, track);
            }
        };
        trackOption.appendChild(importBtn);

        container.appendChild(trackOption);
    });

    // close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Cancel';
    closeButton.style.cssText = 'background: #f44336; border: none; border-radius: .1rem; ' +
        'cursor: pointer; margin-top: .5rem; padding: .5rem; width: 100%';
    closeButton.onclick = () => container.remove();
    container.appendChild(closeButton);

    document.body.appendChild(container);
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