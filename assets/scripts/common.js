// ==========================================
// 🎭 common.js  —  Dynamic component loader
// ==========================================

console.log("[🎭] load-common.js initialized");

// --- Detect environment ---
const isGitHub = window.location.hostname.includes("github.io");
// 🔧 Change "/the-void" if your repo name differs
const repoName = "the-void";
const basePath = isGitHub ? `/${repoName}` : "";

// --- Paths ---
const footerURL = `${basePath}/components/footer.html`;
const footerCSS = `${basePath}/assets/css/footer.css`;
const homeURL = `${basePath}/index.html`;

// --- Load Footer ---
fetch(footerURL)
    .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    })
    .then((html) => {
        const footerPlaceholder = document.getElementById("footer-placeholder");
        if (footerPlaceholder) footerPlaceholder.outerHTML = html;
        console.log(`[✨] Footer loaded successfully from ${footerURL}`);

        // ✅ Inject footer stylesheet with absolute repo-safe path
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = footerCSS.startsWith("http")
            ? footerCSS
            : `${window.location.origin}${footerCSS}`;
        document.head.appendChild(cssLink);
        console.log(`[🎨] Footer CSS loaded from ${cssLink.href}`);
    })
    .catch((err) => console.error("[💀] Footer load error:", err));

// --- DOMContentLoaded ---
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

    // 🏠 Home button
    const homeBtn = document.getElementById("homeButton");
    if (homeBtn) {
        homeBtn.onclick = () => (window.location.href = homeURL);
        console.log(`[🏠] Home button → ${homeURL}`);
    }

    // 💡 Bootstrap tooltip
    if (typeof bootstrap !== "undefined") {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
        console.log("[💬] Bootstrap tooltips active");
    }
});
