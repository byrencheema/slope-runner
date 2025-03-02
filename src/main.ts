import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Initialize game variables
let score = 0;
let isGameOver = false;
let speed = 0.2;
const moveSpeed = 0.15;
let obstacles: THREE.Group[] = [];
const obstacleSpawnInterval = 60; // Frames between obstacle spawns
let frameCount = 0;

// Setup renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB); // Sky blue color
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
document.body.appendChild(renderer.domElement);

// Add fog for depth perception
scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

// Calculate slope-related constants
const SLOPE_ANGLE = Math.PI / 6; // 30 degrees
const SLOPE_HEIGHT_OFFSET = Math.sin(SLOPE_ANGLE) * 2; // Vertical offset based on slope angle

// Create a simple slope using a single plane
const slopeGeometry = new THREE.PlaneGeometry(200, 2000, 20, 100); // Wider and longer slope
const slopeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00FF00, // Green for grass/ground
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide
});
const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
slope.rotation.x = -SLOPE_ANGLE; // Tilt to create the slope
slope.position.z = -1000; // Position it to extend further forward
slope.position.y = 0; // Position at origin height
slope.receiveShadow = true;
scene.add(slope);

// Add side barriers to make the slope more visible
const barrierGeometry = new THREE.BoxGeometry(1, 5, 2000);
const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });

// Left barrier
const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
leftBarrier.position.set(-100, 0, -1000);
scene.add(leftBarrier);

// Right barrier
const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
rightBarrier.position.set(100, 0, -1000);
scene.add(rightBarrier);

// Add slope markers (flags) along the sides
for (let z = -100; z > -1900; z -= 200) {
    // Left flag
    const leftFlag = createFlag(0xFF0000);
    leftFlag.position.set(-90, Math.sin(SLOPE_ANGLE) * Math.abs(z), z);
    scene.add(leftFlag);
    
    // Right flag
    const rightFlag = createFlag(0x0000FF);
    rightFlag.position.set(90, Math.sin(SLOPE_ANGLE) * Math.abs(z), z);
    scene.add(rightFlag);
}

// Function to create a flag
function createFlag(color: number): THREE.Group {
    const flagGroup = new THREE.Group();
    
    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 1.5;
    flagGroup.add(pole);
    
    // Flag
    const flagGeometry = new THREE.PlaneGeometry(1, 0.8);
    const flagMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        side: THREE.DoubleSide
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0.5, 2.5, 0);
    flag.rotation.y = Math.PI / 2;
    flagGroup.add(flag);
    
    return flagGroup;
}

// Create skier
const skierGroup = new THREE.Group();

// Skier body
const bodyGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.2);
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x2244FF });
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
body.position.y = 0.4;
body.castShadow = true;
skierGroup.add(body);

// Skier head
const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFE0BD });
const head = new THREE.Mesh(headGeometry, headMaterial);
head.position.y = 0.9;
head.castShadow = true;
skierGroup.add(head);

// Skis
const skiGeometry = new THREE.BoxGeometry(0.1, 0.05, 1);
const skiMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
const leftSki = new THREE.Mesh(skiGeometry, skiMaterial);
const rightSki = new THREE.Mesh(skiGeometry, skiMaterial);
leftSki.position.set(-0.1, 0, 0);
rightSki.position.set(0.1, 0, 0);
leftSki.castShadow = true;
rightSki.castShadow = true;
skierGroup.add(leftSki);
skierGroup.add(rightSki);

// Position skier
skierGroup.position.set(0, 0, 0); // Start at origin
skierGroup.rotation.x = SLOPE_ANGLE; // Match slope angle
scene.add(skierGroup);

// Properly position the skier on the slope surface
function updateSkierPosition() {
    // Calculate the correct height based on the slope angle and z position
    // Use the same formula as the slope's rotation
    skierGroup.position.y = Math.sin(SLOPE_ANGLE) * Math.abs(skierGroup.position.z) + 0.2; // Small offset to stay on surface
}

// Initial positioning
updateSkierPosition();

// Add lighting
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6); // Brighter ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
directionalLight.position.set(5, 15, 5); // Adjust light position
directionalLight.castShadow = true;
directionalLight.shadow.camera.far = 100; // Increase shadow distance
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Position camera behind skier
camera.position.set(0, 5, 10); // Higher up and further back for better view
camera.lookAt(skierGroup.position);

// Movement controls
const keys = {
    left: false,
    right: false
};

window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'ArrowRight':
            keys.right = true;
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
    }
});

// Create a tree obstacle
function createTree(x: number, z: number) {
    const treeGroup = new THREE.Group();
    
    // Tree trunk (brown cylinder)
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2; // Half of trunk height
    treeGroup.add(trunk);
    
    // Tree top (green cone)
    const topGeometry = new THREE.ConeGeometry(2, 6, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.7 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 6; // Trunk height + half of cone height
    treeGroup.add(top);
    
    // Position the tree
    const y = Math.sin(SLOPE_ANGLE) * Math.abs(z);
    treeGroup.position.set(x, y, z);
    
    // Add collision data
    treeGroup.userData = { type: 'obstacle', radius: 1.5 };
    
    return treeGroup;
}

// Create a rock obstacle
function createRock(x: number, z: number) {
    const rockGroup = new THREE.Group();
    
    // Create a rock (gray sphere with noise)
    const rockGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    
    // Deform the rock to make it look more natural
    const vertices = rockGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const y = vertices.getY(i);
        const z = vertices.getZ(i);
        
        const noise = 0.2 * Math.random();
        vertices.setX(i, x * (1 + noise));
        vertices.setY(i, y * (1 + noise));
        vertices.setZ(i, z * (1 + noise));
    }
    vertices.needsUpdate = true;
    
    rockGroup.add(rock);
    
    // Position the rock
    const y = Math.sin(SLOPE_ANGLE) * Math.abs(z);
    rockGroup.position.set(x, y, z);
    
    // Add collision data
    rockGroup.userData = { type: 'obstacle', radius: 1.5 };
    
    return rockGroup;
}

// Function to spawn obstacles
function spawnObstacle() {
    const isTree = Math.random() > 0.3;
    const x = (Math.random() - 0.5) * 180; // Random position across the wider slope
    const z = skierGroup.position.z - 100; // Spawn further ahead of player

    const obstacle = isTree ? createTree(x, z) : createRock(x, z);
    scene.add(obstacle);
    obstacles.push(obstacle);

    // Remove obstacles that are too far behind
    obstacles = obstacles.filter(obs => {
        if (obs.position.z > skierGroup.position.z + 50) { // Increased distance for cleanup
            scene.remove(obs);
            return false;
        }
        return true;
    });
}

// Check for collisions between skier and obstacles
function checkCollision() {
    const skierRadius = 1.0; // Skier collision radius
    
    for (const obstacle of obstacles) {
        const obstacleRadius = obstacle.userData.radius || 1.0;
        const dx = skierGroup.position.x - obstacle.position.x;
        const dz = skierGroup.position.z - obstacle.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (skierRadius + obstacleRadius)) {
            return true; // Collision detected
        }
    }
    
    // Check if skier is out of bounds (off the slope)
    if (skierGroup.position.x < -95 || skierGroup.position.x > 95) {
        return true;
    }
    
    return false;
}

// Handle game over
function handleGameOver() {
    isGameOver = true;
    
    // Create game over text
    const gameOverDiv = document.createElement('div');
    gameOverDiv.style.position = 'absolute';
    gameOverDiv.style.width = '100%';
    gameOverDiv.style.top = '30%';
    gameOverDiv.style.textAlign = 'center';
    gameOverDiv.style.color = 'white';
    gameOverDiv.style.fontSize = '48px';
    gameOverDiv.style.fontFamily = 'Arial, sans-serif';
    gameOverDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    gameOverDiv.innerHTML = `
        <div>GAME OVER</div>
        <div style="font-size: 24px; margin-top: 20px;">Final Score: ${Math.floor(score / 60)}</div>
        <div style="font-size: 18px; margin-top: 30px;">Press SPACE to restart</div>
    `;
    document.body.appendChild(gameOverDiv);
    
    // Add crash effect
    const crashSound = new Audio('crash.mp3');
    crashSound.volume = 0.5;
    crashSound.play().catch(e => console.log('Audio play failed:', e));
    
    // Add skier falling animation
    skierGroup.rotation.z = Math.PI / 2; // Skier falls sideways
    
    // Add restart listener
    document.addEventListener('keydown', function restartListener(event) {
        if (event.code === 'Space') {
            document.body.removeChild(gameOverDiv);
            document.removeEventListener('keydown', restartListener);
            resetGame();
        }
    });
}

// Reset the game
function resetGame() {
    // Reset game state
    isGameOver = false;
    speed = 0.2;
    score = 0;
    
    // Clear obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    
    // Reset skier position
    skierGroup.position.set(0, 0, 0);
    skierGroup.rotation.set(0, 0, 0);
    
    // Start animation again
    animate();
}

// Add restart button listener
document.getElementById('restart-button')!.addEventListener('click', resetGame);

// Add snow particles
const snowCount = 1000;
const snowParticles = new THREE.Group();
scene.add(snowParticles);

// Create snow particles
for (let i = 0; i < snowCount; i++) {
    const snowGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const snowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const snowflake = new THREE.Mesh(snowGeometry, snowMaterial);
    
    // Random position around the player
    snowflake.position.set(
        (Math.random() - 0.5) * 50,
        Math.random() * 20,
        (Math.random() - 0.5) * 50
    );
    
    // Store initial position for animation
    snowflake.userData = {
        speed: Math.random() * 0.05 + 0.02,
        offset: Math.random() * 100
    };
    
    snowParticles.add(snowflake);
}

// Animation loop
function animate() {
    if (!isGameOver) {
        requestAnimationFrame(animate);

        frameCount++;
        if (frameCount % obstacleSpawnInterval === 0) {
            spawnObstacle();
        }

        // Gradually increase speed
        speed += 0.0001;

        // Move skier forward
        skierGroup.position.z -= speed;
        
        // Update skier's height based on slope position
        updateSkierPosition();
        
        // Handle left/right movement
        if (keys.left && skierGroup.position.x > -90) { // Wider range to match wider slope
            skierGroup.position.x -= moveSpeed;
            skierGroup.rotation.z = Math.PI / 12; // Tilt while turning
        } else if (keys.right && skierGroup.position.x < 90) { // Wider range to match wider slope
            skierGroup.position.x += moveSpeed;
            skierGroup.rotation.z = -Math.PI / 12; // Tilt while turning
        } else {
            skierGroup.rotation.z = 0; // Reset tilt
        }

        // Animate snow particles
        snowParticles.children.forEach((snowflake, index) => {
            // Move snow down and slightly to the side
            snowflake.position.y -= snowflake.userData.speed;
            snowflake.position.x += Math.sin(frameCount * 0.01 + snowflake.userData.offset) * 0.01;
            
            // Reset snow position when it falls below the slope
            if (snowflake.position.y < -5) {
                snowflake.position.y = 15;
                snowflake.position.x = (Math.random() - 0.5) * 180 + skierGroup.position.x;
                snowflake.position.z = (Math.random() - 0.5) * 100 + skierGroup.position.z;
            }
        });
        
        // Move snow particles with player
        snowParticles.position.z = skierGroup.position.z;

        // Check for collisions
        if (checkCollision()) {
            handleGameOver();
            return;
        }

        // Update camera position to follow skier - more behind the player
        camera.position.x = skierGroup.position.x;
        // Calculate camera height based on skier's position on the slope
        camera.position.y = skierGroup.position.y + 4; // Higher camera for better view
        camera.position.z = skierGroup.position.z + 10; // Further behind
        
        // Look slightly ahead and down at the slope
        camera.lookAt(new THREE.Vector3(
            skierGroup.position.x,
            skierGroup.position.y - 1, // Look down at the slope
            skierGroup.position.z - 10 // Look further ahead
        ));
        
        // Update score
        score += 1;
        document.getElementById('score')!.textContent = `Score: ${Math.floor(score / 60)}`;

        renderer.render(scene, camera);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
});

// Start the game
animate(); 