// For exporting manually inputted data from manual_input.js to a HURDAT file
// for storm categories
function getStatusCode(stage, speed) {
    const stageType = stage.toLowerCase();

    if (stageType.includes('extratropical')) {
        if (speed >= 34) return 'EX';
        return 'LO';
    }
    if (stageType.includes('subtropical')) {
        if (speed >= 34) return 'SS';
        return 'SD';
    }
    if (stageType.includes('tropical')) {
        if (speed >= 64) return 'HU';
        if (speed >= 34) return 'TS';
        if (speed >= 20) return 'TD';
        return 'DB';
    }
    return 'DB';
}

// for coordinates
function formatCoordinate(coord) {
    const value = parseFloat(coord.slice(0, -1));
    const direction = coord.slice(-1);
    return value.toFixed(1) + direction;
}

// for pressure calcs
const PRESSURE_TABLE = [
    { mph: 25, base: 1012, delta: 4 },
    { mph: 30, base: 1010, delta: 4 },
    { mph: 35, base: 1007, delta: 5 },
    { mph: 40, base: 1005, delta: 5 },
    { mph: 45, base: 1003, delta: 5 },
    { mph: 50, base: 1001, delta: 5 },
    { mph: 60, base: 997, delta: 6 },
    { mph: 65, base: 994, delta: 8 },
    { mph: 70, base: 992, delta: 8 },
    { mph: 75, base: 989, delta: 10 },
    { mph: 80, base: 986, delta: 10 },
    { mph: 85, base: 982, delta: 10 },
    { mph: 90, base: 978, delta: 10 },
    { mph: 100, base: 974, delta: 10 },
    { mph: 105, base: 969, delta: 10 },
    { mph: 110, base: 964, delta: 10 },
    { mph: 115, base: 960, delta: 12 },
    { mph: 120, base: 956, delta: 12 },
    { mph: 125, base: 952, delta: 12 },
    { mph: 130, base: 948, delta: 12 },
    { mph: 140, base: 944, delta: 12 },
    { mph: 145, base: 940, delta: 12 },
    { mph: 150, base: 936, delta: 12 },
    { mph: 155, base: 932, delta: 12 },
    { mph: 160, base: 928, delta: 12 },
    { mph: 165, base: 920, delta: 12 },
    { mph: 175, base: 910, delta: 12 },
    { mph: 180, base: 903, delta: 12 },
    { mph: 185, base: 895, delta: 12 },
    { mph: 190, base: 890, delta: 12 },
    { mph: 195, base: 885, delta: 12 },
    { mph: 200, base: 880, delta: 12 },
    { mph: 205, base: 875, delta: 12 },
    { mph: 210, base: 870, delta: 12 },
    { mph: 215, base: 865, delta: 12 },
    { mph: 220, base: 860, delta: 12 }
];

function calculatePressure(windKnots) {
    const windMph = windKnots * 1.15078;

    const entries = findNearestEntries(windMph);

    const { base, delta } = interpolateEntries(windMph, entries);

    // randomize pressure within the range
    const pressure = base + (Math.random() * delta * 2 - delta);

    return Math.min(Math.max(Math.round(pressure), 860), 1020);
}

function findNearestEntries(targetMph) {
    let low = 0;
    let high = PRESSURE_TABLE.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const current = PRESSURE_TABLE[mid].mph;

        if (current < targetMph) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return {
        lower: PRESSURE_TABLE[Math.max(0, low - 1)],
        upper: PRESSURE_TABLE[Math.min(PRESSURE_TABLE.length - 1, low)]
    };
}

function interpolateEntries(targetMph, { lower, upper }) {
    if (!lower || !upper || lower.mph === upper.mph) {
        return { base: lower.base, delta: lower.delta };
    }

    const fraction = (targetMph - lower.mph) / (upper.mph - lower.mph);
    return {
        base: lower.base + (upper.base - lower.base) * fraction,
        delta: lower.delta + (upper.delta - lower.delta) * fraction
    };
}

function generateHURDATString(data) {
    if (!data || !data.length) return '';

    const stormId = 'AL012024'; // sample storm ID
    const stormName = (data[0]?.name || 'UNNAMED').toUpperCase().padEnd(10);

    let output = [];

    // header line
    output.push(`${stormId}, ${stormName}, 1,`);

    // entries
    data.forEach((point, index) => {
        const date = '20240131'; // sample date
        const time = ((index % 4) * 600).toString().padStart(4, '0');

        const windKnots = convertSpeed(point.speed, 'kph', 'kt');
        const status = getStatusCode(point.stage, windKnots);

        const lat = formatCoordinate(point.latitude);
        const lon = formatCoordinate(point.longitude);
        const pressure = calculatePressure(windKnots);

        output.push(
            `${date}, ${time},  , ${status}, ${lat.padStart(5)}, ` +
            `${lon.padStart(7)}, ${String(windKnots).padStart(3)}, ${pressure},`
        );
    });

    // footer line
    output.push(`${stormId}, ${stormName}, 1,`);
    return output.join('\n');
}

document.querySelector("#hurdat-export")?.addEventListener("click", async () => {
    try {
        const data = exportData(); // from export.js
        const hurdatString = generateHURDATString(data);

        const blob = new Blob([hurdatString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${data[0]?.name || 'storm'}.txt`;
        a.click();

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Zamn! Failed to export HURDAT format:', error);
        alert('Failed to export data in HURDAT format');
    }
});
