// ======================================== //
//  common.js  —  Dynamic component loader  //
// ======================================== //

console.log("[🎭] load-common.js initialized");

// --- Environment Detection ---
const isGitHub = window.location.hostname.includes("github.io");
const repoName = "the-void";
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

        // Ensure floating controls exist
        initFloatingButtons();
    })
    .catch((err) => console.error("[💀] Footer load error:", err));

// === DOM-level behavior ===
document.addEventListener("DOMContentLoaded", () => {
    initFloatingButtons();

    // 💬 Bootstrap tooltips
    if (typeof bootstrap !== "undefined") {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
        console.log("[💬] Bootstrap tooltips active");
    }
});

// ======================================== //
//  🌀 Floating Button System (Unified)     //
// ======================================== //

function createFloatingButton(id, title, iconPath, onClick) {
    if (document.getElementById(id)) return; // prevent duplicates

    const btn = document.createElement("button");
    btn.id = id;
    btn.className = "floating-btn";
    btn.title = title;

    const img = document.createElement("img");
    img.src = iconPath;
    img.alt = title;
    img.className = "icon";
    btn.appendChild(img);

    btn.addEventListener("click", onClick);
    document.body.appendChild(btn);
    console.log(`[✨] ${id} created`);
}

function initFloatingButtons() {
    const base = `${basePath}/assets/img/buttons`;
    const bgm = document.getElementById("bgm");
    if (!bgm) {
        console.warn("[⚠️] No background music element found.");
        return;
    }

    // === Spiritomb → Home Button ===
    createFloatingButton(
        "homeButton",
        "Return to the Void",
        `${base}/spiritomb.png`,
        () => (window.location.href = homeURL)
    );

    // === Meloetta → Music Button (Toggle Forms) ===
    const meloettaAria = `${base}/meloetta-aria.png`;
    const meloettaPirouette = `${base}/meloetta-pirouette.png`;

    createFloatingButton(
        "musicToggle",
        "Toggle Music",
        meloettaAria,
        () => {
            const icon = document.querySelector("#musicToggle img.icon");
            if (bgm.paused) {
                bgm.play();
                icon.src = meloettaPirouette;
                icon.alt = "Meloetta (Pirouette Form)";
                console.log("[🎶] Meloetta switches to Pirouette Form!");
            } else {
                bgm.pause();
                icon.src = meloettaAria;
                icon.alt = "Meloetta (Aria Form)";
                console.log("[🎵] Meloetta returns to Aria Form.");
            }
        }
    );

    console.log("[🏠] Spiritomb & Meloetta buttons initialized.");
}
