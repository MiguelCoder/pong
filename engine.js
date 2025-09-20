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

// Efeitos de colisão
let collisionEffects = [];
let screenShake = { intensity: 0, duration: 0 };
let victoryEffects = [];

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
  
  // Determinar vencedor
  if (player1.score > player2.score) {
    winner = player1;
    if (winSound) {
      winSound.currentTime = 0;
      winSound.play();
    }
  } else if (player2.score > player1.score) {
    winner = player2;
    if (againstCPU && loseSound) {
      loseSound.currentTime = 0;
      loseSound.play();
    } else if (winSound) {
      winSound.currentTime = 0;
      winSound.play();
    }
  } else {
    winner = null;
    if (winSound) {
      winSound.currentTime = 0;
      winSound.play();
    }
  }
  
  // Criar efeitos de vitória
  createVictoryEffect();
  createScreenShake(10, 20);
}

function update() {
  if (isPaused || gameOver) return;

  updateCollisionEffects();

  if (player1.moveUp) player1.y -= player1.speed;
  if (player1.moveDown) player1.y += player1.speed;
  
  if (!againstCPU) {
    if (player2.moveUp) player2.y -= player2.speed;
    if (player2.moveDown) player2.y += player2.speed;
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
      drawText(`${winner.name} Venceu!`, canvas.width / 2, canvas.height / 2 - 20, winner === player1 ? "cyan" : "purple", "36px");
      drawText(`Placar: ${player1.score} - ${player2.score}`, canvas.width / 2, canvas.height / 2 + 20, "white", "24px");
    } else {
      drawText("Empate!", canvas.width / 2, canvas.height / 2 - 20, "white", "36px");
      drawText(`Placar: ${player1.score} - ${player2.score}`, canvas.width / 2, canvas.height / 2 + 20, "white", "24px");
    }
    
    drawText("Pressione ESC para voltar ao menu", canvas.width / 2, canvas.height / 2 + 60, "yellow", "16px");
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
  if (e.key === "w" || e.key === "W") player1.moveUp = true;
  if (e.key === "s" || e.key === "S") player1.moveDown = true;
  
  if (!againstCPU) {
    if (e.key === "ArrowUp") player2.moveUp = true;
    if (e.key === "ArrowDown") player2.moveDown = true;
  }
  
  if (e.key === " ") togglePause();
  if (e.key === "Enter" && !gameInterval) startGame('Normal');
  if (e.key === "Escape" && gameOver) backToMenu();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W") player1.moveUp = false;
  if (e.key === "s" || e.key === "S") player1.moveDown = false;
  
  if (!againstCPU) {
    if (e.key === "ArrowUp") player2.moveUp = false;
    if (e.key === "ArrowDown") player2.moveDown = false;
  }
});

// Controles de toque para mobile
let leftTouchActive = false;
let rightTouchActive = false;

document.getElementById("leftTouch").addEventListener("touchstart", (e) => {
  e.preventDefault();
  leftTouchActive = true;
});

document.getElementById("leftTouch").addEventListener("touchend", (e) => {
  e.preventDefault();
  leftTouchActive = false;
});

document.getElementById("rightTouch").addEventListener("touchstart", (e) => {
  e.preventDefault();
  rightTouchActive = true;
});

document.getElementById("rightTouch").addEventListener("touchend", (e) => {
  e.preventDefault();
  rightTouchActive = false;
});

function updateTouchControls() {
  if (isMobile) {
    player1.moveUp = leftTouchActive;
    player1.moveDown = false;
    
    if (!againstCPU) {
      player2.moveUp = rightTouchActive;
      player2.moveDown = false;
    }
  }
}

const originalGameLoop = gameLoop;
gameLoop = function() {
  updateTouchControls();
  originalGameLoop();
};

// Configuração dos event listeners para os botões
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("playButton").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  document.getElementById("rankingButton").addEventListener("click", function() {
    showMenu('rankingMenu');
  });
  
  document.getElementById("helpButton").addEventListener("click", function() {
    showMenu('helpMenu');
  });
  
  document.getElementById("continueButton").addEventListener("click", savePlayerNames);
  document.getElementById("backFromPlayerMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  document.querySelectorAll("#difficultyMenu button[data-difficulty]").forEach(button => {
    button.addEventListener("click", function() {
      startGame(this.getAttribute('data-difficulty'));
    });
  });
  
  document.getElementById("backFromDifficultyMenu").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  document.getElementById("backFromRankingMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  document.getElementById("backFromHelpMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  document.getElementById("backToMenuButton").addEventListener("click", backToMenu);
  document.getElementById("pauseButton").addEventListener("click", togglePause);
  
  checkMobile();
  console.log("Pong Neon carregado com sucesso!");
});