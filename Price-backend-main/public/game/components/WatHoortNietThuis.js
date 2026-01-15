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

document.addEventListener('DOMContentLoaded', () => {
  const vraagTekst = document.getElementById('vraag-tekst');
  const optiesContainer = document.getElementById('opties-container');
  const feedback = document.getElementById('feedback');
  const timerElement = document.getElementById('timer');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const avatar = document.getElementById('selectedAvatar');

  // Toon avatar
  const charImage = localStorage.getItem('characterImage');
  if (avatar && charImage) {
    avatar.src = charImage;
    avatar.style.display = 'block';
  }

  const difficulty = localStorage.getItem('difficulty') || 'easy';

  fetch('../data/WatHoortNietThuis.json')
    .then(res => res.json())
    .then(data => {
      const vragen = data[difficulty];
      startGame(vragen);
    })
    .catch(err => {
      vraagTekst.textContent = 'Fout bij het laden van vragen!';
      console.error(err);
    });

  function startGame(vragen) {
    let huidigeVraag = 0;
    let score = 0;
    const MAX_SCORE = 25;
    const puntenPerGoed = MAX_SCORE / vragen.length;
    let tijd = 30;
    let timer;

    function toonVraag(index) {
      clearInterval(timer);
      tijd = 30;
      timerElement.textContent = `Tijd: ${tijd}s`;
      vraagTekst.textContent = vragen[index].vraag || "Welke hoort niet thuis?";
      optiesContainer.innerHTML = '';
      feedback.textContent = '';

      vragen[index].opties.forEach((optie, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = optie.image
          ? `<img src="../assests/whnpic/${optie.image}" alt="${optie.label}"><br>${optie.label}`
          : `<span>${optie.label}</span>`;
        btn.onclick = () => controleerAntwoord(i);
        optiesContainer.appendChild(btn);
      });

      timer = setInterval(() => {
        tijd--;
        timerElement.textContent = `Tijd: ${tijd}s`;
        if (tijd <= 0) {
          clearInterval(timer);
          feedback.textContent = "⏰ Tijd is op!";
          if (!isFreeplay) {
            document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
            setTimeout(volgendeVraag, 1200);
          }
        }
      }, 1000);
    }

    function controleerAntwoord(geselecteerd) {
      clearInterval(timer);
      const juiste = vragen[huidigeVraag].correct;
      const knoppen = optiesContainer.querySelectorAll('.option-btn');

      // In storymode: knoppen disablen na klik
      if (!isFreeplay) {
        knoppen.forEach((btn, i) => {
          btn.disabled = true;
          if (i === juiste) btn.style.backgroundColor = '#4caf50';
          else btn.style.backgroundColor = '#f44336';
          btn.style.color = 'white';
        });
      } else {
        // In freeplay: alleen kleuren, niet disablen
        knoppen.forEach((btn, i) => {
          if (i === juiste) btn.style.backgroundColor = '#4caf50';
          else btn.style.backgroundColor = '#f44336';
          btn.style.color = 'white';
        });
      }

      // --- GELUID TOEVOEGEN ---
      if (geselecteerd === juiste) {
        feedback.textContent = "✅ Goed!";
        score += puntenPerGoed;
        const goodSound = new Audio('../assests/sounds/good.mp3');
        goodSound.play();
      } else {
        feedback.textContent = "❌ Fout!";
        const wrongSound = new Audio('../assests/sounds/wrong.mp3');
        wrongSound.play();
      }
      // --- EINDE GELUID TOEVOEGEN ---

      updateProgressBar();
      setTimeout(() => {
        knoppen.forEach(btn => {
          btn.style.backgroundColor = '';
          btn.style.color = '';
        });
        volgendeVraag();
      }, 1200);
    }

    function volgendeVraag() {
      huidigeVraag++;
      if (huidigeVraag < vragen.length) {
        toonVraag(huidigeVraag);
      } else {
        eindeSpel();
      }
    }

    function updateProgressBar() {
      const quiz = parseFloat(localStorage.getItem('quizScore')) || 0;
      const drag = parseFloat(localStorage.getItem('dragScore')) || 0;
      const match = parseFloat(localStorage.getItem('matchScore')) || 0;
      const watHoortNiet = score;
      const totaal = quiz + drag + match + watHoortNiet;
      if (progressFill) progressFill.style.width = `${totaal}%`;
      if (progressText) progressText.textContent = `${Math.round(totaal)}%`;
    }

    function eindeSpel() {
      optiesContainer.innerHTML = '';
      vraagTekst.textContent = '';
      feedback.textContent = '';
      timerElement.textContent = '';
      score = Math.min(MAX_SCORE, score);

      if (isFreeplay) {
        setTimeout(() => {
          localStorage.removeItem('freeplay');
          window.location.href = '../index.html';
        }, 1200);
        return;
      }

      localStorage.setItem('watHoortNietScore', score);

      const quiz = parseFloat(localStorage.getItem('quizScore')) || 0;
      const drag = parseFloat(localStorage.getItem('dragScore')) || 0;
      const match = parseFloat(localStorage.getItem('matchScore')) || 0;
      const watHoortNiet = score;
      const totaal = quiz + drag + match + watHoortNiet;

      if (totaal > 75) {
        vraagTekst.textContent = 'Je hebt de wereld beter gemaakt, gefeliciteerd!';
        // Winner sound
        const winSound = new Audio('../assests/sounds/winner.mp3');
        winSound.play();

        // Confetti 14 seconden lang
        let confettiInterval = setInterval(() => {
          fire(0.4, { spread: 360, startVelocity: 55, scalar: 1.3 });
        }, 400); // elke 0,4 seconde

        winSound.addEventListener('ended', () => {
          clearInterval(confettiInterval);
          window.location.href = '../index.html';
        });
      } else {
        vraagTekst.textContent = 'Jammer, probeer het opnieuw.';
        // Loser sound
        const loseSound = new Audio('../assests/sounds/loser.mp3');
        loseSound.play();

        loseSound.addEventListener('ended', () => {
          window.location.href = '../index.html';
        });
      }
    }

    // Start
    toonVraag(huidigeVraag);
    updateProgressBar();
  }

  // Verberg voortgangsbalk en timer in freeplay
  if (isFreeplay) {
    document.querySelectorAll('.progress-wrapper').forEach(el => el.style.display = 'none');
    timerElement.style.display = 'none';
  }
});

// Confetti helper
const count = 1200; // Nog meer confetti!
const defaults = { origin: { y: 0.7 }, decay: 0.86, scalar: 1.3 }; // Langzamer, groter

function fire(particleRatio, opts) {
  if (typeof confetti === "function") {
    confetti(
      Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio),
      })
    );
  }
}