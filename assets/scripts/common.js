// assets/js/load-common.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("[🎭] load-common.js initialized");

    // === ENVIRONMENT DETECTION ===
    const isGitHubPages = window.location.hostname.includes("github.io");
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

    // === UNIVERSAL PATH RESOLVER ===
    function resolvePath(targetPath) {
        const pathParts = window.location.pathname.split("/").filter(Boolean);

        if (isGitHubPages) {
            // Anchor everything under your repo name (the-void)
            const voidIndex = pathParts.indexOf("the-void");
            if (voidIndex !== -1) {
                const base = "/" + pathParts.slice(0, voidIndex + 1).join("/");
                return `${base}/${targetPath}`;
            }
            // fallback if GH Pages path shifts
            return `/the-void/${targetPath}`;
        }

        if (isLocalhost) {
            // Local server (running from inside /the-void/)
            const depth = pathParts.length - 1;
            const prefix = depth > 0 ? "../".repeat(depth) : "";
            return `${prefix}${targetPath}`;
        }

        // Fallback for file:// or other hosts
        return targetPath;
    }

    // === FOOTER LOADER ===
    const footerPlaceholder = document.getElementById("footer-placeholder");
    if (footerPlaceholder) {
        const footerPath = resolvePath("components/footer.html");

        fetch(footerPath)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then((html) => {
                footerPlaceholder.outerHTML = html;
                const footer = document.querySelector("footer");
                if (footer) {
                    document.body.style.paddingBottom = footer.offsetHeight + "px";
                }
                console.log(`[✨] Footer loaded successfully from ${footerPath}`);
            })
            .catch((err) => console.error("Footer load error:", err));
    }

    // === UNIVERSAL HOME BUTTON ===
    if (!document.getElementById("homeButton")) {
        const homeBtn = document.createElement("button");
        homeBtn.id = "homeButton";
        homeBtn.title = "Return to the Void";
        homeBtn.innerHTML = "🌑";
        document.body.appendChild(homeBtn);

        const homeURL = resolvePath("index.html");
        console.log(`[🏠] Home button → ${homeURL}`);

        homeBtn.onclick = () => (window.location.href = homeURL);
    }

    // === MUSIC TOGGLE HANDLER ===
    const bgm = document.getElementById("bgm");
    const btn = document.getElementById("musicToggle");
    if (bgm && btn) {
        bgm.pause();
        btn.textContent = "🎵";
        btn.onclick = () => {
            if (bgm.paused) {
                bgm.play();
                btn.textContent = "🔇";
            } else {
                bgm.pause();
                btn.textContent = "🎵";
            }
        };
    }

    // === TOOLTIP INIT (Bootstrap) ===
    if (typeof bootstrap !== "undefined") {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
    }
});
