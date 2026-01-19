document.addEventListener('DOMContentLoaded', async () => {
  const itemContainer = document.getElementById('itemContainer');
  const feedback = document.getElementById('feedback');
  const timerDiv = document.getElementById('timer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progress-text');

  let questions = [];
  let currentIndex = 0;
  let timerInterval;
  let timeLeft = 30;
  let progressPercent = parseFloat(localStorage.getItem('progressPercent')) || 0;
  const MAX_PROGRESS_PERCENT = 25;
  let dragScore = 0;
  const DRAG_MAX = 25;

  const isFreeplay = localStorage.getItem('freeplay') === 'true';

  if (isFreeplay && !localStorage.getItem('characterImage')) {
    const characters = [
      { name: "avonturier", image: "../assests/characters/avonturier.png" },
      { name: "held", image: "../assests/characters/held.png" },
      { name: "wetenschapper", image: "../assests/characters/wetenschapper.png" }
    ];
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    localStorage.setItem('characterImage', randomChar.image);
    localStorage.setItem('characterName', randomChar.name);
  }

  // Vragen inladen
  try {
    const res = await fetch('../data/drag-questions.json');
    const data = await res.json();
    const difficulty = localStorage.getItem('difficulty') || 'easy';
    questions = data[difficulty] || data['easy'];
    if (!questions || questions.length === 0) throw new Error('Geen vragen gevonden');
    showNextItem();
  } catch (e) {
    itemContainer.innerHTML = '<p style="color:red;">Fout bij het laden van vragen</p>';
    return;
  }

  function increaseProgress(amount) {
    dragScore += amount;
    if (dragScore > DRAG_MAX) dragScore = DRAG_MAX;
    localStorage.setItem('dragScore', dragScore);
    updateProgressBar();
  }

  function updateProgressBar() {
    const quiz = parseFloat(localStorage.getItem('quizScore')) || 0;
    const match = parseFloat(localStorage.getItem('matchScore')) || 0;
    const total = quiz + dragScore + match;
    progressFill.style.width = `${total}%`;
    if (progressText) progressText.textContent = `${Math.round(total)}%`;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 30;
    timerDiv.textContent = `Tijd: ${timeLeft}s`;

    timerInterval = setInterval(() => {
      timeLeft--;
      timerDiv.textContent = `Tijd: ${timeLeft}s`;

      if (timeLeft === 0) {
        clearInterval(timerInterval);
        feedback.textContent = "⏰ Tijd is op!";
        if (!isFreeplay) {
          // Storymode: automatisch naar volgende item
          setTimeout(() => {
            currentIndex++;
            showNextItem();
          }, 1000);
        }
        // In freeplay: doe niets, laat alles klikbaar!
      }
    }, 1000);
  }

  let startX = null;

  function showNextItem() {
    feedback.textContent = '';

    if (currentIndex >= questions.length) {
      clearInterval(timerInterval);
      itemContainer.innerHTML = `<p>Klaar! Goed gedaan! ✅</p>`;
      timerDiv.textContent = '';
      dragScore = Math.min(DRAG_MAX, dragScore);
      localStorage.setItem('dragScore', dragScore);

      updateProgressBar();

      if (isFreeplay) {
        setTimeout(() => {
          localStorage.removeItem('freeplay');
          window.location.href = '../index.html';
        }, 2000);
      } else {
        setTimeout(() => {
          window.location.href = 'matchgame.html';
        }, 2000);
      }
      return;
    }

    startTimer();

    const q = questions[currentIndex];
    const imgPath = `../assests/items/${q.item}`;
    itemContainer.innerHTML = `
      <img src="${imgPath}" alt="${q.item}" class="swipe-img" id="swipe-img">
    `;

    const swipeImg = document.getElementById('swipe-img');
    const binBio = document.getElementById('bin-bio');
    const binTechno = document.getElementById('bin-techno');

    binBio.onclick = () => handleClick('bio', swipeImg);
    binTechno.onclick = () => handleClick('techno', swipeImg);

    // Touch
    swipeImg.ontouchstart = e => {
      startX = e.touches[0].clientX;
    };
    swipeImg.ontouchend = e => {
      if (startX === null) return;
      let endX = e.changedTouches[0].clientX;
      handleSwipe(endX - startX);
      startX = null;
    };

    // Mouse
    swipeImg.onmousedown = e => {
      startX = e.clientX;
      document.onmouseup = ev => {
        if (startX === null) return;
        let endX = ev.clientX;
        handleSwipe(endX - startX);
        startX = null;
        document.onmouseup = null;
      };
    };
  }

  function handleClick(answer, swipeImg) {
    const correctAnswer = questions[currentIndex].type;

    if (answer === 'bio') {
      swipeImg.classList.add('swipe-left');
    } else {
      swipeImg.classList.add('swipe-right');
    }

    clearInterval(timerInterval);

    if (answer === correctAnswer) {
      feedback.textContent = '✅ Goed!';
      feedback.style.color = 'lightgreen';
      increaseProgress(5);
      // Goed geluid
      const goodSound = new Audio('../assests/sounds/good.mp3');
      goodSound.play();
    } else {
      feedback.textContent = '❌ Fout!';
      feedback.style.color = 'red';
      // Fout geluid
      const wrongSound = new Audio('../assests/sounds/wrong.mp3');
      wrongSound.play();
    }

    setTimeout(() => {
      currentIndex++;
      showNextItem();
    }, 600);
  }

  function handleSwipe(deltaX) {
    const correctAnswer = questions[currentIndex].type;
    const swipeImg = document.querySelector('.swipe-img');
    let answer = null;

    if (deltaX < -60) {
      answer = 'bio';
      swipeImg.classList.add('swipe-left');
    } else if (deltaX > 60) {
      answer = 'techno';
      swipeImg.classList.add('swipe-right');
    } else {
      return;
    }

    clearInterval(timerInterval);

    if (answer === correctAnswer) {
      feedback.textContent = '✅ Goed!';
      feedback.style.color = 'lightgreen';
      increaseProgress(5);
      // Goed geluid
      const goodSound = new Audio('../assests/sounds/good.mp3');
      goodSound.play();
    } else {
      feedback.textContent = '❌ Fout!';
      feedback.style.color = 'red';
      // Fout geluid
      const wrongSound = new Audio('../assests/sounds/wrong.mp3');
      wrongSound.play();
    }

    setTimeout(() => {
      currentIndex++;
      showNextItem();
    }, 600);
  }

  // Verberg voortgangsbalk en timer in freeplay
  if (isFreeplay) {
    document.querySelectorAll('.progress-wrapper').forEach(el => el.style.display = 'none');
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = 'none';
    if (timerDiv) timerDiv.style.display = 'none';
  }

  updateProgressBar();

  const avatar = document.getElementById('selectedAvatar');
  const charImage = localStorage.getItem('characterImage');
  if (avatar && charImage) {
    avatar.src = charImage;
    avatar.style.display = 'block';
  }
});
