// assets/scripts/matrix.js
(() => {
  const canvas = document.getElementById("matrixCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // --- Tunables ---
  const charSize = 12;
  const lettersPerLine = 100;
  const stringSize = 200;
  const fps = 10;

  const possible =
    "0123456789" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "αβξδεφγηιςκλμνοπθρστυωωχψζ" +
    "ΑΒΞΔΕΦΓΗΙςΚΛΜΝΟΠΘΡΣΤΥΩΧΨΖ" +
    "АБВГДЕЖЅꙀИІКЛМНОПРСТОУФХѠЦЧШЩЪЪІЬѢꙖѤЮѪѬѦѨѮѰѲѴҀ";

  let numLines = 0;
  let textLines = [];
  let curLetter = [];
  let timer = null;

  function randString(length) {
    let text = "";
    for (let z = 0; z < length; z++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  function setStrings() {
    textLines = new Array(numLines);
    curLetter = new Array(numLines);
    for (let i = 0; i < numLines; i++) {
      textLines[i] = randString(stringSize);
      curLetter[i] = Math.floor(Math.random() * textLines[i].length);
    }
  }

  function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    // Use CSS pixels for drawing coords
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.font = "10px Monaco, monospace";
    ctx.textBaseline = "top";

    // columns across screen
    numLines = Math.max(1, Math.floor(cssW / charSize));
    setStrings();
  }

  function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];

      for (let j = 0; j < line.length; j++) {
        if (j < curLetter[i] && j > curLetter[i] - lettersPerLine) {
          const dist = curLetter[i] - j;
          ctx.fillStyle = (dist <= 5) ? "white" : "lightgreen";
          ctx.fillText(line.charAt(j), i * charSize, j * charSize);
        }
      }

      if (curLetter[i] > line.length + lettersPerLine) {
        textLines[i] = randString(stringSize);
        curLetter[i] = 0;
      }
      curLetter[i] += 1;
    }
  }

  function start() {
    resize();
    if (timer) clearInterval(timer);
    timer = setInterval(draw, Math.floor(1000 / fps));
    draw();
  }

  window.addEventListener("load", start);

  // Debounced resize
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(start, 120);
  });
})();
