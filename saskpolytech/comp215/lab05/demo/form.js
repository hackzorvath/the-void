const form = document.getElementById("trainerForm");
        const pokemonSelect = document.getElementById("pokemonSelect");
        const megaContainer = document.getElementById("megaContainer");
        const stageRadios = document.querySelectorAll("input[name='stage']");
        const confirmBtn = document.getElementById("confirmBtn");
        const pokemonImage = document.getElementById("pokemonImage");
        const feedback = document.getElementById("feedback");
        const friendship = document.getElementById("friendship");
        const friendshipValue = document.getElementById("friendshipValue");

        const pokedex = {
            bulbasaur: ["001", "002", "003"],
            charmander: ["004", "005", "006"],
            squirtle: ["007", "008", "009"]
        };

        const evolutions = {
            bulbasaur: ["Bulbasaur", "Ivysaur", "Venusaur"],
            charmander: ["Charmander", "Charmeleon", "Charizard"],
            squirtle: ["Squirtle", "Wartortle", "Blastoise"]
        };

        pokemonSelect.addEventListener("change", updateBorder);
        stageRadios.forEach(r => r.addEventListener("change", toggleMega));
        confirmBtn.addEventListener("click", showResult);
        friendship.addEventListener("input", () => friendshipValue.textContent = friendship.value);
        document.getElementById("isMega").addEventListener("change", updateImage);
        document.getElementById("isShiny").addEventListener("change", updateImage);

        function updateBorder() {
            const selected = pokemonSelect.value;
            form.classList.remove("bulbasaur", "charmander", "squirtle");

            if (!selected) {
                pokemonImage.style.display = "none";
                feedback.classList.add("d-none");
                return;
            }

            // Apply border colour
            form.classList.add(selected);

            // Default to Stage 1 when a Pokémon is chosen
            const stage1 = document.getElementById("stage1");
            stage1.checked = true;
            toggleMega();       // ensure Mega checkbox hides
            updateImage();      // refresh the preview

            // Feedback text
            feedback.classList.remove("d-none");
            feedback.textContent = `You selected ${selected.charAt(0).toUpperCase() + selected.slice(1)}.`;
        }

        function toggleMega() {
            const selectedStage = document.querySelector("input[name='stage']:checked");
            if (!selectedStage) return;
            megaContainer.classList.toggle("d-none", selectedStage.value !== "3");
            updateImage();
        }

        function updateImage() {
            const pokemon = pokemonSelect.value;
            const stage = document.querySelector("input[name='stage']:checked")?.value;
            const isMega = document.getElementById("isMega").checked;
            const isShiny = document.getElementById("isShiny").checked;

            if (!pokemon || !stage) {
                pokemonImage.style.display = "none";
                pokemonImage.classList.remove("visible");
                return;
            }

            const number = pokedex[pokemon][stage - 1];
            let baseName = evolutions[pokemon][stage - 1].toLowerCase();
            let filename = `${number}-${baseName}`;
            if (isMega && stage === "3") filename += "-M";
            if (isShiny) filename += "-shiny";
            const path = `pokemon/${filename}.png`;

            pokemonImage.src = path;
            pokemonImage.style.display = "block";
            requestAnimationFrame(() => pokemonImage.classList.add("visible"));
        }

        function showResult() {
            if (!form.checkValidity()) {
                form.classList.add("was-validated");
                return;
            }

            updateImage();

            const name = document.getElementById("nickname").value;
            const pokemon = pokemonSelect.value;
            const stage = document.querySelector("input[name='stage']:checked").value;
            const isMega = document.getElementById("isMega").checked;
            const isShiny = document.getElementById("isShiny").checked;

            let summary = `You’ve chosen ${name || "a mysterious Pokémon"} — `;
            if (isShiny) summary += "✨Shiny ";
            summary += evolutions[pokemon][stage - 1];
            if (isMega && stage === "3") summary += " (Mega Evolution!)";
            summary += ` with friendship level ${friendship.value}.`;

            feedback.textContent = summary;
            feedback.classList.remove("alert-info");
            feedback.classList.add("alert-success");
            feedback.classList.remove("d-none");
        }