import * as THREE from 'three';

// Build the 3D scene: terrain, sky, storm visuals, particles, tornado
export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x444444, 0.002);

  // Ambient
  const ambientLight = new THREE.AmbientLight(0x556677, 0.6);
  scene.add(ambientLight);

  // Directional (sun behind clouds)
  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.4);
  dirLight.position.set(100, 200, 50);
  scene.add(dirLight);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(1400, 1400, 80, 80);
  // Slight terrain variation
  const posArr = groundGeo.attributes.position.array;
  for (let i = 0; i < posArr.length; i += 3) {
    posArr[i + 2] += (Math.random() - 0.5) * 1.5;
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a6741 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads (grid pattern)
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  for (let i = -2; i <= 2; i++) {
    // Horizontal roads
    let hRoad = new THREE.Mesh(new THREE.PlaneGeometry(1400, 6), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.05, i * 200);
    scene.add(hRoad);
    // Vertical roads
    let vRoad = new THREE.Mesh(new THREE.PlaneGeometry(6, 1400), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(i * 200, 0.05, 0);
    scene.add(vRoad);
  }

  // Scatter some trees/poles for reference
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
  for (let i = 0; i < 120; i++) {
    let tx = (Math.random() - 0.5) * 1200;
    let tz = (Math.random() - 0.5) * 1200;
    // Tree trunk
    let trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 5), trunkMat);
    trunk.position.set(tx, 2, tz);
    scene.add(trunk);
    // Canopy
    let canopy = new THREE.Mesh(new THREE.SphereGeometry(2.5, 5, 4), treeMat);
    canopy.position.set(tx, 5.5, tz);
    scene.add(canopy);
  }

  // Farmsteads
  const barnMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  for (let i = 0; i < 8; i++) {
    let bx = (Math.random() - 0.5) * 1000;
    let bz = (Math.random() - 0.5) * 1000;
    let barn = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 12), barnMat);
    barn.position.set(bx, 3, bz);
    scene.add(barn);
    let roof = new THREE.Mesh(new THREE.ConeGeometry(8, 3, 4), roofMat);
    roof.position.set(bx, 7.5, bz);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof);
  }

  return { scene, ambientLight, dirLight, ground };
}

// Storm cloud mass
export function createStormCloud() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshPhongMaterial({
    color: 0x1a1a2a,
    transparent: true,
    opacity: 0.85,
    flatShading: true
  });

  // Main anvil shape
  for (let i = 0; i < 35; i++) {
    let r = 15 + Math.random() * 40;
    let geo = new THREE.SphereGeometry(r, 6, 5);
    let mesh = new THREE.Mesh(geo, cloudMat);
    mesh.position.set(
      (Math.random() - 0.5) * 80,
      (Math.random()) * 25 + 60,
      (Math.random() - 0.5) * 80
    );
    mesh.scale.y = 0.4 + Math.random() * 0.3;
    group.add(mesh);
  }

  // Darker base (where rain comes from)
  const baseMat = new THREE.MeshPhongMaterial({
    color: 0x0a0a15,
    transparent: true,
    opacity: 0.9,
    flatShading: true
  });
  for (let i = 0; i < 15; i++) {
    let r = 10 + Math.random() * 25;
    let geo = new THREE.SphereGeometry(r, 5, 4);
    let mesh = new THREE.Mesh(geo, baseMat);
    mesh.position.set(
      (Math.random() - 0.5) * 50,
      40 + Math.random() * 15,
      (Math.random() - 0.5) * 50
    );
    mesh.scale.y = 0.5;
    group.add(mesh);
  }

  // Wall cloud (lowered rotating base)
  const wallMat = new THREE.MeshPhongMaterial({
    color: 0x151525,
    transparent: true,
    opacity: 0.9
  });
  let wallCloud = new THREE.Mesh(new THREE.SphereGeometry(18, 8, 6), wallMat);
  wallCloud.position.set(0, 30, 0);
  wallCloud.scale.y = 0.5;
  group.add(wallCloud);
  group.userData.wallCloud = wallCloud;

  return group;
}

// Tornado funnel
export function createTornado() {
  const group = new THREE.Group();
  group.visible = false;

  // Funnel - tapered cylinder
  const funnelGeo = new THREE.CylinderGeometry(1, 12, 50, 12, 8, true);
  const funnelMat = new THREE.MeshPhongMaterial({
    color: 0x2a2a3a,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  const funnel = new THREE.Mesh(funnelGeo, funnelMat);
  funnel.position.y = 25;
  group.add(funnel);
  group.userData.funnel = funnel;

  // Debris cloud at base
  const debrisMat = new THREE.MeshPhongMaterial({
    color: 0x3a3020,
    transparent: true,
    opacity: 0.6
  });
  let debris = new THREE.Mesh(new THREE.SphereGeometry(15, 8, 6), debrisMat);
  debris.position.y = 3;
  debris.scale.y = 0.4;
  group.add(debris);
  group.userData.debris = debris;

  return group;
}

// Rain particle system
export function createRainSystem() {
  const count = 3000;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = Math.random() * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    velocities[i] = 40 + Math.random() * 30;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const mat = new THREE.PointsMaterial({
    color: 0x99aacc,
    size: 0.4,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  });

  const rain = new THREE.Points(geo, mat);
  rain.userData.velocities = velocities;
  rain.userData.count = count;
  return rain;
}

// Lightning flash system
export class LightningSystem {
  constructor(scene) {
    this.scene = scene;
    this.flashLight = new THREE.PointLight(0xccddff, 0, 500);
    this.flashLight.position.set(0, 80, 0);
    scene.add(this.flashLight);
    this.timer = 0;
    this.flashing = false;
    this.flashDuration = 0;

    // Lightning bolt mesh
    this.boltGroup = new THREE.Group();
    scene.add(this.boltGroup);
  }

  update(dt, stormX, stormZ, danger) {
    this.timer -= dt;

    if (this.flashing) {
      this.flashDuration -= dt;
      if (this.flashDuration <= 0) {
        this.flashing = false;
        this.flashLight.intensity = 0;
        this.boltGroup.visible = false;
      } else {
        // Flicker
        this.flashLight.intensity = (Math.random() > 0.3 ? 3 : 0) * danger;
      }
      return;
    }

    if (this.timer <= 0 && danger > 0.1 && Math.random() < danger * 0.05) {
      this.strike(stormX, stormZ, danger);
      this.timer = 1 + Math.random() * 5;
    }
  }

  strike(sx, sz, intensity) {
    // Clear old bolts and dispose geometries
    while (this.boltGroup.children.length) {
      let child = this.boltGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.boltGroup.remove(child);
    }

    let ox = sx + (Math.random() - 0.5) * 80;
    let oz = sz + (Math.random() - 0.5) * 80;
    this.flashLight.position.set(ox, 80, oz);

    // Create jagged bolt
    let points = [];
    let x = ox, y = 75, z = oz;
    for (let i = 0; i < 12; i++) {
      points.push(new THREE.Vector3(x, y, z));
      x += (Math.random() - 0.5) * 15;
      y -= 6 + Math.random() * 3;
      z += (Math.random() - 0.5) * 15;
    }
    let boltGeo = new THREE.BufferGeometry().setFromPoints(points);
    let boltMat = new THREE.LineBasicMaterial({ color: 0xeeeeff, linewidth: 2 });
    let bolt = new THREE.Line(boltGeo, boltMat);
    this.boltGroup.add(bolt);

    // Branch
    if (Math.random() > 0.4) {
      let branchStart = 3 + Math.floor(Math.random() * 5);
      let bp = [];
      let bx = points[branchStart].x, by = points[branchStart].y, bz = points[branchStart].z;
      for (let i = 0; i < 6; i++) {
        bp.push(new THREE.Vector3(bx, by, bz));
        bx += (Math.random() - 0.5) * 12;
        by -= 4 + Math.random() * 3;
        bz += (Math.random() - 0.5) * 12;
      }
      let bg = new THREE.BufferGeometry().setFromPoints(bp);
      this.boltGroup.add(new THREE.Line(bg, boltMat));
    }

    this.boltGroup.visible = true;
    this.flashing = true;
    this.flashDuration = 0.15 + Math.random() * 0.15;
    this.flashLight.intensity = 3 * intensity;
  }
}

// Update rain particles
export function updateRain(rain, dt, playerX, playerZ, stormZone, windAngle) {
  const pos = rain.geometry.attributes.position.array;
  const vel = rain.userData.velocities;
  const count = rain.userData.count;

  let intensity = stormZone === 'core' ? 1 : stormZone === 'rotation' ? 0.7 : stormZone === 'inflow' ? 0.4 : 0.1;
  rain.material.opacity = intensity * 0.6;

  let windX = Math.sin(windAngle) * 10 * intensity;
  let windZ = Math.cos(windAngle) * 10 * intensity;

  for (let i = 0; i < count; i++) {
    let idx = i * 3;
    pos[idx + 1] -= vel[i] * dt * intensity;
    pos[idx] += windX * dt;
    pos[idx + 2] += windZ * dt;

    if (pos[idx + 1] < 0) {
      pos[idx] = (Math.random() - 0.5) * 200;
      pos[idx + 1] = 60 + Math.random() * 20;
      pos[idx + 2] = (Math.random() - 0.5) * 200;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

// Player vehicle mesh
export function createVehicle() {
  const group = new THREE.Group();

  // Body
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
  let body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 4.5), bodyMat);
  body.position.y = 1.2;
  group.add(body);

  // Cabin
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  let cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2), cabinMat);
  cabin.position.set(0, 2.2, -0.3);
  group.add(cabin);

  // Wheels
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
  let positions = [[-1.3, 0.5, 1.5], [1.3, 0.5, 1.5], [-1.3, 0.5, -1.5], [1.3, 0.5, -1.5]];
  positions.forEach(p => {
    let w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(...p);
    w.rotation.z = Math.PI / 2;
    group.add(w);
  });

  // Roof rack / antenna
  let antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), new THREE.MeshLambertMaterial({ color: 0x888888 }));
  antenna.position.set(0.8, 3.3, -0.3);
  group.add(antenna);

  return group;
}

// Dynamic sky color based on storm proximity
export function updateSkyColor(scene, renderer, danger, time) {
  // Lerp from moody blue-gray to dark storm
  let r = 0.35 - danger * 0.3;
  let g = 0.40 - danger * 0.35;
  let b = 0.45 - danger * 0.3;

  // Slight green tint at high danger (tornado sky)
  if (danger > 0.5) {
    g += (danger - 0.5) * 0.15;
  }

  let col = new THREE.Color(r, g, b);
  scene.background = col;
  scene.fog.color = col;
  
  // Increase fog density near storm
  scene.fog.density = 0.002 + danger * 0.008;
}
