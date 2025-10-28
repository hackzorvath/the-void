// ==========================================
// 🎭 common.js  —  Dynamic component loader
// ==========================================

console.log("[🎭] load-common.js initialized");

// --- Detect whether we’re running locally or on GitHub Pages ---
const isGitHub = window.location.hostname.includes("github.io");
// 👇 change "/the-void" if your repo name differs
const basePath = isGitHub ? "/the-void" : "";

// --- Define key paths used throughout ---
const footerURL = `${basePath}/components/footer.html`;
const footerCSS = `${basePath}/assets/css/footer.css`;
const homeURL = `${basePath}/index.html`;

// --- Load the footer component dynamically ---
fetch(footerURL)
    .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    })
    .then((html) => {
        const footerPlaceholder = document.getElementById("footer-placeholder");
        if (footerPlaceholder) footerPlaceholder.outerHTML = html;
        console.log(`[✨] Footer loaded successfully from ${footerURL}`);

        // Inject footer stylesheet dynamically so paths stay correct
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = footerCSS;
        document.head.appendChild(cssLink);
        console.log(`[🎨] Footer CSS loaded from ${footerCSS}`);
    })
    .catch((err) => console.error("[💀] Footer load error:", err));

// --- When DOM is ready, wire up common controls ---
document.addEventListener("DOMContentLoaded", () => {

    // 🎵 Music toggle logic
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

    // 🏠 Home button logic
    const homeBtn = document.getElementById("homeButton");
    if (homeBtn) {
        homeBtn.onclick = () => (window.location.href = homeURL);
        console.log(`[🏠] Home button → ${homeURL}`);
    }

    // 💡 Bootstrap tooltip initialization (optional)
    if (typeof bootstrap !== "undefined") {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
        console.log("[💬] Bootstrap tooltips active");
    }
});
