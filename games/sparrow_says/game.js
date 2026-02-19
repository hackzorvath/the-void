// 1. Pirate Items
var pirateLoot = ["rum", "bomb", "gold", "compass"];

var gamePattern = [];
var userClickedPattern = [];
var started = false;
var level = 0;

// Audio Context for sound generation
var audioContext;

// Initialize audio context on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext created, state:", audioContext.state);
    }
    // Resume if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("AudioContext resumed");
        });
    }
}

// Sound frequencies for each button (in Hz)
var soundFrequencies = {
    rum: 440,     // A4 - Green
    bomb: 554,    // C#5 - Red
    gold: 659,    // E5 - Yellow
    compass: 784  // G5 - Blue
};

// Function to play a sound for a button
function playButtonSound(button) {
    if (!audioContext) {
        console.log("AudioContext not initialized");
        return;
    }
    
    try {
        var frequency = soundFrequencies[button];
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        
        var now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        console.log("Sound played for:", button);
    } catch (e) {
        console.error("Error playing sound:", e);
    }
}

// Function to play defeat/wrong sound (low frequency descending)
function playSound(type) {
    if (!audioContext) return;
    
    if (type === "wrong") {
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = "sine";
        var now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        // Descending frequency sweep
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
}

// 2. Start Game (Mobile Friendly Button)
$("#start-btn").click(function() {
  initAudioContext();
  if (!started) {
    // Hide the start button and show reset button
    $("#start-btn").hide();
    $("#reset-btn").show();
    $("#level-title").text("Voyage " + level);
    nextSequence();
    started = true;
  }
});

// Reset Game Button
$("#reset-btn").click(function() {
  startOver();
  $("#reset-btn").hide();
  $("#start-btn").show();
  $("#level-title").text("🏴‍☠️ Captain Sparrow Says");
});

// 3. User Click Logic
$(".pirate-btn").click(function () {
    // Only allow clicking if game has started (optional safety)
    if (!started) return;

    var userChosenItem = $(this).attr("id");
        userClickedPattern.push(userChosenItem);

        animatePress(userChosenItem);
        playButtonSound(userChosenItem);
        checkAnswer(userClickedPattern.length - 1);
});

        // 4. Check Logic
        function checkAnswer(currentLevel) {
  if (gamePattern[currentLevel] === userClickedPattern[currentLevel]) {
    
    if (userClickedPattern.length === gamePattern.length){
            setTimeout(function () {
                nextSequence();
            }, 1000);
    }

  } else {
            // Game Over Logic
            playSound("wrong"); // Optional if you add sound later

    $("body").addClass("game-over");
    $("#level-title").html("☠️ Walk the Plank!<br><small>Score: Voyage " + level + "</small>");

    // Show Start Button Again
    $("#start-btn").text("Try Again, Matey?").show();

    setTimeout(function () {
        $("body").removeClass("game-over");
    }, 200);

            startOver();
  }
}

            // 5. Generate Next Item
            function nextSequence() {
                userClickedPattern = [];
            level++;
        $("#level-title").text("Voyage " + level);

        var randomNumber = Math.floor(Math.random() * 4);
        var randomChosenItem = pirateLoot[randomNumber];
        gamePattern.push(randomChosenItem);

        // Flash animation with sound
        setTimeout(function() {
            $("#" + randomChosenItem).fadeIn(100).fadeOut(100).fadeIn(100);
            playButtonSound(randomChosenItem);
        }, 500);
}

            // 6. Animation Helper
            function animatePress(currentItem) {
  $("#" + currentItem).addClass("pressed");
        setTimeout(function () {
            $("#" + currentItem).removeClass("pressed");
        }, 100);
    }

// 7. Reset Variables
function startOver() {
            level = 0;
            gamePattern = [];
            userClickedPattern = [];
            started = false;
        }

