(() => {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");
    const scoreElement = document.querySelector("#score");
    const heartsElement = document.querySelector("#hearts");
    const progressElement = document.querySelector("#progress");
    const message = document.querySelector("#game-message");
    const messageIcon = document.querySelector("#message-icon");
    const messageEyebrow = document.querySelector("#message-eyebrow");
    const messageTitle = document.querySelector("#message-title");
    const messageCopy = document.querySelector("#message-copy");
    const playButton = document.querySelector("#play-button");

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const WORLD_WIDTH = 3400;
    const GRAVITY = 1750;
    const MOVE_SPEED = 290;
    const JUMP_SPEED = 650;
    const keys = new Set();
    const controls = { left: false, right: false };

    const platforms = [
        { x: 0, y: 465, w: 570, h: 90 },
        { x: 690, y: 465, w: 450, h: 90 },
        { x: 1260, y: 465, w: 490, h: 90 },
        { x: 1870, y: 465, w: 440, h: 90 },
        { x: 2430, y: 465, w: 970, h: 90 },
        { x: 190, y: 365, w: 155, h: 18 },
        { x: 420, y: 305, w: 145, h: 18 },
        { x: 770, y: 370, w: 165, h: 18 },
        { x: 1010, y: 315, w: 145, h: 18 },
        { x: 1350, y: 365, w: 160, h: 18 },
        { x: 1590, y: 300, w: 150, h: 18 },
        { x: 1940, y: 365, w: 175, h: 18 },
        { x: 2190, y: 310, w: 155, h: 18 },
        { x: 2570, y: 370, w: 165, h: 18 },
        { x: 2850, y: 315, w: 175, h: 18 },
    ];

    const starPositions = [
        [267, 327], [492, 267], [838, 332], [1078, 277],
        [1418, 327], [1655, 262], [2013, 327], [2266, 272],
    ];
    const enemyStarts = [
        { x: 820, min: 720, max: 1080, speed: 68 },
        { x: 1445, min: 1280, max: 1690, speed: 82 },
        { x: 2650, min: 2450, max: 2830, speed: 96 },
    ];

    let player;
    let stars;
    let enemies;
    let cameraX = 0;
    let score = 0;
    let lives = 3;
    let elapsed = 0;
    let gameState = "playing";
    let lastFrame = 0;

    function resetGame() {
        player = { x: 70, y: 385, w: 34, h: 46, vx: 0, vy: 0, grounded: false, invulnerable: 0, facing: 1 };
        stars = starPositions.map(([x, y]) => ({ x, y, collected: false }));
        enemies = enemyStarts.map((enemy) => ({ ...enemy, x: enemy.x, direction: 1, w: 34, h: 30 }));
        cameraX = 0;
        score = 0;
        lives = 3;
        elapsed = 0;
        gameState = "playing";
        message.hidden = true;
        updateHud();
    }

    function updateHud() {
        scoreElement.textContent = String(score);
        heartsElement.textContent = `${"♥ ".repeat(lives).trim()}${"♡ ".repeat(3 - lives).trim()}`.trim();
        heartsElement.setAttribute("aria-label", `残りライフ ${lives}`);
        progressElement.textContent = String(Math.min(100, Math.floor((player.x / (WORLD_WIDTH - 100)) * 100)));
    }

    function finish(won) {
        gameState = won ? "won" : "lost";
        message.hidden = false;
        messageIcon.textContent = won ? "✦" : "♡";
        messageEyebrow.textContent = won ? "ADVENTURE COMPLETE" : "TRY AGAIN";
        messageTitle.textContent = won ? "やったね！" : "もう少し！";
        messageCopy.textContent = won
            ? `星を ${score} 個集めてゴールに到着！`
            : "ライフがなくなっちゃった。もう一度挑戦しよう！";
        playButton.focus();
    }

    function damagePlayer() {
        if (player.invulnerable > 0) return;
        lives -= 1;
        player.x = Math.max(70, player.x - 110);
        player.y = 385;
        player.vx = 0;
        player.vy = 0;
        player.invulnerable = 1.35;
        updateHud();
        if (lives <= 0) finish(false);
    }

    function overlaps(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function update(dt) {
        if (gameState !== "playing") return;
        elapsed += dt;
        player.invulnerable = Math.max(0, player.invulnerable - dt);

        const left = keys.has("ArrowLeft") || keys.has("a") || controls.left;
        const right = keys.has("ArrowRight") || keys.has("d") || controls.right;
        player.vx = (Number(right) - Number(left)) * MOVE_SPEED;
        if (player.vx !== 0) player.facing = Math.sign(player.vx);

        if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("w")) && player.grounded) {
            player.vy = -JUMP_SPEED;
            player.grounded = false;
        }

        const previousBottom = player.y + player.h;
        player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x + player.vx * dt));
        player.vy = Math.min(1000, player.vy + GRAVITY * dt);
        player.y += player.vy * dt;
        player.grounded = false;

        if (player.vy >= 0) {
            for (const platform of platforms) {
                const crossedTop = previousBottom <= platform.y && player.y + player.h >= platform.y;
                const horizontalOverlap = player.x + player.w > platform.x && player.x < platform.x + platform.w;
                if (crossedTop && horizontalOverlap) {
                    player.y = platform.y - player.h;
                    player.vy = 0;
                    player.grounded = true;
                }
            }
        }

        if (player.y > HEIGHT + 100) damagePlayer();

        for (const enemy of enemies) {
            enemy.x += enemy.speed * enemy.direction * dt;
            if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.direction *= -1;
            if (overlaps(player, { x: enemy.x, y: 435, w: enemy.w, h: enemy.h })) damagePlayer();
        }

        for (const star of stars) {
            if (!star.collected && overlaps(player, { x: star.x - 13, y: star.y - 13, w: 26, h: 26 })) {
                star.collected = true;
                score += 1;
            }
        }

        if (player.x > WORLD_WIDTH - 145) finish(true);
        cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * .36));
        updateHud();
    }

    function roundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
    }

    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, "#83b4ec");
        sky.addColorStop(1, "#d5d9ef");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = "rgba(255, 244, 202, .85)";
        ctx.beginPath();
        ctx.arc(790 - cameraX * .05, 106, 36, 0, Math.PI * 2);
        ctx.fill();

        drawCloud(150 - cameraX * .12, 118, 1);
        drawCloud(550 - cameraX * .12, 175, .72);
        drawCloud(920 - cameraX * .12, 108, .9);
        drawHills("#a6c8e8", 0.18, 345, 95, 220);
        drawHills("#8bb2d8", 0.32, 405, 75, 180);
    }

    function drawCloud(x, y, scale) {
        x = ((x % (WIDTH + 240)) + WIDTH + 240) % (WIDTH + 240) - 120;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = "rgba(255, 255, 255, .55)";
        ctx.beginPath();
        ctx.arc(0, 8, 23, Math.PI, 0);
        ctx.arc(24, 0, 30, Math.PI, 0);
        ctx.arc(51, 9, 22, Math.PI, 0);
        ctx.lineTo(72, 18);
        ctx.lineTo(-23, 18);
        ctx.fill();
        ctx.restore();
    }

    function drawHills(color, speed, baseY, amplitude, period) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, HEIGHT);
        for (let x = 0; x <= WIDTH + 10; x += 10) {
            const worldX = x + cameraX * speed;
            const y = baseY + Math.sin(worldX / period) * amplitude * .45 + Math.sin(worldX / (period * .47)) * amplitude * .2;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(WIDTH, HEIGHT);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlatforms() {
        for (const platform of platforms) {
            const x = platform.x - cameraX;
            if (x + platform.w < -10 || x > WIDTH + 10) continue;
            ctx.fillStyle = platform.h > 25 ? "#476651" : "#6b825e";
            roundedRect(x, platform.y, platform.w, platform.h, platform.h > 25 ? 8 : 7);
            ctx.fill();
            ctx.fillStyle = "#90bd72";
            roundedRect(x, platform.y, platform.w, 9, platform.h > 25 ? [8, 8, 2, 2] : 7);
            ctx.fill();
            if (platform.h > 25) {
                ctx.fillStyle = "rgba(31, 58, 60, .25)";
                for (let tileX = x + 24; tileX < x + platform.w; tileX += 46) {
                    ctx.fillRect(tileX, platform.y + 21, 2, platform.h - 26);
                }
            }
        }
    }

    function drawStar(star) {
        if (star.collected) return;
        const x = star.x - cameraX;
        const pulse = 1 + Math.sin(elapsed * 5 + star.x) * .08;
        ctx.save();
        ctx.translate(x, star.y + Math.sin(elapsed * 3 + star.x) * 4);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "#fff0a1";
        ctx.shadowBlur = 17;
        ctx.fillStyle = "#ffd369";
        ctx.beginPath();
        for (let i = 0; i < 10; i += 1) {
            const angle = -Math.PI / 2 + i * Math.PI / 5;
            const radius = i % 2 === 0 ? 13 : 6;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawEnemy(enemy) {
        const x = enemy.x - cameraX;
        ctx.fillStyle = "#db6f73";
        roundedRect(x, 435, enemy.w, enemy.h, 12);
        ctx.fill();
        ctx.fillStyle = "#f5a298";
        roundedRect(x + 4, 438, enemy.w - 8, 8, 5);
        ctx.fill();
        ctx.fillStyle = "#283047";
        ctx.beginPath();
        ctx.arc(x + 11, 448, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 23, 448, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPlayer() {
        if (player.invulnerable > 0 && Math.floor(elapsed * 13) % 2 === 0) return;
        const x = player.x - cameraX;
        const y = player.y;
        ctx.fillStyle = "rgba(30, 44, 67, .18)";
        ctx.beginPath();
        ctx.ellipse(x + player.w / 2, Math.min(458, y + player.h + 3), 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#354768";
        roundedRect(x + 4, y + 17, 26, 28, 8);
        ctx.fill();
        ctx.fillStyle = "#f4bc82";
        roundedRect(x + 5, y + 2, 25, 24, 9);
        ctx.fill();
        ctx.fillStyle = "#4c5a85";
        roundedRect(x + 3, y, 28, 10, 7);
        ctx.fill();
        ctx.fillStyle = "#fff";
        const eyeX = player.facing > 0 ? x + 23 : x + 10;
        ctx.beginPath();
        ctx.arc(eyeX, y + 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#283047";
        ctx.beginPath();
        ctx.arc(eyeX + player.facing, y + 15, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4bc82";
        ctx.fillRect(x + (player.facing > 0 ? 26 : 1), y + 25, 7, 9);
        ctx.fillStyle = "#26324f";
        roundedRect(x + 3, y + 40, 12, 7, 3);
        ctx.fill();
        roundedRect(x + 18, y + 40, 12, 7, 3);
        ctx.fill();
    }

    function drawGoal() {
        const x = WORLD_WIDTH - 105 - cameraX;
        ctx.fillStyle = "#e9edf7";
        ctx.fillRect(x, 358, 7, 107);
        ctx.fillStyle = "#f27c83";
        ctx.beginPath();
        ctx.moveTo(x + 7, 360);
        ctx.lineTo(x + 59, 376);
        ctx.lineTo(x + 7, 393);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.arc(x + 3.5, 356, 7, 0, Math.PI * 2);
        ctx.fill();
    }

    function render() {
        drawBackground();
        drawPlatforms();
        for (const star of stars) drawStar(star);
        for (const enemy of enemies) drawEnemy(enemy);
        drawGoal();
        drawPlayer();
    }

    function frame(timestamp) {
        const dt = Math.min((timestamp - lastFrame) / 1000 || 0, 1 / 30);
        lastFrame = timestamp;
        update(dt);
        render();
        requestAnimationFrame(frame);
    }

    function handleKeyDown(event) {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(key)) event.preventDefault();
        if (key === "r") resetGame();
        keys.add(key);
    }

    function handleKeyUp(event) {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        keys.delete(key);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", () => {
        keys.clear();
        controls.left = false;
        controls.right = false;
    });

    document.querySelectorAll("[data-control]").forEach((button) => {
        const control = button.dataset.control;
        const release = () => {
            button.classList.remove("is-pressed");
            if (control === "jump") keys.delete("Space");
            else controls[control] = false;
        };
        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            button.classList.add("is-pressed");
            if (control === "jump") keys.add("Space");
            else controls[control] = true;
        });
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
    });

    document.querySelector("#restart-button").addEventListener("click", resetGame);
    playButton.addEventListener("click", resetGame);
    resetGame();
    requestAnimationFrame(frame);
})();
