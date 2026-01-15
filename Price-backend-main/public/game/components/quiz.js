document.addEventListener('DOMContentLoaded', () => {
  const vraagTekst = document.getElementById('vraag-tekst');
  const antwoordenContainer = document.getElementById('antwoorden-container');
  const progressFill = document.getElementById('progress-fill');
  const feedback = document.getElementById('feedback');
  const timerElement = document.getElementById('timer');
  const avatar = document.getElementById('selectedAvatar');

  const charImage = localStorage.getItem('characterImage');
  if (charImage) {
    avatar.src = charImage;
    avatar.style.display = 'block';
  }

  const difficulty = localStorage.getItem('difficulty') || 'easy';
  const dataFile = difficulty === 'easy'
    ? '../data/questions-easy.json'
    : '../data/questions-hard.json';

  let currentQuestion = 0;
  let questions = [];
  let timer;
  let timeLeft = 10;
  let quizScore = 0;
  const QUIZ_MAX = 25;
  let totalQuestions = 0;
  let pointsPerGood = 0;
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

  if (!isFreeplay) updateProgressBar();

  function startTimer() {
    clearInterval(timer);
    timeLeft = 30;
    timerElement.textContent = `Tijd: ${timeLeft}s`;

    timer = setInterval(() => {
      timeLeft--;
      timerElement.textContent = `Tijd: ${timeLeft}s`;

      if (timeLeft === 0) {
        clearInterval(timer);
        feedback.textContent = "⏰ Tijd is op!";
        if (!isFreeplay) {
          // Alleen in storymode knoppen disablen en automatisch door
          document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
          setTimeout(() => {
            currentQuestion++;
            showQuestion(currentQuestion);
          }, 1000);
        }
        // In freeplay: doe niets, laat knoppen actief!
      }
    }, 1000);
  }

  function flashProgressColor(color) {
    if (isFreeplay) return;
    const original = '#4caf50';
    progressFill.style.backgroundColor = color;
    setTimeout(() => {
      progressFill.style.backgroundColor = original;
    }, 500);
  }

  function disableButtons() {
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
  }

  function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  function showQuestion(index) {
    const q = questions[index];
    if (!q) return finishQuiz();

    vraagTekst.textContent = q.vraag;
    antwoordenContainer.innerHTML = '';
    feedback.textContent = '';

    const shuffledOptions = shuffle([...q.opties]);

    shuffledOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.classList.add('option-btn');
      // Gebruik 'correct' i.p.v. 'antwoord'
      btn.dataset.correct = (q.opties.indexOf(opt) === (q.correct ?? q.antwoord));
      btn.addEventListener('click', handleAnswer);
      antwoordenContainer.appendChild(btn);
    });

    startTimer();
  }

  // Na het laden van de vragen:
  fetch(dataFile)
    .then(res => res.json())
    .then(data => {
      questions = Array.isArray(data) ? data : data[difficulty];
      totalQuestions = questions.length;
      pointsPerGood = QUIZ_MAX / totalQuestions;
      showQuestion(currentQuestion);
    })
    .catch(err => {
      vraagTekst.textContent = 'Fout bij het laden van vragen';
      console.error(err);
    });

  function handleAnswer(e) {
    clearInterval(timer);
    const correct = e.target.dataset.correct === 'true';

    // Speel geluid af
    if (correct) {
      const goodSound = new Audio('../assests/sounds/good.mp3');
      goodSound.play();
    } else {
      const wrongSound = new Audio('../assests/sounds/wrong.mp3');
      wrongSound.play();
    }

    // In storymode: knoppen disablen na klik
    if (!isFreeplay) {
      document.querySelectorAll('.option-btn').forEach(btn => {
        const isCorrect = btn.dataset.correct === 'true';
        if (!isFreeplay) btn.disabled = true;
        btn.style.backgroundColor = isCorrect ? '#4caf50' : '#f44336';
        btn.style.color = 'white';
      });
    } else {
      // Altijd kleuren, alleen disablen in storymode
      document.querySelectorAll('.option-btn').forEach(btn => {
        const isCorrect = btn.dataset.correct === 'true';
        if (!isFreeplay) btn.disabled = true;
        btn.style.backgroundColor = isCorrect ? '#4caf50' : '#f44336';
        btn.style.color = 'white';
      });
    }

    if (correct) {
      feedback.textContent = "✅ Goed!";
      quizScore += pointsPerGood;
    } else {
      feedback.textContent = "❌ Fout!";
    }

    if (!isFreeplay) updateProgressBar();

    setTimeout(() => {
      currentQuestion++;
      showQuestion(currentQuestion);
    }, 1200);
  }

  function updateProgressBar() {
    const drag = parseFloat(localStorage.getItem('dragScore')) || 0;
    const match = parseFloat(localStorage.getItem('matchScore')) || 0;
    const total = quizScore + drag + match;
    progressFill.style.width = `${total}%`;
    const text = document.getElementById('progress-text');
    if (text) {
      text.textContent = `${Math.round(total)}%`;
    }
  }

  function finishQuiz() {
    vraagTekst.textContent = 'Klaar met deze quiz!';
    antwoordenContainer.innerHTML = `<p>Je bent klaar!</p>`;
    timerElement.textContent = '';
    quizScore = Math.min(QUIZ_MAX, quizScore);

    if (!isFreeplay) {
      localStorage.setItem('quizScore', quizScore);
      updateProgressBar();
    }

    if (isFreeplay) {
      setTimeout(() => {
        localStorage.removeItem('freeplay');
        window.location.href = '../index.html';
      }, 2000);
    } else {
      setTimeout(() => {
        window.location.href = 'draggame.html';
      }, 2000);
    }
  }

  // Verberg voortgangsbalk en timer in freeplay
  if (isFreeplay) {
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = 'none';
    const progressWrapper = document.querySelector('.progress-wrapper');
    if (progressWrapper) progressWrapper.style.display = 'none';
    timerElement.style.display = 'none';
  }
});
