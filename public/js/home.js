// script.js

let interval1 = null;
let interval2 = null;


function loadPageFunctions() {

  const sensorNamen = {
    Sensor0: 'Huis temperatuur',
    Sensor1: 'Hemkor',
    Sensor2: 'Stro',
    Sensor3: 'Cellulose',
    Sensor4: 'Isovlas'
  };

  const sensorOpstellingen = {
    Sensor0: [["Boven", 1], ["Midden", 3], ["Onder", 2]],
    Sensor1: [["Boven", 3], ["Midden", 2], ["Onder", 1]],
    Sensor2: [["Boven", 3], ["Midden", 1], ["Onder", 2]],
    Sensor3: [["Boven", 1], ["Midden", 2], ["Onder", 3]],
    Sensor4: [["Boven", 1], ["Midden", 2], ["Onder", 3]]
  };

  function laadSensorData() {
    const volgorde = ['Sensor4', 'Sensor1', 'Sensor2', 'Sensor3', 'Sensor0'];

    fetch('/api/sensors')
      .then(res => res.json())
      .then(data => {
        const laatstPerSensor = {};
        data.reverse().forEach(entry => {
          if (!(entry.sensor_name in laatstPerSensor) && entry.temperature_1 !== "999.00") {
            laatstPerSensor[entry.sensor_name] = entry;
          }
        });

        volgorde.forEach(sensorKey => {
          const sensor = laatstPerSensor[sensorKey];
          const card = document.getElementById(`sensor${sensorKey.replace('Sensor', '')}`);
          if (!card) return;

          const titelEl = card.querySelector('.sensor-title');
          if (titelEl) {
            console.log('Sensor naam:', sensorKey);
            const naam = sensorNamen[sensorKey] || sensorKey;
            titelEl.textContent = naam;
            titelEl.classList.remove('placeholder');
          }

          const lastUpdatedEl = card.querySelector('.updated-time');
          if (lastUpdatedEl) {
            const now = new Date(sensor.created_at);
            const datum = now.toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            const tijd24uurs = now.toLocaleTimeString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            lastUpdatedEl.innerHTML = `${datum} ${window.languageData.homepage.last_updated_between} ${tijd24uurs}`;
            lastUpdatedEl.classList.remove('placeholder');
          }

          if (!sensor) return;
          const svg = card.querySelector('svg.sensor-visual');
          if (!svg) return;

          const tekstElts = Array.from(svg.querySelectorAll('text'));
          const opstelling = sensorOpstellingen[sensorKey] || [
            ['Boven', 1], ['Midden', 2], ['Onder', 3]
          ];

          opstelling.forEach(([, pos], idx) => {
            const temp = sensor[`temperature_${pos}`];
            const vocht = sensor[`humidity_${pos}`];
            const tempEl = tekstElts[idx * 2];
            const vochtEl = tekstElts[idx * 2 + 1];
            if (tempEl) tempEl.textContent = `${temp}°C`;
            if (vochtEl) vochtEl.textContent = `${vocht}%`;
          });
        });
      })
      .catch(err => console.error('Fout bij ophalen van sensor data:', err));
  }

  // Live weerdata ophalen en tonen via backend route
  async function laadWeer() {
    try {
      const res = await fetch('/api/weather');
      const data = await res.json();

      const { temp_c, condition, wind_kph, humidity, last_updated } = data.current;
      const icoon = `<img src="https:${condition.icon}" alt="${condition.text}" style="vertical-align:middle;">`;

      const updates = [
        ['weer-titel', window.languageData.homepage.weather_title],
        ['weer-conditie', `${icoon} <strong>${condition.text}</strong>`],
        ['weer-locatie', `${window.languageData.homepage.location} ${data.location.name}, ${data.location.region}`],
        ['weer-temp', `${window.languageData.homepage.temperature} ${temp_c} °C`],
        ['weer-wind', `${window.languageData.homepage.wind} ${wind_kph} km/h`],
        ['weer-vocht', `${window.languageData.homepage.humidity} ${humidity}%`],
        ['weer-update', `${window.languageData.homepage.last_updated} ${last_updated}`],
      ];

      updates.forEach(([id, html]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = html;
        el.classList.remove('placeholder');
      });

    } catch (err) {
      console.error('Fout bij ophalen van weerdata:', err);
      const foutElement = document.getElementById('weer-conditie');
      if (foutElement) {
        foutElement.innerHTML = `<span style="color:red;">Fout bij ophalen van weerdata.</span>`;
        foutElement.classList.remove('placeholder');
      }
    }
  }

  laadSensorData();
  interval1 = setInterval(laadSensorData, 240000); // elke 4 minuten

  laadWeer();
  interval2 = setInterval(laadWeer, 600000); // elke 10 minuten
}

function clearPageFunctions() {
  if (interval1) {
    clearInterval(interval1);
    interval1 = null;
  }
  if (interval2) {
    clearInterval(interval2);
    interval2 = null;
  }
}

export { loadPageFunctions, clearPageFunctions };