'use strict';

/**
 * Modernized bouncing ball:
 * - requestAnimationFrame (smooth, efficient)
 * - devicePixelRatio-aware canvas (crisp on Retina)
 * - textured ball (procedural noise pattern + lighting + highlight)
 * - animated background (gradient drift + subtle stars + noise)
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

let W = 0, H = 0, DPR = 1;

// Audio: create on first user gesture
let audioContext = null;
function initAudioContext() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[🔊] AudioContext created');
    } catch (e) {
        console.warn('[🔊] Audio not available:', e);
        audioContext = null;
    }
}

// Ensure we have a user gesture to unlock audio on browsers
document.addEventListener('pointerdown', initAudioContext, { once: true, passive: true });

// Ball config
const ball = {
    r: 70,
    x: 300,
    y: 300,
    vx: 520, // px/sec
    vy: 520  // px/sec
};

// Offscreen textures
let ballPatternCanvas, ballPattern;
let stars = [];

function resize() {
    DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    canvas.width = Math.floor(cssW * DPR);
    canvas.height = Math.floor(cssH * DPR);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    W = canvas.width;
    H = canvas.height;

    // Keep ball position in-bounds after resize
    ball.x = clamp(ball.x, ball.r, W - ball.r);
    ball.y = clamp(ball.y, ball.r, H - ball.r);

    // Rebuild textures that depend on DPR / size
    buildBallPattern();
    buildStarfield();
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function buildBallPattern() {
    // Small offscreen canvas used as a repeating texture
    const size = Math.floor(96 * DPR);
    ballPatternCanvas = document.createElement('canvas');
    ballPatternCanvas.width = size;
    ballPatternCanvas.height = size;

    const pctx = ballPatternCanvas.getContext('2d');

    // Base “material” color
    pctx.fillStyle = '#1f4bd6';
    pctx.fillRect(0, 0, size, size);

    // Add speckle noise
    const img = pctx.getImageData(0, 0, size, size);
    const data = img.data;

    // Light noise: a little grain + a few brighter flecks
    for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() * 20) - 10; // [-10,10]
        data[i] = clamp(data[i] + n, 0, 255);
        data[i + 1] = clamp(data[i + 1] + n, 0, 255);
        data[i + 2] = clamp(data[i + 2] + n, 0, 255);

        if (Math.random() < 0.003) { // rare bright fleck
            data[i] = clamp(data[i] + 55, 0, 255);
            data[i + 1] = clamp(data[i + 1] + 55, 0, 255);
            data[i + 2] = clamp(data[i + 2] + 55, 0, 255);
        }
    }
    pctx.putImageData(img, 0, 0);

    // Add subtle diagonal sheen bands
    pctx.globalAlpha = 0.18;
    pctx.fillStyle = '#ffffff';
    pctx.rotate(-Math.PI / 8);
    for (let x = -size; x < size * 2; x += Math.floor(18 * DPR)) {
        pctx.fillRect(x, 0, Math.floor(6 * DPR), size * 2);
    }
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.globalAlpha = 1;

    ballPattern = ctx.createPattern(ballPatternCanvas, 'repeat');
}

function buildStarfield() {
    // A modest number of stars; scale with screen area.
    const count = Math.floor((W * H) / (250000 * DPR)); // roughly ~ on big screens
    const target = clamp(count, 80, 260);

    stars = [];
    for (let i = 0; i < target; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: (Math.random() * 1.6 + 0.4) * DPR,
            a: Math.random() * 0.5 + 0.15,
            tw: Math.random() * 2.0 + 0.5,     // twinkle speed
            ph: Math.random() * Math.PI * 2.0  // phase
        });
    }
}

function update(dt) {
    // Move ball
    ball.x += ball.vx * dt * DPR;
    ball.y += ball.vy * dt * DPR;

    // Bounce with radius-based bounds and play sounds on collision
    // Detect collisions first so we can play sounds with position info
    if (ball.x + ball.r >= W) {
        ball.x = W - ball.r;
        ball.vx *= -1;
        playBounceSound('x', ball.x / W);
    }
    if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.vx *= -1;
        playBounceSound('x', ball.x / W);
    }
    if (ball.y + ball.r >= H) {
        ball.y = H - ball.r;
        ball.vy *= -1;
        playBounceSound('y', ball.y / H);
    }
    if (ball.y - ball.r <= 0) {
        ball.y = ball.r;
        ball.vy *= -1;
        playBounceSound('y', ball.y / H);
    }
}

// Play a short percussive bounce sound. "axis" is 'x' or 'y'. pan is 0..1 position.
function playBounceSound(axis, normPos) {
    if (!audioContext) return; // gracefully skip if audio not available

    try {
        const now = audioContext.currentTime;

        // Create short noise burst for a percussive "pong" character
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        const panner = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;

        // Slight pitch variation depending on axis
        osc.type = 'sine';
        osc.frequency.value = axis === 'x' ? 680 : 480; // brighter for horizontal hits

        // Short envelope
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.6, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        // Brighten with a highpass-ish filter for click
        filter.type = 'highshelf';
        filter.frequency.value = 1200;
        filter.gain.value = 6;

        // Pan based on normalized X position (-1 .. +1)
        if (panner) {
            panner.pan.value = (normPos - 0.5) * 2;
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(audioContext.destination);
        } else {
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioContext.destination);
        }

        osc.start(now);
        osc.stop(now + 0.14);
    } catch (e) {
        // ignore audio errors in older browsers
        console.warn('bounce sound error', e);
    }
}

function drawBackground(t) {
    // Animated gradient drift
    const driftX = Math.sin(t * 0.00022) * 0.22 + 0.5;
    const driftY = Math.cos(t * 0.00018) * 0.22 + 0.5;

    const gx = W * driftX;
    const gy = H * driftY;

    const grad = ctx.createRadialGradient(gx, gy, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
    grad.addColorStop(0.0, '#071b3a');
    grad.addColorStop(0.45, '#071024');
    grad.addColorStop(1.0, '#03040a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars (gentle twinkle)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const s of stars) {
        const tw = (Math.sin(t * 0.001 * s.tw + s.ph) * 0.5 + 0.5);
        const a = s.a * (0.6 + 0.6 * tw);
        ctx.globalAlpha = a;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = '#cfe6ff';
        ctx.fill();
    }
    ctx.restore();

    // Subtle noise overlay (cheap: sparse dots)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    const dots = 180;
    for (let i = 0; i < dots; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.fillRect(x, y, DPR, DPR);
    }
    ctx.restore();
}

function drawBall() {
    const x = ball.x;
    const y = ball.y;
    const r = ball.r;

    ctx.save();

    // Clip to circle so pattern stays inside the ball
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    // Pattern fill (texture)
    ctx.fillStyle = ballPattern;
    // Offset pattern so it "moves" a bit with the ball (feels attached)
    ctx.translate(x * 0.05, y * 0.05);
    ctx.fillRect(-x * 0.05, -y * 0.05, W + 200 * DPR, H + 200 * DPR);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Lighting (radial gradient: bright top-left, darker bottom-right)
    const light = ctx.createRadialGradient(
        x - r * 0.45, y - r * 0.45, r * 0.1,
        x, y, r * 1.2
    );
    light.addColorStop(0, 'rgba(255,255,255,0.55)');
    light.addColorStop(0.35, 'rgba(255,255,255,0.18)');
    light.addColorStop(1, 'rgba(0,0,0,0.55)');

    ctx.fillStyle = light;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);

    // Specular highlight
    ctx.globalCompositeOperation = 'screen';
    const highlight = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x - r * 0.35, y - r * 0.35, r * 0.7);
    highlight.addColorStop(0, 'rgba(255,255,255,0.85)');
    highlight.addColorStop(0.35, 'rgba(255,255,255,0.22)');
    highlight.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);

    ctx.restore();

    // Outline + subtle shadow under the ball
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.18, y + r * 0.75, r * 0.78, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.lineWidth = Math.max(2 * DPR, 3);
    ctx.strokeStyle = 'rgba(0, 10, 30, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

let last = performance.now();

function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); // cap delta to avoid huge jumps
    last = now;

    update(dt);

    drawBackground(now);
    drawBall();

    requestAnimationFrame(frame);
}

// Kickoff
resize();
window.addEventListener('resize', resize, { passive: true });
requestAnimationFrame(frame);
