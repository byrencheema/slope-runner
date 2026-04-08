// Radio chatter / AI assistant providing imperfect storm analysis
export class Radio {
  constructor() {
    this.messages = [];
    this.currentMessage = '';
    this.messageTimer = 0;
    this.displayTime = 5;
    this.cooldown = 0;
    this.lastZone = 'clear';
    this.warningGiven = {};
  }

  update(dt, player, storm) {
    this.messageTimer -= dt;
    this.cooldown -= dt;

    if (this.messageTimer <= 0) {
      this.currentMessage = '';
    }

    if (this.cooldown > 0) return;

    let zone = storm.getZone(player.x, player.z);
    let dist = storm.getDistanceTo(player.x, player.z);
    let danger = storm.getDangerLevel(player.x, player.z);

    // Zone transition messages
    if (zone !== this.lastZone) {
      if (zone === 'inflow' && this.lastZone === 'clear') {
        this.show(pickRandom([
          "You're entering the inflow region. Good position for photography.",
          "Inflow band ahead. Visibility should be decent from here.",
          "This is the money spot - good viewing angle on the storm structure.",
        ]));
      } else if (zone === 'rotation') {
        this.show(pickRandom([
          "WARNING: You're in the rotation zone. Watch for debris!",
          "Mesocyclone region - tornado could drop any moment. Stay alert.",
          "Heavy rotation detected nearby. Don't push your luck.",
        ]));
      } else if (zone === 'core') {
        this.show(pickRandom([
          "DANGER! You're in the storm core! Get out NOW!",
          "Core punch! Visibility near zero - giant hail likely!",
          "You're inside the bear's cage! Extreme danger!",
        ]));
      } else if (zone === 'clear' && this.lastZone !== 'clear') {
        this.show(pickRandom([
          "You've cleared the storm. Reposition if needed.",
          "Back in the clear. Storm is moving - stay with it.",
        ]));
      }
      this.lastZone = zone;
      return;
    }

    // Tornado warnings
    if (storm.tornadoActive && !this.warningGiven.tornado) {
      this.show(pickRandom([
        "TORNADO! TORNADO ON THE GROUND! Get your camera ready!",
        "We've got a twister! Confirmed tornado! This is it!",
        "Tornado touchdown confirmed! Stay safe but this is your shot!",
      ]));
      this.warningGiven.tornado = true;
      return;
    }
    if (!storm.tornadoActive && this.warningGiven.tornado) {
      this.show("Tornado has lifted. Keep watching - it could reform.");
      this.warningGiven.tornado = false;
      return;
    }

    // Distance-based hints (imperfect analysis)
    if (dist > 250 && Math.random() < 0.02) {
      let bearing = Math.atan2(storm.x - player.x, storm.z - player.z);
      let dir = getCardinal(bearing);
      // Imperfect - sometimes slightly wrong
      if (Math.random() < 0.2) {
        let dirs = ['N','NE','E','SE','S','SW','W','NW'];
        let idx = dirs.indexOf(dir);
        dir = dirs[(idx + (Math.random() < 0.5 ? 1 : -1) + 8) % 8];
      }
      this.show("Storm appears to be to the " + dir + ". Close the gap.");
    }

    // Health warnings
    if (player.health < 40 && !this.warningGiven.health40) {
      this.show("Your vehicle is taking serious damage. Consider pulling back!");
      this.warningGiven.health40 = true;
    }
    if (player.health < 20 && !this.warningGiven.health20) {
      this.show("CRITICAL DAMAGE! You need to get out or you won't make it!");
      this.warningGiven.health20 = true;
    }

    // Score encouragement
    if (player.multiplier >= 3 && !this.warningGiven.multi3) {
      this.show("Great positioning! Your footage quality is excellent!");
      this.warningGiven.multi3 = true;
    }
  }

  show(msg) {
    this.currentMessage = msg;
    this.messageTimer = this.displayTime;
    this.cooldown = 6;
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCardinal(radians) {
  let deg = ((radians * 180 / Math.PI) + 360) % 360;
  let dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}
