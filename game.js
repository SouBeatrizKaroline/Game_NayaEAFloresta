const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const intro = document.getElementById('intro'), finish = document.getElementById('finish');
const hud = document.getElementById('hud'), toast = document.getElementById('toast');
const count = document.getElementById('count'), talk = document.getElementById('talk');
const speaker = document.getElementById('speaker'), message = document.getElementById('message');
const interact = document.getElementById('interact'), soundButton = document.getElementById('soundButton');
const shell = document.getElementById('shell'), starTrack = document.getElementById('starTrack');
const W = 960, H = 540, keys = {};
const stars = [{x:170,y:180},{x:335,y:115},{x:510,y:220},{x:700,y:135},{x:825,y:320},{x:585,y:405},{x:240,y:390}];
const friends = [{x:120,y:370,name:'a coruja',line:'O vento levou uma estrela para o lado das pedras.'},{x:450,y:370,name:'o cervo',line:'A água sabe o caminho. Pergunte ao rio.'},{x:760,y:420,name:'a árvore antiga',line:'Toda luz que você escuta também escuta você.'}];
let player, found, playing = false, last = 0, sound = true, near = -1, audio, finishTimer;
let sparks = [], footsteps = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function playNote(frequency, duration = .13) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator(), volume = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(.0001, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.07, audio.currentTime + .02);
    volume.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch (_) { /* O jogo continua mesmo sem suporte a áudio. */ }
}

function listen() {
  if (!playing || near < 0) return;
  speak(friends[near].name, friends[near].line);
  playNote(440);
}

addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (!playing || !['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)) return;
  e.preventDefault();
  keys[key] = true;
  if (key === ' ' && !e.repeat) listen();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { Object.keys(keys).forEach(key => keys[key] = false); });
document.querySelectorAll('[data-direction]').forEach(button => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); keys[direction] = true; });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(event, () => { keys[direction] = false; });
  }
});
document.getElementById('listenButton').addEventListener('click', listen);
function start() {
  intro.classList.add('hidden');
  finish.classList.add('hidden');
  hud.classList.remove('hidden');
  shell.classList.add('is-playing');
  reset();
  playing = true;
  last = 0;
}
document.getElementById('startButton').onclick = start;
document.getElementById('againButton').onclick = start;
soundButton.onclick = () => {
  sound = !sound;
  soundButton.querySelector('span').textContent = sound ? 'som' : 'mudo';
  soundButton.setAttribute('aria-pressed', String(sound));
  soundButton.setAttribute('aria-label', sound ? 'Desativar som' : 'Ativar som');
  if (sound) playNote(523);
};

function reset() {
  clearTimeout(finishTimer);
  clearTimeout(speak.t);
  clearTimeout(showToast.t);
  player = {x:90,y:270};
  found = new Set();
  near = -1;
  count.textContent = '0';
  starTrack.textContent = '✧ ✧ ✧ ✧ ✧ ✧ ✧';
  sparks = [];
  talk.classList.add('hidden');
  toast.classList.add('hidden');
  interact.classList.add('hidden');
  Object.keys(keys).forEach(key => keys[key] = false);
}
function loop(t) {
  const dt = last ? Math.min((t - last) / 16, 2) : 0;
  last = t;
  if (playing) update(dt);
  sparks = sparks.filter(p => p.life > 0);
  sparks.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  draw(reducedMotion ? 0 : t);
  requestAnimationFrame(loop);
}
function update(dt) {
  const x = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const y = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const n = Math.hypot(x, y) || 1;
  player.x = Math.max(35, Math.min(925, player.x + x / n * 2.5 * dt));
  player.y = Math.max(90, Math.min(485, player.y + y / n * 2.5 * dt));
  player.moving = !!(x || y);
  if (x) player.facing = Math.sign(x);
  if (player.moving && (footsteps += dt) > 7) {
    footsteps = 0;
    sparks.push({x:player.x + (Math.random()-.5)*12,y:player.y+22,vx:(Math.random()-.5)*.5,vy:-.4,life:18,max:18,color:'#cde0a4',size:2});
  }
  near = friends.findIndex(f => Math.hypot(player.x - f.x, player.y - f.y) < 45);
  interact.classList.toggle('hidden', near < 0 || !talk.classList.contains('hidden'));
  stars.forEach((star, i) => {
    if (found.has(i) || Math.hypot(player.x - star.x, player.y - star.y) >= 25) return;
    found.add(i);
    count.textContent = found.size;
    starTrack.textContent = Array.from({length:stars.length}, (_, index) => index < found.size ? '✦' : '✧').join(' ');
    for (let j = 0; j < 20; j++) {
      const angle = j * Math.PI * 2 / 20;
      const speed = 1 + Math.random() * 2;
      sparks.push({x:star.x,y:star.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:25,max:25,color:j%3?'#ffe1a1':'#fff7d9',size:j%3?3:5});
    }
    playNote(523 + found.size * 65, .2);
    showToast(found.size === stars.length ? 'A última estrela encontrou você.' : 'Você ouviu um brilho entre as folhas.');
    if (found.size === stars.length) finishTimer = setTimeout(() => {
      playing = false;
      shell.classList.remove('is-playing');
      hud.classList.add('hidden');
      talk.classList.add('hidden');
      interact.classList.add('hidden');
      toast.classList.add('hidden');
      finish.classList.remove('hidden');
    }, 1300);
  });
}
function speak(who, what) {
  speaker.textContent = who;
  message.textContent = what;
  talk.classList.remove('hidden');
  interact.classList.add('hidden');
  clearTimeout(speak.t);
  speak.t = setTimeout(() => { talk.classList.add('hidden'); }, 3600);
}
function showToast(text) {
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.add('hidden'), 1900);
}
reset();
requestAnimationFrame(loop);
function draw(t) {
  const g = ctx;
  g.save();
  if (innerWidth <= 700 && innerWidth / innerHeight < 1.1) {
    const visibleWidth = H * innerWidth / innerHeight;
    const center = Math.max(visibleWidth / 2, Math.min(W - visibleWidth / 2, player.x));
    g.translate(W / 2 - center, 0);
  }
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0d2338'); sky.addColorStop(.55, '#25465a'); sky.addColorStop(1, '#315653');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // Céu, lua e montanhas ao fundo.
  for (let i = 0; i < 48; i++) {
    const x = (i * 173 + 71) % W, y = 18 + (i * 97) % 240;
    g.globalAlpha = .25 + (Math.sin(t / 900 + i * 3) + 1) * .25;
    g.fillStyle = '#fff2c5'; g.fillRect(x, y, i % 5 === 0 ? 3 : 2, 2);
  }
  g.globalAlpha = 1;
  const moon = g.createRadialGradient(765, 100, 8, 765, 100, 114);
  moon.addColorStop(0, '#f6dba748'); moon.addColorStop(1, '#f6dba700');
  g.fillStyle = moon; g.beginPath(); g.arc(765, 100, 114, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffe1ad'; g.beginPath(); g.arc(765, 100, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#173449'; g.beginPath(); g.arc(780, 87, 32, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#203b49';
  g.beginPath(); g.moveTo(0, 315);
  for (let x = 0; x <= W; x += 50) g.lineTo(x, 254 + Math.sin(x / 85) * 32 + Math.sin(x / 33) * 10);
  g.lineTo(W, 410); g.lineTo(0, 410); g.fill();
  g.fillStyle = '#294b4f';
  g.beginPath(); g.moveTo(0, 325);
  for (let x = 0; x <= W; x += 30) g.lineTo(x, 290 + Math.sin(x / 60 + 2) * 31);
  g.lineTo(W, 450); g.lineTo(0, 450); g.fill();

  // Troncos distantes e copa em camadas.
  for (let i = 0; i < 16; i++) pine((i * 79 + 13) % 1040 - 30, 307 + (i % 4) * 10, .8 + i % 3 * .13, '#1d3d45', '#315957');
  g.fillStyle = '#346056'; g.fillRect(0, 344, W, 196);
  for (let i = 0; i < 12; i++) {
    const x = (i * 103 + 37) % W, y = 366 + (i * 67) % 147;
    g.fillStyle = i % 2 ? '#3a6b5c' : '#396957';
    g.beginPath(); g.ellipse(x, y, 88, 25, -.18, 0, Math.PI * 2); g.fill();
  }

  // Rio e pequenos reflexos que deslizam pela correnteza.
  g.fillStyle = '#244e60';
  g.beginPath(); g.moveTo(730, 337); g.bezierCurveTo(650, 405, 690, 475, 580, 540);
  g.lineTo(865, 540); g.bezierCurveTo(790, 465, 845, 408, 840, 337); g.fill();
  g.strokeStyle = '#77a9a0'; g.lineWidth = 3; g.globalAlpha = .55;
  for (let i = 0; i < 9; i++) {
    const y = 356 + i * 24, x = 728 + Math.sin(i * 2) * 35 + Math.sin(t / 1600 + i) * 7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 24 + i * 2, y); g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = '#4c775f';
  g.beginPath(); g.moveTo(0, 540); g.lineTo(0, 420); g.bezierCurveTo(200, 345, 310, 365, 490, 390);
  g.bezierCurveTo(575, 410, 590, 470, 600, 540); g.fill();

  // Trilha curva: Naya começa à esquerda e descobre a clareira.
  g.fillStyle = '#997961';
  g.beginPath(); g.moveTo(0, 310); g.bezierCurveTo(160, 315, 200, 340, 270, 370);
  g.bezierCurveTo(355, 405, 470, 426, 610, 540); g.lineTo(465, 540);
  g.bezierCurveTo(330, 467, 267, 430, 191, 407); g.bezierCurveTo(80, 375, 27, 394, 0, 404); g.fill();
  g.fillStyle = '#b5976e'; g.globalAlpha = .5;
  for (let i = 0; i < 28; i++) {
    const x = (i * 91) % 570, y = 359 + x * .19 + Math.sin(i * 6) * 16;
    g.fillRect(x, y, i % 3 + 2, 2);
  }
  g.globalAlpha = 1;

  // Pedras, flores e gramíneas pontuam a parte explorável.
  for (let i = 0; i < 75; i++) {
    const x = (i * 137 + 22) % W, y = 337 + (i * 71) % 195;
    if (x > 690 && y > 400) continue;
    g.fillStyle = i % 4 === 0 ? '#9cb58c' : '#71a279';
    g.fillRect(x, y, 2, 5); g.fillRect(x - 3, y + 3, 2, 3); g.fillRect(x + 3, y + 2, 2, 4);
    if (i % 8 === 0) { g.fillStyle = '#f1bd92'; g.fillRect(x, y - 3, 4, 4); g.fillStyle = '#f4e1b8'; g.fillRect(x + 1, y - 2, 2, 2); }
  }
  for (const rock of [[285,336,14],[551,338,21],[868,374,17],[636,477,11]]) {
    g.fillStyle = '#526b67'; g.beginPath(); g.ellipse(rock[0], rock[1], rock[2], rock[2] * .38, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#799087'; g.fillRect(rock[0] - rock[2] / 2, rock[1] - 5, rock[2], 3);
  }
  pine(33, 352, 1.48, '#183943', '#2a6257');
  pine(910, 352, 1.38, '#183943', '#2a6257');
  drawFriends(t);
  stars.forEach((s, i) => { if (!found.has(i)) star(s.x, s.y, t, i); });
  naya(player.x, player.y, t);
  for (const p of sparks) {
    g.globalAlpha = Math.max(0, p.life / p.max);
    g.fillStyle = p.color; g.fillRect(p.x, p.y, p.size, p.size);
  }
  g.globalAlpha = 1;

  // Vaga-lumes atravessam a cena em planos diferentes.
  for (let i = 0; i < 24; i++) {
    const x = (i * 137 + 33 + Math.sin(t / 1000 + i * 7) * 22 + W) % W;
    const y = 175 + (i * 113) % 310 + Math.sin(t / 720 + i * 3) * 11;
    g.globalAlpha = .35 + (Math.sin(t / 440 + i * 4) + 1) * .25;
    g.fillStyle = '#fbe6a0'; g.fillRect(x, y, i % 6 === 0 ? 4 : 2, i % 6 === 0 ? 4 : 2);
  }
  g.globalAlpha = 1;
  foreground(t);
  g.restore();
}
function pine(x, y, scale, trunk, leaves) {
  const g = ctx; g.save(); g.translate(x, y); g.scale(scale, scale);
  g.fillStyle = trunk; g.fillRect(-7, -80, 14, 125);
  g.fillStyle = leaves;
  for (let j = 0; j < 4; j++) {
    const width = 24 + j * 13, top = -119 + j * 23;
    g.beginPath(); g.moveTo(0, top); g.lineTo(-width, top + 49); g.lineTo(width, top + 49); g.fill();
  }
  g.fillStyle = '#a0b284'; g.globalAlpha = .2; g.fillRect(-18, -75, 9, 4); g.fillRect(10, -47, 12, 4);
  g.restore();
}
function drawFriends(t) {
  const g = ctx;
  // Coruja no toco.
  g.fillStyle = '#4a3f3d'; g.fillRect(112, 376, 18, 27); g.fillStyle = '#755e4b'; g.fillRect(109, 374, 24, 6);
  g.save(); g.translate(120, 357 + Math.sin(t / 550) * 2);
  g.fillStyle = '#bd9065'; g.fillRect(-13, -15, 26, 27); g.fillRect(-11, -21, 8, 10); g.fillRect(3, -21, 8, 10);
  g.fillStyle = '#e5c092'; g.fillRect(-9, -6, 18, 14); g.fillStyle = '#fff1cd'; g.fillRect(-9, -12, 8, 8); g.fillRect(2, -12, 8, 8);
  g.fillStyle = '#253340'; g.fillRect(-6, -10, 3, 4); g.fillRect(5, -10, 3, 4);
  g.fillStyle = '#eaa670'; g.fillRect(-2, -3, 4, 4); g.restore();
  // Cervo com pernas, galhadas e olhos claros.
  g.save(); g.translate(450, 371 + Math.sin(t / 730) * 2);
  g.fillStyle = '#916e59'; g.fillRect(-20, -18, 36, 25); g.fillRect(4, -32, 16, 25); g.fillRect(11, -42, 18, 14);
  g.fillRect(-16, 6, 5, 20); g.fillRect(7, 5, 5, 21); g.fillStyle = '#c9a383'; g.fillRect(13, -35, 16, 8);
  g.fillStyle = '#dcc39a'; g.fillRect(16, -62, 3, 24); g.fillRect(27, -58, 3, 18);
  g.fillRect(8, -61, 10, 3); g.fillRect(27, -56, 10, 3); g.fillStyle = '#172e37'; g.fillRect(22, -38, 3, 3); g.restore();
  // A árvore antiga tem rosto, galhos e pequenas luzes.
  g.save(); g.translate(760, 417);
  g.fillStyle = '#574a42'; g.fillRect(-22, -74, 43, 90); g.fillRect(-36, -10, 20, 13); g.fillRect(16, -7, 28, 10);
  g.fillStyle = '#3d775e';
  for (const [x,y,r] of [[-33,-82,35],[0,-110,42],[32,-83,36],[-6,-65,37]]) {
    g.beginPath(); g.arc(x + Math.sin(t / 1400 + x) * 2, y, r, 0, Math.PI*2); g.fill();
  }
  g.fillStyle = '#568a68'; g.fillRect(-39,-106,22,8); g.fillRect(14,-123,17,7);
  g.fillStyle = '#ffe3a1'; g.fillRect(-9,-51,5,5); g.fillRect(8,-51,5,5);
  g.strokeStyle = '#d4aa7a'; g.lineWidth = 2; g.beginPath(); g.arc(2,-35,8,.1,Math.PI-.1); g.stroke();
  g.restore();
  friends.forEach((f, i) => {
    const glow = .35 + (Math.sin(t / 500 + i) + 1) * .15;
    g.globalAlpha = glow; g.fillStyle = '#ffe9ae'; g.fillRect(f.x - 2, f.y - (i === 2 ? 92 : 43) + Math.sin(t / 360 + i) * 3, 4, 4); g.globalAlpha = 1;
  });
}
function star(x, y, t, i) {
  const g = ctx, pulse = Math.sin(t / 300 + i * 2) * 2;
  g.save(); g.translate(x, y + Math.sin(t / 540 + i) * 4);
  g.globalAlpha = .22; g.fillStyle = '#ffe0a0'; g.beginPath(); g.arc(0, 0, 22 + pulse, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1; g.fillStyle = '#fff1c1';
  g.beginPath();
  for (let a = 0; a < 10; a++) {
    const r = a % 2 ? 5 : 13, angle = -Math.PI / 2 + a * Math.PI / 5;
    g.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-2, -3, 4, 5); g.restore();
}
function naya(x, y, t) {
  const g = ctx, bob = player.moving ? Math.sin(t / 95) * 2 : Math.sin(t / 650) * 1;
  g.save(); g.translate(Math.round(x), Math.round(y + bob));
  g.fillStyle = '#132e36a0'; g.beginPath(); g.ellipse(0, 30, 18, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f1aa79'; g.fillRect(-10, 20, 8, 9); g.fillRect(3, 20, 8, 9);
  g.fillStyle = '#2a3940'; g.fillRect(-11, 28, 10, 4); g.fillRect(3, 28, 10, 4);
  g.fillStyle = '#c35e59'; g.fillRect(-13, -3, 27, 26); g.fillStyle = '#e37b68'; g.fillRect(-11, -1, 22, 18);
  g.fillStyle = '#f2b990'; g.fillRect(-18, 2, 5, 18); g.fillRect(14, 2, 5, 18);
  g.fillStyle = '#362b39'; g.fillRect(-11, -25, 23, 23); g.fillStyle = '#f7c99c'; g.fillRect(-9, -21, 18, 19);
  g.fillStyle = '#302637'; g.fillRect(-10, -25, 20, 7); g.fillRect(-12, -19, 5, 16);
  g.fillStyle = '#e79b67'; g.fillRect(-16, -28, 33, 6); g.fillRect(-11, -33, 23, 6);
  g.fillStyle = '#26333c'; g.fillRect(-5, -14, 2, 3); g.fillRect(5, -14, 2, 3);
  g.fillStyle = '#e88e79'; g.fillRect(-7, -8, 3, 2); g.fillRect(6, -8, 3, 2);
  g.fillStyle = '#f9d397'; g.fillRect(11, 4, 4, 7); g.restore();
}
function foreground(t) {
  const g = ctx;
  g.fillStyle = '#1d4b48';
  for (let i = 0; i < 22; i++) {
    const x = i * 49 + (i % 3) * 7, sway = Math.sin(t / 1100 + i) * 3;
    g.beginPath(); g.moveTo(x - 15, 540); g.lineTo(x - 13 + sway, 520 - i % 4 * 5);
    g.lineTo(x - 3, 540); g.lineTo(x + 5 + sway, 510 - i % 5 * 5); g.lineTo(x + 14, 540); g.fill();
  }
}
