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
        const time = ((index % 4) * 600).toString().padStart(4, '0')
        const status = getStatusCode(point.stage, point.speed);
        const lat = formatCoordinate(point.latitude);
        const lon = formatCoordinate(point.longitude);
        const wind = Math.round(point.speed);
        const pressure = 1010 + Math.floor(Math.random() * 15); // sample pressure

        output.push(
            `${date}, ${time},  , ${status}, ${lat.padStart(5)}, ${lon.padStart(7)}, ${String(wind).padStart(3)}, ${pressure},`
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
