// ==========================================
// 🎭 common.js  —  Dynamic component loader (v3)
// ==========================================

console.log("[🎭] load-common.js initialized");

// --- Environment Detection ---
const isGitHub = window.location.hostname.includes("github.io");
const repoName = "the-void"; // 🪐 change if you rename repo
const basePath = isGitHub ? `/${repoName}` : "";

// --- Core Paths ---
const footerURL = `${basePath}/components/footer.html`;
const footerCSS = `${basePath}/assets/css/footer.css`;
const homeURL = `${basePath}/index.html`;

// === Load Footer Component ===
fetch(footerURL)
    .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    })
    .then((html) => {
        const footerPlaceholder = document.getElementById("footer-placeholder");
        if (footerPlaceholder) {
            footerPlaceholder.innerHTML = html;
            console.log(`[✨] Footer loaded successfully from ${footerURL}`);

            // Inject footer stylesheet with repo-safe absolute path
            const cssLink = document.createElement("link");
            cssLink.rel = "stylesheet";
            cssLink.href = `${window.location.origin}${footerCSS}`;
            document.head.appendChild(cssLink);
            console.log(`[🎨] Footer CSS loaded from ${cssLink.href}`);
        }

        // Re-add home button *after* footer finishes loading
        ensureHomeButton();
    })
    .catch((err) => console.error("[💀] Footer load error:", err));

// === DOM-level behavior ===
document.addEventListener("DOMContentLoaded", () => {
    // 🎵 Music toggle
    const bgm = document.getElementById("bgm");
    const btn = document.getElementById("musicToggle");
    if (bgm && btn) {
        btn.onclick = () => {
            if (bgm.paused) {
                bgm.play();
                btn.textContent = "🔇";
            } else {
                bgm.pause();
                btn.textContent = "🎵";
            }
        };
        console.log("[🎶] Music toggle initialized");
    }

    // 🏠 Ensure home button exists (will run again after footer)
    ensureHomeButton();

    // 💬 Bootstrap tooltips
    if (typeof bootstrap !== "undefined") {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
        console.log("[💬] Bootstrap tooltips active");
    }
});

// === Helper: Home Button Generator ===
function ensureHomeButton() {
    if (document.getElementById("homeButton")) return;

    const homeBtn = document.createElement("button");
    homeBtn.id = "homeButton";
    homeBtn.title = "Return to the Void";
    homeBtn.textContent = "🌑";
    homeBtn.style.position = "fixed";
    homeBtn.style.top = "1rem";
    homeBtn.style.left = "1rem";
    homeBtn.style.background = "rgba(255, 255, 255, 0.2)";
    homeBtn.style.border = "none";
    homeBtn.style.borderRadius = "50%";
    homeBtn.style.width = "44px";
    homeBtn.style.height = "44px";
    homeBtn.style.fontSize = "1.3rem";
    homeBtn.style.color = "#fff";
    homeBtn.style.cursor = "pointer";
    homeBtn.style.zIndex = "9999";

    homeBtn.addEventListener("mouseenter", () => {
        homeBtn.style.background = "rgba(255,255,255,0.35)";
        homeBtn.style.transform = "translateY(-2px) scale(1.05)";
    });
    homeBtn.addEventListener("mouseleave", () => {
        homeBtn.style.background = "rgba(255,255,255,0.2)";
        homeBtn.style.transform = "none";
    });
    homeBtn.onclick = () => (window.location.href = homeURL);

    document.body.appendChild(homeBtn);
    console.log(`[🏠] Home button → ${homeURL}`);
}
