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
const rankingMenuEl = document.getElementById("rankingMenu");
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

// Dificuldades corrigidas
const difficulties = {
  veryeasy:  { cpuSpeed: 1, ballSpeed: 2, label: "Muito Fácil" },
  easy:      { cpuSpeed: 3, ballSpeed: 2, label: "Fácil" },
  normal:    { cpuSpeed: 4, ballSpeed: 4, label: "Normal" },
  medium:    { cpuSpeed: 5, ballSpeed: 7, label: "Médio" },
  hard:      { cpuSpeed: 6, ballSpeed: 8, label: "Difícil" },
  impossible:{ cpuSpeed: 9, ballSpeed: 10, label: "Impossível" }
};

// Menus
let currentMenu = "start", selectedIndex = 0;

// -----------------------------
// FUNÇÕES DE MENU
// -----------------------------
function hideAllMenus() {
  menuEl.style.display = "none";
  difficultyMenuEl.style.display = "none";
  helpMenuEl.style.display = "none";
  nameMenuEl.style.display = "none";
  endMenuEl.style.display = "none";
  rankingMenuEl.style.display = "none";
  messageEl.style.display = "none";
}

function updateMenuSelection(){
  let options;
  if(currentMenu==="start") options=menuEl.querySelectorAll(".menu-option");
  else if(currentMenu==="difficulty") options=difficultyMenuEl.querySelectorAll(".menu-option");
  else if(currentMenu==="help") options=helpMenuEl.querySelectorAll(".menu-option");
  else if(currentMenu==="name") options=nameMenuEl.querySelectorAll(".menu-option");
  else if(currentMenu==="end") options=endMenuEl.querySelectorAll(".menu-option");
  else if(currentMenu==="ranking") options=rankingMenuEl.querySelectorAll(".menu-option");
  else options=[];
  options.forEach((opt,i)=>opt.classList.toggle("selected",i===selectedIndex));
}

// -----------------------------
// RANKING
// -----------------------------
function saveScore(winner, score) {
    let ranking = JSON.parse(localStorage.getItem("pongRanking")) || [];
    ranking.push({ player: winner, points: score, date: new Date().toLocaleString() });

    ranking.sort((a, b) => b.points - a.points);
    ranking = ranking.slice(0, 5);

    localStorage.setItem("pongRanking", JSON.stringify(ranking));
}

function showRanking() {
    hideAllMenus();
    const ranking = JSON.parse(localStorage.getItem("pongRanking")) || [];
    const list = ranking.map((r, i) => 
        `<li>${i+1}. ${r.player} - ${r.points} pts (${r.date})</li>`
    ).join("");
    document.getElementById("rankingList").innerHTML = list || "<li>Sem partidas ainda</li>";
    rankingMenuEl.style.display = "block";
    currentMenu = "ranking";
    selectedIndex = 0;
    updateMenuSelection();
}

// -----------------------------
// FUNÇÕES DO JOGO
// -----------------------------
function startGame(){
  canvas.style.display="block"; messageEl.style.display="block";
  player1Score=0; player2Score=0;
  paddle1Y = canvas.height/2 - paddleHeight/2;
  paddle2Y = canvas.height/2 - paddleHeight/2;
  resetBall(ballBaseSpeed);
  timeLeft=180; paused=false; gameRunning=false; waitingStart=true;
  timerEl.textContent = formatTime(timeLeft);
  clearInterval(timerInterval);
  particles=[];
  requestAnimationFrame(gameLoop);
}

function resetBall(speed=5){ 
  ballX=canvas.width/2; ballY=canvas.height/2; 
  ballSpeedX=(Math.random()>0.5?1:-1)*speed; 
  ballSpeedY=(Math.random()*4-2);
}

function updateTimer(){ if(!gameRunning||paused) return; timeLeft--; timerEl.textContent=formatTime(timeLeft); if(timeLeft<=0) endGame();}
function formatTime(sec){ const m=Math.floor(sec/60), s=sec%60; return `${m}:${s<10?"0":""}${s}`; }

function endGame(){
  gameRunning=false; clearInterval(timerInterval); canvas.style.display="none"; messageEl.style.display="none"; timerEl.textContent="";
  endMenuEl.style.display="block"; currentMenu="end"; selectedIndex=0; updateMenuSelection();
  if(player1Score>player2Score){
      document.getElementById("winnerText").textContent=player1Name+" venceu!";
      winSound.play();
      saveScore(player1Name, player1Score);
  }
  else if(player2Score>player1Score){
      document.getElementById("winnerText").textContent=player2Name+" venceu!";
      loseSound.play();
      saveScore(player2Name, player2Score);
  }
  else{
      document.getElementById("winnerText").textContent="Empate!";
  }
}

// -----------------------------
// DESENHOS
// -----------------------------
function drawRect(x,y,w,h,color){ctx.fillStyle=color; ctx.fillRect(x,y,w,h);}
function drawCircle(x,y,r,color){ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.closePath(); ctx.fill();}
function drawText(text,x,y){ctx.fillStyle="white"; ctx.font="24px Arial"; ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText(text,x,y);}
function createParticles(x,y,color){ for(let i=0;i<10;i++){ particles.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:20,color}); } }
function drawParticles(){ for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,2,2); p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) particles.splice(i,1); } }

function moveEverything(){
  if(!gameRunning||paused) return;
  ballX+=ballSpeedX; ballY+=ballSpeedY;
  if(ballY<=0||ballY>=canvas.height){ ballSpeedY=-ballSpeedY; hitSound.play(); createParticles(ballX,ballY,"yellow");}
  if(wPressed && paddle1Y>0)paddle1Y-=paddleSpeed;
  if(sPressed && paddle1Y<canvas.height-paddleHeight)paddle1Y+=paddleSpeed;
  if(gameMode==="2p"){ if(upPressed&&paddle2Y>0)paddle2Y-=paddleSpeed; if(downPressed&&paddle2Y<canvas.height-paddleHeight)paddle2Y+=paddleSpeed;}
  else{ let c=paddle2Y+paddleHeight/2; if(c<ballY-35)paddle2Y+=cpuSpeed; else if(c>ballY+35)paddle2Y-=cpuSpeed; }
  if(ballX<=paddleWidth && ballY>paddle1Y && ballY<paddle1Y+paddleHeight){ ballSpeedX=-ballSpeedX; let deltaY=ballY-(paddle1Y+paddleHeight/2); ballSpeedY=deltaY*0.25; hitSound.play(); createParticles(ballX,ballY,"white"); }
  if(ballX>=canvas.width-paddleWidth && ballY>paddle2Y && ballY<paddle2Y+paddleHeight){ ballSpeedX=-ballSpeedX; let deltaY=ballY-(paddle2Y+paddleHeight/2); ballSpeedY=deltaY*0.25; hitSound.play(); createParticles(ballX,ballY,"white"); }
  if(ballX<0){ player2Score++; pointSound.play(); createParticles(ballX,ballY,"red"); resetBall(Math.abs(ballSpeedX));}
  if(ballX>canvas.width){ player1Score++; pointSound.play(); createParticles(ballX,ballY,"red"); resetBall(Math.abs(ballSpeedX));}
}

function drawEverything(){
  if(!gameRunning && !waitingStart) return;
  drawRect(0,0,canvas.width,canvas.height,"black");
  for(let i=0;i<canvas.height;i+=30) drawRect(canvas.width/2-1,i,2,20,"white");
  drawRect(0,paddle1Y,paddleWidth,paddleHeight,"white");
  drawRect(canvas.width-paddleWidth,paddle2Y,paddleWidth,paddleHeight,"white");
  drawCircle(ballX,ballY,ballSize,"white");
  drawText(player1Name+" "+player1Score,canvas.width/4,10);
  drawText(player2Name+" "+player2Score,canvas.width*3/4,10);
  drawParticles();
  if(waitingStart) messageEl.style.display="block";
  else messageEl.style.display="none";
}

function gameLoop(){ moveEverything(); drawEverything(); requestAnimationFrame(gameLoop); }

// -----------------------------
// CLIQUES E SELEÇÃO DE MENUS
// -----------------------------
document.querySelectorAll(".menu-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        const parent = btn.parentNode;
        const options = Array.from(parent.querySelectorAll(".menu-option"));
        selectedIndex = options.indexOf(btn);
        handleMenuSelect();
    });
});

startGameBtn.addEventListener("click", () => { handleMenuSelect(); });

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
    } else if (action === "ranking") {
      showRanking();
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
    document.getElementById("player2Name").value = "CPU - " + difficulties[diff].label;
  } else if (currentMenu === "help" || currentMenu === "ranking") {
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
// CONTROLES
// -----------------------------
document.addEventListener("keydown",(e)=>{
  if(e.key==="ArrowUp") upPressed=true;
  if(e.key==="ArrowDown") downPressed=true;
  if(e.key==="w") wPressed=true;
  if(e.key==="s") sPressed=true;

  if(currentMenu!=="none"){
    if(e.key==="ArrowUp"){ selectedIndex=(selectedIndex-1+document.querySelectorAll(`#${currentMenu} .menu-option`).length)%document.querySelectorAll(`#${currentMenu} .menu-option`).length; updateMenuSelection();}
    if(e.key==="ArrowDown"){ selectedIndex=(selectedIndex+1)%document.querySelectorAll(`#${currentMenu} .menu-option`).length; updateMenuSelection();}
    if(e.key==="Enter"){ handleMenuSelect(); }
  }

  if(waitingStart && e.key==="Enter"){
    waitingStart=false; gameRunning=true;
    timerInterval=setInterval(updateTimer,1000);
  }
  if(gameRunning && e.key===" "){ paused=!paused; }
});

document.addEventListener("keyup",(e)=>{
  if(e.key==="ArrowUp") upPressed=false;
  if(e.key==="ArrowDown") downPressed=false;
  if(e.key==="w") wPressed=false;
  if(e.key==="s") sPressed=false;
});

// -----------------------------
// CONTROLES TOUCH
// -----------------------------
document.getElementById("p1-up").addEventListener("touchstart", () => wPressed = true);
document.getElementById("p1-up").addEventListener("touchend", () => wPressed = false);
document.getElementById("p1-down").addEventListener("touchstart", () => sPressed = true);
document.getElementById("p1-down").addEventListener("touchend", () => sPressed = false);
document.getElementById("p2-up").addEventListener("touchstart", () => upPressed = true);
document.getElementById("p2-up").addEventListener("touchend", () => upPressed = false);
document.getElementById("p2-down").addEventListener("touchstart", () => downPressed = true);
document.getElementById("p2-down").addEventListener("touchend", () => downPressed = false);
