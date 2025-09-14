import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Global variables
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// Game state
let popups = { negative: [], positive: [] };
let activePopups = [];
let active3DPopups = [];
let playerPosition = new THREE.Vector3(0, 1.6, 0);
let audioContext;
let staticGainNode, musicGainNode, rooftopMusicGainNode;
let staticSource, riverSource, fireSource, rooftopMusicSource;
let postProcessComposer;
let currentScene = 'home'; // 'home', 'main' or 'rooftop'
let rooftopScene, rooftopCamera;
let gameStarted = false;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let mobileJoystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
let mobileLook = { active: false, lastX: 0, lastY: 0 };
let takeBackButton, returnButton;
let popupsHidden = false;
let lastPopupUpdate = 0;
let popupUpdateInterval = 1000; // Update every 1 second
let currentPopupTier = 0; // 0 = none, 1 = 1-10, 2 = 1-20, 3 = 1-30

// Room dimensions
const ROOM_WIDTH = 40;
const ROOM_DEPTH = 20;
const ROOM_HEIGHT = 10;
const WALL_THICKNESS = 0.5;
const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 4;
const WINDOW_WIDTH = 2;
const WINDOW_HEIGHT = 1.5;

// Home screen and mobile setup functions
function setupHomeScreen() {
    const startBtn = document.getElementById('start-btn');
    const continueBtn = document.getElementById('continue-btn');
    const homeScreen = document.getElementById('home-screen');
    const tutorialPopup = document.getElementById('tutorial-popup');
    
    // Create 3D home screen
    createHomeScreen3D();
    
    startBtn.addEventListener('click', () => {
        homeScreen.style.display = 'none';
        tutorialPopup.style.display = 'flex';
        // Clean up home screen 3D
        if (window.homeScreenRenderer) {
            window.homeScreenRenderer.dispose();
        }
    });
    
    continueBtn.addEventListener('click', () => {
        tutorialPopup.style.display = 'none';
        currentScene = 'main';
        gameStarted = true;
        
        // Initialize mobile controls if needed
        if (isMobile) {
            setupMobileControls();
        }
    });
}

function createHomeScreen3D() {
    const homeCanvas = document.getElementById('home-canvas');
    if (!homeCanvas) return;
    
    // Create 3D scene for home screen
    const homeScene = new THREE.Scene();
    const homeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const homeRenderer = new THREE.WebGLRenderer({ canvas: homeCanvas, alpha: true });
    homeRenderer.setSize(window.innerWidth, window.innerHeight);
    homeRenderer.shadowMap.enabled = true;
    homeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    window.homeScreenRenderer = homeRenderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    homeScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 5);
    homeScene.add(directionalLight);
    
    // Create big fire on left side (dark side)
    const firePositions = [
        { x: -8, y: 0, z: -2 },
        { x: -6, y: 0, z: 1 },
        { x: -10, y: 0, z: 0 }
    ];
    
    firePositions.forEach(pos => {
        // Fire barrel
        const barrelGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.set(pos.x, pos.y + 1.5, pos.z);
        homeScene.add(barrel);
        
        // Fire particles
        const fireGeometry = new THREE.BufferGeometry();
        const firePositions = new Float32Array(50 * 3);
        for (let i = 0; i < 150; i += 3) {
            firePositions[i] = pos.x + (Math.random() - 0.5) * 2;
            firePositions[i + 1] = pos.y + 3 + Math.random() * 3;
            firePositions[i + 2] = pos.z + (Math.random() - 0.5) * 2;
        }
        fireGeometry.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
        
        const fireMaterial = new THREE.PointsMaterial({
            color: 0xff4500,
            size: 0.3,
            transparent: true,
            opacity: 0.8
        });
        
        const fireParticles = new THREE.Points(fireGeometry, fireMaterial);
        homeScene.add(fireParticles);
    });
    
    // Create big river on right side (light side)
    const riverGeometry = new THREE.PlaneGeometry(12, 3);
    const riverMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a90e2,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.position.set(8, 0, 0);
    homeScene.add(river);
    
    // Add floating yellow particles on light side (static, barely moving)
    const lightParticleGeometry = new THREE.BufferGeometry();
    const lightParticlePositions = new Float32Array(30 * 3);
    for (let i = 0; i < 90; i += 3) {
        lightParticlePositions[i] = 6 + Math.random() * 6;
        lightParticlePositions[i + 1] = 2 + Math.random() * 4;
        lightParticlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    lightParticleGeometry.setAttribute('position', new THREE.BufferAttribute(lightParticlePositions, 3));
    
    const lightParticleMaterial = new THREE.PointsMaterial({
        color: 0xffff00,
        size: 0.2,
        transparent: true,
        opacity: 0.6
    });
    
    const lightParticles = new THREE.Points(lightParticleGeometry, lightParticleMaterial);
    lightParticles.userData = { isLightParticles: true, time: 0 };
    homeScene.add(lightParticles);
    
    // Camera position
    homeCamera.position.set(0, 3, 8);
    homeCamera.lookAt(0, 2, 0);
    
    // Animation loop for home screen
    function animateHome() {
        if (currentScene === 'home') {
            requestAnimationFrame(animateHome);
            
            // Animate fire particles (keep same movement)
            homeScene.children.forEach(child => {
                if (child.material && child.material.color && child.material.color.r > 0.8) {
                    const positions = child.geometry.attributes.position.array;
                    for (let i = 1; i < positions.length; i += 3) {
                        positions[i] += Math.random() * 0.1;
                        if (positions[i] > 8) {
                            positions[i] = 3;
                        }
                    }
                    child.geometry.attributes.position.needsUpdate = true;
                }
                
                // Animate light particles very slowly
                if (child.userData && child.userData.isLightParticles) {
                    child.userData.time += 0.005; // Very slow time increment
                    const positions = child.geometry.attributes.position.array;
                    for (let i = 1; i < positions.length; i += 3) {
                        // Tiny floating motion
                        positions[i] += Math.sin(child.userData.time + i) * 0.002;
                    }
                    child.geometry.attributes.position.needsUpdate = true;
                }
            });
            
            homeRenderer.render(homeScene, homeCamera);
        }
    }
    
    animateHome();
}

function setupMobileControls() {
    const joystick = document.getElementById('mobile-joystick');
    const knob = document.getElementById('mobile-joystick-knob');
    const canvas = renderer.domElement;
    
    // Joystick for movement
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileJoystick.active = true;
        const rect = joystick.getBoundingClientRect();
        mobileJoystick.startX = rect.left + rect.width / 2;
        mobileJoystick.startY = rect.top + rect.height / 2;
    });
    
    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!mobileJoystick.active) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - mobileJoystick.startX;
        const deltaY = touch.clientY - mobileJoystick.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 30;
        
        if (distance <= maxDistance) {
            mobileJoystick.currentX = deltaX / maxDistance;
            mobileJoystick.currentY = deltaY / maxDistance;
            knob.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            mobileJoystick.currentX = Math.cos(angle);
            mobileJoystick.currentY = Math.sin(angle);
            knob.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * maxDistance}px, ${Math.sin(angle) * maxDistance}px)`;
        }
    });
    
    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileJoystick.active = false;
        mobileJoystick.currentX = 0;
        mobileJoystick.currentY = 0;
        knob.style.transform = 'translate(-50%, -50%)';
    });
    
    // Touch controls for looking around
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            mobileLook.active = true;
            mobileLook.lastX = e.touches[0].clientX;
            mobileLook.lastY = e.touches[0].clientY;
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!mobileLook.active || e.touches.length !== 1) return;
        
        const deltaX = e.touches[0].clientX - mobileLook.lastX;
        const deltaY = e.touches[0].clientY - mobileLook.lastY;
        
        // Apply rotation (similar to mouse movement)
        const sensitivity = 0.002;
        camera.rotation.y -= deltaX * sensitivity;
        camera.rotation.x -= deltaY * sensitivity;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
        
        mobileLook.lastX = e.touches[0].clientX;
        mobileLook.lastY = e.touches[0].clientY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileLook.active = false;
    });
}

// Initialize
init();
animate();

async function init() {
    // Initialize home screen first
    setupHomeScreen();
    
    // Load popups
    await loadPopups();
    
    // Ensure we have popups loaded (force fallback if needed)
    if (popups.negative.length === 0 || popups.positive.length === 0) {
        console.warn('Popups still not loaded after init, forcing fallback');
        createFallbackPopups();
    }
    
    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.01);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // Controls
    controls = new PointerLockControls(camera, renderer.domElement);
    
    // Click to lock pointer
    renderer.domElement.addEventListener('click', () => {
        controls.lock();
    });
    
    controls.addEventListener('lock', () => {
        document.getElementById('instructions').style.display = 'none';
    });
    
    controls.addEventListener('unlock', () => {
        document.getElementById('instructions').style.display = 'block';
    });
    
    // Keyboard controls
    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW':
                moveForward = true;
                break;
            case 'KeyA':
                moveLeft = true;
                break;
            case 'KeyS':
                moveBackward = true;
                break;
            case 'KeyD':
                moveRight = true;
                break;
            case 'KeyO':
                togglePopups();
                break;
        }
    };
    
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW':
                moveForward = false;
                break;
            case 'KeyA':
                moveLeft = false;
                break;
            case 'KeyS':
                moveBackward = false;
                break;
            case 'KeyD':
                moveRight = false;
                break;
        }
    };
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Mouse interaction for buttons
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    renderer.domElement.addEventListener('click', (event) => {
        // Initialize audio context on first user interaction
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('Audio context resumed');
                // Start static noise if pending
                if (window.pendingStaticSource) {
                    try {
                        window.pendingStaticSource.start();
                        console.log('Static noise started after resume');
                        window.pendingStaticSource = null;
                    } catch (e) {
                        console.log('Static already started or error:', e);
                    }
                }
            });
        }
        
        if (!controls.isLocked) return;
        
        // Calculate mouse position
        mouse.x = 0; // Center of screen when locked
        mouse.y = 0;
        
        if (currentScene === 'main') {
            raycaster.setFromCamera(mouse, camera);
            
            // Check button intersection
            const intersects = raycaster.intersectObject(takeBackButton, true);
            if (intersects.length > 0) {
                switchToRooftop();
            }
        } else if (currentScene === 'rooftop') {
            raycaster.setFromCamera(mouse, rooftopCamera);
            
            // Check return button
            const intersects = raycaster.intersectObject(returnButton, true);
            if (intersects.length > 0) {
                switchToMain();
            }
        }
    });
    
    // Build environment
    createRoom();
    createLighting();
    createDarkSideEnvironment();
    createLightSideEnvironment();
    createInteractiveElements();
    createGraffiti();
    createVoxelObjects();
    createProgressLines();
    setupAudio();
    
    // Create rooftop scene
    createRooftopScene();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

async function loadPopups() {
    try {
        const response = await fetch('popups.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        console.log('Loaded popup text:', text.substring(0, 200) + '...');
        
        const lines = text.split('\n');
        
        let currentType = null;
        let currentNumber = 0;
        
        lines.forEach((line, index) => {
            const originalLine = line;
            line = line.trim();
            
            console.log(`Line ${index}: "${originalLine}" -> "${line}"`);
            
            if (line.includes('Negative thoughts')) {
                currentType = 'negative';
                currentNumber = 0;
                console.log('Found negative section at line', index);
            } else if (line.includes('Positive thoughts')) {
                currentType = 'positive';
                currentNumber = 0;
                console.log('Found positive section at line', index);
            } else if (line.match(/^\d+\./)) {
                // Handle lines like "1.	I'm a bit off today."
                const match = line.match(/^(\d+)\.\s*(.*)/);
                console.log(`Trying to parse line ${index}:`, { line, match });
                if (match && match[2] && match[2].trim()) {
                    const content = match[2].trim();
                    console.log(`Adding popup: ${currentType} #${match[1]}: "${content}"`);
                    if (currentType === 'negative') {
                        popups.negative.push({ number: parseInt(match[1]), text: content });
                    } else if (currentType === 'positive') {
                        popups.positive.push({ number: parseInt(match[1]), text: content });
                    }
                }
            }
        });
        
        console.log('Loaded popups:', {
            negative: popups.negative.length,
            positive: popups.positive.length,
            firstNegative: popups.negative[0],
            firstPositive: popups.positive[0]
        });
        
        // If no popups were loaded, use fallback
        if (popups.negative.length === 0 || popups.positive.length === 0) {
            console.warn('No popups were parsed, using fallback');
            createFallbackPopups();
        }
    } catch (error) {
        console.error('Error loading popups:', error);
        createFallbackPopups();
    }
}

function createFallbackPopups() {
    // Create comprehensive fallback popups
    popups.negative = [
        { number: 1, text: "I'm a bit off today." },
        { number: 2, text: "People probably don't notice me." },
        { number: 3, text: "I always say the wrong thing." },
        { number: 4, text: "I'm behind everyone my age." },
        { number: 5, text: "I'm not attractive enough." },
        { number: 6, text: "My best is average." },
        { number: 7, text: "I mess up first impressions." },
        { number: 8, text: "I'm wasting my time." },
        { number: 9, text: "Everyone else has it figured out." },
        { number: 10, text: "I'm not cut out for this." },
        { number: 11, text: "I'll never meet a girl who likes me." },
        { number: 12, text: "I'm boring." },
        { number: 13, text: "She'd never be into me." },
        { number: 14, text: "My work isn't good enough to share." },
        { number: 15, text: "They can tell I'm insecure." },
        { number: 16, text: "I'm an impostor." },
        { number: 17, text: "Nothing I try ever sticks." },
        { number: 18, text: "I'm destined to be mediocre." },
        { number: 19, text: "I'm too late to the party." },
        { number: 20, text: "I'm fundamentally unlovable." },
        { number: 21, text: "Success happens to other people." },
        { number: 22, text: "I'll never be successful in business." },
        { number: 23, text: "Any win I get is a fluke." },
        { number: 24, text: "If they knew me, they'd leave." },
        { number: 25, text: "I don't deserve good things." },
        { number: 26, text: "I'll die alone." },
        { number: 27, text: "My future is already ruined." },
        { number: 28, text: "There's no point trying anymore." },
        { number: 29, text: "I'm a burden to people." },
        { number: 30, text: "Nothing I do will ever matter." }
    ];
    
    popups.positive = [
        { number: 1, text: "I'm a little off, but it's temporary." },
        { number: 2, text: "Some people notice me; the right ones will." },
        { number: 3, text: "I can learn to say the right thing." },
        { number: 4, text: "I'm on my own timeline." },
        { number: 5, text: "People have found me attractive before." },
        { number: 6, text: "My best improves with reps." },
        { number: 7, text: "First impressions can be fixed." },
        { number: 8, text: "Every hour I invest compounds." },
        { number: 9, text: "Nobody has it fully figured out." },
        { number: 10, text: "I'm learning the skills I need." },
        { number: 11, text: "I will meet someone who likes me for me." },
        { number: 12, text: "I'm interesting when I'm present." },
        { number: 13, text: "Attraction is unpredictable; I only need one yes." },
        { number: 14, text: "My work deserves to be seen." },
        { number: 15, text: "Confidence grows with practice." },
        { number: 16, text: "I belong in the rooms I enter." },
        { number: 17, text: "Attempts are data; iteration works." },
        { number: 18, text: "I can be exceptional at my niche." },
        { number: 19, text: "The right time beats early or late." },
        { number: 20, text: "I'm fully worthy of love." },
        { number: 21, text: "I'm already building momentum." },
        { number: 22, text: "I can build a real business; revenue follows persistence." },
        { number: 23, text: "Wins come from systems, not luck." },
        { number: 24, text: "The more real I am, the closer people get." },
        { number: 25, text: "I deserve good things and I'm working toward them." },
        { number: 26, text: "I will build a life with someone." },
        { number: 27, text: "My future is flexible and forgiving." },
        { number: 28, text: "Effort creates momentum; momentum creates options." },
        { number: 29, text: "People benefit from me being here." },
        { number: 30, text: "What I do can matter a lot—to me and to others." }
    ];
    
    console.log('Using fallback popups - 30 negative and 30 positive messages loaded');
}

function createRoom() {
    // Floor - split into two parts
    const darkFloorGeometry = new THREE.BoxGeometry(ROOM_WIDTH/2, 0.1, ROOM_DEPTH);
    const darkFloorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1
    });
    const darkFloor = new THREE.Mesh(darkFloorGeometry, darkFloorMaterial);
    darkFloor.position.set(-ROOM_WIDTH/4, -0.05, 0);
    darkFloor.receiveShadow = true;
    scene.add(darkFloor);
    
    // Light side floor (grass)
    const lightFloorGeometry = new THREE.BoxGeometry(ROOM_WIDTH/2, 0.1, ROOM_DEPTH);
    const lightFloorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d5a2d,
        roughness: 0.8,
        metalness: 0
    });
    const lightFloor = new THREE.Mesh(lightFloorGeometry, lightFloorMaterial);
    lightFloor.position.set(ROOM_WIDTH/4, -0.05, 0);
    lightFloor.receiveShadow = true;
    scene.add(lightFloor);
    
    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    
    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS),
        wallMaterial
    );
    backWall.position.set(0, ROOM_HEIGHT/2, -ROOM_DEPTH/2 + WALL_THICKNESS/2);
    backWall.castShadow = true;
    scene.add(backWall);
    
    // Front wall
    const frontWall = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS),
        wallMaterial
    );
    frontWall.position.set(0, ROOM_HEIGHT/2, ROOM_DEPTH/2 - WALL_THICKNESS/2);
    frontWall.castShadow = true;
    scene.add(frontWall);
    
    // Side walls
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH),
        wallMaterial
    );
    leftWall.position.set(-ROOM_WIDTH/2 + WALL_THICKNESS/2, ROOM_HEIGHT/2, 0);
    leftWall.castShadow = true;
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH),
        wallMaterial
    );
    rightWall.position.set(ROOM_WIDTH/2 - WALL_THICKNESS/2, ROOM_HEIGHT/2, 0);
    rightWall.castShadow = true;
    scene.add(rightWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_WIDTH, WALL_THICKNESS, ROOM_DEPTH),
        wallMaterial
    );
    ceiling.position.set(0, ROOM_HEIGHT - WALL_THICKNESS/2, 0);
    scene.add(ceiling);
    
    // Middle dividing wall with door and window
    createDividingWall();
}

function createDividingWall() {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    
    // Top part (above door)
    const topWall = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, ROOM_DEPTH),
        wallMaterial
    );
    topWall.position.set(0, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT)/2, 0);
    topWall.castShadow = true;
    scene.add(topWall);
    
    // Side parts (around door)
    const sideDepth = (ROOM_DEPTH - DOOR_WIDTH) / 2;
    const leftSide = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, sideDepth),
        wallMaterial
    );
    leftSide.position.set(0, ROOM_HEIGHT/2, -ROOM_DEPTH/2 + sideDepth/2);
    leftSide.castShadow = true;
    scene.add(leftSide);
    
    const rightSide = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, sideDepth),
        wallMaterial
    );
    rightSide.position.set(0, ROOM_HEIGHT/2, ROOM_DEPTH/2 - sideDepth/2);
    rightSide.castShadow = true;
    scene.add(rightSide);
    
    // Window - Actually carve it out properly
    const windowY = DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT)/2;
    
    // Top part of wall above window
    const aboveWindow = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, (ROOM_HEIGHT - DOOR_HEIGHT - WINDOW_HEIGHT)/2, WINDOW_WIDTH),
        wallMaterial
    );
    aboveWindow.position.set(0, windowY + WINDOW_HEIGHT/2 + (ROOM_HEIGHT - DOOR_HEIGHT - WINDOW_HEIGHT)/4, 0);
    aboveWindow.castShadow = true;
    scene.add(aboveWindow);
    
    // Bottom part of wall below window (above door)
    const belowWindow = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_THICKNESS, (ROOM_HEIGHT - DOOR_HEIGHT - WINDOW_HEIGHT)/2, WINDOW_WIDTH),
        wallMaterial
    );
    belowWindow.position.set(0, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT - WINDOW_HEIGHT)/4, 0);
    belowWindow.castShadow = true;
    scene.add(belowWindow);
    
    // Labels above door
    createLabels();
}

function createInteractiveElements() {
    // Create "Take me back" button with skull
    const buttonGroup = new THREE.Group();
    
    // Button base
    const buttonGeometry = new THREE.BoxGeometry(2, 1, 0.3);
    const buttonMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0x440000,
        emissiveIntensity: 0.3
    });
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.castShadow = true;
    buttonGroup.add(buttonMesh);
    
    // Skull icon
    const skullCanvas = document.createElement('canvas');
    const skullCtx = skullCanvas.getContext('2d');
    skullCanvas.width = 256;
    skullCanvas.height = 256;
    
    // Draw skull
    skullCtx.fillStyle = '#ffffff';
    skullCtx.font = 'bold 180px Arial';
    skullCtx.textAlign = 'center';
    skullCtx.textBaseline = 'middle';
    skullCtx.fillText('💀', 128, 128);
    
    const skullTexture = new THREE.CanvasTexture(skullCanvas);
    const skullGeometry = new THREE.PlaneGeometry(0.8, 0.8);
    const skullMaterial = new THREE.MeshBasicMaterial({ 
        map: skullTexture,
        transparent: true
    });
    const skullMesh = new THREE.Mesh(skullGeometry, skullMaterial);
    skullMesh.position.z = 0.16;
    buttonGroup.add(skullMesh);
    
    // Text
    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');
    textCanvas.width = 512;
    textCanvas.height = 128;
    textCtx.fillStyle = '#ffffff';
    textCtx.font = 'bold 32px Arial';
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillText('TAKE ME BACK', 256, 44);
    textCtx.font = 'italic 20px Arial';
    textCtx.fillStyle = '#cccccc';
    textCtx.fillText('click me to visit another time', 256, 84);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textGeometry = new THREE.PlaneGeometry(1.8, 0.4);
    const textMaterial = new THREE.MeshBasicMaterial({ 
        map: textTexture,
        transparent: true
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.y = -0.3;
    textMesh.position.z = 0.16;
    buttonGroup.add(textMesh);
    
    // Position on dark side wall
    buttonGroup.position.set(-19, 3, 0);
    buttonGroup.rotation.y = Math.PI / 2; // Face inward from wall
    
    // Make it interactive
    buttonGroup.userData = { isButton: true, action: 'rooftop' };
    takeBackButton = buttonGroup;
    
    scene.add(buttonGroup);
}

function createGraffiti() {
    const createGraffitiText = (text, position, rotation, size = 1) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 256;
        
        // Graffiti style
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.font = `bold ${48 * size}px Arial`;
        ctx.strokeText(text, 20, 128);
        
        ctx.fillStyle = '#ffaa00';
        ctx.font = `bold ${48 * size}px Arial`;
        ctx.fillText(text, 20, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(8 * size, 2 * size);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.y = rotation;
        scene.add(mesh);
    };
    
    // Graffiti texts
    createGraffitiText(
        'the chase, the halt, the hint, the fault',
        new THREE.Vector3(-18, 2, -8),
        Math.PI / 2,
        0.8
    );
    
    // Long text - split into multiple lines
    const longTextCanvas = document.createElement('canvas');
    const longCtx = longTextCanvas.getContext('2d');
    longTextCanvas.width = 2048;
    longTextCanvas.height = 512;
    
    longCtx.fillStyle = '#111111';
    longCtx.fillRect(0, 0, longTextCanvas.width, longTextCanvas.height);
    
    longCtx.fillStyle = '#00ff00';
    longCtx.font = 'bold 32px monospace';
    const lines = [
        'the kazakhstan dollar, Paper Skies, BMO, TD fog,',
        'Everlife cofounder, Charlie Kirk\'s assassination',
        'being near Lehi Utah, Epiphany holiday and',
        'realizing everlife can be built now'
    ];
    
    lines.forEach((line, i) => {
        longCtx.fillText(line, 20, 50 + i * 40);
    });
    
    const longTexture = new THREE.CanvasTexture(longTextCanvas);
    const longGeometry = new THREE.PlaneGeometry(12, 3);
    const longMaterial = new THREE.MeshBasicMaterial({ 
        map: longTexture,
        transparent: true,
        opacity: 0.7
    });
    const longMesh = new THREE.Mesh(longGeometry, longMaterial);
    longMesh.position.set(18, 3, -7);
    longMesh.rotation.y = -Math.PI / 2;
    scene.add(longMesh);
    
    // Removed ChaseTO graffiti
}

function createProgressLines() {
    // Create subtle floor lines to show popup progression zones
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x666666, 
        transparent: true, 
        opacity: 0.3
    });
    
    // Based on the popup logic:
    // Tier 1: 1-10 popups show when progress > 0.05 (distance ~1-2 units from center)
    // Tier 2: 11-20 popups show when progress > 0.33 (distance ~6-7 units from center) 
    // Tier 3: 21-30 popups show when progress > 0.66 (distance ~13-14 units from center)
    
    const lines = [];
    
    // Dark side progression lines (negative X)
    const darkSideLines = [
        { x: -3, label: 'Tier 1' },   // Around 15% into dark side
        { x: -8, label: 'Tier 2' },   // Around 40% into dark side  
        { x: -15, label: 'Tier 3' }   // Around 75% into dark side
    ];
    
    // Light side progression lines (positive X)
    const lightSideLines = [
        { x: 3, label: 'Tier 1' },    // Around 15% into light side
        { x: 8, label: 'Tier 2' },    // Around 40% into light side
        { x: 15, label: 'Tier 3' }    // Around 75% into light side
    ];
    
    // Create lines for both sides
    [...darkSideLines, ...lightSideLines].forEach(lineData => {
        const points = [
            new THREE.Vector3(lineData.x, 0.01, -ROOM_DEPTH/2 + 1),
            new THREE.Vector3(lineData.x, 0.01, ROOM_DEPTH/2 - 1)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial.clone());
        
        // Make tier 3 lines more visible (highest severity)
        if (lineData.label === 'Tier 3') {
            line.material.color.setHex(lineData.x < 0 ? 0x881111 : 0x118811);
            line.material.opacity = 0.5;
        }
        
        scene.add(line);
    });
}

function createVoxelObjects() {
    // Voxel style ropes
    const ropePositions = [
        { start: new THREE.Vector3(-5, 0, -5), end: new THREE.Vector3(-3, 3, -7) },
        { start: new THREE.Vector3(8, 0, 3), end: new THREE.Vector3(10, 2, 5) }
    ];
    
    ropePositions.forEach(({ start, end }) => {
        const ropeGeometry = new THREE.CylinderGeometry(0.05, 0.05, start.distanceTo(end));
        const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        rope.position.copy(midPoint);
        rope.lookAt(end);
        rope.rotateX(Math.PI / 2);
        scene.add(rope);
    });
    
    // Tools
    const toolPositions = [
        { pos: new THREE.Vector3(-12, 0.3, 3), rot: 0.5 },
        { pos: new THREE.Vector3(15, 0.3, -3), rot: -0.3 }
    ];
    
    toolPositions.forEach(({ pos, rot }) => {
        // Hammer handle
        const handleGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.copy(pos);
        handle.rotation.z = rot;
        scene.add(handle);
        
        // Hammer head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.4);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.copy(pos);
        head.position.y += 0.8;
        head.rotation.z = rot;
        scene.add(head);
    });
    
    // Xbox console
    const xboxGroup = new THREE.Group();
    const xboxGeometry = new THREE.BoxGeometry(1.5, 0.3, 1.2);
    const xboxMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const xbox = new THREE.Mesh(xboxGeometry, xboxMaterial);
    xboxGroup.add(xbox);
    
    // Xbox logo (green circle)
    const logoGeometry = new THREE.CircleGeometry(0.2, 16);
    const logoMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.y = 0.16;
    logo.rotation.x = -Math.PI / 2;
    xboxGroup.add(logo);
    
    xboxGroup.position.set(-8, 0.2, 6);
    xboxGroup.rotation.y = 0.3;
    scene.add(xboxGroup);
    
    // TV with static
    const tvGroup = new THREE.Group();
    
    // TV frame
    const tvFrameGeometry = new THREE.BoxGeometry(2.5, 1.8, 0.3);
    const tvFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const tvFrame = new THREE.Mesh(tvFrameGeometry, tvFrameMaterial);
    tvGroup.add(tvFrame);
    
    // TV screen with static
    const staticCanvas = document.createElement('canvas');
    const staticCtx = staticCanvas.getContext('2d');
    staticCanvas.width = 256;
    staticCanvas.height = 256;
    
    // Initial static
    const imageData = staticCtx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const val = Math.random() * 255;
        imageData.data[i] = val;
        imageData.data[i + 1] = val;
        imageData.data[i + 2] = val;
        imageData.data[i + 3] = 255;
    }
    staticCtx.putImageData(imageData, 0, 0);
    
    const staticTexture = new THREE.CanvasTexture(staticCanvas);
    const screenGeometry = new THREE.PlaneGeometry(2, 1.4);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
        map: staticTexture,
        emissive: 0xffffff,
        emissiveIntensity: 0.1
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.16;
    screen.userData = { staticCanvas, staticCtx, staticTexture };
    tvGroup.add(screen);
    
    tvGroup.position.set(12, 1.5, 7);
    tvGroup.rotation.y = -Math.PI / 4;
    scene.add(tvGroup);
}

function createLabels() {
    // Create text using canvas
    const createTextTexture = (text, bgColor, textColor) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Background
        context.fillStyle = bgColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Text
        context.fillStyle = textColor;
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    };
    
    // Dark side label (flip rotation to make readable)
    const darkLabelGeometry = new THREE.PlaneGeometry(3, 0.8);
    const darkLabelMaterial = new THREE.MeshBasicMaterial({
        map: createTextTexture('DARK SIDE', '#000000', '#ff0000'),
        side: THREE.DoubleSide
    });
    const darkLabel = new THREE.Mesh(darkLabelGeometry, darkLabelMaterial);
    darkLabel.position.set(-WALL_THICKNESS/2 - 0.01, DOOR_HEIGHT + 0.8, 0);
    darkLabel.rotation.y = -Math.PI / 2; // Flipped
    scene.add(darkLabel);
    
    // Light side label (flip rotation to make readable)
    const lightLabelGeometry = new THREE.PlaneGeometry(3, 0.8);
    const lightLabelMaterial = new THREE.MeshBasicMaterial({
        map: createTextTexture('LIGHT SIDE', '#ffffff', '#00aa00'),
        side: THREE.DoubleSide
    });
    const lightLabel = new THREE.Mesh(lightLabelGeometry, lightLabelMaterial);
    lightLabel.position.set(WALL_THICKNESS/2 + 0.01, DOOR_HEIGHT + 0.8, 0);
    lightLabel.rotation.y = Math.PI / 2; // Flipped
    scene.add(lightLabel);
}

function createLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
}

function createDarkSideEnvironment() {
    // Debris and trash
    const debrisGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.5);
    const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    for (let i = 0; i < 15; i++) {
        const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
        debris.position.set(
            -Math.random() * (ROOM_WIDTH/2 - 2) - 2,
            0.15,
            (Math.random() - 0.5) * (ROOM_DEPTH - 4)
        );
        debris.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        debris.castShadow = true;
        scene.add(debris);
    }
    
    // Muck pools
    const muckGeometry = new THREE.CylinderGeometry(2, 2.5, 0.1, 8);
    const muckMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a0f0a,
        roughness: 0.95,
        metalness: 0.3
    });
    
    for (let i = 0; i < 5; i++) {
        const muck = new THREE.Mesh(muckGeometry, muckMaterial);
        muck.position.set(
            -Math.random() * (ROOM_WIDTH/2 - 3) - 3,
            0.05,
            (Math.random() - 0.5) * (ROOM_DEPTH - 4)
        );
        scene.add(muck);
    }
    
    // Trash cans
    createTrashCans();
    
    // Animated trash fires
    createTrashFires();
    
    // Voxel rats
    createRats();
    
    // Chain link fence
    createDarkSideFence();
}

function createTrashCans() {
    const canGeometry = new THREE.CylinderGeometry(1, 1.2, 2, 8);
    const canMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 });
    
    const positions = [
        new THREE.Vector3(-8, 1, -5),
        new THREE.Vector3(-15, 1, 5),
        new THREE.Vector3(-12, 1, 0)
    ];
    
    positions.forEach(pos => {
        const can = new THREE.Mesh(canGeometry, canMaterial);
        can.position.copy(pos);
        can.castShadow = true;
        scene.add(can);
    });
}

function createTrashFires() {
    const firePositions = [
        new THREE.Vector3(-8, 0.5, -5),
        new THREE.Vector3(-15, 0.5, 5)
    ];
    
    firePositions.forEach(pos => {
        // Fire container
        const fireGroup = new THREE.Group();
        fireGroup.position.copy(pos);
        
        // Fire light
        const fireLight = new THREE.PointLight(0xff6600, 2, 10);
        fireLight.position.y = 1;
        fireLight.castShadow = true;
        fireGroup.add(fireLight);
        
        // Animated fire particles
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.1 * Math.random(), 1, 0.5),
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    Math.random() * 0.05 + 0.02,
                    (Math.random() - 0.5) * 0.02
                ),
                life: Math.random()
            };
            particles.push(particle);
            fireGroup.add(particle);
        }
        
        fireGroup.userData = { particles };
        scene.add(fireGroup);
    });
}

function createRats() {
    const ratGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.6);
    const ratMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    
    for (let i = 0; i < 5; i++) {
        const rat = new THREE.Mesh(ratGeometry, ratMaterial);
        rat.position.set(
            -Math.random() * (ROOM_WIDTH/2 - 3) - 3,
            0.1,
            (Math.random() - 0.5) * (ROOM_DEPTH - 4)
        );
        rat.castShadow = true;
        rat.userData = {
            speed: Math.random() * 0.02 + 0.01,
            direction: Math.random() * Math.PI * 2
        };
        scene.add(rat);
    }
}

function createLightSideEnvironment() {
    // Trees
    createTrees();
    
    // Birds and bees
    createFlyingCreatures();
    
    // Rabbits
    createRabbits();
    
    // River
    createRiver();
    
    // Wooden fence
    createLightSideFence();
}

function createTrees() {
    const createTree = (x, z, type) => {
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2917 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Leaves
        let leavesGeometry;
        let leavesMaterial;
        
        if (type === 'pine') {
            leavesGeometry = new THREE.ConeGeometry(2, 4, 6);
            leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x0f4f0f });
        } else {
            leavesGeometry = new THREE.SphereGeometry(2, 6, 4);
            leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a2d });
        }
        
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = type === 'pine' ? 5 : 4.5;
        leaves.castShadow = true;
        treeGroup.add(leaves);
        
        treeGroup.position.set(x, 0, z);
        scene.add(treeGroup);
    };
    
    // Place trees
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * (ROOM_WIDTH/2 - 5) + 5;
        const z = (Math.random() - 0.5) * (ROOM_DEPTH - 5);
        const type = Math.random() > 0.5 ? 'pine' : 'oak';
        createTree(x, z, type);
    }
}

function createFlyingCreatures() {
    // Birds
    const birdGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.5);
    const birdMaterial = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
    
    for (let i = 0; i < 5; i++) {
        const bird = new THREE.Mesh(birdGeometry, birdMaterial);
        bird.position.set(
            Math.random() * (ROOM_WIDTH/2 - 3) + 3,
            Math.random() * 3 + 2,
            (Math.random() - 0.5) * (ROOM_DEPTH - 4)
        );
        bird.userData = {
            speed: Math.random() * 0.03 + 0.02,
            radius: Math.random() * 5 + 2,
            angle: Math.random() * Math.PI * 2
        };
        scene.add(bird);
    }
    
    // Bees
    const beeGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const beeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    for (let i = 0; i < 8; i++) {
        const bee = new THREE.Mesh(beeGeometry, beeMaterial);
        bee.position.set(
            Math.random() * (ROOM_WIDTH/2 - 3) + 3,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * (ROOM_DEPTH - 4)
        );
        bee.userData = {
            speed: Math.random() * 0.05 + 0.03,
            pattern: Math.random()
        };
        scene.add(bee);
    }
}

function createRabbits() {
    const rabbitGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.6);
    const rabbitMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    
    for (let i = 0; i < 4; i++) {
        const rabbit = new THREE.Mesh(rabbitGeometry, rabbitMaterial);
        rabbit.position.set(
            Math.random() * (ROOM_WIDTH/2 - 3) + 3,
            0.15,
            (Math.random() - 0.5) * (ROOM_DEPTH - 4)
        );
        rabbit.castShadow = true;
        rabbit.userData = {
            hopTimer: Math.random() * 100,
            direction: Math.random() * Math.PI * 2
        };
        scene.add(rabbit);
    }
}

function createRiver() {
    // River bed
    const riverGeometry = new THREE.BoxGeometry(2, 0.1, ROOM_DEPTH - 4);
    const riverMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4682b4,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
        metalness: 0.3
    });
    const river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.position.set(12, 0.05, 0);
    river.receiveShadow = true;
    scene.add(river);
}

function createDarkSideFence() {
    const fenceHeight = 2.5;
    const postGeometry = new THREE.BoxGeometry(0.15, fenceHeight, 0.15);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    
    // Simple fence posts only - no complex linking
    const posts = [
        // Back wall posts
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(-15, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(-10, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(-5, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(-0.5, 0, -ROOM_DEPTH/2 + 0.5),
        
        // Left wall posts  
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, -5),
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, 0),
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, 5),
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, ROOM_DEPTH/2 - 0.5),
        
        // Front wall posts
        new THREE.Vector3(-ROOM_WIDTH/2 + 0.5, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(-15, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(-10, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(-5, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(-0.5, 0, ROOM_DEPTH/2 - 0.5)
    ];
    
    // Create simple posts
    posts.forEach(pos => {
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.copy(pos);
        post.position.y = fenceHeight / 2;
        scene.add(post);
    });
    
    // Simple horizontal bars between posts
    const barGeometry = new THREE.BoxGeometry(4.5, 0.1, 0.05);
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    
    // Back wall bars
    for (let x = -17.5; x < -1; x += 5) {
        for (let height = 0.8; height <= 2; height += 0.6) {
            const bar = new THREE.Mesh(barGeometry, barMaterial);
            bar.position.set(x, height, -ROOM_DEPTH/2 + 0.5);
            scene.add(bar);
        }
    }
    
    // Front wall bars
    for (let x = -17.5; x < -1; x += 5) {
        for (let height = 0.8; height <= 2; height += 0.6) {
            const bar = new THREE.Mesh(barGeometry, barMaterial);
            bar.position.set(x, height, ROOM_DEPTH/2 - 0.5);
            scene.add(bar);
        }
    }
    
    // Left wall bars
    const leftBarGeometry = new THREE.BoxGeometry(0.05, 0.1, 4.5);
    for (let z = -7.5; z < 8; z += 5) {
        for (let height = 0.8; height <= 2; height += 0.6) {
            const bar = new THREE.Mesh(leftBarGeometry, barMaterial);
            bar.position.set(-ROOM_WIDTH/2 + 0.5, height, z);
            scene.add(bar);
        }
    }
}

function createLightSideFence() {
    const fenceHeight = 2;
    const postGeometry = new THREE.BoxGeometry(0.2, fenceHeight, 0.2);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    
    // Simple fence posts only - no complex linking
    const posts = [
        // Back wall posts
        new THREE.Vector3(0.5, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(5, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(10, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(15, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, -ROOM_DEPTH/2 + 0.5),
        
        // Right wall posts  
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, -ROOM_DEPTH/2 + 0.5),
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, -5),
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, 0),
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, 5),
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, ROOM_DEPTH/2 - 0.5),
        
        // Front wall posts
        new THREE.Vector3(ROOM_WIDTH/2 - 0.5, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(15, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(10, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(5, 0, ROOM_DEPTH/2 - 0.5),
        new THREE.Vector3(0.5, 0, ROOM_DEPTH/2 - 0.5)
    ];
    
    // Create simple posts
    posts.forEach(pos => {
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.copy(pos);
        post.position.y = fenceHeight / 2;
        scene.add(post);
    });
    
    // Simple horizontal rails between posts
    const railGeometry = new THREE.BoxGeometry(4.5, 0.1, 0.1);
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0xa0522d });
    
    // Back wall rails
    for (let x = 2.75; x < 18; x += 5) {
        // Top rail
        const topRail = new THREE.Mesh(railGeometry, railMaterial);
        topRail.position.set(x, fenceHeight - 0.2, -ROOM_DEPTH/2 + 0.5);
        scene.add(topRail);
        
        // Bottom rail
        const bottomRail = new THREE.Mesh(railGeometry, railMaterial);
        bottomRail.position.set(x, 0.3, -ROOM_DEPTH/2 + 0.5);
        scene.add(bottomRail);
    }
    
    // Front wall rails
    for (let x = 2.75; x < 18; x += 5) {
        // Top rail
        const topRail = new THREE.Mesh(railGeometry, railMaterial);
        topRail.position.set(x, fenceHeight - 0.2, ROOM_DEPTH/2 - 0.5);
        scene.add(topRail);
        
        // Bottom rail
        const bottomRail = new THREE.Mesh(railGeometry, railMaterial);
        bottomRail.position.set(x, 0.3, ROOM_DEPTH/2 - 0.5);
        scene.add(bottomRail);
    }
    
    // Right wall rails
    const rightRailGeometry = new THREE.BoxGeometry(0.1, 0.1, 4.5);
    for (let z = -7.5; z < 8; z += 5) {
        // Top rail
        const topRail = new THREE.Mesh(rightRailGeometry, railMaterial);
        topRail.position.set(ROOM_WIDTH/2 - 0.5, fenceHeight - 0.2, z);
        scene.add(topRail);
        
        // Bottom rail
        const bottomRail = new THREE.Mesh(rightRailGeometry, railMaterial);
        bottomRail.position.set(ROOM_WIDTH/2 - 0.5, 0.3, z);
        scene.add(bottomRail);
    }
}

function createChainLinkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 64, 64);
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    
    // Create chain link pattern
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            ctx.beginPath();
            ctx.moveTo(i * 8, j * 8);
            ctx.lineTo((i + 1) * 8, (j + 1) * 8);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo((i + 1) * 8, j * 8);
            ctx.lineTo(i * 8, (j + 1) * 8);
            ctx.stroke();
        }
    }
    
    return new THREE.CanvasTexture(canvas);
}

function create3DSign(text, isDarkSide) {
    const signGroup = new THREE.Group();
    
    // Sign post
    const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    const postMaterial = new THREE.MeshStandardMaterial({ 
        color: isDarkSide ? 0x333333 : 0x8b4513 
    });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 0.5;
    signGroup.add(post);
    
    // Sign board
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    // Background
    context.fillStyle = isDarkSide ? '#1a0000' : '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    context.strokeStyle = isDarkSide ? '#ff0000' : '#00ff00';
    context.lineWidth = 5;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    
    // Text
    context.fillStyle = isDarkSide ? '#ff6666' : '#006600';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Word wrap
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        const testLine = currentLine + word + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > canvas.width - 40 && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine = testLine;
        }
    });
    lines.push(currentLine.trim());
    
    // Draw wrapped text
    const lineHeight = 30;
    const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, index) => {
        context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    const signGeometry = new THREE.PlaneGeometry(2, 1);
    const signMaterial = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide 
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.y = 1;
    signGroup.add(sign);
    
    // Random rotation
    signGroup.rotation.y = Math.random() * Math.PI * 2;
    
    return signGroup;
}

function setupAudio() {
    try {
        // Initialize Web Audio API
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context created, state:', audioContext.state);
        
        // Create gain nodes first
        staticGainNode = audioContext.createGain();
        staticGainNode.gain.value = 0;
        staticGainNode.connect(audioContext.destination);
        
        // Static noise for dark side
        createStaticNoise();
        
        // Initialize music system
        initializeMusic();
        
    } catch (error) {
        console.error('Error setting up audio:', error);
    }
}

function createStaticNoise() {
    try {
        const bufferSize = audioContext.sampleRate * 2;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        staticSource = audioContext.createBufferSource();
        staticSource.buffer = noiseBuffer;
        staticSource.loop = true;
        staticSource.connect(staticGainNode);
        
        // Start immediately if context is running, or wait for user interaction
        if (audioContext.state === 'running') {
            staticSource.start();
            console.log('Static noise started immediately');
        } else {
            // Store source to start later when context is resumed
            window.pendingStaticSource = staticSource;
            console.log('Static noise ready, waiting for user interaction');
        }
        
    } catch (error) {
        console.error('Error creating static noise:', error);
    }
}

function initializeMusic() {
    // Music gain node for light side
    musicGainNode = audioContext.createGain();
    musicGainNode.gain.value = 0;
    musicGainNode.connect(audioContext.destination);
    
    // Rooftop music gain
    rooftopMusicGainNode = audioContext.createGain();
    rooftopMusicGainNode.gain.value = 0;
    rooftopMusicGainNode.connect(audioContext.destination);
    
    // Load rooftop music
    loadAudioFile('public/offchance.wav', (buffer) => {
        rooftopMusicSource = audioContext.createBufferSource();
        rooftopMusicSource.buffer = buffer;
        rooftopMusicSource.loop = true;
        rooftopMusicSource.connect(rooftopMusicGainNode);
        rooftopMusicSource.start();
    });
    
    // Load audio files with new names
    loadAudioFile('public/ambient1.mp3', (buffer) => {
        const musicSource = audioContext.createBufferSource();
        musicSource.buffer = buffer;
        musicSource.loop = true;
        musicSource.connect(musicGainNode);
        musicSource.start();
    });
    
    // River sound (positional with proximity)
    loadAudioFile('public/gentle_river_flowing-#2-1757658386707.mp3', (buffer) => {
        riverSource = audioContext.createBufferSource(); // Use global variable
        riverSource.buffer = buffer;
        riverSource.loop = true;
        
                const riverGain = audioContext.createGain();
                riverGain.gain.value = 0;
                
                riverSource.connect(riverGain);
                riverGain.connect(audioContext.destination);
                riverSource.start();
                
                // Store for proximity updates
                riverSource.gainNode = riverGain;
                riverSource.position = new THREE.Vector3(12, 0, 0);
                console.log('River sound loaded and started');
    });
    
    // Fire sounds (positional with proximity)
    loadAudioFile('public/fire_burning-#1-1757658444170.mp3', (buffer) => {
            const firePositions = [
                { x: -8, y: 0.5, z: -5 },
                { x: -15, y: 0.5, z: 5 }
            ];
        
        firePositions.forEach(pos => {
            const fireSourceInstance = audioContext.createBufferSource(); // Use different name to avoid confusion
            fireSourceInstance.buffer = buffer;
            fireSourceInstance.loop = true;
            
                    const fireGain = audioContext.createGain();
                    fireGain.gain.value = 0;
                    
                    fireSourceInstance.connect(fireGain);
                    fireGain.connect(audioContext.destination);
                    fireSourceInstance.start();
                    
                    // Store for proximity updates
                    fireSourceInstance.gainNode = fireGain;
                    fireSourceInstance.position = new THREE.Vector3(pos.x, pos.y, pos.z);
                    
                    if (!window.fireSources) window.fireSources = [];
                    window.fireSources.push(fireSourceInstance);
                    console.log('Fire sound loaded at position:', pos);
        });
    });
}

function togglePopups() {
    popupsHidden = !popupsHidden;
    const container = document.getElementById('popup-container');
    
    if (popupsHidden) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
    }
    
    console.log('Popups', popupsHidden ? 'hidden' : 'shown');
}

// Debug function to test audio manually
window.testAudio = function() {
    console.log('Testing audio...');
    console.log('AudioContext state:', audioContext?.state);
    console.log('River source:', !!riverSource);
    console.log('Fire sources:', window.fireSources?.length || 0);
    
    if (riverSource && riverSource.gainNode) {
        console.log('Setting river volume to 0.5 for test');
        riverSource.gainNode.gain.value = 0.5;
        setTimeout(() => {
            riverSource.gainNode.gain.value = 0;
            console.log('River test ended');
        }, 3000);
    }
    
    if (window.fireSources && window.fireSources.length > 0) {
        console.log('Setting fire volume to 0.5 for test');
        window.fireSources[0].gainNode.gain.value = 0.5;
        setTimeout(() => {
            window.fireSources[0].gainNode.gain.value = 0;
            console.log('Fire test ended');
        }, 3000);
    }
};

function loadAudioFile(url, callback) {
    console.log('Loading audio file:', url);
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(data => audioContext.decodeAudioData(data))
        .then(buffer => {
            console.log('Successfully loaded:', url);
            callback(buffer);
        })
        .catch(error => {
            console.error('Failed to load audio file:', url, error);
        });
}

function updateAudio() {
    if (!audioContext || !gameStarted) return;
    
    if (currentScene === 'main') {
        const distanceFromDoor = camera.position.x;
        
        if (distanceFromDoor < -0.5) {
            // Dark side - increase static (fixed calculation)
            const staticLevel = Math.min(Math.abs(distanceFromDoor) / (ROOM_WIDTH/2), 0.02); // Much quieter
            if (staticGainNode) {
                staticGainNode.gain.setValueAtTime(staticLevel, audioContext.currentTime);
                console.log('Setting static level to:', staticLevel);
            }
            if (musicGainNode) musicGainNode.gain.value = 0;
        } else if (distanceFromDoor > 0.5) {
            // Light side - increase music
            const musicLevel = Math.min(distanceFromDoor / (ROOM_WIDTH/2), 0.5);
            if (musicGainNode) musicGainNode.gain.value = musicLevel;
            if (staticGainNode) staticGainNode.gain.value = 0;
        } else {
            // Neutral
            if (staticGainNode) staticGainNode.gain.value = 0;
            if (musicGainNode) musicGainNode.gain.value = 0;
        }
    
        
        // Update river proximity
        if (riverSource && riverSource.gainNode) {
            const riverDist = camera.position.distanceTo(riverSource.position);
            const riverVolume = Math.max(0, 1 - riverDist / 10) * 0.4;
            riverSource.gainNode.gain.value = riverVolume;
            if (riverVolume > 0) {
                console.log('River volume:', riverVolume, 'distance:', riverDist, 'audioContext state:', audioContext.state);
            }
        } else if (riverSource) {
            console.log('River source exists but no gainNode');
        } else {
            // Only log this once every 60 frames to avoid spam
            if (Math.random() < 0.016) console.log('No river source found');
        }
        
        // Update fire proximity
        if (window.fireSources) {
            window.fireSources.forEach((fireSource, index) => {
                if (fireSource && fireSource.gainNode) {
                    const fireDist = camera.position.distanceTo(fireSource.position);
                    const fireVolume = Math.max(0, 1 - fireDist / 8) * 0.5;
                    fireSource.gainNode.gain.value = fireVolume;
                    if (fireVolume > 0) {
                        console.log(`Fire ${index} volume:`, fireVolume, 'distance:', fireDist);
                    }
                }
            });
        }
        
        // Mute rooftop music
        if (rooftopMusicGainNode) rooftopMusicGainNode.gain.value = 0;
    } else if (currentScene === 'rooftop') {
        // Ensure main scene audio is muted
        if (staticGainNode) staticGainNode.gain.value = 0;
        if (musicGainNode) musicGainNode.gain.value = 0;
        if (riverSource && riverSource.gainNode) riverSource.gainNode.gain.value = 0;
        if (window.fireSources) {
            window.fireSources.forEach(fireSource => {
                if (fireSource && fireSource.gainNode) fireSource.gainNode.gain.value = 0;
            });
        }
        
        // Play rooftop music
        if (rooftopMusicGainNode) rooftopMusicGainNode.gain.value = 0.3;
    }
}

function updatePopups() {
    if (currentScene !== 'main') return; // Only show popups in main scene
    
    const now = Date.now();
    if (now - lastPopupUpdate < popupUpdateInterval) return; // Throttle updates
    lastPopupUpdate = now;
    
    const distanceFromDoor = camera.position.x;
    const container = document.getElementById('popup-container');
    
    if (Math.abs(distanceFromDoor) < 0.5) {
        // Neutral zone - clear all popups
        clearAllPopups();
        currentPopupTier = 0;
        return;
    }
    
    const isOnDarkSide = distanceFromDoor < 0;
    const distance = Math.abs(distanceFromDoor);
    const maxDistance = ROOM_WIDTH / 2 - 2;
    const progress = Math.min(distance / maxDistance, 1);
    
    // Determine tier based on distance
    let newTier = 0;
    if (progress > 0.7) newTier = 3; // Show 1-30 (most serious)
    else if (progress > 0.4) newTier = 2; // Show 1-20 (medium)
    else if (progress > 0.1) newTier = 1; // Show 1-10 (least serious)
    
    const relevantPopups = isOnDarkSide ? popups.negative : popups.positive;
    
    console.log('Popup debug:', {
        distanceFromDoor,
        isOnDarkSide,
        progress,
        newTier,
        currentPopupTier,
        relevantPopupsLength: relevantPopups.length
    });
    
    // Only update if tier changed or side changed
    if (newTier !== currentPopupTier || activePopups.length === 0) {
        currentPopupTier = newTier;
        
        // Determine how many popups to show
        let maxPopups = 0;
        if (newTier === 1) maxPopups = 10; // 1-10
        else if (newTier === 2) maxPopups = 20; // 1-20
        else if (newTier === 3) maxPopups = 30; // 1-30
        
        // Clear existing popups that are outside our range
        activePopups = activePopups.filter(popup => {
            if (popup.data.number > maxPopups) {
                popup.element.remove();
                return false;
            }
            return true;
        });
        
        // Add new popups that we don't have yet
        const existingNumbers = new Set(activePopups.map(p => p.data.number));
        
        let popupIndex = 0;
        for (let i = 0; i < maxPopups && i < relevantPopups.length; i++) {
            const popupData = relevantPopups[i];
            if (!popupData || existingNumbers.has(popupData.number)) continue;
            
            // Create popup with staggered timing
            setTimeout(() => {
                const popupElement = document.createElement('div');
                
                // Determine tier based on popup number
                let tier = 'tier-1';
                if (popupData.number >= 21) {
                    tier = 'tier-3'; // Most severe (21-30)
                } else if (popupData.number >= 11) {
                    tier = 'tier-2'; // Medium severity (11-20)
                } else {
                    tier = 'tier-1'; // Mild severity (1-10)
                }
                
                popupElement.className = `popup ${isOnDarkSide ? 'dark-side' : 'light-side'} ${tier}`;
                popupElement.textContent = popupData.text;
            
                // Position popup without overlapping
                const popupSize = { width: 350, height: 80 }; // Approximate popup size
                const screenPadding = 50;
                let x, y, attempts = 0;
                let validPosition = false;
                
                while (!validPosition && attempts < 20) {
                    x = Math.random() * (window.innerWidth - popupSize.width - screenPadding * 2) + screenPadding;
                    y = Math.random() * (window.innerHeight - popupSize.height - screenPadding * 2) + screenPadding;
                    
                    // Check if this position overlaps with existing popups
                    validPosition = true;
                    for (const existingPopup of activePopups) {
                        const existingRect = existingPopup.element.getBoundingClientRect();
                        if (x < existingRect.right + 20 && x + popupSize.width > existingRect.left - 20 &&
                            y < existingRect.bottom + 20 && y + popupSize.height > existingRect.top - 20) {
                            validPosition = false;
                            break;
                        }
                    }
                    attempts++;
                }
            
                // Mobile vs Desktop positioning
                if (isMobile) {
                    // Mobile: vertical slice layout
                    const sliceHeight = 70; // Height of each popup slice
                    const sliceIndex = activePopups.length;
                    
                    x = 10;
                    y = sliceIndex * sliceHeight + 10;
                    
                    // Ensure we don't go off screen
                    if (y + popupSize.height > window.innerHeight - 100) {
                        y = 10 + (sliceIndex % Math.floor((window.innerHeight - 120) / sliceHeight)) * sliceHeight;
                    }
                    
                    popupElement.style.left = `${x}px`;
                    popupElement.style.top = `${y}px`;
                    popupElement.style.right = '10px';
                    popupElement.style.width = 'auto';
                    popupElement.style.maxWidth = 'calc(100vw - 40px)';
                } else {
                    // Desktop: grid-based approach for fallback
                    if (!validPosition) {
                        const gridCols = Math.floor(window.innerWidth / (popupSize.width + 20));
                        const popupIndex = activePopups.length;
                        const gridX = (popupIndex % gridCols) * (popupSize.width + 20) + screenPadding;
                        const gridY = Math.floor(popupIndex / gridCols) * (popupSize.height + 20) + screenPadding;
                        x = gridX;
                        y = gridY;
                    }
                    
                    popupElement.style.left = `${x}px`;
                    popupElement.style.top = `${y}px`;
                }
                
                popupElement.style.transform = 'none';
                popupElement.style.zIndex = '1000';
            
                // Add fade-in animation
                popupElement.style.opacity = '0';
                setTimeout(() => {
                    if (popupElement.parentNode) {
                        popupElement.style.opacity = '1';
                    }
                }, 100);
                
                container.appendChild(popupElement);
                activePopups.push({ element: popupElement, data: popupData });
            }, popupIndex * 800); // Stagger each popup by 800ms
            
            popupIndex++;
        }
    }
    
    // Update visual distortion based on progress
    if (isOnDarkSide) {
        updateDarkSideEffects(progress);
    } else {
        updateLightSideEffects(progress);
    }
}

function clearAllPopups() {
    activePopups.forEach(popup => {
        popup.element.remove();
    });
    activePopups = [];
    
    active3DPopups.forEach(popup => {
        scene.remove(popup);
    });
    active3DPopups = [];
}

function updateDarkSideEffects(progress) {
    // Simple fog increase
    scene.fog.density = 0.02 + progress * 0.01;
}

function updateLightSideEffects(progress) {
    // Simple fog decrease
    scene.fog.density = Math.max(0.01, 0.02 - progress * 0.01);
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (currentScene === 'main') {
        // Update controls
        if (controls.isLocked === true || (isMobile && gameStarted)) {
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            
            // Add mobile joystick input
            if (isMobile && mobileJoystick.active) {
                direction.z += -mobileJoystick.currentY;
                direction.x += mobileJoystick.currentX;
            }
            
            direction.normalize();
            
            if (moveForward || moveBackward || (isMobile && Math.abs(mobileJoystick.currentY) > 0.1)) {
                velocity.z -= direction.z * 40.0 * delta;
            }
            if (moveLeft || moveRight || (isMobile && Math.abs(mobileJoystick.currentX) > 0.1)) {
                velocity.x -= direction.x * 40.0 * delta;
            }
            
            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);
            
            // Keep player at correct height
            camera.position.y = 1.6;
            
            // Collision detection with walls
            const margin = 0.3;
            camera.position.x = Math.max(-ROOM_WIDTH/2 + margin, Math.min(ROOM_WIDTH/2 - margin, camera.position.x));
            camera.position.z = Math.max(-ROOM_DEPTH/2 + margin, Math.min(ROOM_DEPTH/2 - margin, camera.position.z));
        }
        
        // Update animated elements
        updateAnimations(delta);
        
        // Update popups based on position
        updatePopups();
        
        // Update audio
        updateAudio();
        
        renderer.render(scene, camera);
    } else if (currentScene === 'rooftop') {
        // Update rooftop scene
        updateRooftopAnimations(delta);
        
        // Simple rooftop controls
        if (controls.isLocked === true) {
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();
            
            if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;
            
            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);
            
            // Keep player at correct height
            rooftopCamera.position.y = 1.6;
            
            // Rooftop bounds and height
            const roofMargin = 1;
            rooftopCamera.position.x = Math.max(-14 + roofMargin, Math.min(14 - roofMargin, rooftopCamera.position.x));
            rooftopCamera.position.z = Math.max(-14 + roofMargin, Math.min(14 - roofMargin, rooftopCamera.position.z));
            rooftopCamera.position.y = 101.6; // Keep at rooftop height
        }
        
        renderer.render(rooftopScene, rooftopCamera);
    }
}

function updateAnimations(delta) {
    const time = clock.getElapsedTime();
    
    // Animate fire particles
    scene.traverse(child => {
        if (child.userData.particles) {
            child.userData.particles.forEach(particle => {
                particle.position.add(particle.userData.velocity);
                particle.userData.life += delta;
                
                if (particle.userData.life > 1) {
                    particle.position.set(
                        (Math.random() - 0.5) * 0.5,
                        0,
                        (Math.random() - 0.5) * 0.5
                    );
                    particle.userData.life = 0;
                }
                
                particle.material.opacity = 1 - particle.userData.life;
            });
        }
        
        // Animate rats
        if (child.userData.speed && child.position.x < 0) {
            child.position.x += Math.cos(child.userData.direction) * child.userData.speed;
            child.position.z += Math.sin(child.userData.direction) * child.userData.speed;
            
            // Bounce off walls
            if (Math.abs(child.position.x) > ROOM_WIDTH/2 - 1 || Math.abs(child.position.z) > ROOM_DEPTH/2 - 1) {
                child.userData.direction += Math.PI;
            }
        }
        
        // Animate birds
        if (child.userData.radius) {
            child.userData.angle += child.userData.speed;
            child.position.x = 10 + Math.cos(child.userData.angle) * child.userData.radius;
            child.position.z = Math.sin(child.userData.angle) * child.userData.radius;
        }
        
        // Animate bees
        if (child.userData.pattern !== undefined) {
            child.position.x += Math.sin(time * 3 + child.userData.pattern * Math.PI) * 0.02;
            child.position.y += Math.cos(time * 2) * 0.01;
        }
        
        // Animate rabbits
        if (child.userData.hopTimer !== undefined) {
            child.userData.hopTimer += delta * 60;
            if (child.userData.hopTimer > 120) {
                child.position.y = 0.15 + Math.abs(Math.sin(child.userData.hopTimer * 0.1)) * 0.3;
                if (child.userData.hopTimer > 140) {
                    child.position.x += Math.cos(child.userData.direction) * 0.5;
                    child.position.z += Math.sin(child.userData.direction) * 0.5;
                    child.userData.hopTimer = 0;
                    child.userData.direction += (Math.random() - 0.5) * Math.PI * 0.5;
                }
            }
        }
        
        // Animate TV static
        if (child.userData.staticCanvas) {
            const ctx = child.userData.staticCtx;
            const imageData = ctx.createImageData(256, 256);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const val = Math.random() * 255;
                imageData.data[i] = val;
                imageData.data[i + 1] = val;
                imageData.data[i + 2] = val;
                imageData.data[i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
            child.userData.staticTexture.needsUpdate = true;
        }
    });
}

function updateRooftopAnimations(delta) {
    const time = clock.getElapsedTime();
    
    // Only update rain every few frames for performance
    if (time % 0.1 < delta) { // Update roughly every 100ms
        rooftopScene.traverse(child => {
            // Animate rain
            if (child.userData.isRain) {
                const positions = child.geometry.attributes.position.array;
                for (let i = 1; i < positions.length; i += 3) {
                    positions[i] -= 20 * delta; // Consistent rain speed
                    if (positions[i] < 80) { // Reset when rain gets close to rooftop
                        positions[i] = 120 + Math.random() * 20; // Reset high above with variation
                        // Also randomize X and Z slightly to make rain more dynamic
                        positions[i - 1] += (Math.random() - 0.5) * 2;
                        positions[i + 1] += (Math.random() - 0.5) * 2;
                    }
                }
                child.geometry.attributes.position.needsUpdate = true;
            }
        });
    }
}

function switchToRooftop() {
    currentScene = 'rooftop';
    controls.unlock();
    
    // Stop main scene audio completely
    if (staticGainNode) {
        staticGainNode.gain.setValueAtTime(staticGainNode.gain.value, audioContext.currentTime);
        staticGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
    }
    if (musicGainNode) {
        musicGainNode.gain.setValueAtTime(musicGainNode.gain.value, audioContext.currentTime);
        musicGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
    }
    
    // Start rooftop music
    if (rooftopMusicGainNode) {
        rooftopMusicGainNode.gain.setValueAtTime(0, audioContext.currentTime);
        rooftopMusicGainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1);
        console.log('Starting rooftop music');
    }
    
    // Setup rooftop controls and optimize for performance
    setTimeout(() => {
        controls = new PointerLockControls(rooftopCamera, renderer.domElement);
        rooftopCamera.position.set(0, 101.6, 5); // Much higher up
        
        // Optimize renderer for rooftop scene
        renderer.shadowMap.enabled = false; // Disable shadows for performance
        
        // Clear popups
        const container = document.getElementById('popup-container');
        container.innerHTML = '';
        activePopups = [];
        active3DPopups.forEach(popup => scene.remove(popup));
        active3DPopups = [];
    }, 100);
}

function switchToMain() {
    currentScene = 'main';
    controls.unlock();
    
    // Fade out rooftop music
    if (rooftopMusicGainNode) {
        rooftopMusicGainNode.gain.setValueAtTime(rooftopMusicGainNode.gain.value, audioContext.currentTime);
        rooftopMusicGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
    }
    
    // Restore main controls and settings
    setTimeout(() => {
        controls = new PointerLockControls(camera, renderer.domElement);
        camera.position.set(0, 1.6, 0);
        
        // Restore shadows for main scene
        renderer.shadowMap.enabled = true;
    }, 100);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (rooftopCamera) {
        rooftopCamera.aspect = window.innerWidth / window.innerHeight;
        rooftopCamera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createRooftopScene() {
    // Create separate scene for rooftop
    rooftopScene = new THREE.Scene();
    rooftopScene.fog = new THREE.FogExp2(0x000033, 0.02);
    
    // Rooftop camera
    rooftopCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    rooftopCamera.position.set(0, 101.6, 0); // High up in the sky
    
    // Rooftop floor
    const roofGeometry = new THREE.BoxGeometry(30, 0.5, 30);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        roughness: 0.9,
        metalness: 0.1
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 99.75; // High up
    roof.receiveShadow = true;
    rooftopScene.add(roof);
    
    // Industrial elements - AC units (adjusted for height)
    for (let i = 0; i < 3; i++) {
        const acGeometry = new THREE.BoxGeometry(2, 1.5, 2);
        const acMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const ac = new THREE.Mesh(acGeometry, acMaterial);
        ac.position.set(-10 + i * 6, 100.75, -8);
        ac.castShadow = true;
        rooftopScene.add(ac);
    }
    
    // Wall with text (adjusted for height)
    const wallGeometry = new THREE.BoxGeometry(10, 4, 0.3);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(0, 102, -12);
    wall.castShadow = true;
    rooftopScene.add(wall);
    
    // Text on wall
    const textCanvas = document.createElement('canvas');
    const ctx = textCanvas.getContext('2d');
    textCanvas.width = 1024;
    textCanvas.height = 256;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HE WASN\'T ALL WRONG', 512, 128);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textGeometry = new THREE.PlaneGeometry(8, 2);
    const textMaterial = new THREE.MeshBasicMaterial({ 
        map: textTexture,
        transparent: true
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, 102, -11.8);
    rooftopScene.add(textMesh);
    
    // Optimized rain particles
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 1000; // Fewer particles for performance
    const rainPositions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
        rainPositions[i] = (Math.random() - 0.5) * 60;
        rainPositions[i + 1] = 100 + Math.random() * 40; // Start high above rooftop
        rainPositions[i + 2] = (Math.random() - 0.5) * 60;
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({
        color: 0x8888ff,
        size: 0.1,
        transparent: true,
        opacity: 0.6
    });
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.userData = { isRain: true };
    rooftopScene.add(rain);
    
    // Skyline (simple boxes)
    const buildingColors = [0x1a1a1a, 0x2a2a2a, 0x0a0a0a];
    for (let i = 0; i < 15; i++) { // Fewer buildings for performance
        const height = Math.random() * 120 + 60; // Tall but optimized
        const buildingGeometry = new THREE.BoxGeometry(
            Math.random() * 4 + 2, // Slightly smaller for performance
            height,
            Math.random() * 4 + 2
        );
        const buildingMaterial = new THREE.MeshLambertMaterial({ // Cheaper material
            color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        const angle = (i / 20) * Math.PI * 2;
        const distance = 40 + Math.random() * 20;
        building.position.set(
            Math.cos(angle) * distance,
            height / 2, // Buildings at various heights, some taller than rooftop
            Math.sin(angle) * distance
        );
        rooftopScene.add(building);
    }
    
    // Return button
    const returnGroup = new THREE.Group();
    
    const returnButtonGeometry = new THREE.BoxGeometry(3, 1, 0.3);
    const returnButtonMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        emissive: 0x004400,
        emissiveIntensity: 0.3
    });
    const returnButtonMesh = new THREE.Mesh(returnButtonGeometry, returnButtonMaterial);
    returnGroup.add(returnButtonMesh);
    
    const returnTextCanvas = document.createElement('canvas');
    const returnCtx = returnTextCanvas.getContext('2d');
    returnTextCanvas.width = 512;
    returnTextCanvas.height = 128;
    returnCtx.fillStyle = '#000000';
    returnCtx.font = 'bold 36px Arial';
    returnCtx.textAlign = 'center';
    returnCtx.textBaseline = 'middle';
    returnCtx.fillText('RETURN TO PRESENT', 256, 64);
    
    const returnTextTexture = new THREE.CanvasTexture(returnTextCanvas);
    const returnTextGeometry = new THREE.PlaneGeometry(2.8, 0.7);
    const returnTextMaterial = new THREE.MeshBasicMaterial({ 
        map: returnTextTexture,
        transparent: true
    });
    const returnTextMesh = new THREE.Mesh(returnTextGeometry, returnTextMaterial);
    returnTextMesh.position.z = 0.16;
    returnGroup.add(returnTextMesh);
    
    returnGroup.position.set(0, 102, 10); // Adjusted for height
    returnGroup.userData = { isButton: true, action: 'return' };
    returnButton = returnGroup;
    rooftopScene.add(returnGroup);
    
    // Optimized rooftop lighting
    const rooftopAmbient = new THREE.AmbientLight(0x222244, 0.4);
    rooftopScene.add(rooftopAmbient);
    
    const moonlight = new THREE.DirectionalLight(0x4444ff, 0.4);
    moonlight.position.set(10, 20, 10);
    moonlight.castShadow = false; // Disable shadows for performance
    rooftopScene.add(moonlight);
    
    // Optimized city lights - fewer but more efficient
    for (let i = 0; i < 15; i++) {
        const light = new THREE.PointLight(0xffaa00, 0.8, 80);
        light.position.set(
            (Math.random() - 0.5) * 150,
            50 + Math.random() * 80,
            (Math.random() - 0.5) * 150
        );
        rooftopScene.add(light);
    }
    
    // Add distant city glow - fewer lights, larger effect
    for (let i = 0; i < 20; i++) {
        const distantLight = new THREE.PointLight(
            Math.random() > 0.5 ? 0xffaa00 : 0xff6600, 
            0.4, 
            150
        );
        const angle = (i / 20) * Math.PI * 2;
        const distance = 200 + Math.random() * 100;
        distantLight.position.set(
            Math.cos(angle) * distance,
            Math.random() * 60 + 20,
            Math.sin(angle) * distance
        );
        rooftopScene.add(distantLight);
    }
}
