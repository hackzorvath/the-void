// assets/js/load-common.js
document.addEventListener("DOMContentLoaded", () => {
    // === FOOTER LOADER ===
    const footerPlaceholder = document.getElementById("footer-placeholder");
    if (footerPlaceholder) {
        // Detect path depth automatically
        const depth = window.location.pathname.split("/").length - 2;
        const prefix = "../".repeat(depth);
        const footerPath = `${prefix}components/footer.html`;

        fetch(footerPath)
            .then((res) => {
                if (!res.ok) throw new Error(res.statusText);
                return res.text();
            })
            .then((html) => {
                footerPlaceholder.outerHTML = html;

                // Adjust body padding dynamically based on footer height
                const footer = document.querySelector("footer");
                if (footer) document.body.style.paddingBottom = footer.offsetHeight + "px";
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

        // === Functionality: navigate to correct index ===
        const pathDepth = window.location.pathname.split("/").length - 2;
        const prefix = "../".repeat(pathDepth);
        homeBtn.onclick = () => {
            window.location.href = `${prefix}index.html`;
        };
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
