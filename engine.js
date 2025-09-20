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
  trail: [] // Para efeito de rastro
};

let isPaused = false;
let gameOver = false;
let timer = 180; // 3 minutos
let gameInterval, timerInterval;
let againstCPU = false;
let cpuDifficulty = "Normal";
let isMobile = false;

// Função para mostrar/esconder menus
function showMenu(menuId) {
  // Esconder todos os menus
  document.querySelectorAll('.menu-container').forEach(menu => {
    menu.classList.add('hidden');
  });
  
  // Mostrar o menu específico
  document.getElementById(menuId).classList.remove('hidden');
}

// Verificar se é dispositivo móvel
function checkMobile() {
  isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    touchControls.classList.remove("hidden");
    // Ajustar tamanho do canvas para mobile
    canvas.width = Math.min(800, window.innerWidth - 20);
    canvas.height = Math.min(400, window.innerHeight * 0.5);
    
    // Reposicionar players
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
  // Parar os intervalos do jogo
  if (gameInterval) clearInterval(gameInterval);
  if (timerInterval) clearInterval(timerInterval);
  
  // Esconder tela do jogo
  document.getElementById('gameScreen').classList.add('hidden');
  
  // Mostrar menu principal
  document.getElementById('mainMenu').classList.remove('hidden');
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
  // Desenhar rastro da bola
  for (let i = 0; i < ball.trail.length; i++) {
    const trail = ball.trail[i];
    const alpha = i / ball.trail.length * 0.6;
    ctx.globalAlpha = alpha;
    drawCircle(trail.x, trail.y, ball.radius * (0.5 + i/ball.trail.length * 0.5), "rgba(255, 255, 255, 0.5)");
  }
  ctx.globalAlpha = 1;
  
  // Desenhar bola principal com efeito de glow
  drawCircle(ball.x, ball.y, ball.radius, "white");
  
  // Efeito de brilho interno
  const gradient = ctx.createRadialGradient(
    ball.x, ball.y, 0,
    ball.x, ball.y, ball.radius
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.7, "rgba(200, 200, 255, 0.7)");
  gradient.addColorStop(1, "rgba(100, 100, 255, 0.3)");
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
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

// Funções de jogo
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speedX = ball.originalSpeedX * (Math.random() > 0.5 ? 1 : -1);
  ball.speedY = ball.originalSpeedY * (Math.random() * 2 - 1);
  ball.trail = []; // Limpar rastro
}

function limitPaddleMovement() {
  // Player 1 - Limites superior e inferior
  if (player1.y < 0) player1.y = 0;
  if (player1.y + player1.height > canvas.height) player1.y = canvas.height - player1.height;
  
  // Player 2 - Limites superior e inferior
  if (player2.y < 0) player2.y = 0;
  if (player2.y + player2.height > canvas.height) player2.y = canvas.height - player2.height;
}

function moveCPU() {
  if (!againstCPU) return;
  
  // CPU move em direção à bola com base na dificuldade
  const cpuCenter = player2.y + player2.height / 2;
  const ballCenter = ball.y;
  
  // Ajustar a velocidade da CPU baseado na dificuldade
  let cpuSpeed = player2.speed;
  if (cpuDifficulty === "Muito Fácil") cpuSpeed *= 0.5;
  else if (cpuDifficulty === "Fácil") cpuSpeed *= 0.7;
  else if (cpuDifficulty === "Normal") cpuSpeed *= 0.9;
  else if (cpuDifficulty === "Médio") cpuSpeed *= 1.0;
  else if (cpuDifficulty === "Difícil") cpuSpeed *= 1.2;
  else if (cpuDifficulty === "Impossível") cpuSpeed *= 1.5;
  
  // Adicionar um pequeno atraso para a CPU não ser perfeita
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
      
      // Calcular ângulo de rebatida baseado na posição relativa
      const hitPoint = (ball.y - player1.y) / player1.height;
      const angle = (hitPoint - 0.5) * Math.PI / 3;
      
      // Aumentar velocidade
      const speedIncrease = 0.1;
      const currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
      const newSpeed = Math.min(currentSpeed + speedIncrease, 15);
      
      ball.speedX = Math.abs(newSpeed * Math.cos(angle));
      ball.speedY = newSpeed * Math.sin(angle);
      
      // Ajustar posição para evitar colisão múltipla
      ball.x = player1.x + player1.width + ball.radius;
      
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
      
      // Calcular ângulo de rebatida baseado na posição relativa
      const hitPoint = (ball.y - player2.y) / player2.height;
      const angle = (hitPoint - 0.5) * Math.PI / 3;
      
      // Aumentar velocidade
      const speedIncrease = 0.1;
      const currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
      const newSpeed = Math.min(currentSpeed + speedIncrease, 15);
      
      ball.speedX = -Math.abs(newSpeed * Math.cos(angle));
      ball.speedY = newSpeed * Math.sin(angle);
      
      // Ajustar posição para evitar colisão múltipla
      ball.x = player2.x - ball.radius;
      
      if (hitSound) hitSound.play();
      return true;
    }
  }
  
  return false;
}

function update() {
  if (isPaused || gameOver) return;

  // Mover players baseado no estado das teclas
  if (player1.moveUp) player1.y -= player1.speed;
  if (player1.moveDown) player1.y += player1.speed;
  
  if (!againstCPU) {
    if (player2.moveUp) player2.y -= player2.speed;
    if (player2.moveDown) player2.y += player2.speed;
  }

  // Limitar movimento das raquetes
  limitPaddleMovement();
  
  // Mover a CPU se estiver no modo contra CPU
  if (againstCPU) {
    moveCPU();
  }

  // Adicionar posição atual ao rastro (limitado a 5 posições)
  ball.trail.push({x: ball.x, y: ball.y});
  if (ball.trail.length > 5) {
    ball.trail.shift();
  }

  // Mover a bola
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Colisão com borda superior/inferior
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.speedY = Math.abs(ball.speedY);
    if (hitSound) hitSound.play();
  } else if (ball.y + ball.radius > canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.speedY = -Math.abs(ball.speedY);
    if (hitSound) hitSound.play();
  }

  // Verificar colisões com os players
  checkCollision();

  // Pontuação
  if (ball.x - ball.radius < 0) {
    player2.score++;
    player2ScoreElem.textContent = player2.score;
    if (pointSound) pointSound.play();
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    player1.score++;
    player1ScoreElem.textContent = player1.score;
    if (pointSound) pointSound.play();
    resetBall();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawNet();

  // Desenhar bola com efeitos
  drawBallWithEffects();

  drawRect(player1.x, player1.y, player1.width, player1.height, "cyan");
  drawRect(player2.x, player2.y, player2.width, player2.height, "purple");

  // Mostrar mensagem de pausa
  if (isPaused) {
    drawText("PAUSADO", canvas.width / 2, canvas.height / 2, "yellow", "40px");
  }
  
  // Mostrar mensagem de fim de jogo
  if (gameOver) {
    drawText("FIM DE JOGO", canvas.width / 2, canvas.height / 2 - 40, "red", "50px");
    if (player1.score > player2.score) {
      drawText(`${player1.name} Venceu!`, canvas.width / 2, canvas.height / 2 + 20, "cyan", "30px");
    } else if (player2.score > player1.score) {
      drawText(`${player2.name} Venceu!`, canvas.width / 2, canvas.height / 2 + 20, "purple", "30px");
    } else {
      drawText("Empate!", canvas.width / 2, canvas.height / 2 + 20, "white", "30px");
    }
  }
}

function gameLoop() {
  update();
  render();
}

function updateTimerDisplay() {
  let minutes = Math.floor(timer / 60);
  let seconds = timer % 60;
  gameTimerElem.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

function startGame(difficulty) {
  console.log("Iniciando jogo com dificuldade:", difficulty);
  cpuDifficulty = difficulty;
  
  // Ajustar dificuldade
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
  
  // Resetar o jogo
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
  document.getElementById("pauseButton").textContent = "Pausar";

  resetBall();

  // Mostrar tela do jogo e esconder menus
  document.getElementById('difficultyMenu').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');

  // Iniciar loops do jogo
  gameInterval = setInterval(gameLoop, 1000 / 60);
  timerInterval = setInterval(() => {
    if (!isPaused && !gameOver) {
      timer--;
      updateTimerDisplay();
      if (timer <= 0) {
        gameOver = true;
        clearInterval(gameInterval);
        clearInterval(timerInterval);
        if (player1.score > player2.score && winSound) {
          winSound.play();
        } else if (player2.score > player1.score && loseSound) {
          loseSound.play();
        }
      }
    }
  }, 1000);
}

// Controles de teclado
document.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "W") player1.moveUp = true;
  if (e.key === "s" || e.key === "S") player1.moveDown = true;
  
  // Se não for modo CPU, player2 pode ser controlado
  if (!againstCPU) {
    if (e.key === "ArrowUp") player2.moveUp = true;
    if (e.key === "ArrowDown") player2.moveDown = true;
  }
  
  if (e.key === " ") togglePause(); // Pausa
  if (e.key === "Enter" && !gameInterval) startGame('Normal'); // Inicia com dificuldade padrão
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

// Atualizar movimento baseado no toque
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

// Modificar o gameLoop para incluir controles de toque
const originalGameLoop = gameLoop;
gameLoop = function() {
  updateTouchControls();
  originalGameLoop();
};

// Configuração dos event listeners para os botões
document.addEventListener("DOMContentLoaded", function() {
  // Menu principal
  document.getElementById("playButton").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  document.getElementById("rankingButton").addEventListener("click", function() {
    showMenu('rankingMenu');
  });
  
  document.getElementById("helpButton").addEventListener("click", function() {
    showMenu('helpMenu');
  });
  
  // Menu de jogadores
  document.getElementById("continueButton").addEventListener("click", savePlayerNames);
  document.getElementById("backFromPlayerMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  // Menu de dificuldade
  document.querySelectorAll("#difficultyMenu button[data-difficulty]").forEach(button => {
    button.addEventListener("click", function() {
      startGame(this.getAttribute('data-difficulty'));
    });
  });
  
  document.getElementById("backFromDifficultyMenu").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  // Menu de ranking
  document.getElementById("backFromRankingMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  // Menu de ajuda
  document.getElementById("backFromHelpMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  // Tela de jogo
  document.getElementById("backToMenuButton").addEventListener("click", backToMenu);
  document.getElementById("pauseButton").addEventListener("click", togglePause);
  
  // Inicialização
  checkMobile();
  console.log("Pong Neon carregado com sucesso!");
});