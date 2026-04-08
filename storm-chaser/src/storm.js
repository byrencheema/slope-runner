// Storm system with core, inflow, and rotation zones
export class Storm {
  constructor(config) {
    this.type = config.type;
    this.intensity = config.intensity;
    this.tornadoProb = config.tornadoProb;
    this.windSpeed = config.windSpeed;
    this.visibility = config.visibility;
    
    // Position and movement
    this.x = config.startX;
    this.z = config.startZ;
    this.heading = config.heading;
    this.speed = config.speed;
    this.time = 0;
    
    // Storm structure radii
    this.coreRadius = 40 + this.intensity * 20;
    this.inflowRadius = this.coreRadius + 60 + this.intensity * 15;
    this.rotationRadius = this.coreRadius + 25 + this.intensity * 10;
    
    // Tornado state
    this.tornadoActive = false;
    this.tornadoTimer = 0;
    this.tornadoCooldown = 0;
    this.tornadoLifetime = 0;
    this.tornadoX = 0;
    this.tornadoZ = 0;
    
    // Dynamic behavior
    this.wobble = 0;
    this.intensityPulse = 0;
    this.steerAngle = 0;
  }

  update(dt) {
    this.time += dt;
    
    // Wobble movement
    this.wobble += dt * 0.5;
    this.steerAngle = Math.sin(this.wobble) * 0.3 + Math.sin(this.wobble * 0.7) * 0.15;
    
    // Steer storm back toward center when it drifts too far
    let distFromCenter = Math.sqrt(this.x * this.x + this.z * this.z);
    if (distFromCenter > 400) {
      let pullStrength = (distFromCenter - 400) / 200;
      let angleToCenter = Math.atan2(-this.x, -this.z);
      let angleDiff = angleToCenter - this.heading;
      // Normalize to -PI..PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.heading += angleDiff * Math.min(pullStrength, 1) * dt * 0.5;
    }

    let currentHeading = this.heading + this.steerAngle;
    this.x += Math.sin(currentHeading) * this.speed * dt;
    this.z += Math.cos(currentHeading) * this.speed * dt;
    
    // Intensity pulses
    this.intensityPulse = Math.sin(this.time * 0.3) * 0.15;
    
    // Tornado logic
    this.tornadoCooldown -= dt;
    if (this.tornadoActive) {
      this.tornadoLifetime -= dt;
      // Tornado stays near rotation zone
      let tAngle = this.time * 0.2;
      this.tornadoX = this.x + Math.sin(tAngle) * this.rotationRadius * 0.7;
      this.tornadoZ = this.z + Math.cos(tAngle) * this.rotationRadius * 0.7;
      
      if (this.tornadoLifetime <= 0) {
        this.tornadoActive = false;
        this.tornadoCooldown = 20 + Math.random() * 30;
      }
    } else if (this.tornadoCooldown <= 0 && Math.random() < this.tornadoProb * dt * 0.02) {
      this.tornadoActive = true;
      this.tornadoLifetime = 15 + Math.random() * 30;
      this.tornadoCooldown = 0;
    }
  }

  getZone(px, pz) {
    let dx = px - this.x;
    let dz = pz - this.z;
    let dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < this.coreRadius * (1 + this.intensityPulse)) return 'core';
    if (dist < this.rotationRadius * (1 + this.intensityPulse)) return 'rotation';
    if (dist < this.inflowRadius * (1 + this.intensityPulse)) return 'inflow';
    return 'clear';
  }

  getDistanceTo(px, pz) {
    let dx = px - this.x;
    let dz = pz - this.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  getDangerLevel(px, pz) {
    let zone = this.getZone(px, pz);
    let base = zone === 'core' ? 1.0 : zone === 'rotation' ? 0.6 : zone === 'inflow' ? 0.2 : 0;
    
    // Add tornado danger
    if (this.tornadoActive) {
      let tdx = px - this.tornadoX;
      let tdz = pz - this.tornadoZ;
      let tDist = Math.sqrt(tdx * tdx + tdz * tdz);
      if (tDist < 30) base = Math.max(base, 1.0);
      else if (tDist < 60) base = Math.max(base, 0.7);
    }
    
    return Math.min(base * (1 + this.intensityPulse), 1.0);
  }

  getVisibility(px, pz) {
    let zone = this.getZone(px, pz);
    if (zone === 'core') return 0.15;
    if (zone === 'rotation') return 0.4;
    if (zone === 'inflow') return 0.7;
    return 1.0;
  }
  
  getPhotoScore(px, pz) {
    let dist = this.getDistanceTo(px, pz);
    let zone = this.getZone(px, pz);
    let vis = this.getVisibility(px, pz);
    
    // Base score from proximity
    let proximityScore = Math.max(0, 1 - dist / this.inflowRadius) * 50;
    
    // Inflow zone bonus (best viewing angle)
    let zoneBonus = zone === 'inflow' ? 30 : zone === 'rotation' ? 15 : zone === 'core' ? -10 : 0;
    
    // Visibility factor - can't photograph what you can't see
    let visFactor = vis;
    
    // Tornado bonus
    let tornadoBonus = 0;
    if (this.tornadoActive) {
      let tdx = px - this.tornadoX;
      let tdz = pz - this.tornadoZ;
      let tDist = Math.sqrt(tdx * tdx + tdz * tdz);
      if (tDist < 100) {
        tornadoBonus = Math.max(0, (1 - tDist / 100)) * 80;
        // But you need visibility to photograph it
        tornadoBonus *= visFactor;
      }
    }
    
    return Math.max(0, Math.round((proximityScore + zoneBonus + tornadoBonus) * visFactor));
  }
}

export function generateStormConfig() {
  const types = ['Supercell', 'Squall Line', 'HP Supercell', 'LP Supercell'];
  const typeIdx = Math.floor(Math.random() * types.length);
  const type = types[typeIdx];
  
  let intensity = 0.3 + Math.random() * 0.7; // 0.3-1.0
  let tornadoProb = 0;
  let speed = 8 + Math.random() * 12;
  let windSpeed = 30 + intensity * 60;
  let vis = 1.0 - intensity * 0.4;
  
  if (type === 'Supercell') {
    tornadoProb = 0.2 + Math.random() * 0.5;
    intensity = Math.max(intensity, 0.5);
  } else if (type === 'HP Supercell') {
    tornadoProb = 0.1 + Math.random() * 0.3;
    vis *= 0.7;
    intensity = Math.max(intensity, 0.6);
  } else if (type === 'LP Supercell') {
    tornadoProb = 0.3 + Math.random() * 0.4;
    vis *= 1.2;
    intensity = Math.max(intensity, 0.4);
  } else {
    tornadoProb = Math.random() * 0.15;
    speed += 5;
  }

  let heading = Math.random() * Math.PI * 2;
  let angle = Math.random() * Math.PI * 2;
  let dist = 200 + Math.random() * 150;
  
  return {
    type, intensity: Math.min(intensity, 1),
    tornadoProb: Math.min(tornadoProb, 0.8),
    windSpeed: Math.round(windSpeed),
    visibility: Math.min(vis, 1),
    speed, heading,
    startX: Math.sin(angle) * dist,
    startZ: Math.cos(angle) * dist
  };
}
