// Variáveis globais
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// Elementos da UI
const player1ScoreElem = document.querySelector("#player1Score .score-value");
const player2ScoreElem = document.querySelector("#player2Score .score-value");
const player1NameElem = document.querySelector("#player1Score .player-name");
const player2NameElem = document.querySelector("#player2Score .player-name");
const gameTimerElem = document.getElementById("gameTimer");
const touchControls = document.getElementById("touchControls");

// Sons
const hitSound = document.getElementById("hitSound");
const pointSound = document.getElementById("pointSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

// Variáveis do jogo
let player1 = { 
  x: 10, 
  y: canvas.height / 2 - 50, 
  width: 10, 
  height: 100, 
  score: 0, 
  name: "Player 1",
  speed: 10,
  moveUp: false,
  moveDown: false
};

let player2 = { 
  x: canvas.width - 20, 
  y: canvas.height / 2 - 50, 
  width: 10, 
  height: 100, 
  score: 0, 
  name: "Player 2",
  speed: 10,
  moveUp: false,
  moveDown: false
};

let ball = { 
  x: canvas.width / 2, 
  y: canvas.height / 2, 
  radius: 10, 
  speedX: 5, 
  speedY: 5,
  originalSpeedX: 5,
  originalSpeedY: 5,
  trail: []
};

let isPaused = false;
let gameOver = false;
let timer = 180;
let gameInterval, timerInterval;
let againstCPU = false;
let cpuDifficulty = "Normal";
let isMobile = false;
let winner = null;

// Controles touch
let leftTouchId = null;
let rightTouchId = null;

// Efeitos de colisão
let collisionEffects = [];
let screenShake = { intensity: 0, duration: 0 };
let victoryEffects = [];
let victoryMessage = { show: false, text: "", color: "", timer: 0 };

// Função para mostrar/esconder menus
function showMenu(menuId) {
  document.querySelectorAll('.menu-container').forEach(menu => {
    menu.classList.add('hidden');
  });
  document.getElementById(menuId).classList.remove('hidden');
}

// Verificar se é dispositivo móvel
function checkMobile() {
  isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    touchControls.classList.remove("hidden");
    canvas.width = Math.min(800, window.innerWidth - 20);
    canvas.height = Math.min(400, window.innerHeight * 0.5);
    player1.x = 10;
    player2.x = canvas.width - 20;
    player1.y = canvas.height / 2 - 50;
    player2.y = canvas.height / 2 - 50;
    
    // Ajustar botões para mobile
    document.querySelectorAll('button').forEach(button => {
      button.style.padding = '15px 25px';
      button.style.fontSize = '16px';
    });
  }
}

function savePlayerNames() {
  const player1Name = document.getElementById("player1Name").value.trim();
  const player2Name = document.getElementById("player2Name").value.trim();
  const cpuMode = document.getElementById("cpuMode").checked;
  
  if (player1Name) player1.name = player1Name;
  if (player2Name) player2.name = player2Name;
  
  player1NameElem.textContent = player1.name;
  player2NameElem.textContent = player2.name;
  againstCPU = cpuMode;
  showMenu('difficultyMenu');
}

function backToMenu() {
  if (gameInterval) clearInterval(gameInterval);
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('mainMenu').classList.remove('hidden');
  gameOver = false;
  winner = null;
  victoryEffects = [];
  victoryMessage.show = false;
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById("pauseButton").textContent = isPaused ? "Continuar" : "Pausar";
}

// Funções de desenho
function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

function drawCircle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBallWithEffects() {
  for (let i = 0; i < ball.trail.length; i++) {
    const trail = ball.trail[i];
    const alpha = i / ball.trail.length * 0.6;
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(
      trail.x, trail.y, 0,
      trail.x, trail.y, ball.radius * (0.5 + i/ball.trail.length * 0.5)
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(1, "rgba(100, 200, 255, 0.2)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, ball.radius * (0.5 + i/ball.trail.length * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  const gradient = ctx.createRadialGradient(
    ball.x, ball.y, 0,
    ball.x, ball.y, ball.radius * 1.5
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.5, "rgba(200, 220, 255, 0.8)");
  gradient.addColorStop(1, "rgba(100, 150, 255, 0.3)");
  ctx.fillStyle = gradient;
  ctx.shadowColor = "cyan";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawText(text, x, y, color, size = "30px") {
  ctx.fillStyle = color;
  ctx.font = `${size} Orbitron, Arial`;
  ctx.textAlign = "center";
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function drawNet() {
  for (let i = 0; i <= canvas.height; i += 20) {
    drawRect(canvas.width / 2 - 1, i, 2, 10, "cyan");
  }
}

// Funções para efeitos de colisão
function createCollisionEffect(x, y, color) {
  collisionEffects.push({
    x: x,
    y: y,
    radius: 15,
    maxRadius: 30,
    color: color,
    life: 1.0
  });
}

function createVictoryEffect() {
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    const size = 3 + Math.random() * 4;
    victoryEffects.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      size: size,
      color: winner === player1 ? "cyan" : "purple",
      life: 1.0
    });
  }
}

function showVictoryMessage(text, color) {
  victoryMessage.show = true;
  victoryMessage.text = text;
  victoryMessage.color = color;
  victoryMessage.timer = 180;
}

function createScreenShake(intensity = 5, duration = 10) {
  screenShake.intensity = intensity;
  screenShake.duration = duration;
}

function updateCollisionEffects() {
  for (let i = collisionEffects.length - 1; i >= 0; i--) {
    const effect = collisionEffects[i];
    effect.radius += 2;
    effect.life -= 0.05;
    if (effect.life <= 0 || effect.radius > effect.maxRadius) {
      collisionEffects.splice(i, 1);
    }
  }
  
  for (let i = victoryEffects.length - 1; i >= 0; i--) {
    const effect = victoryEffects[i];
    effect.x += effect.speedX;
    effect.y += effect.speedY;
    effect.life -= 0.02;
    if (effect.life <= 0) {
      victoryEffects.splice(i, 1);
    }
  }
  
  if (victoryMessage.show) {
    victoryMessage.timer--;
    if (victoryMessage.timer <= 0) {
      victoryMessage.show = false;
    }
  }
  
  if (screenShake.duration > 0) {
    screenShake.duration--;
  } else {
    screenShake.intensity = 0;
  }
}

function drawCollisionEffects() {
  for (const effect of collisionEffects) {
    ctx.globalAlpha = effect.life;
    const gradient = ctx.createRadialGradient(
      effect.x, effect.y, 0,
      effect.x, effect.y, effect.radius
    );
    gradient.addColorStop(0, effect.color);
    gradient.addColorStop(0.7, effect.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, effect.color.replace(')', ', 0)').replace('rgb', 'rgba'));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawVictoryEffects() {
  for (const effect of victoryEffects) {
    ctx.globalAlpha = effect.life;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function drawVictoryMessage() {
  if (victoryMessage.show) {
    const alpha = Math.min(1, victoryMessage.timer / 60);
    ctx.globalAlpha = alpha;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    const messageWidth = 400;
    const messageHeight = 100;
    const x = canvas.width / 2 - messageWidth / 2;
    const y = canvas.height / 2 - messageHeight / 2;
    
    ctx.fillRect(x, y, messageWidth, messageHeight);
    
    ctx.strokeStyle = victoryMessage.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = victoryMessage.color;
    ctx.shadowBlur = 15;
    ctx.strokeRect(x, y, messageWidth, messageHeight);
    
    ctx.shadowBlur = 0;
    drawText(victoryMessage.text, canvas.width / 2, canvas.height / 2 - 10, victoryMessage.color, "28px");
    
    ctx.globalAlpha = 1;
  }
}

function applyScreenShake() {
  if (screenShake.intensity > 0) {
    const offsetX = (Math.random() - 0.5) * screenShake.intensity;
    const offsetY = (Math.random() - 0.5) * screenShake.intensity;
    ctx.translate(offsetX, offsetY);
  }
}

// Funções de jogo
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speedX = ball.originalSpeedX * (Math.random() > 0.5 ? 1 : -1);
  ball.speedY = ball.originalSpeedY * (Math.random() * 2 - 1);
  ball.trail = [];
}

function limitPaddleMovement() {
  if (player1.y < 0) player1.y = 0;
  if (player1.y + player1.height > canvas.height) player1.y = canvas.height - player1.height;
  if (player2.y < 0) player2.y = 0;
  if (player2.y + player2.height > canvas.height) player2.y = canvas.height - player2.height;
}

function moveCPU() {
  if (!againstCPU) return;
  
  const cpuCenter = player2.y + player2.height / 2;
  const ballCenter = ball.y;
  let cpuSpeed = player2.speed;
  
  if (cpuDifficulty === "Muito Fácil") cpuSpeed *= 0.5;
  else if (cpuDifficulty === "Fácil") cpuSpeed *= 0.7;
  else if (cpuDifficulty === "Normal") cpuSpeed *= 0.9;
  else if (cpuDifficulty === "Médio") cpuSpeed *= 1.0;
  else if (cpuDifficulty === "Difícil") cpuSpeed *= 1.2;
  else if (cpuDifficulty === "Impossível") cpuSpeed *= 1.5;
  
  const reactionThreshold = {
    "Muito Fácil": 50,
    "Fácil": 40,
    "Normal": 30,
    "Médio": 20,
    "Difícil": 10,
    "Impossível": 5
  }[cpuDifficulty];
  
  if (Math.abs(cpuCenter - ballCenter) > reactionThreshold) {
    if (cpuCenter < ballCenter) {
      player2.y += cpuSpeed;
    } else if (cpuCenter > ballCenter) {
      player2.y -= cpuSpeed;
    }
  }
}

function checkCollision() {
  // Colisão com player1 (esquerda)
  if (ball.speedX < 0) {
    if (ball.x - ball.radius <= player1.x + player1.width &&
        ball.x - ball.radius >= player1.x &&
        ball.y >= player1.y &&
        ball.y <= player1.y + player1.height) {
      
      const hitPoint = (ball.y - player1.y) / player1.height;
      const angle = (hitPoint - 0.5) * Math.PI / 3;
      const speedIncrease = 0.1;
      const currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
      const newSpeed = Math.min(currentSpeed + speedIncrease, 15);
      
      ball.speedX = Math.abs(newSpeed * Math.cos(angle));
      ball.speedY = newSpeed * Math.sin(angle);
      ball.x = player1.x + player1.width + ball.radius;
      
      createCollisionEffect(ball.x, ball.y, "rgb(0, 255, 255)");
      createScreenShake(3, 8);
      
      if (hitSound) hitSound.play();
      return true;
    }
  }
  
  // Colisão com player2 (direita)
  if (ball.speedX > 0) {
    if (ball.x + ball.radius >= player2.x &&
        ball.x + ball.radius <= player2.x + player2.width &&
        ball.y >= player2.y &&
        ball.y <= player2.y + player2.height) {
      
      const hitPoint = (ball.y - player2.y) / player2.height;
      const angle = (hitPoint - 0.5) * Math.PI / 3;
      const speedIncrease = 0.1;
      const currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
      const newSpeed = Math.min(currentSpeed + speedIncrease, 15);
      
      ball.speedX = -Math.abs(newSpeed * Math.cos(angle));
      ball.speedY = newSpeed * Math.sin(angle);
      ball.x = player2.x - ball.radius;
      
      createCollisionEffect(ball.x, ball.y, "rgb(255, 0, 255)");
      createScreenShake(3, 8);
      
      if (hitSound) hitSound.play();
      return true;
    }
  }
  
  return false;
}

function endGame() {
  gameOver = true;
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  
  if (player1.score > player2.score) {
    winner = player1;
    showVictoryMessage(`${player1.name} Venceu!`, "cyan");
    if (winSound) {
      winSound.currentTime = 0;
      winSound.play();
    }
  } else if (player2.score > player1.score) {
    winner = player2;
    if (againstCPU) {
      showVictoryMessage("CPU Venceu!", "purple");
      if (loseSound) {
        loseSound.currentTime = 0;
        loseSound.play();
      }
    } else {
      showVictoryMessage(`${player2.name} Venceu!`, "purple");
      if (winSound) {
        winSound.currentTime = 0;
        winSound.play();
      }
    }
  } else {
    winner = null;
    showVictoryMessage("Empate!", "white");
    if (winSound) {
      winSound.currentTime = 0;
      winSound.play();
    }
  }
  
  createVictoryEffect();
  createScreenShake(10, 20);
}

function update() {
  if (isPaused || gameOver) return;

  updateCollisionEffects();

  // Movimento dos jogadores (apenas se não for mobile)
  if (!isMobile) {
    if (player1.moveUp) player1.y -= player1.speed;
    if (player1.moveDown) player1.y += player1.speed;
    
    if (!againstCPU) {
      if (player2.moveUp) player2.y -= player2.speed;
      if (player2.moveDown) player2.y += player2.speed;
    }
  }

  limitPaddleMovement();
  
  if (againstCPU) {
    moveCPU();
  }

  ball.trail.push({x: ball.x, y: ball.y});
  if (ball.trail.length > 5) {
    ball.trail.shift();
  }

  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Colisão com borda superior/inferior
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.speedY = Math.abs(ball.speedY);
    createCollisionEffect(ball.x, 0, "rgb(255, 255, 255)");
    createScreenShake(2, 5);
    if (hitSound) hitSound.play();
  } else if (ball.y + ball.radius > canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.speedY = -Math.abs(ball.speedY);
    createCollisionEffect(ball.x, canvas.height, "rgb(255, 255, 255)");
    createScreenShake(2, 5);
    if (hitSound) hitSound.play();
  }

  checkCollision();

  // Pontuação
  if (ball.x - ball.radius < 0) {
    player2.score++;
    player2ScoreElem.textContent = player2.score;
    createScreenShake(8, 15);
    for (let i = 0; i < 10; i++) {
      createCollisionEffect(canvas.width / 4, canvas.height / 2, "rgb(255, 0, 255)");
    }
    if (pointSound) pointSound.play();
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    player1.score++;
    player1ScoreElem.textContent = player1.score;
    createScreenShake(8, 15);
    for (let i = 0; i < 10; i++) {
      createCollisionEffect((3 * canvas.width) / 4, canvas.height / 2, "rgb(0, 255, 255)");
    }
    if (pointSound) pointSound.play();
    resetBall();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  applyScreenShake();

  drawNet();
  drawCollisionEffects();
  drawVictoryEffects();

  if (!gameOver) {
    drawBallWithEffects();
  }

  drawRect(player1.x, player1.y, player1.width, player1.height, "cyan");
  drawRect(player2.x, player2.y, player2.width, player2.height, "purple");

  if (victoryMessage.show) {
    drawVictoryMessage();
  }

  if (isPaused) {
    drawText("PAUSADO", canvas.width / 2, canvas.height / 2, "yellow", "40px");
  }
  
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(canvas.width / 2 - 200, canvas.height / 2 - 100, 400, 200);
    ctx.strokeStyle = winner ? (winner === player1 ? "cyan" : "purple") : "white";
    ctx.lineWidth = 3;
    ctx.shadowColor = winner ? (winner === player1 ? "cyan" : "purple") : "white";
    ctx.shadowBlur = 15;
    ctx.strokeRect(canvas.width / 2 - 200, canvas.height / 2 - 100, 400, 200);
    ctx.shadowBlur = 0;
    
    drawText("FIM DE JOGO", canvas.width / 2, canvas.height / 2 - 60, "white", "30px");
    
    if (winner) {
      const winnerName = againstCPU && winner === player2 ? "CPU" : winner.name;
      drawText(`${winnerName} Venceu!`, canvas.width / 2, canvas.height / 2 - 20, winner === player1 ? "cyan" : "purple", "36px");
      drawText(`Placar: ${player1.score} - ${player2.score}`, canvas.width / 2, canvas.height / 2 + 20, "white", "24px");
    } else {
      drawText("Empate!", canvas.width / 2, canvas.height / 2 - 20, "white", "36px");
      drawText(`Placar: ${player1.score} - ${player2.score}`, canvas.width / 2, canvas.height / 2 + 20, "white", "24px");
    }
    
    if (isMobile) {
      drawText("Toque para voltar ao menu", canvas.width / 2, canvas.height / 2 + 60, "yellow", "16px");
    } else {
      drawText("Pressione ESC para voltar ao menu", canvas.width / 2, canvas.height / 2 + 60, "yellow", "16px");
    }
  }
  
  ctx.restore();
}

function gameLoop() {
  update();
  render();
  if (timer <= 0 && !gameOver) {
    endGame();
  }
}

function updateTimerDisplay() {
  let minutes = Math.floor(timer / 60);
  let seconds = timer % 60;
  gameTimerElem.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

function startGame(difficulty) {
  console.log("Iniciando jogo com dificuldade:", difficulty);
  cpuDifficulty = difficulty;
  
  switch(difficulty) {
    case 'Muito Fácil':
      ball.originalSpeedX = 4;
      ball.originalSpeedY = 4;
      break;
    case 'Fácil':
      ball.originalSpeedX = 5;
      ball.originalSpeedY = 5;
      break;
    case 'Normal':
      ball.originalSpeedX = 6;
      ball.originalSpeedY = 6;
      break;
    case 'Médio':
      ball.originalSpeedX = 7;
      ball.originalSpeedY = 7;
      break;
    case 'Difícil':
      ball.originalSpeedX = 8;
      ball.originalSpeedY = 8;
      break;
    case 'Impossível':
      ball.originalSpeedX = 10;
      ball.originalSpeedY = 10;
      break;
    default:
      ball.originalSpeedX = 6;
      ball.originalSpeedY = 6;
  }
  
  if (gameInterval) clearInterval(gameInterval);
  if (timerInterval) clearInterval(timerInterval);

  player1.score = 0;
  player2.score = 0;
  player1ScoreElem.textContent = "0";
  player2ScoreElem.textContent = "0";
  timer = 180;
  updateTimerDisplay();
  gameOver = false;
  isPaused = false;
  winner = null;
  document.getElementById("pauseButton").textContent = "Pausar";

  collisionEffects = [];
  victoryEffects = [];
  victoryMessage.show = false;
  screenShake = { intensity: 0, duration: 0 };

  resetBall();

  document.getElementById('difficultyMenu').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');

  gameInterval = setInterval(gameLoop, 1000 / 60);
  timerInterval = setInterval(() => {
    if (!isPaused && !gameOver) {
      timer--;
      updateTimerDisplay();
    }
  }, 1000);
}

// Controles de teclado
document.addEventListener("keydown", (e) => {
  if (!isMobile) {
    if (e.key === "w" || e.key === "W") player1.moveUp = true;
    if (e.key === "s" || e.key === "S") player1.moveDown = true;
    
    if (!againstCPU) {
      if (e.key === "ArrowUp") player2.moveUp = true;
      if (e.key === "ArrowDown") player2.moveDown = true;
    }
  }
  
  if (e.key === " ") togglePause();
  if (e.key === "Enter" && !gameInterval) startGame('Normal');
  if (e.key === "Escape" && gameOver) backToMenu();
});

document.addEventListener("keyup", (e) => {
  if (!isMobile) {
    if (e.key === "w" || e.key === "W") player1.moveUp = false;
    if (e.key === "s" || e.key === "S") player1.moveDown = false;
    
    if (!againstCPU) {
      if (e.key === "ArrowUp") player2.moveUp = false;
      if (e.key === "ArrowDown") player2.moveDown = false;
    }
  }
});

// CONTROLES TOUCH PARA MOBILE
function getTouchY(touch) {
  const rect = canvas.getBoundingClientRect();
  return touch.clientY - rect.top;
}

// Player 1 - Controle por arraste
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touches = e.changedTouches;
  
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const touchX = touch.clientX;
    const touchY = getTouchY(touch);
    
    // Verificar se o toque está na área do player 1 (lado esquerdo)
    if (touchX < canvas.width / 2) {
      leftTouchId = touch.identifier;
      player1.y = touchY - player1.height / 2;
    }
    // Verificar se o toque está na área do player 2 (lado direito) e não é contra CPU
    else if (!againstCPU) {
      rightTouchId = touch.identifier;
      player2.y = touchY - player2.height / 2;
    }
  }
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touches = e.changedTouches;
  
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const touchY = getTouchY(touch);
    
    if (touch.identifier === leftTouchId) {
      player1.y = touchY - player1.height / 2;
    }
    else if (!againstCPU && touch.identifier === rightTouchId) {
      player2.y = touchY - player2.height / 2;
    }
  }
  
  // Garantir que as raquetes não saiam da tela
  limitPaddleMovement();
});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const touches = e.changedTouches;
  
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    
    if (touch.identifier === leftTouchId) {
      leftTouchId = null;
    }
    else if (touch.identifier === rightTouchId) {
      rightTouchId = null;
    }
  }
});

canvas.addEventListener('touchcancel', (e) => {
  e.preventDefault();
  leftTouchId = null;
  rightTouchId = null;
});

// Toque na tela para voltar ao menu quando o jogo acabar
canvas.addEventListener("click", (e) => {
  if (gameOver) {
    backToMenu();
  }
});

canvas.addEventListener("touchend", (e) => {
  if (gameOver) {
    e.preventDefault();
    backToMenu();
  }
});

// CONFIGURAÇÃO DOS EVENT LISTENERS - CORRIGIDO
function setupEventListeners() {
  // Menu principal
  const playButton = document.getElementById("playButton");
  const rankingButton = document.getElementById("rankingButton");
  const helpButton = document.getElementById("helpButton");
  
  if (playButton) {
    playButton.addEventListener("click", function() {
      showMenu('playerMenu');
    });
  }
  
  if (rankingButton) {
    rankingButton.addEventListener("click", function() {
      showMenu('rankingMenu');
    });
  }
  
  if (helpButton) {
    helpButton.addEventListener("click", function() {
      showMenu('helpMenu');
    });
  }
  
  // Menu de jogadores
  const continueButton = document.getElementById("continueButton");
  const backFromPlayerMenu = document.getElementById("backFromPlayerMenu");
  
  if (continueButton) {
    continueButton.addEventListener("click", savePlayerNames);
  }
  
  if (backFromPlayerMenu) {
    backFromPlayerMenu.addEventListener("click", function() {
      showMenu('mainMenu');
    });
  }
  
  // Menu de dificuldade
  const difficultyButtons = document.querySelectorAll("#difficultyMenu button[data-difficulty]");
  const backFromDifficultyMenu = document.getElementById("backFromDifficultyMenu");
  
  if (difficultyButtons) {
    difficultyButtons.forEach(button => {
      button.addEventListener("click", function() {
        startGame(this.getAttribute('data-difficulty'));
      });
    });
  }
  
  if (backFromDifficultyMenu) {
    backFromDifficultyMenu.addEventListener("click", function() {
      showMenu('playerMenu');
    });
  }
  
  // Menu de ranking
  const backFromRankingMenu = document.getElementById("backFromRankingMenu");
  if (backFromRankingMenu) {
    backFromRankingMenu.addEventListener("click", function() {
      showMenu('mainMenu');
    });
  }
  
  // Menu de ajuda
  const backFromHelpMenu = document.getElementById("backFromHelpMenu");
  if (backFromHelpMenu) {
    backFromHelpMenu.addEventListener("click", function() {
      showMenu('mainMenu');
    });
  }
  
  // Tela de jogo
  const backToMenuButton = document.getElementById("backToMenuButton");
  const pauseButton = document.getElementById("pauseButton");
  
  if (backToMenuButton) {
    backToMenuButton.addEventListener("click", backToMenu);
  }
  
  if (pauseButton) {
    pauseButton.addEventListener("click", togglePause);
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", function() {
  setupEventListeners();
  checkMobile();
  console.log("Pong Neon carregado com sucesso!");
});