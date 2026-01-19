if (localStorage.getItem('freeplay') === 'true') {
  document.addEventListener('DOMContentLoaded', () => {
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const leftColumn = document.getElementById('left-column');
  const rightColumn = document.getElementById('right-column');
  const canvas = document.getElementById('lineCanvas');
  const ctx = canvas.getContext('2d');
  const feedback = document.getElementById('feedback');
  const avatar = document.getElementById('selectedAvatar');
  const progressFill = document.getElementById('progressFill');
  const timerElement = document.getElementById('timer');
  const progressText = document.getElementById('progress-text');
  let progressPercent = parseFloat(localStorage.getItem('progressPercent')) || 0;
  let matchScore = 0;
  const MATCH_MAX = 25;

  const charImage = localStorage.getItem('characterImage');
  if (charImage) {
    avatar.src = charImage;
    avatar.style.display = 'block';
  }

  let matches = [];
  let selectedLeft = null;
  let currentSet = 0;
  let timeLeft = 60;
  let timerInterval;

  const sets = [
    [
      { material: 'glas.png', source: 'zand.png', answer: 'zand' },
      { material: 'plastic.png', source: 'aardolie.png', answer: 'aardolie' },
      { material: 'papier.png', source: 'boom.png', answer: 'boom' }
    ],
    [
      { material: 'aluminium.png', source: 'bauxiet.png', answer: 'bauxiet' },
      { material: 'leer.png', source: 'koe.png', answer: 'koe' },
      { material: 'biogas.png', source: 'tuinafval.png', answer: 'tuinafval' }
    ],
    [
      { material: 'bioplastic.png', source: 'mais.png', answer: 'mais' },
      { material: 'wol.png', source: 'schaap.png', answer: 'schaap' },
      { material: 'metaal.png', source: 'ijzererts.png', answer: 'ijzererts' }
    ]
  ];

  function startGame() {
    drawSet(sets[currentSet]);
    startTimer();
  }

  function drawSet(set) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  leftColumn.innerHTML = '';
  rightColumn.innerHTML = '';
  matches = [];

  // Shuffle beide kolommen onafhankelijk
  const shuffledLeft = [...set].sort(() => Math.random() - 0.5);
  let shuffledRight = [...set].sort(() => Math.random() - 0.5);

  // Zorg dat de juiste antwoorden NIET recht tegenover elkaar staan
  // (dus: als op index 0 links het antwoord 'zand' is, mag op index 0 rechts NIET 'zand' zijn)
  let tries = 0;
  while (shuffledLeft.some((pair, i) => pair.answer === shuffledRight[i].answer) && tries < 10) {
    shuffledRight = [...set].sort(() => Math.random() - 0.5);
    tries++;
  }

  shuffledLeft.forEach((pair, index) => {
    const left = document.createElement('div');
left.classList.add('item-container');
left.innerHTML = `
  <img src="../assests/materials/${pair.material}" class="item" data-answer="${pair.answer}" data-index="${index}">
  <div class="item-label">${pair.left || pair.material.replace('.png','')}</div>
`;
const imgLeft = left.querySelector('img');
imgLeft.addEventListener('click', () => handleLeftClick(imgLeft));
leftColumn.appendChild(left);
  });

  shuffledRight.forEach((pair, index) => {
    const right = document.createElement('div');
right.classList.add('item-container');
right.innerHTML = `
  <img src="../assests/materials/${pair.source}" class="item" data-answer="${pair.answer}" data-index="${index}">
  <div class="item-label">${pair.right || pair.source.replace('.png','')}</div>
`;
const imgRight = right.querySelector('img');
imgRight.addEventListener('click', () => handleRightClick(imgRight));
rightColumn.appendChild(right);
  });
}


  function handleLeftClick(element) {
    selectedLeft = element;
    document.querySelectorAll('.item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
  }

  function handleRightClick(right) {
    if (!selectedLeft) return;

    // Als één van beide al 'matched', doe niets meer
    if (selectedLeft.classList.contains('matched') || right.classList.contains('matched')) {
      selectedLeft.classList.remove('selected');
      selectedLeft = null;
      return;
    }

    const isMatch = selectedLeft.dataset.answer === right.dataset.answer;
    drawLineBetween(selectedLeft, right, isMatch ? 'green' : 'red');

    // --- GELUID TOEVOEGEN ---
    if (isMatch) {
      const goodSound = new Audio('../assests/sounds/good.mp3');
      goodSound.play();
      selectedLeft.removeEventListener('click', handleLeftClick);
      right.removeEventListener('click', handleRightClick);
      selectedLeft.classList.add('matched');
      right.classList.add('matched');
      // Alleen punten als ze NIET eerder fout waren
      if (!selectedLeft.classList.contains('wrong') && !right.classList.contains('wrong')) {
        increaseProgress(5);
      }
    } else {
      const wrongSound = new Audio('../assests/sounds/wrong.mp3');
      wrongSound.play();
      // Markeer beide als 'wrong', zodat ze geen punten meer kunnen krijgen
      selectedLeft.classList.add('wrong');
      right.classList.add('wrong');
    }
    // --- EINDE GELUID TOEVOEGEN ---

    selectedLeft.classList.remove('selected');
    selectedLeft = null;

    checkCompletion();
  }

  function drawLineBetween(left, right, color) {
    const rectLeft = left.getBoundingClientRect();
    const rectRight = right.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const startX = rectLeft.right - canvasRect.left;
    const startY = rectLeft.top + rectLeft.height / 2 - canvasRect.top;

    const endX = rectRight.left - canvasRect.left;
    const endY = rectRight.top + rectRight.height / 2 - canvasRect.top;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6; // dikkere lijn
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.restore();
  }

  function increaseProgress(amount) {
    matchScore += amount;
    if (matchScore > MATCH_MAX) matchScore = MATCH_MAX;
    localStorage.setItem('matchScore', matchScore);
    updateProgressBar();
  }

  function updateProgressBar() {
    const quiz = parseFloat(localStorage.getItem('quizScore')) || 0;
    const drag = parseFloat(localStorage.getItem('dragScore')) || 0;
    const match = parseFloat(localStorage.getItem('matchScore')) || 0;
    const total = quiz + drag + match;
    progressFill.style.width = `${total}%`;
    if (progressText) {
      progressText.textContent = `${Math.round(total)}%`;
    }
  }

  function checkCompletion() {
    const allMatched = [...leftColumn.querySelectorAll('.item, .item-container img')].every(el => el.classList.contains('matched'));
    if (allMatched) {
      currentSet++;
      if (currentSet < sets.length) {
        setTimeout(() => {
          selectedLeft = null;
          drawSet(sets[currentSet]);
        }, 1000);
      } else {
        clearInterval(timerInterval);
        // Maximaal 25%
        matchScore = Math.min(MATCH_MAX, matchScore);
        localStorage.setItem('matchScore', matchScore);

        updateProgressBar();

        // Ga direct door naar het volgende spel
        setTimeout(() => {
          window.location.href = 'WatHoortNietThuis.html';
        }, 2000);
      }
    }
  }

  const isFreeplay = localStorage.getItem('freeplay') === 'true';

// Stel je hebt een timer zoals:
  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    timerElement.textContent = `Tijd: ${timeLeft}s`;

    timerInterval = setInterval(() => {
      timeLeft--;
      timerElement.textContent = `Tijd: ${timeLeft}s`;

      if (timeLeft === 0) {
        clearInterval(timerInterval);
        if (!isFreeplay) {
          // Normale modus: direct naar einde
          feedback.textContent = "⏰ Tijd is op!";
          setTimeout(() => {
            checkCompletion(true); // of jouw eigen einde-functie
          }, 1000);
        } else {
          // Freeplay: alleen melding, niet automatisch door
          feedback.textContent = "⏰ Tijd is op!";
          // Je kunt knoppen disablen als je wilt
        }
      }
    }, 1000);
  }

  // Update de balk en tekst direct bij het laden
  updateProgressBar();

  startGame();
});

const isFreeplay = localStorage.getItem('freeplay') === 'true';

if (isFreeplay && !localStorage.getItem('characterImage')) {
  const characters = [
    { name: "avonturier", image: "../assests/avatars/avonturier.png" },
    { name: "held", image: "../assests/avatars/held.png" },
    { name: "wetenschapper", image: "../assests/avatars/wetenschapper.png" }
  ];
  const randomChar = characters[Math.floor(Math.random() * characters.length)];
  localStorage.setItem('characterImage', randomChar.image);
  localStorage.setItem('characterName', randomChar.name);
}
