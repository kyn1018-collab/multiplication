const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

const ui = {
    score: document.getElementById('score'),
    time: document.getElementById('time'),
    life: document.getElementById('life-display'),
    problem: document.getElementById('problem-display'),
    car: document.getElementById('player-car'),
    gatesContainer: document.getElementById('gates-container'),
    track: document.getElementById('track'),
    hint: document.getElementById('hint-display'),
    finalScore: document.getElementById('final-score'),
    feedbackMessage: document.getElementById('feedback-message')
};

let gameState = {
    isPlaying: false,
    level: 'low',
    score: 0,
    time: 60,
    lives: 3,
    speed: 5,
    baseSpeed: 5,
    gateSpeed: 5, // px per frame
    currentProblem: null,
    gates: [],
    lastTime: 0,
    timer: null
};

// Sound effects using Audio API
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// Generate Problem
function generateProblem() {
    let num1, num2;
    if (gameState.level === 'low') {
        // 하: 2자리 x 1자리
        num1 = Math.floor(Math.random() * 90) + 10; // 10~99
        num2 = Math.floor(Math.random() * 8) + 2;   // 2~9
    } else if (gameState.level === 'mid') {
        // 중: 3자리 x 1자리
        num1 = Math.floor(Math.random() * 900) + 100; // 100~999
        num2 = Math.floor(Math.random() * 8) + 2;     // 2~9
    } else {
        // 상: 3자리 x 2자리
        num1 = Math.floor(Math.random() * 900) + 100; // 100~999
        num2 = Math.floor(Math.random() * 90) + 10;   // 10~99
    }
    
    const correctAns = num1 * num2;
    // Generate wrong answers that are plausible
    let wrong1 = correctAns + (Math.floor(Math.random() * 5) + 1) * 10;
    let wrong2 = correctAns - (Math.floor(Math.random() * 5) + 1) * 10;
    
    // Add some random variations
    if (Math.random() > 0.5) wrong1 += 100;
    if (Math.random() > 0.5) wrong2 -= 100;
    
    // Ensure wrong answers are positive and distinct
    if (wrong2 <= 0) wrong2 = correctAns + 20;
    if (wrong1 === wrong2) wrong1 += 10;
    if (wrong1 === correctAns) wrong1 += 10;
    if (wrong2 === correctAns) wrong2 -= 10;

    let answers = [correctAns, wrong1, wrong2];
    answers.sort(() => Math.random() - 0.5); // Shuffle array

    return {
        text: `${num1} × ${num2} = ?`,
        correct: correctAns,
        answers: answers
    };
}

function spawnGates() {
    if (!gameState.isPlaying) return;
    
    const problem = generateProblem();
    gameState.currentProblem = problem;
    ui.problem.textContent = problem.text;

    const row = document.createElement('div');
    row.className = 'gate-row';
    row.style.top = '-100px';

    const gateData = {
        el: row,
        y: -100,
        answers: problem.answers,
        correctValue: problem.correct
    };

    problem.answers.forEach((ans) => {
        const gate = document.createElement('div');
        gate.className = 'gate';
        gate.textContent = ans;
        row.appendChild(gate);
    });

    ui.gatesContainer.appendChild(row);
    gameState.gates.push(gateData);
}

function startGame(level) {
    initAudio();
    
    gameState.level = level;
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.time = 60;
    gameState.lives = 3;
    
    // Set speed based on difficulty (4배 느리게 변경)
    gameState.gateSpeed = level === 'low' ? 1 : (level === 'mid' ? 1.25 : 1.5);
    gameState.baseSpeed = gameState.gateSpeed;
    
    gameState.gates.forEach(g => g.el.remove());
    gameState.gates = [];
    ui.gatesContainer.innerHTML = '';
    
    updateHUD();
    
    screens.start.classList.remove('active');
    screens.end.classList.remove('active');
    screens.game.classList.add('active');
    
    ui.track.classList.add('moving');
    ui.track.style.animationDuration = `${10 / gameState.gateSpeed}s`;
    
    // Initial car position
    ui.car.style.left = `50%`;

    spawnGates();
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    
    gameState.timer = setInterval(() => {
        if (!gameState.isPlaying) return;
        gameState.time--;
        ui.time.textContent = gameState.time;
        if (gameState.time <= 0 || gameState.lives <= 0) {
            endGame();
        }
    }, 1000);
}

function updateHUD() {
    ui.score.textContent = gameState.score;
    ui.time.textContent = gameState.time;
    ui.life.textContent = '❤️'.repeat(gameState.lives);
}

function showHint(correctAnswer) {
    ui.hint.textContent = `정답은 ${correctAnswer} 였습니다!`;
    ui.hint.style.opacity = 1;
    setTimeout(() => {
        ui.hint.style.opacity = 0;
    }, 2000);
}

function gameLoop(time) {
    if (!gameState.isPlaying) return;

    const deltaTime = (time - gameState.lastTime) / 16.66; // Normalize to approx 60fps
    gameState.lastTime = time;

    // Move gates
    for (let i = gameState.gates.length - 1; i >= 0; i--) {
        let g = gameState.gates[i];
        g.y += gameState.gateSpeed * deltaTime;
        g.el.style.top = `${g.y}px`;

        // Collision Check
        const carRect = ui.car.getBoundingClientRect();
        const gateRect = g.el.getBoundingClientRect();
        
        // Car is at the bottom, gate moves down
        if (g.y + 80 > window.innerHeight - 150 && g.y < window.innerHeight - 30) {
            // Determine which lane the car is in (0, 1, or 2)
            const carCenter = carRect.left + carRect.width / 2;
            const screenWidth = window.innerWidth;
            
            let col = 0;
            if (carCenter > screenWidth * 0.33 && carCenter <= screenWidth * 0.66) col = 1;
            if (carCenter > screenWidth * 0.66) col = 2;

            const selectedAnswer = g.answers[col];
            
            if (selectedAnswer === g.correctValue) {
                // Correct
                playSound('correct');
                gameState.score += 100;
                ui.track.style.animationDuration = '0.2s'; // Boost effect
                setTimeout(() => { ui.track.style.animationDuration = `${10 / gameState.baseSpeed}s`; }, 500);
            } else {
                // Wrong
                playSound('wrong');
                gameState.lives--;
                ui.car.classList.add('shake');
                setTimeout(() => ui.car.classList.remove('shake'), 500);
                showHint(g.correctValue);
            }
            
            updateHUD();
            g.el.remove();
            gameState.gates.splice(i, 1);
            
            if (gameState.lives > 0) {
                spawnGates();
            } else {
                endGame();
            }
        } else if (g.y > window.innerHeight) {
            // Missed gate
            g.el.remove();
            gameState.gates.splice(i, 1);
            if (gameState.lives > 0) {
                spawnGates();
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timer);
    ui.track.classList.remove('moving');
    
    screens.game.classList.remove('active');
    screens.end.classList.add('active');
    
    ui.finalScore.textContent = gameState.score;
    
    if (gameState.score >= 1000) {
        ui.feedbackMessage.textContent = '대단해요! 완벽한 레이서네요! 🏆';
    } else if (gameState.score >= 500) {
        ui.feedbackMessage.textContent = '잘했어요! 조금만 더 연습하면 최고가 될 거예요! 🌟';
    } else {
        ui.feedbackMessage.textContent = '조금 더 연습해봐요! 화이팅! 💪';
    }
}

// Input Handling - Touch & Mouse Drag
let isDragging = false;

function handleMove(clientX) {
    if (!gameState.isPlaying) return;
    let newX = clientX;
    const padding = ui.car.offsetWidth / 2 + 20;
    if (newX < padding) newX = padding;
    if (newX > window.innerWidth - padding) newX = window.innerWidth - padding;
    ui.car.style.left = `${newX}px`;
}

ui.track.addEventListener('mousedown', (e) => { 
    isDragging = true; 
    handleMove(e.clientX); 
});
window.addEventListener('mousemove', (e) => { 
    if (isDragging) handleMove(e.clientX); 
});
window.addEventListener('mouseup', () => { 
    isDragging = false; 
});

ui.track.addEventListener('touchstart', (e) => { 
    isDragging = true; 
    handleMove(e.touches[0].clientX); 
});
window.addEventListener('touchmove', (e) => { 
    if (isDragging) handleMove(e.touches[0].clientX); 
}, { passive: false });
window.addEventListener('touchend', () => { 
    isDragging = false; 
});

// Buttons
document.querySelectorAll('.difficulty-buttons button').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.level));
});

document.getElementById('restart-btn').addEventListener('click', () => {
    screens.end.classList.remove('active');
    screens.start.classList.add('active');
});
