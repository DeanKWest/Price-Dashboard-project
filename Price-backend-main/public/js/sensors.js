let interval = null;

const DATA_REFRESH_INTERVAL = 30000; // 30 seconds

// State
let currentView = 'temp';
let currentHours = 720;
let allData = {}; // Cache all loaded data
let dataChart, radarChart;

async function refreshData() {
    try {
        const res = await fetch(`/api/sensors/${window.sensorId}/history?hours=${currentHours}`);
        const data = await res.json();

        allData[currentHours] = {
            labels: data.labels.map(l => new Date(l)),
            temperatures: data.temperatures || [[], [], []],
            humidities: data.humidities || [[], [], []]
        };

        updateChartDisplay();
    } catch (error) {
        console.error('Data refresh error:', error);
    }
}

function getTimeUnit(hours) {
    if (hours <= 24) return 'hour';
    if (hours <= 720) return 'day';
    return 'month';
}

function initCharts() {
    // Main data chart
    const ctx = document.getElementById('dataChart').getContext('2d');
    dataChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: window.languageData.sensor.top, borderColor: '#7734E2', backgroundColor: 'rgba(119,52,226,0.1)', tension: 0.1, fill: true, pointRadius: 0 },
                { label: window.languageData.sensor.middle, borderColor: '#2FC780', backgroundColor: 'rgba(47,199,128,0.1)', tension: 0.1, fill: true, pointRadius: 0 },
                { label: window.languageData.sensor.bottom, borderColor: '#FFCE56', backgroundColor: 'rgba(255, 86, 86, 0.1)', tension: 0.1, fill: true, pointRadius: 0 }
            ]
        },
        options: getChartOptions()
    });

    // Radar chart
    const rctx = document.getElementById('sustainabilityRadarChart').getContext('2d');
    radarChart = new Chart(rctx, {
        type: 'radar',
        data: {
            labels: ["Hematoy", "Sustainability", "Temperature", "Cluster", "Medecin"],
            datasets: [{
                label: 'Score',
                data: [3, 4, 2, 5, 3],
                backgroundColor: 'rgba(75,192,192,0.2)',
                borderColor: 'rgba(75,192,192,1)',
                pointBackgroundColor: 'rgba(75,192,192,1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { suggestedMin: 0, suggestedMax: 5, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: getTimeUnit(currentHours),
                    displayFormats: {
                        hour: 'HH:mm',
                        day: 'dd MMM',
                        month: 'MMM yyyy'
                    },
                    tooltipFormat: 'dd MMM yyyy HH:mm'
                },
                title: { display: true, text: 'Time' }
            },
            y: {
                beginAtZero: false,
                title: { display: true, text: currentView === 'temp' ? '°C' : '%' },
                min: currentView === 'hum' ? 0 : null,
                max: currentView === 'hum' ? 100 : null
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}${currentView === 'temp' ? '°C' : '%'}`
                }
            },
            legend: { position: 'top' }
        }
    };
}

async function loadInitialData() {
    try {
        // Load all data ranges immediately
        const timeRanges = ['2', '24', '720', '8760'];
        const requests = timeRanges.map(range =>
            fetch(`/api/sensors/${window.sensorId}/history?hours=${range}`)
                .then(res => res.json())
                .then(data => {
                    allData[range] = {
                        labels: data.labels.map(l => new Date(l)),
                        temperatures: data.temperatures || [[], [], []],
                        humidities: data.humidities || [[], [], []]
                    };
                })
        );

        // Also load sustainability data
        requests.push(
            fetch(`/api/sensors/${window.sensorId}/sustainability/${window.languageData.lang}`)
                .then(res => res.json())
                .then(data => {
                    if (data.labels && data.datasets) {
                        radarChart.data.labels = data.labels;
                        radarChart.data.datasets[0].data = data.datasets[0].data;
                        radarChart.update();
                    }
                })
        );

        await Promise.all(requests);

        // Display initial data
        updateChartDisplay();

        // Setup refresh interval
        interval = setInterval(refreshData, DATA_REFRESH_INTERVAL);

    } catch (error) {
        console.error('Initial data loading error:', error);
    }
}

function handleTimeRangeChange() {
    currentHours = parseInt(document.getElementById('timeRange').value);
    updateChartDisplay();
}

function switchView(view) {
    currentView = view;
    document.getElementById('tempBtn').classList.toggle('active', view === 'temp');
    document.getElementById('humBtn').classList.toggle('active', view === 'hum');
    updateChartDisplay();
}

function updateChartDisplay() {
    const data = allData[currentHours] || allData['24']; // Fallback to 24h if no data
    if (!data) return;

    const arr = currentView === 'temp' ? data.temperatures : data.humidities;

    // Update chart data
    dataChart.data.labels = data.labels;
    dataChart.data.datasets.forEach((ds, i) => {
        ds.data = arr[i].map((v, j) => ({ x: data.labels[j], y: v }));
    });

    // Update chart options
    dataChart.options = getChartOptions();
    dataChart.update();

    updateCurrentReadings();
}

function updateCurrentReadings() {
    const data = allData[currentHours] || allData['24']; // Fallback to 24h if no data
    if (!data || data.labels.length === 0) return;

    const lastIndex = data.labels.length - 1;
    const arr = currentView === 'temp' ? data.temperatures : data.humidities;
    const unit = currentView === 'temp' ? '°C' : '%';

    document.getElementById('currentReadings').innerHTML = `
    <h2>${window.languageData.sensor.current_readings}</h2>
        <svg style="overflow: visible;" class="sensor-visual placeholder-svg" viewBox="-15 0 230 260" width="200"
          height="200">
          <polygon points="
        20,20
        200,180
        167,217
        -13,57
      " fill="#eee" stroke="#777" stroke-width="1.5" />
          <line x1="-2" y1="0" x2="222" y2="200" stroke="#555" stroke-width="2" />
          <circle cx="56" cy="52" r="7" fill="#333" />
          <circle cx="94" cy="119" r="7" fill="#333" />
          <circle cx="131" cy="185" r="7" fill="#333" />

          <line x1="56" y1="42" x2="56" y2="32" stroke="#333" stroke-width="2" />
          <line x1="56" y1="32" x2="126" y2="32" stroke="#333" stroke-width="2" />

          <line x1="94" y1="109" x2="94" y2="99" stroke="#333" stroke-width="2" />
          <line x1="94" y1="99" x2="164" y2="99" stroke="#333" stroke-width="2" />

          <line x1="131" y1="175" x2="131" y2="165" stroke="#333" stroke-width="2" />
          <line x1="131" y1="165" x2="201" y2="165" stroke="#333" stroke-width="2" />

          <text x="136" y="37" font-size="20" fill="#888">${arr[0][lastIndex].toFixed(1)} ${unit}</text>
          <text x="174" y="104" font-size="20" fill="#888">${arr[1][lastIndex].toFixed(1)} ${unit}</text>
          <text x="211" y="170" font-size="20" fill="#888">${arr[2][lastIndex].toFixed(1)} ${unit}</text>
        </svg>
      </div>
        `
}

function loadPageFunctions() {

    console.log('Loading sensor page functions...');

    // Zoom logic: altijd slechts één element tegelijk enlarged
    const zoomables = Array.from(document.querySelectorAll('.zoomable'))
        .concat(Array.from(document.querySelectorAll('.zoomable-radar')));
    zoomables.forEach(el => {
        el.addEventListener('click', () => {
            const open = document.querySelector('.enlarged');
            if (open && open !== el) open.classList.remove('enlarged');
            el.classList.toggle('enlarged');
        });
    });

    document.getElementById('timeRange').addEventListener('change', handleTimeRangeChange);
    document.getElementById('tempBtn').addEventListener('click', () => switchView('temp'));
    document.getElementById('humBtn').addEventListener('click', () => switchView('hum'));
    document.getElementById('sustainabilityRadarChart').addEventListener('click', () => {
        const open = document.querySelector('.enlarged');
        if (open) open.classList.remove('enlarged');
    });


    initCharts();
    loadInitialData();

}

function clearPageFunctions() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    if (dataChart) {
        dataChart.destroy();
        dataChart = null;
    }
    if (radarChart) {
        radarChart.destroy();
        radarChart = null;
    }
    allData = {};
    currentView = 'temp';
}

export { loadPageFunctions, clearPageFunctions };