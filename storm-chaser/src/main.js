import * as THREE from 'three';
import { Storm, generateStormConfig } from './storm.js';
import { Player } from './player.js';
import { Radio } from './radio.js';
import { AudioSystem } from './audio.js';
import {
  createScene, createStormCloud, createTornado, createRainSystem,
  createVehicle, LightningSystem, updateRain, updateSkyColor
} from './visuals.js';

// ──── GAME STATE ────
let state = 'forecast'; // forecast | playing | gameover
let stormConfig = null;
let storm = null;
let player = null;
let radio = null;
let audio = null;
let gameTime = 0;
let maxGameTime = 420; // 7 minutes
let photoCooldown = 0;
let cameraMode = 'chase'; // chase | first

// ──── THREE.JS SETUP ────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
document.body.insertBefore(renderer.domElement, document.getElementById('ui-overlay'));

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 1200);
camera.position.set(0, 30, -30);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ──── BUILD SCENE ────
const { scene, ambientLight, dirLight } = createScene();
const stormCloud = createStormCloud();
scene.add(stormCloud);
const tornado = createTornado();
scene.add(tornado);
const rain = createRainSystem();
scene.add(rain);
const lightning = new LightningSystem(scene);
const vehicle = createVehicle();
scene.add(vehicle);

// ──── MINIMAP ────
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

function drawMinimap() {
  if (!storm || !player) return;
  const ctx = minimapCtx;
  const w = 180, h = 180;
  const scale = 0.14;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);

  // Grid roads
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    let rx = w / 2 + i * 200 * scale;
    let ry = h / 2 + i * 200 * scale;
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(w, ry); ctx.stroke();
  }

  // Storm zones
  let sx = w / 2 + (storm.x - player.x) * scale;
  let sz = h / 2 + (storm.z - player.z) * scale;

  // Inflow
  ctx.beginPath();
  ctx.arc(sx, sz, storm.inflowRadius * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(100,100,255,0.15)';
  ctx.fill();

  // Rotation
  ctx.beginPath();
  ctx.arc(sx, sz, storm.rotationRadius * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,200,0,0.2)';
  ctx.fill();

  // Core
  ctx.beginPath();
  ctx.arc(sx, sz, storm.coreRadius * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,50,50,0.3)';
  ctx.fill();

  // Storm movement arrow
  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 2;
  let arrowLen = 15;
  let ah = storm.heading + storm.steerAngle;
  ctx.beginPath();
  ctx.moveTo(sx, sz);
  ctx.lineTo(sx + Math.sin(ah) * arrowLen, sz + Math.cos(ah) * arrowLen);
  ctx.stroke();

  // Tornado
  if (storm.tornadoActive) {
    let ttx = w / 2 + (storm.tornadoX - player.x) * scale;
    let ttz = h / 2 + (storm.tornadoZ - player.z) * scale;
    ctx.beginPath();
    ctx.arc(ttx, ttz, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ttx, ttz, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Player
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-player.rotation);
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-3, 4);
  ctx.lineTo(3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Border
  ctx.strokeStyle = 'rgba(255,107,53,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, w, h);
}

// ──── INPUT ────
const keys = { up: false, down: false, left: false, right: false, photo: false, camera: false };
const keyMap = {
  'KeyW': 'up', 'ArrowUp': 'up',
  'KeyS': 'down', 'ArrowDown': 'down',
  'KeyA': 'left', 'ArrowLeft': 'left',
  'KeyD': 'right', 'ArrowRight': 'right',
  'Space': 'photo',
  'KeyC': 'camera'
};

window.addEventListener('keydown', e => {
  let action = keyMap[e.code];
  if (action) {
    e.preventDefault();
    keys[action] = true;
  }
});
window.addEventListener('keyup', e => {
  let action = keyMap[e.code];
  if (action) keys[action] = false;
});

// ──── FORECAST UI ────
function showForecast() {
  stormConfig = generateStormConfig();

  document.getElementById('fc-type').textContent = stormConfig.type;
  
  let intLabel = stormConfig.intensity > 0.7 ? 'SEVERE' : stormConfig.intensity > 0.4 ? 'MODERATE' : 'WEAK';
  let intEl = document.getElementById('fc-intensity');
  intEl.textContent = intLabel;
  intEl.className = 'value ' + (stormConfig.intensity > 0.7 ? 'danger' : stormConfig.intensity > 0.4 ? 'warn' : 'good');

  document.getElementById('fc-movement').textContent = Math.round(stormConfig.speed) + ' mph ' + getCardinal(stormConfig.heading);

  let torLabel = stormConfig.tornadoProb > 0.4 ? 'HIGH' : stormConfig.tornadoProb > 0.15 ? 'MODERATE' : 'LOW';
  let torEl = document.getElementById('fc-tornado');
  torEl.textContent = torLabel + ' (' + Math.round(stormConfig.tornadoProb * 100) + '%)';
  torEl.className = 'value ' + (stormConfig.tornadoProb > 0.4 ? 'danger' : stormConfig.tornadoProb > 0.15 ? 'warn' : 'good');

  document.getElementById('fc-wind').textContent = stormConfig.windSpeed + ' mph';
  
  let visLabel = stormConfig.visibility > 0.7 ? 'GOOD' : stormConfig.visibility > 0.4 ? 'REDUCED' : 'POOR';
  let visEl = document.getElementById('fc-visibility');
  visEl.textContent = visLabel;
  visEl.className = 'value ' + (stormConfig.visibility > 0.7 ? 'good' : stormConfig.visibility > 0.4 ? 'warn' : 'danger');

  let bearing = Math.atan2(stormConfig.startX, stormConfig.startZ);
  document.getElementById('fc-bearing').textContent = getCardinal(bearing);
  let dist = Math.sqrt(stormConfig.startX ** 2 + stormConfig.startZ ** 2);
  document.getElementById('fc-distance').textContent = Math.round(dist / 10) + ' miles';
  document.getElementById('fc-heading').textContent = getCardinal(stormConfig.heading);
}

function getCardinal(rad) {
  let deg = ((rad * 180 / Math.PI) + 360) % 360;
  let dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ──── START CHASE ────
function startChase() {
  if (!audio) {
    audio = new AudioSystem();
  }
  audio.init();

  storm = new Storm(stormConfig);
  player = new Player();
  radio = new Radio();
  gameTime = 0;
  photoCooldown = 0;

  document.getElementById('forecast-screen').style.display = 'none';
  document.getElementById('gameover-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';

  state = 'playing';
}

// ──── GAME OVER ────
function endGame(reason) {
  state = 'gameover';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('gameover-screen').style.display = 'flex';

  let title = reason === 'destroyed' ? 'VEHICLE DESTROYED' : 'CHASE COMPLETE';
  document.getElementById('gameover-title').textContent = title;
  document.getElementById('gameover-reason').textContent =
    reason === 'destroyed' ? 'Your vehicle sustained critical damage.' : 'Time expired. Good chase!';
  document.getElementById('gameover-score').textContent = Math.round(player.score);
  document.getElementById('stat-photos').textContent = player.photos.length;
  document.getElementById('stat-best').textContent = player.photos.length ? Math.max(...player.photos) : 0;
  document.getElementById('stat-closest').textContent = Math.round(player.closestApproach / 10) + ' mi';
  document.getElementById('stat-multiplier').textContent = 'x' + player.maxMultiplier.toFixed(1);
  document.getElementById('stat-tornado').textContent = player.sawTornado ? 'Yes!' : 'No';
  let mins = Math.floor(gameTime / 60);
  let secs = Math.floor(gameTime % 60);
  document.getElementById('stat-time').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// ──── HUD UPDATE ────
function updateHUD() {
  document.getElementById('score-display').textContent = Math.round(player.score);
  document.getElementById('multiplier-display').textContent = 'x' + player.multiplier.toFixed(1);
  if (player.multiplier >= 3) {
    document.getElementById('multiplier-display').style.color = '#ff4444';
  } else if (player.multiplier >= 2) {
    document.getElementById('multiplier-display').style.color = '#ffaa00';
  } else {
    document.getElementById('multiplier-display').style.color = '#ffaa00';
  }

  document.getElementById('speed-display').textContent = Math.round(Math.abs(player.speed)) + ' mph';
  
  let dist = storm.getDistanceTo(player.x, player.z);
  document.getElementById('dist-display').textContent = (dist / 10).toFixed(1) + ' mi';

  let zone = storm.getZone(player.x, player.z);
  let zoneEl = document.getElementById('zone-display');
  zoneEl.textContent = zone === 'core' ? 'STORM CORE' : zone === 'rotation' ? 'ROTATION' : zone === 'inflow' ? 'INFLOW' : 'Clear';
  zoneEl.style.color = zone === 'core' ? '#ff0000' : zone === 'rotation' ? '#ffaa00' : zone === 'inflow' ? '#44aaff' : '#888';

  let danger = storm.getDangerLevel(player.x, player.z);
  let dangerEl = document.getElementById('danger-display');
  let dangerLabel = danger > 0.7 ? 'EXTREME' : danger > 0.4 ? 'HIGH' : danger > 0.15 ? 'MODERATE' : 'LOW';
  dangerEl.textContent = dangerLabel;
  dangerEl.style.color = danger > 0.7 ? '#ff0000' : danger > 0.4 ? '#ff6600' : danger > 0.15 ? '#ffaa00' : '#44ff44';

  document.getElementById('photo-display').textContent = player.photos.length;

  // Timer
  let remaining = Math.max(0, maxGameTime - gameTime);
  let mins = Math.floor(remaining / 60);
  let secs = Math.floor(remaining % 60);
  let timerEl = document.getElementById('hud-timer');
  timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  timerEl.style.color = remaining < 60 ? '#ff4444' : '#fff';

  // Compass
  let deg = ((player.rotation * 180 / Math.PI) + 360) % 360;
  document.getElementById('compass-text').textContent = getCardinal(player.rotation) + ' ' + Math.round(deg) + '\u00B0';

  // Radio
  let radioEl = document.getElementById('hud-radio');
  if (radio.currentMessage) {
    radioEl.textContent = '\u25C8 ' + radio.currentMessage;
    radioEl.classList.add('visible');
  } else {
    radioEl.classList.remove('visible');
  }

  // Danger warning
  let dangerOverlay = document.getElementById('hud-danger');
  if (danger > 0.7) {
    dangerOverlay.classList.add('visible');
    dangerOverlay.textContent = storm.tornadoActive ? 'TORNADO WARNING' : 'DANGER - STORM CORE';
  } else {
    dangerOverlay.classList.remove('visible');
  }

  // Health bar via status color
  let healthColor = player.health > 60 ? '#44ff44' : player.health > 30 ? '#ffaa00' : '#ff4444';
  document.getElementById('speed-display').style.color = healthColor;
}

// ──── PHOTO ────
function takePhoto() {
  if (photoCooldown > 0) return;
  
  let score = player.takePhoto(storm);
  photoCooldown = 1.5;

  // Camera flash
  let flash = document.getElementById('camera-flash');
  flash.style.opacity = '1';
  setTimeout(() => flash.style.opacity = '0', 80);

  // Score popup
  let popup = document.getElementById('score-popup');
  popup.textContent = score > 0 ? '+' + score : 'No good shot';
  popup.style.color = score > 50 ? '#ff4444' : score > 20 ? '#ffaa00' : score > 0 ? '#ff6b35' : '#666';
  popup.style.opacity = '1';
  popup.style.transform = 'translate(-50%, -50%)';
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%, -80%)';
  }, 1200);

  if (audio) audio.playShutter();
}

// ──── CAMERA ────
function updateCamera() {
  if (!player) return;

  if (cameraMode === 'chase') {
    let camDist = 22;
    let camHeight = 10;
    let targetX = player.x - Math.sin(player.rotation) * camDist;
    let targetZ = player.z - Math.cos(player.rotation) * camDist;

    camera.position.lerp(new THREE.Vector3(targetX, camHeight, targetZ), 0.06);
    
    let lookX = player.x + Math.sin(player.rotation) * 10;
    let lookZ = player.z + Math.cos(player.rotation) * 10;
    let lookTarget = new THREE.Vector3(lookX, 3, lookZ);
    
    let currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    camera.lookAt(lookTarget);
  } else {
    // First person from vehicle
    camera.position.set(player.x, 3.5, player.z);
    let lookX = player.x + Math.sin(player.rotation) * 50;
    let lookZ = player.z + Math.cos(player.rotation) * 50;
    camera.lookAt(lookX, 8, lookZ);
  }

  // Shake in danger
  let danger = storm.getDangerLevel(player.x, player.z);
  if (danger > 0.3) {
    let shakeAmt = (danger - 0.3) * 0.5;
    camera.position.x += (Math.random() - 0.5) * shakeAmt;
    camera.position.y += (Math.random() - 0.5) * shakeAmt * 0.5;
    camera.position.z += (Math.random() - 0.5) * shakeAmt;
  }
}

// ──── UPDATE VISUALS ────
function updateVisuals(dt) {
  // Vehicle position
  vehicle.position.set(player.x, 0, player.z);
  vehicle.rotation.y = player.rotation;

  // Storm cloud position
  stormCloud.position.set(storm.x, 0, storm.z);
  stormCloud.rotation.y += 0.02 * dt * (1 + storm.intensity);
  if (stormCloud.userData.wallCloud) {
    stormCloud.userData.wallCloud.rotation.y -= 0.1 * dt;
  }

  // Tornado
  if (storm.tornadoActive) {
    tornado.visible = true;
    tornado.position.set(storm.tornadoX, 0, storm.tornadoZ);
    tornado.rotation.y += 3 * dt;
    // Scale based on lifetime
    let s = Math.min(1, storm.tornadoLifetime / 3);
    tornado.scale.set(s, 1, s);
    if (tornado.userData.debris) {
      tornado.userData.debris.rotation.y -= 5 * dt;
    }
  } else {
    tornado.visible = false;
  }

  // Rain follows player
  let zone = storm.getZone(player.x, player.z);
  updateRain(rain, dt, player.x, player.z, zone, storm.heading);
  rain.position.set(player.x, 0, player.z);

  // Lightning
  let danger = storm.getDangerLevel(player.x, player.z);
  lightning.update(dt, storm.x, storm.z, danger);

  // Sky
  updateSkyColor(scene, renderer, danger, gameTime);

  // Lighting adjustments
  ambientLight.intensity = 0.6 - danger * 0.3;
  dirLight.intensity = 0.4 - danger * 0.3;

  // Damage red tint
  if (player.damageFlash > 0) {
    scene.fog.color.lerp(new THREE.Color(0.5, 0, 0), player.damageFlash * 0.3);
  }
}

// ──── GAME LOOP ────
let lastTime = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  
  let dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (state !== 'playing') {
    renderer.render(scene, camera);
    return;
  }

  gameTime += dt;
  photoCooldown -= dt;

  // Handle camera toggle
  if (keys.camera) {
    cameraMode = cameraMode === 'chase' ? 'first' : 'chase';
    keys.camera = false;
  }

  // Handle photo
  if (keys.photo) {
    takePhoto();
    keys.photo = false;
  }

  // Update systems
  storm.update(dt);
  player.update(dt, keys, storm);
  radio.update(dt, player, storm);
  if (audio) audio.update(dt, player, storm);

  updateVisuals(dt);
  updateCamera();
  updateHUD();
  drawMinimap();

  renderer.render(scene, camera);

  // End conditions
  if (player.health <= 0) {
    endGame('destroyed');
  } else if (gameTime >= maxGameTime) {
    endGame('time');
  }
}

// ──── EVENT BINDINGS ────
document.getElementById('start-chase-btn').addEventListener('click', startChase);
document.getElementById('play-again-btn').addEventListener('click', () => {
  state = 'forecast';
  document.getElementById('gameover-screen').style.display = 'none';
  document.getElementById('forecast-screen').style.display = 'flex';
  showForecast();
});

// ──── INIT ────
showForecast();
requestAnimationFrame(gameLoop);
