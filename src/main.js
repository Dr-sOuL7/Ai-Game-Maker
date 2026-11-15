import * as THREE from 'three';
import './style.css';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const PARTS = {
  core: [
    { name: 'Impact', glyph: '✦', copy: 'Hard-hitting avatar. High contact force, heavier energy toll.', color: '#ff713d', stats: { power: 9, stamina: -4, stability: -1 }, ability: 'Impact Drive' },
    { name: 'Aegis', glyph: '⬡', copy: 'Brace against contact and hold your line under pressure.', color: '#7ac8ff', stats: { power: -2, stamina: 2, stability: 8 }, ability: 'Aegis Guard' },
    { name: 'Vortex', glyph: '◉', copy: 'Curved paths and rotational control; trades raw force for flow.', color: '#ad91ff', stats: { power: 2, stamina: 5, stability: 1 }, ability: 'Vortex Shift' },
    { name: 'Rebound', glyph: '↗', copy: 'Turn collision energy into a quick physical redirection.', color: '#ffad56', stats: { power: 4, stamina: 0, stability: 4 }, ability: 'Rebound Pulse' },
  ],
  blade: [
    { name: 'Nova Edge', glyph: '✧', copy: 'Three broad contact wings. Direct, predictable hits.', color: '#ff813b', stats: { power: 7, stamina: 0, stability: -1 } },
    { name: 'Crescent', glyph: '☾', copy: 'Angled contact faces redirect opponents off-center.', color: '#9f8cff', stats: { power: 3, stamina: 2, stability: 1 } },
    { name: 'Aero Ring', glyph: '◎', copy: 'Smooth rounded profile; lower impact, clean movement.', color: '#78d6d1', stats: { power: -2, stamina: 7, stability: 3 } },
    { name: 'Raptor Claw', glyph: '⌁', copy: 'Aggressive offset hooks with higher recoil and risk.', color: '#ff5e58', stats: { power: 9, stamina: -3, stability: -4 } },
  ],
  disc: [
    { name: 'Feather 7', glyph: '◇', copy: 'Low mass accelerates quickly; gives up impact resistance.', color: '#aebfce', stats: { power: 1, stamina: 5, stability: -2 } },
    { name: 'Orbit 4', glyph: '◌', copy: 'Balanced mass and rotational inertia for flexible play.', color: '#9db0bd', stats: { power: 1, stamina: 1, stability: 2 } },
    { name: 'Anchor 9', glyph: '⬟', copy: 'High inertia and resistance, slower to redirect.', color: '#d8a76a', stats: { power: 3, stamina: -3, stability: 8 } },
    { name: 'Halo 6', glyph: '◎', copy: 'Wide, even mass distribution favors stamina and balance.', color: '#75c6bf', stats: { power: -1, stamina: 7, stability: 5 } },
  ],
  tip: [
    { name: 'Flat', glyph: '▽', copy: 'Fast, wide movement. Consumes energy on hard turns.', color: '#ff7946', stats: { power: 5, stamina: -4, stability: -1 } },
    { name: 'Sharp', glyph: '⌖', copy: 'Small contact point holds a compact stamina route.', color: '#90c6ff', stats: { power: -2, stamina: 8, stability: 1 } },
    { name: 'Rubber', glyph: '◒', copy: 'High grip and traction; turns sharply with extra drag.', color: '#e38666', stats: { power: 4, stamina: -2, stability: 5 } },
    { name: 'Ball', glyph: '●', copy: 'Smooth rolling contact; stable, but less direct control.', color: '#b7a3ff', stats: { power: -1, stamina: 5, stability: 5 } },
  ],
};
const DEFAULT_BUILD = { core: 0, blade: 0, disc: 1, tip: 0, name: 'NOVA / 01' };
const loadedBuild = (() => { try { return { ...DEFAULT_BUILD, ...JSON.parse(localStorage.getItem('soulsspin-build') || '{}') }; } catch { return DEFAULT_BUILD; } })();
const playerBuild = { ...loadedBuild };
const statsFor = (build) => {
  const sum = { power: 48, stamina: 55, stability: 53 };
  for (const key of Object.keys(PARTS)) for (const stat of Object.keys(sum)) sum[stat] += PARTS[key][build[key]].stats[stat] || 0;
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, clamp(v, 20, 90)]));
};
const buildColor = (build) => PARTS.core[build.core].color;

// Three.js arena, stadium and Beyblade models.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
$('#scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0e13, 0.021);
const arenaGroup = new THREE.Group(); scene.add(arenaGroup);
scene.add(new THREE.HemisphereLight(0xb9d8ed, 0x141820, 2.0));
const keyLight = new THREE.DirectionalLight(0xffead5, 3.2); keyLight.position.set(-5, 11, 7); scene.add(keyLight);
const rimLight = new THREE.PointLight(0x43b9c9, 110, 22); rimLight.position.set(6, 4, -5); scene.add(rimLight);
const orangeLight = new THREE.PointLight(0xff6740, 80, 18); orangeLight.position.set(-7, 3, 5); scene.add(orangeLight);
const topCamera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100); topCamera.position.set(0, 17.5, 8.8); topCamera.lookAt(0, 0, 0);
topCamera.up.set(0, 0, -1);
const sideCamera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, .1, 100); sideCamera.position.set(0, 9.5, 17.5); sideCamera.lookAt(0, 0, 0);
const povCamera = new THREE.PerspectiveCamera(71, innerWidth / innerHeight, .03, 80);
let activeCamera = topCamera;

const floorMat = new THREE.MeshStandardMaterial({ color: 0x222a31, metalness: .48, roughness: .38, side: THREE.DoubleSide });
const stadium = new THREE.Mesh(new THREE.CylinderGeometry(8.7, 8.35, .58, 96, 1, false), floorMat);
stadium.position.y = -.42; arenaGroup.add(stadium);
const dish = new THREE.Mesh(new THREE.CylinderGeometry(7.7, 7.16, .45, 96, 1, false), new THREE.MeshStandardMaterial({ color: 0x131a20, metalness: .37, roughness: .36, side: THREE.DoubleSide })); dish.position.y = -.11; arenaGroup.add(dish);
const bowl = new THREE.Mesh(new THREE.CylinderGeometry(7.3, 5.85, .39, 96, 1, false), new THREE.MeshStandardMaterial({ color: 0x272f35, metalness: .42, roughness: .31, side: THREE.DoubleSide })); bowl.position.y = -.02; arenaGroup.add(bowl);
const playSurface = new THREE.Mesh(new THREE.CylinderGeometry(5.85, 5.85, .25, 96, 1, false), new THREE.MeshStandardMaterial({ color: 0x394147, metalness: .31, roughness: .42, side: THREE.DoubleSide })); playSurface.position.y = .07; arenaGroup.add(playSurface);
const edge = new THREE.Mesh(new THREE.TorusGeometry(7.6, .16, 12, 100), new THREE.MeshStandardMaterial({ color: 0x9ba9b2, metalness: .8, roughness: .22, emissive: 0x162028 })); edge.rotation.x = Math.PI / 2; edge.position.y = .18; arenaGroup.add(edge);
const insideEdge = new THREE.Mesh(new THREE.TorusGeometry(5.82, .045, 8, 100), new THREE.MeshStandardMaterial({ color: 0xff794d, metalness: .42, roughness: .4, emissive: 0x41170d })); insideEdge.rotation.x = Math.PI / 2; insideEdge.position.y = .215; arenaGroup.add(insideEdge);
for (const radius of [2.4, 4.1, 6.7]) { const line = new THREE.Mesh(new THREE.TorusGeometry(radius, .012, 6, 96), new THREE.MeshBasicMaterial({ color: radius === 6.7 ? 0x61717a : 0x707b7f, transparent: true, opacity: .46 })); line.rotation.x = Math.PI / 2; line.position.y = .205; arenaGroup.add(line); }
const centerDisc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 48), new THREE.MeshBasicMaterial({ color: 0xff7546, transparent: true, opacity: .17, side: THREE.DoubleSide })); centerDisc.rotation.x = -Math.PI / 2; centerDisc.position.y = .21; arenaGroup.add(centerDisc);
const grid = new THREE.GridHelper(40, 50, 0x3c4650, 0x222a32); grid.position.y = -1.02; scene.add(grid);
for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; const light = new THREE.Mesh(new THREE.BoxGeometry(.25, .055, .65), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xff7546 : 0x66737c, transparent: true, opacity: .7 })); light.position.set(Math.sin(a) * 8.46, -.02, Math.cos(a) * 8.46); light.rotation.y = -a; arenaGroup.add(light); }

const createBey = (build, tintOverride) => {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const tint = tintOverride || buildColor(build);
  const metal = (color, roughness = .28, metalness = .78) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mainMat = metal(tint, .22, .78), silver = metal(0xb5c6cf, .24, .88), dark = metal(0x20262d, .28, .82), accent = metal(0xf0bb71, .2, .83);
  const discMass = build.disc === 2 ? 1.08 : build.disc === 0 ? .9 : 1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.66, .72, .22, 32), dark); base.position.y = .18; body.add(base);
  const lowerRing = new THREE.Mesh(new THREE.TorusGeometry(.56 * discMass, .10, 10, 36), silver); lowerRing.rotation.x = Math.PI / 2; lowerRing.position.y = .31; body.add(lowerRing);
  const armor = new THREE.Mesh(new THREE.CylinderGeometry(.7, .61, .15, 12), mainMat); armor.position.y = .39; body.add(armor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .095, 10, 36), accent); ring.rotation.x = Math.PI / 2; ring.position.y = .49; body.add(ring);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.52, .57, .15, 12), mainMat); top.position.y = .53; body.add(top);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.3, .37, .1, 12), silver); core.position.y = .65; body.add(core);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(.19, 18, 12), new THREE.MeshStandardMaterial({ color: tint, metalness: .4, roughness: .18, emissive: tint, emissiveIntensity: .42 })); jewel.position.y = .74; body.add(jewel);
  const bladeCount = build.blade === 3 ? 5 : build.blade === 2 ? 8 : build.blade === 1 ? 4 : 3;
  const wingGeo = new THREE.BoxGeometry(build.blade === 3 ? .22 : .3, .12, build.blade === 1 ? .35 : .47);
  for (let i = 0; i < bladeCount; i++) { const a = i / bladeCount * Math.PI * 2; const wing = new THREE.Mesh(wingGeo, i % 2 ? silver : mainMat); wing.position.set(Math.cos(a) * .54, .52, Math.sin(a) * .54); wing.rotation.y = -a + (build.blade === 1 ? .3 : 0); wing.rotation.z = (build.blade === 3 ? .18 : 0); body.add(wing); }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, build.tip === 1 ? .48 : .33, 12), dark); pin.position.y = -.1; body.add(pin);
  const tipRadius = build.tip === 1 ? .07 : build.tip === 3 ? .16 : .13;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(tipRadius, 12, 8), build.tip === 2 ? new THREE.MeshStandardMaterial({ color: 0x3a2522, roughness: .75, metalness: .1 }) : silver); tip.position.y = -.34; body.add(tip);
  const aura = new THREE.Mesh(new THREE.TorusGeometry(.86, .017, 6, 56), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .6 })); aura.rotation.x = Math.PI / 2; aura.position.y = .05; body.add(aura);
  root.userData = { body, aura, tint, build };
  return root;
};

const makeFighter = (build, position, color, isPlayer) => {
  const model = createBey(build, color); model.position.set(position.x, .25, position.z); scene.add(model);
  return { model, build, isPlayer, x: position.x, z: position.z, vx: 0, vz: 0, heading: isPlayer ? -0.75 : 2.4, tiltX: 0, tiltZ: 0, spin: 100, health: 100, maxSpin: 100, maxHealth: 100, stats: statsFor(build), launch: 0, dashUsed: false, tiltUsed: false, abilityUsed: false, abilityTimer: 0, shieldTimer: 0, turn: 1, wobble: 0, damageFlash: 0, alive: true };
};
let player = makeFighter(playerBuild, { x: -3.2, z: 0 }, buildColor(playerBuild), true);
const AI_BUILD = { name: 'IRON WRAITH', core: 1, blade: 1, disc: 2, tip: 3 };
let opponent = makeFighter(AI_BUILD, { x: 3.2, z: 0 }, '#ea735c', false);
let workshopModel = createBey(playerBuild); scene.add(workshopModel); workshopModel.visible = false;

const state = { running: false, launched: false, phase: 'autonomous', phaseLeft: 10, round: 1, scoreP: 0, scoreO: 0, mode: '1v1', camera: 'top', gameOver: false, aiLevel: 'ADVANCED', personality: 'BALANCED', moveX: 0, moveZ: 0, launchMode: false, launchAge: 0, aim: new THREE.Vector2(0, 0), shake: 0, lastTime: performance.now(), collisionCooldown: 0, practice: false, cameraShake: .45 };
let workshopRenderer, workshopScene, workshopCamera;
const sfx = { ctx: null, master: .58 };
function playTone(freq, duration = .12, wave = 'sine', volume = .055, endFreq = null) { try { if (!sfx.ctx) sfx.ctx = new AudioContext(); const ctx = sfx.ctx; const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = wave; osc.frequency.setValueAtTime(freq, ctx.currentTime); if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration); gain.gain.setValueAtTime(volume * sfx.master, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration); } catch { /* Audio may be unavailable until user gesture. */ } }
function setFeed(text) { $('#feedText').textContent = text; }
let toastTimer;
function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200); }
function showView(name) { $$('.view').forEach(v => v.classList.remove('active')); $(`#${name}View`).classList.add('active'); $$('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === name)); if (name === 'workshop') { buildPartOptions(); refreshWorkshop(); } }

function launchStart() {
  if (state.launched || state.gameOver) return;
  state.launchMode = true; state.launchAge = 0; $('#launchOverlay').classList.add('hidden');
  setFeed('Aim with the pointer · click inside the green release window');
  $('#phaseTitle').textContent = 'FIND YOUR RELEASE'; $('#phaseSub').textContent = 'Direction follows your aim · timing sets launch power';
}
function releaseLaunch(event) {
  if (!state.launchMode || state.launched) return;
  if (event) { state.aim.x = (event.clientX / innerWidth - .5) * 2; state.aim.y = (event.clientY / innerHeight - .5) * 2; }
  const phase = ((state.launchAge % 2.2) / 2.2);
  const distance = Math.min(phase, 1 - phase);
  const precision = clamp(1 - distance / .24, 0, 1);
  const power = .74 + precision * .26;
  const angle = state.aim.y * .28;
  const len = Math.hypot(state.aim.x, state.aim.y) || 1;
  const dirX = state.aim.x / len || .8, dirZ = state.aim.y / len || .25;
  player.heading = Math.atan2(dirX, dirZ);
  player.vx = dirX * (1.2 + power * 2.25); player.vz = dirZ * (1.2 + power * 2.25);
  player.tiltX = angle; player.tiltZ = -state.aim.x * .2;
  player.spin = 83 + power * 17;
  player.launch = 1; state.launched = true; state.launchMode = false; state.running = true; state.phaseLeft = 10; state.phase = 'autonomous';
  const direction = player.heading;
  const aiDirection = Math.atan2(-opponent.x, -opponent.z);
  opponent.heading = aiDirection; opponent.vx = Math.sin(aiDirection) * 3.05; opponent.vz = Math.cos(aiDirection) * 3.05; opponent.spin = 96;
  $('#launchOverlay').classList.add('hidden'); setFeed(precision > .76 ? `PERFECT RELEASE · ${Math.round(power * 100)}% power` : `LAUNCH SET · ${Math.round(power * 100)}% power`);
  playTone(precision > .76 ? 460 : 300, .24, 'sawtooth', .09, 100);
  $('#phaseTitle').textContent = 'WATCH THE FLOW'; $('#phaseSub').textContent = 'Autonomous physics · control opens in a moment';
  updateHud();
}
function resetFighter(f, x, z) {
  f.x = x; f.z = z; f.vx = 0; f.vz = 0; f.spin = 100; f.health = 100; f.heading = f.isPlayer ? -.75 : 2.4; f.tiltX = 0; f.tiltZ = 0; f.dashUsed = false; f.tiltUsed = false; f.abilityUsed = false; f.abilityTimer = 0; f.shieldTimer = 0; f.alive = true; f.damageFlash = 0; f.model.visible = true; f.model.position.set(x, .25, z);
}
function beginNextRound() {
  if (state.gameOver) return;
  state.round++; resetFighter(player, -3.2, 0); resetFighter(opponent, 3.2, 0); state.phase = 'autonomous'; state.phaseLeft = 10; state.running = false; state.launched = false; state.launchMode = false; state.gameOver = false;
  $('#finishOverlay').classList.remove('show'); $('#launchOverlay').classList.remove('hidden'); $('#roundLabel').textContent = `ROUND ${String(state.round).padStart(2, '0')}`; setFeed('New round. Reset your launch timing.'); updateHud();
}
function startMatch() {
  state.scoreP = 0; state.scoreO = 0; state.round = 1; state.gameOver = false; state.practice = $('#modeSelect').value === 'practice'; state.aiLevel = $('#difficultySelect').value; state.personality = $('#personalitySelect').value; state.running = false; state.launched = false; state.phase = 'autonomous'; state.phaseLeft = 10;
  resetFighter(player, -3.2, 0); resetFighter(opponent, 3.2, 0); $('#finishOverlay').classList.remove('show'); $('#launchOverlay').classList.remove('hidden'); $('#roundLabel').textContent = 'ROUND 01';
  $('#aiDifficulty').textContent = state.aiLevel; $('#opponentNameTop').textContent = state.personality === 'STAMINA SPECIALIST' ? 'STEADY' : 'RIVAL'; $('#rivalBuildName').textContent = state.personality === 'STAMINA SPECIALIST' ? 'STILLWATER' : 'IRON WRAITH';
  setFeed(state.practice ? 'Practice mode · score disabled' : 'Ready when you are. Lock in your launch.'); showView('battle'); updateHud(); playTone(240, .28, 'sine', .05, 420);
}
function finishRound(finish, winner, points) {
  if (!state.running || state.gameOver) return;
  state.running = false; state.gameOver = true; state.phaseLeft = 0;
  if (!state.practice && winner) winner.isPlayer ? state.scoreP += points : state.scoreO += points;
  if (!state.practice && state.scoreP >= 5) { $('#finishTitle').textContent = 'VICTORY'; $('#finishDescription').textContent = `${finish} · Match won, ${state.scoreP} to ${state.scoreO}`; $('#nextRoundBtn').textContent = 'REMATCH  →'; state.matchEnded = true; }
  else if (!state.practice && state.scoreO >= 5) { $('#finishTitle').textContent = 'DEFEAT'; $('#finishDescription').textContent = `${finish} · Iron Wraith takes the match`; $('#nextRoundBtn').textContent = 'REMATCH  →'; state.matchEnded = true; }
  else if (!winner) { $('#finishTitle').textContent = 'DRAWN ROUND'; $('#finishDescription').textContent = 'Simultaneous finish · no points awarded'; $('#nextRoundBtn').textContent = 'NEXT ROUND  →'; state.matchEnded = false; }
  else { $('#finishTitle').textContent = finish.toUpperCase(); $('#finishDescription').textContent = state.practice ? 'Practice finish · scores are disabled' : `${winner.isPlayer ? 'You score' : 'Rival scores'} +${points} point${points > 1 ? 's' : ''}`; $('#nextRoundBtn').textContent = 'NEXT ROUND  →'; state.matchEnded = false; }
  $('#finishOverlay').classList.add('show'); setFeed(`${finish} · ${winner ? (winner.isPlayer ? 'You take the round.' : 'Round to the rival.') : 'Drawn round.'}`); playTone(finish === 'Burst Finish' ? 100 : finish === 'Ring Out' ? 180 : 130, .72, 'sawtooth', .09, 38); updateHud();
}
$('#nextRoundBtn').addEventListener('click', () => { if (state.matchEnded) { state.matchEnded = false; startMatch(); } else beginNextRound(); });

function updateHud() {
  const update = (f, side) => { const p = clamp(f.spin, 0, 100), h = clamp(f.health, 0, 100); $(`#${side}SpinBar`).style.width = `${p}%`; $(`#${side}HealthBar`).style.width = `${h}%`; $(`#${side}SpinValue`).textContent = `${Math.ceil(p)}%`; $(`#${side}HealthValue`).textContent = `${Math.ceil(h)}%`; };
  update(player, 'player'); update(opponent, 'rival'); $('#playerScore').textContent = String(state.scoreP).padStart(2, '0'); $('#opponentScore').textContent = String(state.scoreO).padStart(2, '0');
  const manual = state.phase === 'manual'; $('#phaseChip').classList.toggle('manual', manual); $('#phaseChip span').textContent = manual ? 'MANUAL CONTROL' : 'AUTONOMOUS'; $('#phaseTime').textContent = state.launched ? Math.max(0, state.phaseLeft).toFixed(1) : '—';
  $('#phaseSymbol').textContent = manual ? '⌖' : '◌'; $('#phaseTitle').textContent = manual ? 'YOUR WINDOW. MAKE IT COUNT.' : 'WATCH THE FLOW'; $('#phaseSub').textContent = manual ? 'Steer · Dash OR tilt · or conserve your spin' : 'Autonomous physics · read the opponent';
  $('#dashBtn').disabled = !manual || player.dashUsed || player.tiltUsed; $('#tiltBtn').disabled = !manual || player.tiltUsed || player.dashUsed; $('#avatarBtn').disabled = !manual || player.abilityUsed || player.health > 50;
}
function toggleCamera(which) { state.camera = which; activeCamera = which === 'side' ? sideCamera : which === 'pov' ? povCamera : topCamera; $$('.camera-switch button').forEach(b => b.classList.toggle('selected', b.dataset.camera === which)); }
$$('.camera-switch button').forEach(b => b.addEventListener('click', () => toggleCamera(b.dataset.camera)));

function applyDamage(target, amount, angle, impactSpeed) {
  const blade = PARTS.blade[target.build.blade];
  const angular = 0.72 + Math.abs(Math.sin(angle)) * .45;
  const defense = target.stats.stability / 100 * .19 + (target.build.disc === 2 ? .08 : 0);
  const damage = Math.max(1.2, (amount * angular * (1 - defense)));
  target.health = Math.max(0, target.health - damage); target.spin = Math.max(0, target.spin - damage * (.43 + impactSpeed * .07)); target.damageFlash = .18;
  if (target.shieldTimer > 0) { target.health = Math.min(100, target.health + damage * .55); target.spin = Math.min(100, target.spin + damage * .08); }
  target.model.userData.body.scale.set(1.08, .9, 1.08); state.shake = Math.min(.25, impactSpeed * .026); playTone(105 + impactSpeed * 34, .12, 'square', .045, 45);
}
function collide(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || .001, min = 1.38;
  if (d >= min) return;
  const nx = dx / d, nz = dz / d;
  const relative = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  const impulse = Math.max(0, relative) * .7 + .75;
  const overlap = min - d;
  a.x -= nx * overlap * .52; a.z -= nz * overlap * .52; b.x += nx * overlap * .52; b.z += nz * overlap * .52;
  a.vx += nx * impulse * .62; a.vz += nz * impulse * .62; b.vx -= nx * impulse * .62; b.vz -= nz * impulse * .62;
  const bladeBoostA = PARTS.blade[a.build.blade].stats.power / 100;
  const bladeBoostB = PARTS.blade[b.build.blade].stats.power / 100;
  applyDamage(a, (1.5 + impulse * 1.0 + bladeBoostB * 2.1) * (b.abilityTimer > 0 && b.build.core === 0 ? 1.25 : 1), Math.atan2(nz, nx) - a.heading, impulse);
  applyDamage(b, (1.5 + impulse * 1.0 + bladeBoostA * 2.1) * (a.abilityTimer > 0 && a.build.core === 0 ? 1.25 : 1), Math.atan2(-nz, -nx) - b.heading, impulse);
  if (a.abilityTimer > 0 && a.build.core === 3) { a.vx -= nx * .7; a.vz -= nz * .7; }
  if (b.abilityTimer > 0 && b.build.core === 3) { b.vx += nx * .7; b.vz += nz * .7; }
  setFeed(impulse > 3.2 ? 'HEAVY COLLISION · both Beyblades destabilized' : 'Metal-on-metal impact');
}
function ringOutCheck() {
  const po = Math.hypot(player.x, player.z), oo = Math.hypot(opponent.x, opponent.z);
  if (po > 8.35 && oo > 8.35) { finishRound('Double Ring Out', null, 0); return true; }
  if (po > 8.35) { player.alive = false; player.model.visible = false; finishRound('Ring Out', opponent, 2); return true; }
  if (oo > 8.35) { opponent.alive = false; opponent.model.visible = false; finishRound('Ring Out', player, 2); return true; }
  return false;
}
function resolveFinishes() {
  const pBurst = player.health <= 0, oBurst = opponent.health <= 0, pSpin = player.spin <= 0, oSpin = opponent.spin <= 0;
  if ((pBurst || pSpin) && (oBurst || oSpin)) { finishRound('Simultaneous Finish', null, 0); return true; }
  if (pBurst) { player.alive = false; finishRound('Burst Finish', opponent, 3); return true; }
  if (oBurst) { opponent.alive = false; finishRound('Burst Finish', player, 3); return true; }
  if (pSpin) { player.alive = false; finishRound('Spin Finish', opponent, 1); return true; }
  if (oSpin) { opponent.alive = false; finishRound('Spin Finish', player, 1); return true; }
  return false;
}
function useDash() { if (state.phase !== 'manual' || player.dashUsed || player.tiltUsed || !state.running) return; player.dashUsed = true; player.spin = Math.max(0, player.spin - 12); const force = 7.7 * (.65 + player.stats.power / 200); player.vx += Math.sin(player.heading) * force; player.vz += Math.cos(player.heading) * force; player.wobble += .32; player.damageFlash = .12; setFeed('DASH · accelerated along current facing'); playTone(240, .2, 'sawtooth', .06, 720); updateHud(); }
function useTilt() { if (state.phase !== 'manual' || player.tiltUsed || player.dashUsed || !state.running) return; const mag = Math.hypot(state.moveX, state.moveZ); if (mag < .1) { toast('Point a direction first · use WASD / arrows'); return; } player.tiltUsed = true; player.spin = Math.max(0, player.spin - 9); player.tiltX = clamp(state.moveZ * .42, -.42, .42); player.tiltZ = clamp(-state.moveX * .42, -.42, .42); player.vx += state.moveX * 1.1; player.vz += state.moveZ * 1.1; player.wobble += .45; setFeed('TILT · attack geometry shifted toward your input'); playTone(340, .2, 'triangle', .06, 210); updateHud(); }
function useAvatar(f) {
  if (state.phase !== 'manual' || f.abilityUsed || f.health > 50 || !state.running) { if (f.isPlayer && f.health > 50) toast('Avatar Attack unlocks at 50% Burst Health'); return; }
  f.abilityUsed = true; f.spin = Math.max(0, f.spin - 14); f.abilityTimer = 3.5; const core = f.build.core;
  if (core === 0) { f.vx += Math.sin(f.heading) * 3.3; f.vz += Math.cos(f.heading) * 3.3; f.wobble += .25; }
  if (core === 1) f.shieldTimer = 3.2;
  if (core === 2) { f.vx += Math.sin(f.heading + .8) * 2.4; f.vz += Math.cos(f.heading + .8) * 2.4; f.turn *= -1; }
  if (core === 3) { f.vx *= -.3; f.vz *= -.3; f.vx += Math.sin(f.heading + Math.PI / 2) * 4; f.vz += Math.cos(f.heading + Math.PI / 2) * 4; }
  setFeed(`${PARTS.core[core].ability.toUpperCase()} · energy committed`); playTone(650, .38, 'sawtooth', .09, 180);
  const flash = new THREE.PointLight(f.model.userData.tint, 70, 5); flash.position.copy(f.model.position); scene.add(flash); setTimeout(() => scene.remove(flash), 380);
  updateHud();
}

const keys = new Set();
function keyDown(e) {
  const k = e.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'enter' && !state.launched && $('#battleView').classList.contains('active')) { if (!state.launchMode) launchStart(); else releaseLaunch(); }
  if (k === ' ' || k === 'shift') useDash(); if (k === 'q') useTilt(); if (k === 'e') useAvatar(player);
  if (k === '1') toggleCamera('top'); if (k === '2') toggleCamera('side'); if (k === '3') toggleCamera('pov');
}
function keyUp(e) { keys.delete(e.key.toLowerCase()); }
window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
$('#launchOverlay').addEventListener('click', (e) => { if (!state.launchMode) launchStart(); else releaseLaunch(e); });
$('#dashBtn').addEventListener('click', useDash); $('#tiltBtn').addEventListener('click', useTilt); $('#avatarBtn').addEventListener('click', () => useAvatar(player)); $('#mobileDash').addEventListener('click', useDash);
$$('.mobile-controls button[data-move]').forEach(button => { const map = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' }; button.addEventListener('touchstart', e => { e.preventDefault(); keys.add(map[button.dataset.move]); }, { passive: false }); for (const event of ['touchend','touchcancel']) button.addEventListener(event, () => keys.delete(map[button.dataset.move])); });

function updatePlayerInput() {
  let x = 0, z = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1; if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) z -= 1; if (keys.has('s') || keys.has('arrowdown')) z += 1;
  const len = Math.hypot(x, z) || 1; state.moveX = x / len; state.moveZ = z / len;
  if (state.running && state.phase === 'manual') { const grip = .58 + (player.build.tip === 2 ? .2 : player.build.tip === 1 ? -.09 : 0); const force = (4.2 + player.stats.stability * .016) * grip; player.vx += state.moveX * force * dt; player.vz += state.moveZ * force * dt; if (x || z) player.heading = Math.atan2(state.moveX, state.moveZ); }
}
function aiControl(dt) {
  const levelFactor = { BEGINNER: .45, INTERMEDIATE: .66, ADVANCED: .81, EXPERT: .94 }[state.aiLevel] || .75;
  if (!state.running || state.phase !== 'manual' || Math.random() > dt * (1.1 + levelFactor * 2.1)) return;
  const towardX = player.x - opponent.x, towardZ = player.z - opponent.z, d = Math.hypot(towardX, towardZ) || 1;
  const wantsAttack = ['AGGRESSIVE','BALANCED','COUNTER ATTACKER'].includes(state.personality) && (state.personality === 'AGGRESSIVE' || d > 2.2);
  if (state.personality === 'STAMINA SPECIALIST' || state.personality === 'DEFENSIVE') { opponent.vx += (opponent.x / Math.max(1, Math.hypot(opponent.x, opponent.z))) * dt * 1.7; opponent.vz += (opponent.z / Math.max(1, Math.hypot(opponent.x, opponent.z))) * dt * 1.7; }
  else { opponent.vx += towardX / d * dt * (2.4 + levelFactor); opponent.vz += towardZ / d * dt * (2.4 + levelFactor); }
  if (wantsAttack && !opponent.dashUsed && !opponent.tiltUsed && d > 2 && Math.random() < .18 + levelFactor * .3) {
    opponent.dashUsed = true; opponent.spin -= 12; opponent.vx += Math.sin(opponent.heading) * 5.2; opponent.vz += Math.cos(opponent.heading) * 5.2;
  } else if (wantsAttack && !opponent.dashUsed && !opponent.tiltUsed && d < 3.2) {
    opponent.tiltUsed = true; opponent.spin -= 8; opponent.tiltX = towardZ / d * .38; opponent.tiltZ = -towardX / d * .38; opponent.vx += towardX / d * 1.4; opponent.vz += towardZ / d * 1.4;
  }
  if (opponent.health <= 50 && !opponent.abilityUsed && Math.random() < levelFactor * .3) useAvatar(opponent);
}
function applyTipFriction(f) {
  const base = f.build.tip === 0 ? .17 : f.build.tip === 1 ? .075 : f.build.tip === 2 ? .22 : .095;
  const stability = f.stats.stability / 100 * .045;
  const drag = Math.max(.02, base - stability) * (1 + (100 - f.spin) / 100 * .4);
  f.vx *= Math.max(0, 1 - drag * dt); f.vz *= Math.max(0, 1 - drag * dt);
  const maxSpeed = f.build.tip === 0 ? 6.8 : 5.8; const speed = Math.hypot(f.vx, f.vz); if (speed > maxSpeed) { f.vx *= maxSpeed / speed; f.vz *= maxSpeed / speed; }
}
function updateFighter(f) {
  if (!f.alive) return;
  f.x += f.vx * dt; f.z += f.vz * dt;
  applyTipFriction(f);
  const radius = Math.hypot(f.x, f.z);
  if (radius > 7.7 && radius < 8.35) { const nx = f.x / radius, nz = f.z / radius; f.vx -= nx * dt * 12; f.vz -= nz * dt * 12; f.spin = Math.max(0, f.spin - dt * 3.3); }
  f.heading += (f.build.tip === 0 ? 1 : -1) * dt * (1.9 + f.spin * .055) * (f.build.core === 2 && f.abilityTimer > 0 ? 1.8 : 1);
  const speed = Math.hypot(f.vx, f.vz); if (speed > .24) { const desired = Math.atan2(f.vx, f.vz); const diff = Math.atan2(Math.sin(desired - f.heading), Math.cos(desired - f.heading)); f.heading += diff * dt * (f.stats.stability / 100 * 1.7 + .35); }
  f.spin = Math.max(0, f.spin - dt * (.39 + (100 - f.stats.stamina) * .0032 + speed * .026));
  f.wobble = Math.max(0, f.wobble - dt * .34); f.abilityTimer = Math.max(0, f.abilityTimer - dt); f.shieldTimer = Math.max(0, f.shieldTimer - dt); f.damageFlash = Math.max(0, f.damageFlash - dt);
  const lost = (100 - f.spin) / 100; const w = Math.sin(performance.now() * .009 + f.x) * lost * .26 + f.tiltX + f.wobble * .08; const t = Math.cos(performance.now() * .008 + f.z) * lost * .26 + f.tiltZ + f.wobble * .08;
  f.model.position.set(f.x, .25 + Math.max(0, speed * .012), f.z); f.model.rotation.set(w, 0, t); f.model.userData.body.rotation.y += dt * (14 + f.spin * .27) * (f.build.tip === 1 ? -.78 : 1); f.model.userData.body.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 8));
  f.model.userData.aura.material.opacity = f.abilityTimer > 0 ? .95 : .35 + f.spin / 180;
}
function updatePhase(dt) {
  if (!state.running) return;
  state.phaseLeft -= dt;
  if (state.phaseLeft <= 0) {
    if (state.phase === 'autonomous') { state.phase = 'manual'; state.phaseLeft = 10; player.dashUsed = false; player.tiltUsed = false; opponent.dashUsed = false; opponent.tiltUsed = false; setFeed('MANUAL WINDOW · Dash, Tilt, or hold your spin'); playTone(720, .13, 'sine', .04, 850); }
    else { state.phase = 'autonomous'; state.phaseLeft = 10; setFeed('Autonomous phase · physics takes over'); }
    updateHud();
  }
}
function updatePOVCamera() {
  if (state.camera !== 'pov') return;
  const x = player.x, z = player.z, dirX = Math.sin(player.heading), dirZ = Math.cos(player.heading);
  povCamera.position.set(x + dirX * .04, .25 + .84 + Math.max(0, player.tiltX) * .3, z + dirZ * .04);
  const aim = new THREE.Vector3(x + dirX * 4, .45, z + dirZ * 4); povCamera.lookAt(aim); povCamera.up.set(-Math.sin(player.heading), 0, -Math.cos(player.heading));
}
let dt = 0;
function animate(now) {
  requestAnimationFrame(animate); dt = Math.min(.04, Math.max(0, (now - state.lastTime) / 1000)); state.lastTime = now;
  if (state.launchMode) { state.launchAge += dt; const p = (state.launchAge % 2.2) / 2.2; const swing = Math.abs(p * 2 - 1); $('#launchOverlay').style.setProperty('--launch', `${swing * 100}%`); $('#launchOverlay').querySelector('small').textContent = `Release near center · ${Math.round((.74 + clamp(1 - Math.min(p, 1-p)/.24, 0, 1)*.26)*100)}% power`; }
  if (state.running) {
    updatePhase(dt); updatePlayerInput(); aiControl(dt); updateFighter(player); updateFighter(opponent);
    state.collisionCooldown -= dt; if (state.collisionCooldown <= 0) { collide(player, opponent); state.collisionCooldown = .11; }
    if (!ringOutCheck()) resolveFinishes();
    updateHud();
  }
  if (state.camera === 'pov') updatePOVCamera();
  if (state.shake > 0) { state.shake = Math.max(0, state.shake - dt); const s = state.shake * state.cameraShake; activeCamera.position.x += (Math.random() - .5) * s; }
  workshopModel.rotation.y += dt * .8; workshopModel.userData.body.rotation.y += dt * 7;
  renderer.render(scene, activeCamera);
  if (workshopRenderer && $('#workshopView').classList.contains('active')) workshopRenderer.render(workshopScene, workshopCamera);
}
requestAnimationFrame(animate);

function buildPartOptions() {
  const tab = $('.part-tab.active').dataset.part;
  $('#partOptions').innerHTML = PARTS[tab].map((part, i) => `<button class="part-option ${playerBuild[tab] === i ? 'selected' : ''}" data-index="${i}"><span class="availability">UNLOCKED</span><span class="part-glyph" style="color:${part.color}">${part.glyph}</span><b>${part.name}</b><small>${part.copy}</small></button>`).join('');
  $$('.part-option').forEach(button => button.addEventListener('click', () => { playerBuild[tab] = Number(button.dataset.index); buildPartOptions(); refreshWorkshop(); }));
}
$$('.part-tab').forEach(button => button.addEventListener('click', () => { $$('.part-tab').forEach(b => b.classList.toggle('active', b === button)); buildPartOptions(); }));
function createWorkshopRenderer() {
  if (workshopRenderer) return;
  workshopRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); workshopRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); workshopRenderer.outputColorSpace = THREE.SRGBColorSpace; workshopRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  $('#workshopPreview').appendChild(workshopRenderer.domElement);
  workshopScene = new THREE.Scene(); workshopScene.add(new THREE.HemisphereLight(0xc5e7f2, 0x11151c, 2.3)); const l = new THREE.DirectionalLight(0xffe6ca, 3); l.position.set(-4, 7, 6); workshopScene.add(l); const fill = new THREE.PointLight(0x4abfc4, 50, 8); fill.position.set(3, 2, 2); workshopScene.add(fill);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, .12, 48), new THREE.MeshStandardMaterial({ color: 0x232b32, metalness: .45, roughness: .4 })); pad.position.y = -.62; workshopScene.add(pad); const r = new THREE.Mesh(new THREE.TorusGeometry(1.75, .035, 8, 48), new THREE.MeshStandardMaterial({ color: 0x59646c, metalness: .7, roughness: .25 })); r.rotation.x = Math.PI/2; r.position.y = -.53; workshopScene.add(r);
  workshopModel = createBey(playerBuild); workshopModel.position.y = -.1; workshopScene.add(workshopModel); workshopCamera = new THREE.PerspectiveCamera(37, 1, .1, 30); workshopCamera.position.set(4.5, 4.1, 6.5); workshopCamera.lookAt(0, .1, 0); resizeWorkshop();
}
function resizeWorkshop() { if (!workshopRenderer) return; const box = $('#workshopPreview').getBoundingClientRect(); if (!box.width || !box.height) return; workshopRenderer.setSize(box.width, box.height, false); workshopCamera.aspect = box.width / box.height; workshopCamera.updateProjectionMatrix(); }
function refreshWorkshop() {
  createWorkshopRenderer();
  const old = workshopModel; if (old) workshopScene.remove(old); workshopModel = createBey(playerBuild); workshopModel.position.y = -.1; workshopScene.add(workshopModel); workshopModel.rotation.y = old?.rotation.y || 0;
  const stat = statsFor(playerBuild); $('#statList').innerHTML = [['IMPACT', stat.power], ['STAMINA', stat.stamina], ['STABILITY', stat.stability]].map(([n,v]) => `<div class="stat-line"><span>${n}</span><div class="stat-track"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('');
  $('#buildName').value = playerBuild.name; $('#previewTitle').textContent = playerBuild.name || 'UNTITLED BUILD'; resizeWorkshop();
}
$('#buildName').addEventListener('input', e => { playerBuild.name = e.target.value.toUpperCase(); $('#previewTitle').textContent = playerBuild.name || 'UNTITLED BUILD'; $('#playerBuildName').textContent = playerBuild.name || 'CUSTOM BUILD'; });
$('#saveBuild').addEventListener('click', () => { try { localStorage.setItem('soulsspin-build', JSON.stringify(playerBuild)); toast('Build saved on this device'); } catch { toast('Could not save build'); } });
$('#testBuild').addEventListener('click', () => { applyPlayerBuild(); startMatch(); });
function applyPlayerBuild() { playerBuild.name = $('#buildName').value.trim().toUpperCase() || 'CUSTOM BUILD'; const old = player.model; scene.remove(old); player = makeFighter(playerBuild, { x: -3.2, z: 0 }, buildColor(playerBuild), true); $('#playerBuildName').textContent = playerBuild.name; updateHud(); }

$$('.nav-link').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
$('#brandHome').addEventListener('click', e => { e.preventDefault(); showView('battle'); });
$('#backToBattle').addEventListener('click', () => { applyPlayerBuild(); showView('battle'); });
$('#startMatchBtn').addEventListener('click', () => { applyPlayerBuild(); startMatch(); });
$('#settingsBtn').addEventListener('click', () => showView('settings')); $('#settingsBack').addEventListener('click', () => showView('battle'));
$('#copyCode').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#roomCode').textContent); toast('Room code copied'); } catch { toast('Room code: SOUL-481'); } });
$('#modeSelect').addEventListener('change', e => { state.mode = e.target.value; });
$('#masterVolume').addEventListener('input', e => { sfx.master = e.target.value / 100; $('#volumeValue').textContent = `${e.target.value}%`; });
$('#shakeSetting').addEventListener('input', e => { state.cameraShake = e.target.value / 100; $('#shakeValue').textContent = `${e.target.value}%`; });
window.addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); for (const camera of [topCamera, sideCamera, povCamera]) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); } resizeWorkshop(); });
$('#mobileDash').addEventListener('click', useDash);
updateHud();
