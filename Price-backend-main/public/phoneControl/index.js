let socket = null;

const socketStatus = document.getElementById('socket-status');
const pinContainer = document.getElementById('pin-container');
const main = document.querySelector('main');

const sensorNamen = {
    Sensor0: 'Huis temperatuur',
    Sensor1: 'Hemkor',
    Sensor2: 'Stro',
    Sensor3: 'Cellulose',
    Sensor4: 'Isovlas'
};

function laadActueleData() {
    fetch('/api/sensors')
        .then(res => res.json())
        .then((data) => {
            const firstPerSensor = {};
            data.forEach(element => {
                if (Object.keys(firstPerSensor).length === 5) return; // Stop als we alle sensors hebben
                if (!(element.sensor_name in firstPerSensor)) {
                    firstPerSensor[element.sensor_name] = element;
                    const titel = document.getElementById(`sensor${element.sensor_name.replace('Sensor', '')}`);
                    if (titel) {
                        const naam = sensorNamen[element.sensor_name] || element.sensor_name;
                        titel.innerHTML = naam;
                    }
                }
            });

        })
}

function displayPage() {
    socketStatus.innerHTML = 'Verbonden';
    socketStatus.style.color = 'green';
    pinContainer.style.display = 'none';
    main.style.display = 'block';
}

async function sendEvent(data) {
    const url = '../event'
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({pin: window.pin, ...data})
    })
}

async function connectWebSocket(pin) {

    window.pin = pin;

    socketStatus.innerHTML = 'Verbinden...';
    socketStatus.style.color = 'orange';

    const url = '../event'
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'checkAuth',
            pin: pin
        })
    }).then(res => res.json())
        .then((data) => {
            if (data.success) {
                displayPage();
            }
        })
}


async function goToPage(page) {
    if (!window.pin) {
        alert('Niet verbonden. Probeer opnieuw te verbinden.');
        return;
    }

    sendEvent({ type: 'switchPage', path: page });
}

async function clickButton(buttonId) {
    if (!window.pin) {
        alert('Niet verbonden. Probeer opnieuw te verbinden.');
        return;
    }

    sendEvent({ type: 'clickButton', buttonId: buttonId });
}

async function switchTimeRange(range) {
    if (!window.pin) {
        alert('Niet verbonden. Probeer opnieuw te verbinden.');
        return;
    }

    sendEvent({ type: 'switchTimeRange', hours: range });
}

async function toggleSlideshow() {
    if (!window.pin) {
        alert('Niet verbonden. Probeer opnieuw te verbinden.');
        return;
    }

    sendEvent({ type: 'toggleSlideshow' });
}

document.getElementById('pin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const pin = document.getElementById('pin-input').value.trim();
    if (pin) {
        connectWebSocket(pin);
    } else {
        alert('Voer een geldige PIN in.');
    }
});

laadActueleData();