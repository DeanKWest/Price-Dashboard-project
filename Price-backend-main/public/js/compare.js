let dataChart;
let currentView = 'temp';
const colors = [
  'rgba(255, 99, 132, 1)',
  'rgba(54, 162, 235, 1)',
  'rgba(24, 23, 51, 1)',
  'rgba(47, 199, 128, 1)',
  'rgba(153, 102, 255, 1)'
];

function switchView(view) {
  currentView = view;
  document.getElementById('tempBtn').classList.toggle('active', view === 'temp');
  document.getElementById('humBtn').classList.toggle('active', view === 'hum');
  fetchData();
}

function handleTimeRangeChange() {
  const hours = document.getElementById('timeRange').value;
  fetchData(hours);
}

async function fetchData(hours = 720) {
  try {
    const sensorIds = [0, 1, 2, 3, 4];
    const results = await Promise.all(
      sensorIds.map(id =>
        fetch(`/api/sensors/${id}/history?hours=${hours}`).then(r => r.json())
      )
    );
    window.sensorData = results.map((d, i) => ({
      name: getSensorTitle(i),
      labels: d.labels,
      values: currentView === 'temp' ? d.temperatures[0] : d.humidities[0]
    }));
    updateChart();
  } catch (err) {
    console.error(err);
  }
}

function updateChart() {
  const ctx = document.getElementById('dataChart').getContext('2d');
  if (dataChart) dataChart.destroy();
  dataChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: window.sensorData.map((s, i) => ({
        label: s.name,
        data: s.labels.map((t, idx) => ({ x: new Date(t), y: s.values[idx] })),
        borderColor: colors[i % colors.length],
        borderWidth: 2,
        tension: 0.2,
        fill: false,
        pointRadius: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', time: { tooltipFormat: 'HH:mm', displayFormats: { hour: 'HH:mm' } } },
        y: { title: { display: true, text: currentView === 'temp' ? 'Temperature (°C)' : 'Humidity (%)' } }
      },
      plugins: { legend: { position: 'top' } }
    }
  });
}

function getSensorTitle(id) {
  const titles = ['Huistemperatuur', 'Hemkor', 'Stro', 'Cellulose', 'Isovlas'];
  return titles[id] || `Sensor ${id}`;
}

function loadPageFunctions() {
  fetchData();

  document.getElementById('timeRange').addEventListener('change', handleTimeRangeChange);
  document.getElementById('tempBtn').addEventListener('click', () => switchView('temp'));
  document.getElementById('humBtn').addEventListener('click', () => switchView('hum'));

}

function clearPageFunctions() {
  if (dataChart) {
    dataChart.destroy();
    dataChart = null;
  }
  currentView = 'temp';
}

export { loadPageFunctions, clearPageFunctions };