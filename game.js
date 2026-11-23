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
    const BATTLE_EFFECT_DURATION = .42;
    const BATTLE_RESULT_DURATION = .72;
    const keys = new Set();
    const controls = { left: false, right: false };
    const battleMessage = document.querySelector("#battle-message");
    const battlePrompt = document.querySelector("#battle-prompt");
    const battleFeedback = document.querySelector("#battle-feedback");
    const battleChoices = [...document.querySelectorAll("[data-battle-choice]")];
    const battleQuestions = [
        { prompt: "3 + 4 = ?", answer: 7, choices: [6, 7, 8] },
        { prompt: "9 - 5 = ?", answer: 4, choices: [3, 4, 5] },
        { prompt: "2 × 4 = ?", answer: 8, choices: [6, 8, 10] },
        { prompt: "6 + 7 = ?", answer: 13, choices: [12, 13, 14] },
        { prompt: "15 - 8 = ?", answer: 7, choices: [6, 7, 9] },
        { prompt: "3 × 5 = ?", answer: 15, choices: [12, 15, 18] },
    ];

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

    const coinPositions = [
        [267, 327], [492, 267], [838, 332], [1078, 277],
        [1418, 327], [1655, 262], [2013, 327], [2266, 272],
    ];
    const enemyStarts = [
        { x: 820, min: 720, max: 1080, speed: 68 },
        { x: 1445, min: 1280, max: 1690, speed: 82 },
        { x: 2650, min: 2450, max: 2830, speed: 96 },
    ];

    let player;
    let coins;
    let enemies;
    let cameraX = 0;
    let score = 0;
    let lives = 3;
    let elapsed = 0;
    let battleEffect = null;
    let activeBattle = null;
    let battleQuestion = null;
    let battleTimer = 0;
    let gameState = "playing";
    let lastFrame = 0;

    function resetGame() {
        player = { x: 70, y: 385, w: 34, h: 46, vx: 0, vy: 0, grounded: false, invulnerable: 0, facing: 1 };
        coins = coinPositions.map(([x, y]) => ({ x, y, collected: false }));
        enemies = enemyStarts.map((enemy) => ({ ...enemy, x: enemy.x, direction: 1, w: 34, h: 30 }));
        cameraX = 0;
        score = 0;
        lives = 3;
        elapsed = 0;
        battleEffect = null;
        activeBattle = null;
        battleQuestion = null;
        battleTimer = 0;
        gameState = "playing";
        battleMessage.hidden = true;
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
        battleMessage.hidden = true;
        message.hidden = false;
        messageIcon.textContent = won ? "¥" : "♡";
        messageEyebrow.textContent = won ? "ADVENTURE COMPLETE" : "TRY AGAIN";
        messageTitle.textContent = won ? "やったね！" : "もう少し！";
        messageCopy.textContent = won
            ? `コインを ${score} 枚集めてゴールに到着！`
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

    function clearMovementInput() {
        for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "a", "d", "w"]) keys.delete(key);
        controls.left = false;
        controls.right = false;
    }

    function beginBattle(enemy) {
        activeBattle = enemy;
        player.facing = enemy.x + enemy.w / 2 > player.x + player.w / 2 ? 1 : -1;
        battleQuestion = battleQuestions[Math.floor(Math.random() * battleQuestions.length)];
        const choices = [...battleQuestion.choices];
        for (let i = choices.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        battlePrompt.textContent = battleQuestion.prompt;
        battleFeedback.textContent = "";
        battleChoices.forEach((button, index) => {
            button.textContent = String(choices[index]);
            button.dataset.answer = String(choices[index]);
            button.disabled = false;
        });
        player.vx = 0;
        clearMovementInput();
        battleMessage.hidden = false;
        gameState = "battle";
        battleChoices[0].focus();
    }

    function submitBattleAnswer(answer) {
        if (gameState !== "battle" || !activeBattle || !battleQuestion) return;
        battleChoices.forEach((button) => { button.disabled = true; });
        battleTimer = 0;

        if (answer === battleQuestion.answer) {
            activeBattle.defeated = true;
            activeBattle.defeatTime = 0;
            battleEffect = {
                x: 700,
                y: 330,
                elapsed: 0,
                text: "撃破！",
                screen: true,
            };
            battleFeedback.textContent = "正解！敵をたおした！";
            gameState = "attack";
            return;
        }

        const enemy = activeBattle;
        const playerWasLeft = player.x + player.w / 2 < enemy.x + enemy.w / 2;
        lives -= 1;
        player.invulnerable = 1.35;
        player.x = Math.max(0, Math.min(
            WORLD_WIDTH - player.w,
            playerWasLeft ? enemy.x - player.w - 8 : enemy.x + enemy.w + 8,
        ));
        player.y = 385;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * .36));
        updateHud();
        battleFeedback.textContent = "不正解！ライフが1つ減った";
        if (lives <= 0) {
            finish(false);
            return;
        }
        gameState = "miss";
    }

    function update(dt) {
        if (gameState === "battle") {
            elapsed += dt;
            return;
        }
        if (gameState === "attack" || gameState === "miss") {
            elapsed += dt;
            battleTimer += dt;
            if (battleEffect) {
                battleEffect.elapsed += dt;
                if (battleEffect.elapsed >= BATTLE_EFFECT_DURATION) battleEffect = null;
            }
            if (activeBattle?.defeated) activeBattle.defeatTime = battleTimer;
            if (battleTimer >= BATTLE_RESULT_DURATION) {
                if (gameState === "attack") enemies = enemies.filter((enemy) => enemy !== activeBattle);
                activeBattle = null;
                battleQuestion = null;
                battleEffect = null;
                battleMessage.hidden = true;
                clearMovementInput();
                gameState = "playing";
            }
            return;
        }
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
            if (enemy.defeated) continue;
            enemy.x += enemy.speed * enemy.direction * dt;
            if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.direction *= -1;
            if (overlaps(player, { x: enemy.x, y: 435, w: enemy.w, h: enemy.h })) {
                beginBattle(enemy);
                break;
            }
        }
        if (gameState !== "playing") return;

        for (const coin of coins) {
            if (!coin.collected && overlaps(player, { x: coin.x - 13, y: coin.y - 13, w: 26, h: 26 })) {
                coin.collected = true;
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

    function drawBattleScene() {
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, "#172443");
        sky.addColorStop(.52, "#637b9b");
        sky.addColorStop(1, "#d5b68f");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const light = ctx.createRadialGradient(480, 200, 30, 480, 200, 470);
        light.addColorStop(0, "rgba(255, 239, 193, .55)");
        light.addColorStop(1, "rgba(255, 239, 193, 0)");
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, WIDTH, 400);

        ctx.fillStyle = "rgba(32, 49, 77, .35)";
        ctx.beginPath();
        ctx.moveTo(0, 315);
        ctx.lineTo(115, 245);
        ctx.lineTo(245, 315);
        ctx.lineTo(380, 225);
        ctx.lineTo(535, 320);
        ctx.lineTo(700, 238);
        ctx.lineTo(855, 310);
        ctx.lineTo(960, 255);
        ctx.lineTo(960, 390);
        ctx.lineTo(0, 390);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#34445a";
        ctx.beginPath();
        ctx.moveTo(0, 350);
        ctx.quadraticCurveTo(240, 318, 470, 355);
        ctx.quadraticCurveTo(735, 392, 960, 345);
        ctx.lineTo(960, HEIGHT);
        ctx.lineTo(0, HEIGHT);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 231, 183, .6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 350);
        ctx.quadraticCurveTo(240, 318, 470, 355);
        ctx.quadraticCurveTo(735, 392, 960, 345);
        ctx.stroke();

        const compact = canvas.clientHeight < 280;
        if (compact) {
            ctx.fillStyle = "rgba(20, 32, 54, .3)";
            ctx.beginPath();
            ctx.ellipse(270, 148, 105, 18, -.08, 0, Math.PI * 2);
            ctx.ellipse(725, 148, 86, 15, .06, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(20, 32, 54, .3)";
        ctx.beginPath();
        ctx.ellipse(270, compact ? 148 : 398, 88, 16, -.08, 0, Math.PI * 2);
        ctx.ellipse(725, compact ? 148 : 398, 74, 14, .06, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 231, 183, .28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(270, compact ? 148 : 398, 100, 19, -.08, 0, Math.PI * 2);
        ctx.ellipse(725, compact ? 148 : 398, 86, 17, .06, 0, Math.PI * 2);
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 15px sans-serif";
        ctx.fillStyle = "#fff4d8";
        if (!compact) {
            ctx.fillText("ぼうけんしゃ", 270, 135);
            ctx.fillText("スライム", 725, 170);
        }

        const playerScale = 2.7;
        ctx.save();
        const playerTop = compact ? 0 : 155;
        ctx.translate(205 - (player.x - cameraX) * playerScale, playerTop - player.y * playerScale);
        ctx.scale(playerScale, playerScale);
        drawPlayer(true);
        ctx.restore();

        const enemyScale = 2.7;
        ctx.save();
        const enemyTop = compact ? 8 : 190;
        ctx.translate(685 - (activeBattle.x - cameraX) * enemyScale, enemyTop - 435 * enemyScale);
        ctx.scale(enemyScale, enemyScale);
        drawEnemy(activeBattle);
        ctx.restore();

        if (gameState === "attack") drawBattleEffect();
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

    function drawCoin(coin) {
        if (coin.collected) return;
        const x = coin.x - cameraX;
        const bob = Math.sin(elapsed * 3 + coin.x) * 4;
        const width = .72 + Math.abs(Math.sin(elapsed * 4 + coin.x)) * .28;
        ctx.save();
        ctx.translate(x, coin.y + bob);
        ctx.scale(width, 1);
        ctx.shadowColor = "rgba(255, 195, 66, .7)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#e89a2e";
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff0a1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#fff0a1";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("¥", 0, 1);
        ctx.restore();
    }

    function drawEnemy(enemy) {
        let x = enemy.x - cameraX;
        let y = 435;
        ctx.save();
        if (enemy.defeated) {
            const progress = Math.min(1, enemy.defeatTime / BATTLE_RESULT_DURATION);
            ctx.globalAlpha = 1 - progress;
            ctx.translate(x + enemy.w / 2, y + enemy.h / 2 - progress * 26);
            ctx.rotate(progress * 2);
            ctx.scale(1 - progress * .65, 1 - progress * .65);
            x = -enemy.w / 2;
            y = -enemy.h / 2;
        }
        ctx.fillStyle = "#db6f73";
        roundedRect(x, y, enemy.w, enemy.h, 12);
        ctx.fill();
        ctx.fillStyle = "#f5a298";
        roundedRect(x + 4, y + 3, enemy.w - 8, 8, 5);
        ctx.fill();
        ctx.fillStyle = "#283047";
        ctx.beginPath();
        ctx.arc(x + 11, y + 13, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 23, y + 13, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBattleEffect() {
        if (!battleEffect || battleEffect.elapsed >= BATTLE_EFFECT_DURATION) return;
        const progress = battleEffect.elapsed / BATTLE_EFFECT_DURATION;
        const alpha = 1 - progress;
        const scale = .65 + progress * .7;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(battleEffect.x - (battleEffect.screen ? 0 : cameraX), battleEffect.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = "#fff2a6";
        ctx.strokeStyle = "#f7b84d";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 12; i += 1) {
            const angle = -Math.PI / 2 + i * Math.PI / 6;
            const radius = i % 2 === 0 ? 20 : 10;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.lineCap = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(-16, -14);
        ctx.lineTo(16, 14);
        ctx.moveTo(16, -14);
        ctx.lineTo(-16, 14);
        ctx.stroke();

        ctx.font = "bold 17px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#344365";
        ctx.strokeText(battleEffect.text, 0, -31 - progress * 12);
        ctx.fillStyle = "#fff";
        ctx.fillText(battleEffect.text, 0, -31 - progress * 12);
        ctx.restore();
    }

    function drawPlayer(ignoreInvulnerability = false) {
        if (!ignoreInvulnerability && player.invulnerable > 0 && Math.floor(elapsed * 13) % 2 === 0) return;
        const x = player.x - cameraX;
        const y = player.y;
        ctx.fillStyle = "rgba(30, 44, 67, .18)";
        ctx.beginPath();
        ctx.ellipse(x + player.w / 2, Math.min(458, y + player.h + 3), 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const moving = player.grounded && player.vx !== 0;
        const running = moving ? Math.sin(elapsed * 14) * 3 : 0;
        const idle = player.grounded ? Math.sin(elapsed * 3) * .7 : 0;
        ctx.save();
        ctx.translate(x + (player.facing < 0 ? player.w : 0), y + idle);
        ctx.scale(player.facing, 1);

        // 流れるマフラー
        ctx.fillStyle = "#efbd54";
        ctx.beginPath();
        ctx.moveTo(8, 21);
        ctx.quadraticCurveTo(-2 - running * .35, 24, -8 - running * .6, 18 + running);
        ctx.lineTo(-5 - running * .4, 14);
        ctx.quadraticCurveTo(3, 16, 12, 17);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffe18a";
        ctx.fillRect(9, 19, 16, 4);

        // 袖と腕
        ctx.fillStyle = "#263a5c";
        ctx.save();
        ctx.translate(7, 29);
        ctx.rotate((-running - 4) * Math.PI / 180);
        roundedRect(-3, 0, 8, 17, 4);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#38598a";
        ctx.save();
        ctx.translate(26, 29);
        ctx.rotate((running - 2) * Math.PI / 180);
        roundedRect(-2, 0, 8, 17, 4);
        ctx.fill();
        ctx.restore();

        // グローブ
        ctx.fillStyle = "#d9e5f3";
        ctx.beginPath();
        ctx.arc(5, 44, 4.2, 0, Math.PI * 2);
        ctx.arc(28, 43 + (running < 0 ? 2 : 0), 4.2, 0, Math.PI * 2);
        ctx.fill();

        // ジャケット
        ctx.shadowColor = "rgba(20, 35, 58, .38)";
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = "#365c8d";
        roundedRect(4, 17, 27, 25, 8);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#527faf";
        ctx.beginPath();
        ctx.moveTo(7, 20);
        ctx.quadraticCurveTo(17, 16, 28, 20);
        ctx.lineTo(25, 38);
        ctx.lineTo(8, 38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f4ca69";
        ctx.fillRect(17, 20, 2, 18);
        ctx.fillStyle = "#243c60";
        ctx.beginPath();
        ctx.moveTo(17, 27);
        ctx.lineTo(25, 31);
        ctx.lineTo(17, 34);
        ctx.closePath();
        ctx.fill();

        // 顔と髪
        ctx.fillStyle = "#f1c39a";
        roundedRect(6, 5, 23, 18, 8);
        ctx.fill();
        ctx.fillStyle = "#17263f";
        ctx.beginPath();
        ctx.moveTo(5, 11);
        ctx.quadraticCurveTo(7, 0, 17, 1);
        ctx.quadraticCurveTo(26, -2, 31, 9);
        ctx.lineTo(28, 14);
        ctx.quadraticCurveTo(21, 7, 13, 10);
        ctx.quadraticCurveTo(9, 13, 5, 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#263750";
        ctx.beginPath();
        ctx.moveTo(10, 2);
        ctx.quadraticCurveTo(17, 7, 27, 4);
        ctx.quadraticCurveTo(24, 0, 16, 0);
        ctx.closePath();
        ctx.fill();

        // 強気な目・鼻・頬
        ctx.fillStyle = "#dfe9f5";
        ctx.beginPath();
        ctx.moveTo(21, 12);
        ctx.quadraticCurveTo(25, 11, 28, 14);
        ctx.quadraticCurveTo(25, 17, 21, 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#17233a";
        ctx.beginPath();
        ctx.arc(25, 14, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9ed0ed";
        ctx.beginPath();
        ctx.arc(24.9, 13.8, .7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d89b82";
        ctx.fillRect(28, 18, 3, 1);

        // ヘッドギア
        ctx.fillStyle = "#557eb1";
        ctx.beginPath();
        ctx.moveTo(5, 7);
        ctx.quadraticCurveTo(13, 0, 26, 5);
        ctx.lineTo(29, 9);
        ctx.quadraticCurveTo(17, 4, 7, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#8fb1da";
        ctx.fillRect(11, 3, 11, 2);

        // 動きのあるブーツ
        ctx.fillStyle = "#202d45";
        ctx.save();
        ctx.translate(9, 41);
        ctx.rotate((-running * .8) * Math.PI / 180);
        roundedRect(-4, 0, 14, 7, 3);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(25, 41);
        ctx.rotate((running * .8) * Math.PI / 180);
        roundedRect(-4, 0, 14, 7, 3);
        ctx.fill();
        ctx.restore();

        ctx.restore();
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
        if (gameState === "battle" || gameState === "attack" || gameState === "miss") {
            drawBattleScene();
            return;
        }
        const shake = battleEffect
            ? Math.sin(battleEffect.elapsed * 70) * (1 - battleEffect.elapsed / BATTLE_EFFECT_DURATION) * 4
            : 0;
        ctx.save();
        ctx.translate(shake, -shake * .35);
        drawBackground();
        drawPlatforms();
        for (const coin of coins) drawCoin(coin);
        for (const enemy of enemies) drawEnemy(enemy);
        drawGoal();
        drawPlayer();
        drawBattleEffect();
        ctx.restore();
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
    battleChoices.forEach((button) => {
        button.addEventListener("click", () => submitBattleAnswer(Number(button.dataset.answer)));
    });
    resetGame();
    requestAnimationFrame(frame);
})();
