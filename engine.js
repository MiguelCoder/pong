// -----------------------------
// ELEMENTOS DO HTML
// -----------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");

const hitSound = document.getElementById("hitSound");
const pointSound = document.getElementById("pointSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

const menuEl = document.getElementById("menu");
const difficultyMenuEl = document.getElementById("difficultyMenu");
const endMenuEl = document.getElementById("endMenu");
const helpMenuEl = document.getElementById("helpMenu");
const nameMenuEl = document.getElementById("nameMenu");
const startGameBtn = document.getElementById("startGameBtn");

// -----------------------------
// VARIÁVEIS DE CONFIGURAÇÃO
// -----------------------------
let paddleHeight = 100, paddleWidth = 10, paddle1Y, paddle2Y, paddleSpeed = 8;
let ballX, ballY, ballSpeedX, ballSpeedY, ballBaseSpeed = 5, ballSize = 10;
let player1Score, player2Score, gameMode = "cpu";
let upPressed = false, downPressed = false, wPressed = false, sPressed = false;
let gameRunning = false, paused = false, waitingStart = false;
let timeLeft = 180, timerInterval, cpuSpeed = 6;
let player1Name = "Player 1", player2Name = "Player 2";
let particles = [];

// -----------------------------
// DIFICULDADES
// -----------------------------
const difficulties = {
  veryeasy: { cpuSpeed: 2, ballSpeed: 4 },
  easy: { cpuSpeed: 3, ballSpeed: 4 },
  normal: { cpuSpeed: 5, ballSpeed: 5 },
  medium: { cpuSpeed: 7, ballSpeed: 6 },
  hard: { cpuSpeed: 9, ballSpeed: 7 },
  impossible: { cpuSpeed: 22, ballSpeed: 9 }
};

// -----------------------------
// MENUS
// -----------------------------
let currentMenu = "start", selectedIndex = 0;

function hideAllMenus() {
  menuEl.style.display = "none";
  difficultyMenuEl.style.display = "none";
  helpMenuEl.style.display = "none";
  nameMenuEl.style.display = "none";
  endMenuEl.style.display = "none";
  messageEl.style.display = "none";
}

function updateMenuSelection() {
  let options;
  if (currentMenu === "start") options = menuEl.querySelectorAll(".menu-option");
  else if (currentMenu === "difficulty") options = difficultyMenuEl.querySelectorAll(".menu-option");
  else if (currentMenu === "help") options = helpMenuEl.querySelectorAll(".menu-option");
  else if (currentMenu === "name") options = nameMenuEl.querySelectorAll(".menu-option");
  else options = endMenuEl.querySelectorAll(".menu-option");
  options.forEach((opt, i) => opt.classList.toggle("selected", i === selectedIndex));
}

// -----------------------------
// CLIQUES E SELEÇÃO DE MENUS
// -----------------------------
document.querySelectorAll(".menu-option").forEach((btn) => {
    btn.addEventListener("click", () => {
        const parent = btn.parentNode;
        const options = Array.from(parent.querySelectorAll(".menu-option"));
        selectedIndex = options.indexOf(btn);
        handleMenuSelect();
    });
});

document.querySelectorAll("#difficultyMenu .menu-option").forEach((btn) => {
    btn.addEventListener("click", () => {
        const diff = btn.dataset.diff;
        cpuSpeed = difficulties[diff].cpuSpeed;
        ballBaseSpeed = difficulties[diff].ballSpeed;

        hideAllMenus();
        nameMenuEl.style.display = "block";
        currentMenu = "name";
        selectedIndex = 0;
        updateMenuSelection();

        document.getElementById("player2Name").value = "CPU - " + btn.innerText;
    });
});

startGameBtn.addEventListener("click", () => { handleMenuSelect(); });

// -----------------------------
// FUNÇÃO HANDLEMENUSELECT
// -----------------------------
function handleMenuSelect() {
  if (currentMenu === "start") {
    const action = menuEl.querySelectorAll(".menu-option")[selectedIndex].dataset.action;
    if (action === "cpu") {
      hideAllMenus(); 
      difficultyMenuEl.style.display = "block";
      currentMenu = "difficulty"; 
      selectedIndex = 0; 
      updateMenuSelection();
    } else if (action === "2p") {
      hideAllMenus(); 
      nameMenuEl.style.display = "block";
      currentMenu = "name"; 
      selectedIndex = 0; 
      updateMenuSelection(); 
      gameMode = "2p";
    } else if (action === "help") {
      hideAllMenus(); 
      helpMenuEl.style.display = "block";
      currentMenu = "help"; 
      selectedIndex = 0; 
      updateMenuSelection();
    }
  } else if (currentMenu === "difficulty") {
    const diff = difficultyMenuEl.querySelectorAll(".menu-option")[selectedIndex].dataset.diff;
    cpuSpeed = difficulties[diff].cpuSpeed;
    ballBaseSpeed = difficulties[diff].ballSpeed;

    hideAllMenus();
    nameMenuEl.style.display = "block"; 
    currentMenu = "name"; 
    selectedIndex = 0; 
    updateMenuSelection();

    document.getElementById("player2Name").value = "CPU - " + difficultyMenuEl.querySelectorAll(".menu-option")[selectedIndex].innerText;
  } else if (currentMenu === "help") {
    hideAllMenus(); 
    menuEl.style.display = "block"; 
    currentMenu = "start"; 
    selectedIndex = 0; 
    updateMenuSelection();
  } else if (currentMenu === "name") {
    player1Name = document.getElementById("player1Name").value || "Player 1";
    player2Name = document.getElementById("player2Name").value || player2Name;
    hideAllMenus(); 
    startGame();
  } else if (currentMenu === "end") {
    if (selectedIndex === 0) {
      hideAllMenus(); 
      startGame();
    } else {
      hideAllMenus(); 
      menuEl.style.display = "block"; 
      currentMenu = "start"; 
      selectedIndex = 0; 
      updateMenuSelection();
    }
  }
}

// -----------------------------
// FUNÇÃO ENDGAME
// -----------------------------
function endGame() {
  gameRunning = false; 
  clearInterval(timerInterval); 
  canvas.style.display = "none"; 
  messageEl.style.display = "none"; 
  timerEl.textContent = "";

  endMenuEl.style.display = "block"; 
  currentMenu = "end"; 
  selectedIndex = 0; 
  updateMenuSelection();

  if (player1Score > player2Score) {
      document.getElementById("winnerText").textContent = player1Name + " venceu!";
      winSound.play();
  } else if (player2Score > player1Score) {
      document.getElementById("winnerText").textContent = player2Name + " venceu!";
      loseSound.play();
  } else {
      document.getElementById("winnerText").textContent = "Empate!";
  }
}

// -----------------------------
// FUNÇÕES DO JOGO
// -----------------------------
function startGame() {
  canvas.style.display = "block"; 
  messageEl.style.display = "block";
  player1Score = 0; 
  player2Score = 0;
  paddle1Y = canvas.height / 2 - paddleHeight / 2;
  paddle2Y = canvas.height / 2 - paddleHeight / 2;
  resetBall(ballBaseSpeed);
  timeLeft = 180; paused = false; gameRunning = false; waitingStart = true;
  timerEl.textContent = formatTime(timeLeft);
  clearInterval(timerInterval);
  particles = [];
  requestAnimationFrame(gameLoop);
}

function resetBall(speed = 5) {
  ballX = canvas.width / 2; ballY = canvas.height / 2;
  ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * speed;
  ballSpeedY = (Math.random() * 4 - 2);
}

function updateTimer() {
  if (!gameRunning || paused) return;
  timeLeft--; 
  timerEl.textContent = formatTime(timeLeft);
  if (timeLeft <= 0) endGame();
}

function formatTime(sec) { 
  const m = Math.floor(sec / 60), s = sec % 60; 
  return `${m}:${s < 10 ? "0" : ""}${s}`; 
}

// -----------------------------
// DESENHOS
// -----------------------------
function drawRect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function drawCircle(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.closePath(); ctx.fill(); }
function drawText(text, x, y) { ctx.fillStyle = "white"; ctx.font = "24px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(text, x, y); }
function createParticles(x, y, color) { for (let i=0;i<10;i++){particles.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:20,color});} }
function drawParticles() { for(let i=particles.length-1;i>=0;i--){const p=particles[i];ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);p.x+=p.vx;p.y+=p.vy;p.life--;if(p.life<=0)particles.splice(i,1);} }

function moveEverything() {
  if (!gameRunning || paused) return;
  ballX += ballSpeedX; ballY += ballSpeedY;

  if (ballY <= 0 || ballY >= canvas.height) { ballSpeedY = -ballSpeedY; hitSound.play(); createParticles(ballX, ballY, "yellow"); }

  if (wPressed && paddle1Y > 0) paddle1Y -= paddleSpeed;
  if (sPressed && paddle1Y < canvas.height - paddleHeight) paddle1Y += paddleSpeed;

  if (gameMode === "2p") {
    if (upPressed && paddle2Y > 0) paddle2Y -= paddleSpeed;
    if (downPressed && paddle2Y < canvas.height - paddleHeight) paddle2Y += paddleSpeed;
  } else {
    let c = paddle2Y + paddleHeight/2;
    if (c < ballY-35) paddle2Y += cpuSpeed;
    else if (c > ballY+35) paddle2Y -= cpuSpeed;
  }

  if (ballX <= paddleWidth && ballY > paddle1Y && ballY < paddle1Y+paddleHeight) {
    ballSpeedX = -ballSpeedX; 
    let deltaY = ballY - (paddle1Y+paddleHeight/2); 
    ballSpeedY = deltaY*0.25; 
    hitSound.play(); 
    createParticles(ballX, ballY, "white");
  }

  if (ballX >= canvas.width - paddleWidth && ballY > paddle2Y && ballY < paddle2Y+paddleHeight) {
    ballSpeedX = -ballSpeedX; 
    let deltaY = ballY - (paddle2Y+paddleHeight/2); 
    ballSpeedY = deltaY*0.25; 
    hitSound.play(); 
    createParticles(ballX, ballY, "white");
  }

  if (ballX < 0) { player2Score++; pointSound.play(); createParticles(ballX, ballY, "red"); resetBall(Math.abs(ballSpeedX)); }
  if (ballX > canvas.width) { player1Score++; pointSound.play(); createParticles(ballX, ballY, "red"); resetBall(Math.abs(ballSpeedX)); }
}

function drawEverything() {
  if (!gameRunning && !waitingStart) return;
  drawRect(0,0,canvas.width,canvas.height,"black");
  for(let i=0;i<canvas.height;i+=30) drawRect(canvas.width/2-1,i,2,20,"white");
  drawRect(0,paddle1Y,paddleWidth,paddleHeight,"white");
  drawRect(canvas.width-paddleWidth,paddle2Y,paddleWidth,paddleHeight,"white");
  drawCircle(ballX,ballY,ballSize,"white");
  drawText(player1Name+" "+player1Score,canvas.width/4,10);
  drawText(player2Name+" "+player2Score,canvas.width*3/4,10);
  drawParticles();
  if(waitingStart) messageEl.style.display = "block";
  else messageEl.style.display = "none";
}

function gameLoop() { moveEverything(); drawEverything(); requestAnimationFrame(gameLoop); }

// -----------------------------
// CONTROLES
// -----------------------------
document.addEventListener("keydown",(e)=>{
    if(e.key==="ArrowUp") upPressed=true;
    if(e.key==="ArrowDown") downPressed=true;
    if(e.key==="w") wPressed=true;
    if(e.key==="s") sPressed=true;

    // navegação menus
    if(currentMenu!=="none" && !waitingStart){
        if(e.key==="ArrowUp"){ selectedIndex=Math.max(0,selectedIndex-1); updateMenuSelection(); }
        if(e.key==="ArrowDown"){
            let options;
            if(currentMenu==="start") options=menuEl.querySelectorAll(".menu-option");
            else if(currentMenu==="difficulty") options=difficultyMenuEl.querySelectorAll(".menu-option");
            else if(currentMenu==="help") options=helpMenuEl.querySelectorAll(".menu-option");
            else if(currentMenu==="name") options=nameMenuEl.querySelectorAll(".menu-option");
            else options=endMenuEl.querySelectorAll(".menu-option");
            selectedIndex=Math.min(options.length-1,selectedIndex+1); updateMenuSelection();
        }
    }

    if(e.key==="Enter"){
        if(waitingStart){
            waitingStart=false; gameRunning=true; messageEl.style.display="none";
            timerInterval=setInterval(updateTimer,1000);
        } else if(currentMenu!=="none"){
            handleMenuSelect();
        }
    }

    if(e.key===" " && gameRunning) paused=!paused;
});

document.addEventListener("keyup",(e)=>{
    if(e.key==="ArrowUp") upPressed=false;
    if(e.key==="ArrowDown") downPressed=false;
    if(e.key==="w") wPressed=false;
    if(e.key==="s") sPressed=false;
});
