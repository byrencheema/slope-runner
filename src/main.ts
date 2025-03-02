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
document.body.appendChild(renderer.domElement);

// Add fog for depth perception
scene.fog = new THREE.Fog(0x87CEEB, 1, 100);

// Create slope
const slopeGeometry = new THREE.PlaneGeometry(20, 1000);
const slopeMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xFFFFFF,
    shininess: 10,
    side: THREE.DoubleSide // Render both sides of the plane
});
const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
slope.rotation.x = -Math.PI / 6; // 30-degree angle
slope.position.z = 0;
slope.position.y = -2;
slope.receiveShadow = true;
scene.add(slope);

// Calculate slope-related constants
const SLOPE_ANGLE = Math.PI / 6; // 30 degrees
const SLOPE_HEIGHT_OFFSET = Math.sin(SLOPE_ANGLE) * 2; // Vertical offset based on slope angle

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
skierGroup.position.set(0, -2 + SLOPE_HEIGHT_OFFSET, 0);
skierGroup.rotation.x = SLOPE_ANGLE; // Match slope angle
scene.add(skierGroup);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
directionalLight.position.set(0, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Position camera behind skier
camera.position.set(0, 2, 4);
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

// Create a tree function
function createTree(x: number, z: number): THREE.Group {
    const tree = new THREE.Group();

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4A2B0F });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    tree.add(trunk);

    // Tree top (multiple layers of cones)
    const layers = 3;
    for (let i = 0; i < layers; i++) {
        const topGeometry = new THREE.ConeGeometry(1 - i * 0.2, 1.5, 8);
        const topMaterial = new THREE.MeshPhongMaterial({ color: 0x0F4D0F });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 1 + i * 0.7;
        top.castShadow = true;
        tree.add(top);
    }

    // Calculate y position based on slope
    const distanceFromStart = Math.abs(z);
    const heightOffset = -2 + Math.sin(SLOPE_ANGLE) * distanceFromStart;
    
    tree.position.set(x, heightOffset, z);
    tree.rotation.x = SLOPE_ANGLE; // Align with slope
    tree.scale.set(0.7, 0.7, 0.7);
    return tree;
}

// Create a rock function
function createRock(x: number, z: number): THREE.Group {
    const rock = new THREE.Group();

    const rockGeometry = new THREE.DodecahedronGeometry(0.8, 1);
    const rockMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666,
        roughness: 0.8,
    });
    const rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
    rockMesh.castShadow = true;
    rockMesh.scale.y = 0.7;
    rock.add(rockMesh);

    // Calculate y position based on slope
    const distanceFromStart = Math.abs(z);
    const heightOffset = -2 + Math.sin(SLOPE_ANGLE) * distanceFromStart;
    
    rock.position.set(x, heightOffset - 0.4, z);
    rock.rotation.x = SLOPE_ANGLE; // Align with slope
    rock.rotation.y = Math.random() * Math.PI;
    return rock;
}

// Function to spawn obstacles
function spawnObstacle() {
    const isTree = Math.random() > 0.3;
    const x = (Math.random() - 0.5) * 16; // Random position across slope
    const z = skierGroup.position.z - 50; // Spawn ahead of player

    const obstacle = isTree ? createTree(x, z) : createRock(x, z);
    scene.add(obstacle);
    obstacles.push(obstacle);

    // Remove obstacles that are too far behind
    obstacles = obstacles.filter(obs => {
        if (obs.position.z > skierGroup.position.z + 10) {
            scene.remove(obs);
            return false;
        }
        return true;
    });
}

// Collision detection function
function checkCollision(): boolean {
    const skierBox = new THREE.Box3().setFromObject(skierGroup);
    
    for (const obstacle of obstacles) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (skierBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }
    return false;
}

// Game over function
function handleGameOver() {
    isGameOver = true;
    const gameOverScreen = document.getElementById('game-over')!;
    const finalScoreElement = document.getElementById('final-score')!;
    finalScoreElement.textContent = Math.floor(score / 60).toString();
    gameOverScreen.style.display = 'block';
}

// Reset game function
function resetGame() {
    // Reset game variables
    score = 0;
    isGameOver = false;
    speed = 0.2;
    frameCount = 0;
    
    // Reset skier position
    skierGroup.position.set(0, -2 + SLOPE_HEIGHT_OFFSET, 0);
    skierGroup.rotation.set(SLOPE_ANGLE, 0, 0);
    
    // Remove all obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    
    // Hide game over screen
    document.getElementById('game-over')!.style.display = 'none';
    
    // Start animation
    animate();
}

// Add restart button listener
document.getElementById('restart-button')!.addEventListener('click', resetGame);

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

        // Move skier forward and adjust height based on slope
        skierGroup.position.z -= speed;
        skierGroup.position.y = -2 + Math.sin(SLOPE_ANGLE) * Math.abs(skierGroup.position.z);
        
        // Handle left/right movement
        if (keys.left && skierGroup.position.x > -8) {
            skierGroup.position.x -= moveSpeed;
            skierGroup.rotation.z = Math.PI / 12; // Tilt while turning
        } else if (keys.right && skierGroup.position.x < 8) {
            skierGroup.position.x += moveSpeed;
            skierGroup.rotation.z = -Math.PI / 12; // Tilt while turning
        } else {
            skierGroup.rotation.z = 0; // Reset tilt
        }

        // Check for collisions
        if (checkCollision()) {
            handleGameOver();
            return;
        }

        // Update camera position to follow skier
        camera.position.x = skierGroup.position.x;
        camera.position.y = skierGroup.position.y + 2;
        camera.position.z = skierGroup.position.z + 4;
        camera.lookAt(skierGroup.position);
        
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