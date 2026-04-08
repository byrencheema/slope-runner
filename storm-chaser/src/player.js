// Player vehicle controller
export class Player {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.rotation = 0; // facing direction
    this.speed = 0;
    this.maxSpeed = 45;
    this.acceleration = 25;
    this.braking = 35;
    this.friction = 8;
    this.turnSpeed = 2.2;
    this.health = 100;
    this.photos = [];
    this.score = 0;
    this.multiplier = 1.0;
    this.maxMultiplier = 1.0;
    this.closestApproach = Infinity;
    this.sawTornado = false;
    this.damageFlash = 0;
  }

  update(dt, keys, storm) {
    // Acceleration
    if (keys.up) {
      this.speed += this.acceleration * dt;
    } else if (keys.down) {
      this.speed -= this.braking * dt;
    } else {
      // Friction
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * dt);
    }
    this.speed = Math.max(-15, Math.min(this.maxSpeed, this.speed));

    // Turning (only when moving)
    let turnFactor = Math.min(1, Math.abs(this.speed) / 10);
    if (keys.left) this.rotation += this.turnSpeed * dt * turnFactor;
    if (keys.right) this.rotation -= this.turnSpeed * dt * turnFactor;

    // Movement
    this.x += Math.sin(this.rotation) * this.speed * dt;
    this.z += Math.cos(this.rotation) * this.speed * dt;

    // Map boundaries
    let boundary = 600;
    this.x = Math.max(-boundary, Math.min(boundary, this.x));
    this.z = Math.max(-boundary, Math.min(boundary, this.z));

    // Storm interaction
    let dist = storm.getDistanceTo(this.x, this.z);
    this.closestApproach = Math.min(this.closestApproach, dist);
    
    if (storm.tornadoActive) this.sawTornado = true;

    // Danger and damage
    let danger = storm.getDangerLevel(this.x, this.z);
    let zone = storm.getZone(this.x, this.z);
    
    if (zone === 'core') {
      this.health -= (15 + storm.intensity * 25) * dt;
      this.damageFlash = 0.5;
      // Reduce speed in core
      this.speed *= (1 - 0.5 * dt);
    } else if (zone === 'rotation') {
      this.health -= (5 + storm.intensity * 10) * dt;
      this.damageFlash = Math.max(this.damageFlash, 0.2);
    }
    
    // Tornado damage
    if (storm.tornadoActive) {
      let tdx = this.x - storm.tornadoX;
      let tdz = this.z - storm.tornadoZ;
      let tDist = Math.sqrt(tdx * tdx + tdz * tdz);
      if (tDist < 20) {
        this.health -= 50 * dt; // Instant death zone
        this.damageFlash = 1.0;
      } else if (tDist < 50) {
        this.health -= 15 * dt;
        this.damageFlash = Math.max(this.damageFlash, 0.5);
        // Push away from tornado
        let pushAngle = Math.atan2(tdx, tdz);
        this.x += Math.sin(pushAngle) * 10 * dt;
        this.z += Math.cos(pushAngle) * 10 * dt;
      }
    }

    // Multiplier based on zone
    if (zone === 'inflow') {
      this.multiplier = Math.min(3.0, this.multiplier + 0.3 * dt);
    } else if (zone === 'rotation') {
      this.multiplier = Math.min(5.0, this.multiplier + 0.8 * dt);
    } else if (zone === 'core') {
      this.multiplier = Math.min(5.0, this.multiplier + 0.5 * dt);
    } else {
      this.multiplier = Math.max(1.0, this.multiplier - 0.5 * dt);
    }
    this.maxMultiplier = Math.max(this.maxMultiplier, this.multiplier);

    // Passive score from being near storm
    if (zone !== 'clear') {
      this.score += danger * 5 * this.multiplier * dt;
    }

    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.health = Math.max(0, Math.min(100, this.health));
  }

  takePhoto(storm) {
    let score = storm.getPhotoScore(this.x, this.z);
    score = Math.round(score * this.multiplier);
    this.photos.push(score);
    this.score += score;
    return score;
  }
}
