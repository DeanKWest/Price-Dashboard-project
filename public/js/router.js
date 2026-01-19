let baseLang = location.pathname.split('/')[1] || 'nl';

let current;
let currentRaw;
window.languageData = {};

let doSlideShow = false;

loadLanguageStrings(baseLang);

function resolveRoute(path) {
    const clean = path
        .replace(/^\/+/, '')                            // verwijder leading slash
        .replace(new RegExp(`/${baseLang}$`), '')       // strip trailing taal als die al bestaat

    return `/${clean}/${baseLang}`;
}

async function loadLanguageStrings(lang) {
    const res = await fetch(`/lang/${lang}`);
    window.languageData = await res.json();
}

async function loadMainContent(path) {
    currentRaw = path;
    const fetchPath = resolveRoute(path);
    current = path;
    baseLang = location.pathname.split('/')[1] || 'nl';

    try {
        const res = await fetch(fetchPath, {
            headers: { 'X-Requested-With': 'spa-client' }
        });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const html = await res.text();

        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newMain = temp.querySelector('main');
        const currentMain = document.querySelector('main');

        if (newMain && currentMain) {

            currentMain.style.opacity = 0;
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, 300);
            }); // fade-out effect

            currentMain.replaceWith(newMain);

            if (typeof window.clearPageFunctions === 'function') {
                window.clearPageFunctions();
            }

            executeInlineScripts(temp); // altijd na replace

            const basePath = path.replace(/^\/+/, '').split('/')[0] || 'home';
            if (basePath === 'sensors') {
                const parts = path.replace(/^\/+/, '').split('/');
                const id = parseInt(parts[1]);
                if (!isNaN(id)) {
                    window.sensorId = id;
                    console.log('[SPA] sensorId ingesteld op:', id);
                } else {
                    delete window.sensorId;
                }
            } else {
                delete window.sensorId;
            }
            const pageScript = `/js/${basePath}.js`;

            try {
                const module = await import(pageScript);
                window.loadPageFunctions = module.loadPageFunctions || (() => { });
                window.clearPageFunctions = module.clearPageFunctions || (() => { });
                window.loadPageFunctions();
            } catch (err) {
                console.warn(`Geen paginascript gevonden voor ${basePath}:`, err);
                window.loadPageFunctions = () => { };
                window.clearPageFunctions = () => { };
            }

            const newMainEl = document.querySelector('main');
            newMainEl.style.opacity = 0;

            requestAnimationFrame(() => {
                setTimeout(() => {
                    newMainEl.style.opacity = 1;
                }, 10); // klein beetje delay nodig om transition te triggeren
            });
        }

    } catch (err) {
        console.error('Failed to load content', err);
    }
}

document.addEventListener('click', e => {
    const link = e.target.closest('a[data-spa]');
    if (link && link.href) {
        const url = new URL(link.href);
        if (url.origin === location.origin) {
            e.preventDefault();
            loadMainContent(url.pathname);
        }
    }
});

window.addEventListener('popstate', () => {
    loadMainContent(location.pathname, false);
});

function updateActiveLink(path) {
    document.querySelectorAll('a[data-spa]').forEach(link => {
        const linkPath = new URL(link.href).pathname;
        link.classList.toggle('active', linkPath === path);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[data-spa]').forEach(link => {
        const href = link.getAttribute('href');
        if (href?.startsWith('/')) {
            link.setAttribute('href', resolveRoute(href));
        }
    });

    if (!document.querySelector('main')?.hasChildNodes()) {
        loadMainContent('home');
    }
    setTimeout(() => startSlideShow(), 500);
});

function executeInlineScripts(container) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
            newScript.src = script.src;
            newScript.type = script.type || 'text/javascript';
        } else {
            newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
        script.remove();
    });
}

let oldPath = null;

function goToCompare() {
    oldPath = `${currentRaw}`;
    loadMainContent(`/compare`);
}

function goBackFromCompare() {
    loadMainContent(oldPath);
}

document.getElementById('lang-btn-nl').addEventListener('click', () => {
    baseLang = 'nl';
    history.pushState({}, '', `/${baseLang}`);
    loadLanguageStrings(baseLang);
    loadMainContent(currentRaw);
    window.loadPageFunctions();
});

document.getElementById('lang-btn-en').addEventListener('click', () => {
    baseLang = 'en';
    history.pushState({}, '', `/${baseLang}`);
    loadLanguageStrings(baseLang);
    loadMainContent(currentRaw);
    window.loadPageFunctions();
});

let slideshowTimeouts = [];


function nextPageIn(path, milis) {
    return new Promise(resolve => {
        spawnProgessBar(milis);
        const t = setTimeout(async () => {
            await loadMainContent(path);
            resolve();
        }, milis);
        slideshowTimeouts.push(t);
    });
}

function spawnProgessBar(milis) {
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';

    document.body.appendChild(progressBar);

    void progressBar.offsetWidth;

    progressBar.style.transition = `width ${milis}ms linear`;
    progressBar.style.width = '100%';

    const t = setTimeout(() => {
        progressBar.remove();
    }, milis);
    slideshowTimeouts.push(t);
}

// TODO: Moet nog dynamisch worden opgehaald ipv hardcoded hier.

// Begint bij home. Delay is na hoeveel ms de pagina komt.
// Dat betekend dat bij een delay van 5000 de loadbar voor de pagina 5 duurt, en daarna pas dus de pagina komt.
const slideShowQueue = [
    {
        type: 'switchpage',
        path: 'sensors/4',
        delay: 20000,
    },
    {
        type: 'buttonPress',
        buttonId: 'humBtn',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'home',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'sensors/1',
        delay: 20000,
    },
    {
        type: 'buttonPress',
        buttonId: 'humBtn',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'home',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'sensors/2',
        delay: 20000,
    },
    {
        type: 'buttonPress',
        buttonId: 'humBtn',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'home',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'sensors/3',
        delay: 20000,
    },
    {
        type: 'buttonPress',
        buttonId: 'humBtn',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'home',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'sensors/0',
        delay: 20000,
    },
    {
        type: 'buttonPress',
        buttonId: 'humBtn',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'home',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'compare',
        delay: 20000,
    },
    {
        type: 'buttonPress',
        buttonId: 'humBtn',
        delay: 10000,
    },
    {
        type: 'switchpage',
        path: 'home',
        delay: 10000,
    }
]

/**
 * Start de slideshow. Dit is een oneindige loop, en als de queue leeg is, dan begint hij weer opnieuw.
 */

let activeLoop = null;

async function startSlideShow() {
    while (doSlideShow) {
        for (let i = 0; i < slideShowQueue.length; i++) {
            if (!doSlideShow) return; // stop de slideshow als doSlideShow false is
            const item = slideShowQueue[i];
            const nextItem = slideShowQueue[i + 1];
            if (item.type === 'buttonPress' && nextItem && nextItem.type === 'switchpage') {
                i++; // skip the next item because we handle it here
                const totalDelay = item.delay + nextItem.delay;
                spawnProgessBar(totalDelay);
                const button = document.getElementById(item.buttonId);
                const t = setTimeout(() => {
                    if (button) {
                        button.click();
                    }

                    if (nextItem.path.includes('sensors')) {
                        const sensorName = `sensor${item.path.split('/')[1]}`
                        const _sensor = document.getElementById(sensorName);
                        if (_sensor) {
                            _sensor.classList.add('choosing');
                        }
                    }
                }, item.delay);
                slideshowTimeouts.push(t);

                const t2 = setTimeout(async () => {
                    await loadMainContent(nextItem.path);
                }, totalDelay);
                slideshowTimeouts.push(t2);

                await new Promise(resolve => {
                    const t = setTimeout(resolve, totalDelay);
                    slideshowTimeouts.push(t);
                });

            } else if (item.type === 'switchpage') {
                if (item.path.includes('sensors')) {
                    clearInterval(activeLoop);
                    const sensorName = `sensor${item.path.split('/')[1]}`
                    activeLoop = setInterval(() => {
                        const _sensor = document.getElementById(sensorName);
                        if (_sensor) {
                            _sensor.classList.add('choosing');
                            clearInterval(activeLoop);
                        }
                    });
                }
                await nextPageIn(item.path, item.delay);
            } else if (item.type === 'buttonPress') {
                const button = document.getElementById(item.buttonId);
                if (button) {
                    await new Promise(resolve => {
                        const t = setTimeout(resolve, item.delay);
                        slideshowTimeouts.push(t);
                    });
                    button.click();
                }
            }
        }
    }
}

function stopSlideShow() {
    doSlideShow = false;
    slideshowTimeouts.forEach(t => {
        clearTimeout(t);
    });
    slideshowTimeouts = [];
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.remove();
    }
    const sensors = document.querySelectorAll('.sensor-card');
    sensors.forEach(sensor => {
        sensor.classList.remove('choosing');
    });
    if (activeLoop) {
        clearInterval(activeLoop);
        activeLoop = null;
    }
}

function resumeSlideShow() {
    if (!doSlideShow) {
        doSlideShow = true;
        startSlideShow();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('slideshow-toggle');
    if (toggle) {
        toggle.addEventListener('change', function () {
            if (this.checked) {
                resumeSlideShow();
            } else {
                stopSlideShow();
            }
        });
    }
});

async function initWebsocket() {

    //Get websocket URL from api
    const res = await fetch('/api/websocket-url');

    // json response with the response socket
    const data = await res.json()
    var socket

    try {
        socket = new WebSocket(data.url);
    } catch (err) {
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        try {
            socket = new WebSocket(`ws://localhost:3001`);
        }
        catch (err) {
            console.error('Failed to connect to WebSocket:', err);
            return;
        }
    }

    socket.onopen = function () {

        console.log('[WebSocket] Connected to server');
        socket.send(JSON.stringify({ type: 'identify', name: 'mainPage' }));

    };

    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        console.log('[WebSocket] ', message);

        switch (message.type) {
            case 'toggleSlideshow':
                if (!doSlideShow) {
                    resumeSlideShow();
                    toggle = document.getElementById('slideshow-toggle');
                    if (toggle) {
                        toggle.checked = true; // Update the toggle state
                    }
                } else {
                    stopSlideShow();
                    toggle = document.getElementById('slideshow-toggle');
                    if (toggle) {
                        toggle.checked = false; // Update the toggle state
                    }
                }
                break;
            case 'identified':
                break;
            case 'switchTimeRange':
                if (message.hours) {
                    try {
                        const timeRangeSelect = document.getElementById('timeRange');
                        if (timeRangeSelect) {
                            // click the select element to trigger the change
                            timeRangeSelect.value = message.hours;
                            timeRangeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log(`[WebSocket] Time range switched to: ${message.hours} hours`);
                        } else {
                            console.warn('[WebSocket] Time range select element not found');
                        }
                    } catch { }
                } else {
                    console.warn('[WebSocket] No hours provided in updateTimeRange message');
                }
                break;
            case 'clickButton':
                const button = document.getElementById(message.buttonId);
                if (button) {
                    button.click();
                    console.log(`[WebSocket] Button ${message.buttonId} clicked`);
                } else {
                    console.warn('[WebSocket] Button not found:', message.buttonId);
                }
                break;
            case 'switchPage':
                if (message.path) {
                    console.log('[WebSocket] Switching page to:', message.path);
                    loadMainContent(message.path);
                } else {
                    console.warn('[WebSocket] No path provided in switchPage message');
                }
                break;
            default:
                console.warn('[WebSocket] Unknown type:', message.type);
        }
    }
}

initWebsocket()