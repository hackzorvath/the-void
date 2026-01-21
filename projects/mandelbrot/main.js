(() => {
    // --- Elements ---
    const glCanvas = document.getElementById("glCanvas");
    const cpuCanvas = document.getElementById("cpuCanvas");
    const header = document.querySelector(".void-header");
    const footer = document.querySelector(".void-footer");

    const resetBtn = document.getElementById("resetBtn");
    const qualityBtn = document.getElementById("qualityBtn");
    const hudBtn = document.getElementById("hudBtn");

    const hud = document.getElementById("hud");
    const hudRenderer = document.getElementById("hudRenderer");
    const hudCenter = document.getElementById("hudCenter");
    const hudScale = document.getElementById("hudScale");
    const hudIter = document.getElementById("hudIter");

    // --- View parameters ---
    const DEFAULTS = { cx: -0.5, cy: 0.0, scale: 3.0, maxIter: 400 };
    let cx = DEFAULTS.cx;
    let cy = DEFAULTS.cy;
    let scale = DEFAULTS.scale;
    let maxIter = DEFAULTS.maxIter;

    // Quality / DPR cap (huge impact on perf, even on GPU)
    let qualityHigh = true;

    // --- Layout ---
    function setLayoutVars() {
        const h = header?.getBoundingClientRect().height ?? 0;
        const f = footer?.getBoundingClientRect().height ?? 0;
        document.documentElement.style.setProperty("--header-h", `${Math.round(h)}px`);
        document.documentElement.style.setProperty("--footer-h", `${Math.round(f)}px`);
    }

    function getDpr() {
        const raw = window.devicePixelRatio || 1;
        const cap = qualityHigh ? 2.0 : 1.25; // tweak as desired
        return Math.max(1, Math.min(cap, raw));
    }

    function resizeCanvases() {
        setLayoutVars();

        const rect = glCanvas.getBoundingClientRect();
        const dpr = getDpr();

        const w = Math.max(2, Math.floor(rect.width * dpr));
        const h = Math.max(2, Math.floor(rect.height * dpr));

        glCanvas.width = w;
        glCanvas.height = h;
        cpuCanvas.width = w;
        cpuCanvas.height = h;

        if (glState.ok) {
            gl.viewport(0, 0, w, h);
            setUniforms();
            requestDraw();
        } else {
            cpuResize();
            cpuRenderQueued();
        }
    }

    // --- Coordinate mapping (CPU side for interactions) ---
    function aspect() {
        return glCanvas.height / glCanvas.width;
    }

    function complexAtPixel(px, py) {
        const w = glCanvas.width;
        const h = glCanvas.height;
        const asp = h / w;
        const re = cx + (px / w - 0.5) * scale;
        const im = cy + (py / h - 0.5) * scale * asp;
        return { re, im };
    }

    function zoomAtPixel(px, py, zoomFactor) {
        // Leave zoom exactly as it was: keep point under cursor stable.
        const before = complexAtPixel(px, py);
        scale *= zoomFactor;
        const after = complexAtPixel(px, py);
        cx += (before.re - after.re);
        cy += (before.im - after.im);

        maxIter = iterationsForScale(scale);
        requestDrawUnified();
    }

    function iterationsForScale(s) {
        const t = Math.log10(DEFAULTS.scale / s + 1);
        const it = Math.floor(350 + t * 260);
        return Math.max(200, Math.min(2000, it));
    }

    function panByPixels(dx, dy) {
        const w = glCanvas.width;
        const h = glCanvas.height;
        const asp = h / w;

        // X: opposite of drag (grab-the-world feel)
        cx -= (dx / w) * scale;

        // Y: keep your current “feels right” behavior
        cy += (dy / h) * scale * asp;

        requestDrawUnified();
    }


    // --- HUD ---
    function updateHud(rendererName) {
        hudRenderer.textContent = rendererName;
        hudCenter.textContent = `${cx.toFixed(6)}, ${cy.toFixed(6)}`;
        hudScale.textContent = scale.toExponential(3);
        hudIter.textContent = `${maxIter}`;
    }

    // ============================================================
    // WebGL Renderer (GPU)
    // ============================================================
    const gl = glCanvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false });

    const glState = {
        ok: false,
        program: null,
        u_resolution: null,
        u_center: null,
        u_scale: null,
        u_aspect: null,
        u_maxIter: null,
        u_time: null,
        u_palette: null
    };

    const vertSrc = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

    const fragSrc = `
    precision highp float;

    uniform vec2  u_resolution;
    uniform vec2  u_center;
    uniform float u_scale;
    uniform float u_aspect;
    uniform float u_time;
    uniform int   u_maxIter;
    uniform int   u_palette;

    vec3 paletteClassic(float t) {
      return 0.5 + 0.5*cos(6.28318*(vec3(0.0, 0.33, 0.67) + t));
    }

    vec3 paletteAmber(float t) {
      return vec3(1.0, 0.78, 0.45) * (0.15 + 0.85*t);
    }

    vec3 paletteVoid(float t) {
      vec3 a = vec3(0.02, 0.02, 0.03);
      vec3 b = vec3(0.75, 0.55, 0.35);
      vec3 c = vec3(0.95, 0.92, 0.88);
      float k = smoothstep(0.0, 1.0, t);
      return mix(mix(a,b,k), c, k*k*k);
    }

    vec3 pickPalette(float t) {
      if (u_palette == 0) return paletteVoid(t);
      if (u_palette == 1) return paletteClassic(t);
      return paletteAmber(t);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;

      float re = u_center.x + (uv.x - 0.5) * u_scale;
      float im = u_center.y + (uv.y - 0.5) * (u_scale * u_aspect);

      float zr = 0.0;
      float zi = 0.0;

      int iter = 0;
      const int MAX = 2000;

      for (int i = 0; i < MAX; i++) {
        if (i >= u_maxIter) break;

        float zr2 = zr*zr;
        float zi2 = zi*zi;
        if (zr2 + zi2 > 4.0) { iter = i; break; }

        float two = 2.0*zr*zi;
        zr = zr2 - zi2 + re;
        zi = two + im;

        iter = i;
      }

      if (iter >= u_maxIter - 1) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      float mag = sqrt(zr*zr + zi*zi);
      float smooth = float(iter) + 1.0 - log(log(mag)) / log(2.0);

      float t = smooth / float(u_maxIter);
      t = clamp(t, 0.0, 1.0);
      t = pow(t, 0.85);

      vec3 col = pickPalette(t);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

    function compileShader(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            const msg = gl.getShaderInfoLog(sh) || "Shader compile error";
            gl.deleteShader(sh);
            throw new Error(msg);
        }
        return sh;
    }

    function createProgram(vs, fs) {
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            const msg = gl.getProgramInfoLog(prog) || "Program link error";
            gl.deleteProgram(prog);
            throw new Error(msg);
        }
        return prog;
    }

    let paletteIndex = 0; // 0 Void, 1 Classic, 2 Amber
    let drawQueued = false;

    function setUniforms() {
        gl.useProgram(glState.program);
        gl.uniform2f(glState.u_resolution, glCanvas.width, glCanvas.height);
        gl.uniform2f(glState.u_center, cx, cy);
        gl.uniform1f(glState.u_scale, scale);
        gl.uniform1f(glState.u_aspect, aspect());
        gl.uniform1i(glState.u_maxIter, maxIter);
        gl.uniform1f(glState.u_time, performance.now() * 0.001);
        gl.uniform1i(glState.u_palette, paletteIndex);
    }

    function requestDraw() {
        if (!glState.ok) {
            cpuRenderQueued();
            return;
        }
        if (drawQueued) return;
        drawQueued = true;
        requestAnimationFrame(() => {
            drawQueued = false;
            setUniforms();
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            updateHud("WebGL (GPU)");
        });
    }

    function initWebGL() {
        if (!gl) return false;

        try {
            const vs = compileShader(gl.VERTEX_SHADER, vertSrc);
            const fs = compileShader(gl.FRAGMENT_SHADER, fragSrc);
            const program = createProgram(vs, fs);

            gl.deleteShader(vs);
            gl.deleteShader(fs);

            gl.useProgram(program);

            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);

            const verts = new Float32Array([
                -1, -1, 1, -1, -1, 1,
                -1, 1, 1, -1, 1, 1
            ]);
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

            const aPos = gl.getAttribLocation(program, "a_pos");
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            glState.program = program;
            glState.u_resolution = gl.getUniformLocation(program, "u_resolution");
            glState.u_center = gl.getUniformLocation(program, "u_center");
            glState.u_scale = gl.getUniformLocation(program, "u_scale");
            glState.u_aspect = gl.getUniformLocation(program, "u_aspect");
            glState.u_maxIter = gl.getUniformLocation(program, "u_maxIter");
            glState.u_time = gl.getUniformLocation(program, "u_time");
            glState.u_palette = gl.getUniformLocation(program, "u_palette");

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);

            glState.ok = true;
            return true;
        } catch (err) {
            console.warn("WebGL init failed:", err);
            return false;
        }
    }

    // ============================================================
    // CPU fallback (Canvas 2D)
    // ============================================================
    const cpu = cpuCanvas.getContext("2d", { alpha: false });
    let cpuImg = null;
    let cpuU32 = null;

    function cpuResize() {
        cpuImg = cpu.createImageData(cpuCanvas.width, cpuCanvas.height);
        cpuU32 = new Uint32Array(cpuImg.data.buffer);
    }

    function cpuRender() {
        const w = cpuCanvas.width;
        const h = cpuCanvas.height;
        const asp = h / w;

        const reStart = cx - 0.5 * scale;
        const imStart = cy - 0.5 * scale * asp;
        const reStep = scale / w;
        const imStep = (scale * asp) / h;

        let idx = 0;
        for (let y = 0; y < h; y++) {
            const cim = imStart + y * imStep;
            for (let x = 0; x < w; x++) {
                const cre = reStart + x * reStep;

                let zr = 0, zi = 0;
                let i = 0;
                while (i < maxIter) {
                    const zr2 = zr * zr;
                    const zi2 = zi * zi;
                    if (zr2 + zi2 > 4) break;
                    zi = 2 * zr * zi + cim;
                    zr = zr2 - zi2 + cre;
                    i++;
                }

                let r = 0, g = 0, b = 0;
                if (i < maxIter) {
                    const mag = Math.sqrt(zr * zr + zi * zi);
                    const smooth = i + 1 - Math.log(Math.log(mag)) / Math.log(2);
                    let t = Math.max(0, Math.min(1, smooth / maxIter));
                    t = Math.pow(t, 0.85);

                    r = (255 * (0.10 + 0.90 * t)) | 0;
                    g = (255 * (0.08 + 0.75 * t)) | 0;
                    b = (255 * (0.10 + 0.55 * t)) | 0;
                }

                cpuU32[idx++] = (255 << 24) | (b << 16) | (g << 8) | (r);
            }
        }

        cpu.putImageData(cpuImg, 0, 0);
        updateHud("Canvas 2D (CPU fallback)");
    }

    let cpuQueued = false;
    function cpuRenderQueued() {
        if (cpuQueued) return;
        cpuQueued = true;
        requestAnimationFrame(() => {
            cpuQueued = false;
            cpuRender();
        });
    }

    // ============================================================
    // Input (mouse + touch)
    // ============================================================
    let isDragging = false;
    let lastX = 0, lastY = 0;

    function canvasEventToDevicePx(e, canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvasEl.width / rect.width);
        const y = (e.clientY - rect.top) * (canvasEl.height / rect.height);
        return { x, y };
    }

    function activeCanvas() {
        return glState.ok ? glCanvas : cpuCanvas;
    }

    function requestDrawUnified() {
        if (glState.ok) requestDraw();
        else cpuRenderQueued();
    }

    // Mouse drag
    glCanvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        const { x, y } = canvasEventToDevicePx(e, glCanvas);
        lastX = x; lastY = y;
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const { x, y } = canvasEventToDevicePx(e, glCanvas);
        const dx = x - lastX;
        const dy = y - lastY;
        lastX = x; lastY = y;
        panByPixels(dx, dy);
    });

    window.addEventListener("mouseup", () => { isDragging = false; });

    // ✅ Double-click to zoom (no single-click zoom)
    glCanvas.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const { x, y } = canvasEventToDevicePx(e, glCanvas);
        zoomAtPixel(x, y, 0.65);
    });


    // Wheel zoom
    glCanvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const { x, y } = canvasEventToDevicePx(e, glCanvas);
        const zoomIn = e.deltaY < 0;
        const factor = zoomIn ? 0.82 : 1.22;
        zoomAtPixel(x, y, factor);
    }, { passive: false });

    // Touch: pan, double-tap, pinch
    let lastTap = 0;
    let pinchStartDist = 0;
    let pinchStartScale = 0;
    let pinchCenter = { x: 0, y: 0 };

    function touchDist(t1, t2) {
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function touchMid(t1, t2) {
        return { clientX: (t1.clientX + t2.clientX) / 2, clientY: (t1.clientY + t2.clientY) / 2 };
    }

    glCanvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const c = activeCanvas();

        if (e.touches.length === 1) {
            const now = Date.now();
            const dt = now - lastTap;
            lastTap = now;

            const t = e.touches[0];
            const { x, y } = canvasEventToDevicePx(t, c);

            // double tap zoom
            if (dt > 0 && dt < 320) {
                zoomAtPixel(x, y, 0.65);
                isDragging = false;
                return;
            }

            isDragging = true;
            lastX = x; lastY = y;
            return;
        }

        if (e.touches.length === 2) {
            isDragging = false;
            pinchStartDist = touchDist(e.touches[0], e.touches[1]);
            pinchStartScale = scale;

            const mid = touchMid(e.touches[0], e.touches[1]);
            const { x, y } = canvasEventToDevicePx(mid, c);
            pinchCenter = { x, y };
        }
    }, { passive: false });

    glCanvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const c = activeCanvas();

        if (e.touches.length === 1 && isDragging) {
            const t = e.touches[0];
            const { x, y } = canvasEventToDevicePx(t, c);
            const dx = x - lastX;
            const dy = y - lastY;
            lastX = x; lastY = y;
            panByPixels(dx, dy);
            return;
        }

        if (e.touches.length === 2) {
            const dist = touchDist(e.touches[0], e.touches[1]);
            if (pinchStartDist <= 0) return;
            const ratio = dist / pinchStartDist;

            const desiredScale = pinchStartScale / ratio;

            const before = complexAtPixel(pinchCenter.x, pinchCenter.y);
            scale = desiredScale;
            const after = complexAtPixel(pinchCenter.x, pinchCenter.y);
            cx += (before.re - after.re);
            cy += (before.im - after.im);

            maxIter = iterationsForScale(scale);
            requestDrawUnified();
        }
    }, { passive: false });

    glCanvas.addEventListener("touchend", () => {
        isDragging = false;
        pinchStartDist = 0;
    });

    // ============================================================
    // Buttons / UI
    // ============================================================
    resetBtn.addEventListener("click", () => {
        cx = DEFAULTS.cx;
        cy = DEFAULTS.cy;
        scale = DEFAULTS.scale;
        maxIter = DEFAULTS.maxIter;
        requestDrawUnified();
    });

    qualityBtn.addEventListener("click", () => {
        qualityHigh = !qualityHigh;
        qualityBtn.textContent = `Quality: ${qualityHigh ? "High" : "Low"}`;
        resizeCanvases();
    });

    hudBtn.addEventListener("click", () => {
        hud.style.display = (hud.style.display === "none") ? "block" : "none";
    });

    // Bonus: cycle palette with "P"
    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "p") {
            paletteIndex = (paletteIndex + 1) % 3;
            requestDrawUnified();
        }
    });

    // ============================================================
    // Init
    // ============================================================
    const ok = initWebGL();

    if (!ok) {
        glCanvas.classList.add("d-none");
        cpuCanvas.classList.remove("d-none");
        cpuResize();
        updateHud("Canvas 2D (CPU fallback)");
    } else {
        updateHud("WebGL (GPU)");
    }

    window.addEventListener("resize", resizeCanvases);
    resizeCanvases();
    requestDrawUnified();

    // Ensure uniforms exist before first draw
    function setUniforms() {
        gl.useProgram(glState.program);
        gl.uniform2f(glState.u_resolution, glCanvas.width, glCanvas.height);
        gl.uniform2f(glState.u_center, cx, cy);
        gl.uniform1f(glState.u_scale, scale);
        gl.uniform1f(glState.u_aspect, aspect());
        gl.uniform1i(glState.u_maxIter, maxIter);
        gl.uniform1f(glState.u_time, performance.now() * 0.001);
        gl.uniform1i(glState.u_palette, paletteIndex);
    }
})();
