const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const intro = document.getElementById('intro'), finish = document.getElementById('finish');
const hud = document.getElementById('hud'), toast = document.getElementById('toast');
const count = document.getElementById('count'), talk = document.getElementById('talk');
const speaker = document.getElementById('speaker'), message = document.getElementById('message');
const interact = document.getElementById('interact'), soundButton = document.getElementById('soundButton');
const W = 960, H = 540, keys = {};
const stars = [{x:170,y:180},{x:335,y:115},{x:510,y:220},{x:700,y:135},{x:825,y:320},{x:585,y:405},{x:240,y:390}];
const friends = [{x:120,y:370,name:'a coruja',line:'O vento levou uma estrela para o lado das pedras.'},{x:450,y:370,name:'o cervo',line:'A água sabe o caminho. Pergunte ao rio.'},{x:760,y:420,name:'a árvore antiga',line:'Toda luz que você escuta também escuta você.'}];
let player, found, playing = false, last = 0, sound = true, near = -1, audio, finishTimer;

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
  reset();
  playing = true;
  last = 0;
  requestAnimationFrame(loop);
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
  talk.classList.add('hidden');
  toast.classList.add('hidden');
  interact.classList.add('hidden');
  Object.keys(keys).forEach(key => keys[key] = false);
}
function loop(t) {
  if (!playing) return;
  const dt = last ? Math.min((t - last) / 16, 2) : 0;
  last = t;
  update(dt);
  draw(t);
  if (playing) requestAnimationFrame(loop);
}
function update(dt) {
  const x = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const y = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const n = Math.hypot(x, y) || 1;
  player.x = Math.max(35, Math.min(925, player.x + x / n * 2.5 * dt));
  player.y = Math.max(90, Math.min(485, player.y + y / n * 2.5 * dt));
  near = friends.findIndex(f => Math.hypot(player.x - f.x, player.y - f.y) < 45);
  interact.classList.toggle('hidden', near < 0 || !talk.classList.contains('hidden'));
  stars.forEach((star, i) => {
    if (found.has(i) || Math.hypot(player.x - star.x, player.y - star.y) >= 25) return;
    found.add(i);
    count.textContent = found.size;
    playNote(523 + found.size * 65, .2);
    showToast(found.size === stars.length ? 'A última estrela encontrou você.' : 'Você ouviu um brilho entre as folhas.');
    if (found.size === stars.length) finishTimer = setTimeout(() => {
      playing = false;
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
draw(0);
function draw(t){let g=ctx;g.fillStyle='#183443';g.fillRect(0,0,W,H);g.fillStyle='#f6d99a';g.globalAlpha=.9;g.beginPath();g.arc(790,82,27,0,Math.PI*2);g.fill();g.fillStyle='#183443';g.beginPath();g.arc(802,72,25,0,Math.PI*2);g.fill();g.globalAlpha=1;g.fillStyle='#203f48';g.fillRect(0,305,W,235);g.fillStyle='#294d4a';for(let i=0;i<18;i++){let x=(i*71)%W;tree(x,300-(i%3)*20,1+(i%2)*.18)}g.fillStyle='#315b51';g.fillRect(0,420,W,120);g.fillStyle='#396e69';g.fillRect(365,428,260,75);g.fillStyle='#5d9690';g.globalAlpha=.35;g.fillRect(380,438,210,3);g.fillRect(420,462,145,2);g.globalAlpha=1;g.fillStyle='#3b6959';for(let i=0;i<55;i++){let x=(i*83+30)%W,y=430+(i*37)%88;g.fillRect(x,y,3,4);g.fillRect(x+4,y-3,2,3)}g.fillStyle='#e8c98b';g.globalAlpha=.85;for(let i=0;i<30;i++){let x=(i*137)%W,y=36+(i*73)%250;g.fillRect(x,y,2,2)}g.globalAlpha=1;friends.forEach(f=>animal(f.x,f.y));stars.forEach((s,i)=>{if(!found.has(i))star(s.x,s.y,t,i)});naya(player.x,player.y,t)}
function animal(x,y){ctx.fillStyle='#b9b58a';ctx.fillRect(x-9,y-8,18,13);ctx.fillRect(x-6,y-15,4,7);ctx.fillRect(x+2,y-15,4,7);ctx.fillStyle='#172c36';ctx.fillRect(x-5,y-4,2,2);ctx.fillRect(x+3,y-4,2,2)}
function tree(x,y,scale){ctx.fillStyle='#1d3742';ctx.fillRect(x-8*scale,y,16*scale,115*scale);ctx.fillStyle='#254940';ctx.fillRect(x-42*scale,y-33*scale,84*scale,36*scale);ctx.fillRect(x-29*scale,y-58*scale,58*scale,30*scale);ctx.fillStyle='#31574e';ctx.fillRect(x-24*scale,y-45*scale,13*scale,12*scale);ctx.fillRect(x+16*scale,y-24*scale,16*scale,10*scale)}
function star(x,y,t,i){let pulse=Math.sin(t/330+i)*2;ctx.save();ctx.translate(x,y);ctx.fillStyle='#f9bd7d';ctx.globalAlpha=.16;ctx.fillRect(-17-pulse,-17-pulse,34+pulse*2,34+pulse*2);ctx.globalAlpha=1;ctx.fillStyle='#ffe2a1';ctx.beginPath();for(let a=0;a<10;a++){let r=a%2?5:12;let ang=-Math.PI/2+a*Math.PI/5;ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r)}ctx.fill();ctx.restore()}
function naya(x,y,t){ctx.save();ctx.translate(Math.round(x),Math.round(y));let bob=Math.sin(t/180)*2;ctx.translate(0,bob);ctx.fillStyle='#ef8b6b';ctx.fillRect(-11,-2,22,25);ctx.fillStyle='#f7c19a';ctx.fillRect(-8,-20,16,18);ctx.fillStyle='#251c32';ctx.fillRect(-6,-15,3,3);ctx.fillRect(4,-15,3,3);ctx.fillStyle='#f3a56e';ctx.fillRect(-14,-24,28,6);ctx.fillRect(-10,-28,20,5);ctx.fillStyle='#db6a62';ctx.fillRect(-13,22,-1,8);ctx.fillRect(5,22,8,8);ctx.restore()}
