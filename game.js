(function () {
    "use strict";

    var SAVE_KEY = "brainrot_clicker_save_v1";
    var TIERS = [
        { name: "Wooden", image: "graphics/ttts_wooden.png", unlockRequirement: 0 },
        { name: "Golden", image: "graphics/ttts_golden.png", unlockRequirement: 5000 },
        { name: "Diamond", image: "graphics/ttts_diamond.png", unlockRequirement: 60000 }
    ];
    var CLICKERS = {
        standard: { cost: 50, clicksPerSecond: 1 },
        platinum: { cost: 400, clicksPerSecond: 10 }
    };
    var state = {
        coins: 0,
        tierIndex: 0,
        clickers: {
            standard: 0,
            platinum: 0
        }
    };

    var coinCountEl = document.getElementById("coin-count");
    var tierLineEl = document.getElementById("tier-line");
    var gameArea = document.getElementById("game-area");
    var target = document.getElementById("target");
    var targetImg = document.getElementById("target-image");
    var effectsLayer = document.getElementById("effects");
    var standardOwnedEl = document.getElementById("standard-owned");
    var platinumOwnedEl = document.getElementById("platinum-owned");
    var standardCostEl = document.getElementById("standard-cost");
    var platinumCostEl = document.getElementById("platinum-cost");
    var buyStandardBtn = document.getElementById("buy-standard");
    var buyPlatinumBtn = document.getElementById("buy-platinum");
    var nextTierImageEl = document.getElementById("next-tier-image");
    var prestigeNameEl = document.getElementById("prestige-name");
    var prestigeRequirementEl = document.getElementById("prestige-requirement");
    var prestigeEffectEl = document.getElementById("prestige-effect");
    var prestigeBtn = document.getElementById("prestige-btn");
    var prestigePreviewEl = document.getElementById("prestige-preview");
    var autoCpsEl = document.getElementById("auto-cps");
    var prestigeContentEl = document.getElementById("prestige-content");
    var pendingManualCoins = 0;
    var pendingAutoCoins = 0;
    var lastManualPointer = null;
    var lastAutoPulseAt = 0;

    standardCostEl.textContent = String(CLICKERS.standard.cost);
    platinumCostEl.textContent = String(CLICKERS.platinum.cost);

    function formatNumber(value) {
        return Math.floor(value).toLocaleString("en-US");
    }

    function getClickValue() {
        return Math.pow(2, state.tierIndex);
    }

    function getCurrentTier() {
        return TIERS[state.tierIndex];
    }

    function getNextTier() {
        return TIERS[state.tierIndex + 1] || null;
    }

    function getNextTierRequirement() {
        var nextTier = getNextTier();
        if (!nextTier || !Number.isFinite(nextTier.unlockRequirement)) {
            return null;
        }
        return nextTier.unlockRequirement;
    }

    function getAutoClicksPerSecond() {
        return state.clickers.standard * CLICKERS.standard.clicksPerSecond +
            state.clickers.platinum * CLICKERS.platinum.clicksPerSecond;
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(SAVE_KEY);
            if (!raw) {
                return;
            }
            var parsed = JSON.parse(raw);
            if (parsed && Number.isFinite(parsed.coins) && parsed.coins >= 0) {
                state.coins = Math.floor(parsed.coins);
            }
            if (parsed && Number.isInteger(parsed.tierIndex) && parsed.tierIndex >= 0 && parsed.tierIndex < TIERS.length) {
                state.tierIndex = parsed.tierIndex;
            } else if (parsed && typeof parsed.selectedVariant === "string") {
                if (parsed.selectedVariant === "wooden") {
                    state.tierIndex = 0;
                } else if (parsed.selectedVariant === "golden") {
                    state.tierIndex = 1;
                } else if (parsed.selectedVariant === "diamond") {
                    state.tierIndex = 2;
                }
            }

            if (parsed && parsed.clickers && typeof parsed.clickers === "object") {
                if (Number.isFinite(parsed.clickers.standard) && parsed.clickers.standard >= 0) {
                    state.clickers.standard = Math.floor(parsed.clickers.standard);
                }
                if (Number.isFinite(parsed.clickers.platinum) && parsed.clickers.platinum >= 0) {
                    state.clickers.platinum = Math.floor(parsed.clickers.platinum);
                }
            }
        } catch (err) {
            console.warn("Could not load save data.", err);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn("Could not save data.", err);
        }
    }

    function render() {
        var currentTier = getCurrentTier();
        var nextTier = getNextTier();
        var clickValue = getClickValue();
        var autoCps = getAutoClicksPerSecond();

        coinCountEl.textContent = formatNumber(state.coins);
        tierLineEl.textContent = "Tier: " + currentTier.name + " | Click Power: x" + clickValue;
        standardOwnedEl.textContent = String(state.clickers.standard);
        platinumOwnedEl.textContent = String(state.clickers.platinum);
        autoCpsEl.textContent = formatNumber(autoCps);
        buyStandardBtn.disabled = state.coins < CLICKERS.standard.cost;
        buyPlatinumBtn.disabled = state.coins < CLICKERS.platinum.cost;

        if (!nextTier) {
            prestigeContentEl.innerHTML = "<p class=\"prestige-meta\">Max tier reached.</p>";
            return;
        }

        var req = getNextTierRequirement();
        var unlocked = req !== null && state.coins >= req;

        nextTierImageEl.src = nextTier.image;
        nextTierImageEl.alt = nextTier.name + " tier preview";
        prestigeNameEl.textContent = "Next: " + nextTier.name;
        prestigeRequirementEl.textContent = "Requires: " + formatNumber(req) + " coins";
        prestigeEffectEl.textContent = "On prestige: remove clickers, click value doubles.";
        prestigeBtn.disabled = !unlocked;
        prestigePreviewEl.classList.toggle("unlocked", unlocked);
    }

    function pulseTarget() {
        target.classList.remove("pulse");
        void target.offsetWidth;
        target.classList.add("pulse");
    }

    function updateTargetSize() {
        var naturalWidth = targetImg.naturalWidth || 435;
        var naturalHeight = targetImg.naturalHeight || 1022;
        var areaRect = gameArea.getBoundingClientRect();
        var maxWidth = areaRect.width * 0.9;
        var maxHeight = areaRect.height * 0.9;
        var scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);

        if (!Number.isFinite(scale) || scale <= 0) {
            return;
        }

        target.style.width = Math.round(naturalWidth * scale) + "px";
        target.style.height = Math.round(naturalHeight * scale) + "px";
    }

    function refreshTierTargetImage() {
        var tier = getCurrentTier();
        targetImg.src = tier.image;
        targetImg.alt = tier.name + " target";
        if (targetImg.complete) {
            updateTargetSize();
        } else {
            targetImg.addEventListener("load", updateTargetSize, { once: true });
        }
    }

    function getAnimationChunkSize(pending) {
        if (pending >= 50000) {
            return 10000;
        }
        if (pending >= 10000) {
            return 2500;
        }
        if (pending >= 2000) {
            return 500;
        }
        if (pending >= 500) {
            return 100;
        }
        if (pending >= 100) {
            return 50;
        }
        if (pending >= 20) {
            return 10;
        }
        return 1;
    }

    function queueCoinAnimation(amount, source, evt) {
        var wholeAmount = Math.floor(amount);
        var wasIdle = pendingManualCoins === 0 && pendingAutoCoins === 0;
        if (!Number.isFinite(wholeAmount) || wholeAmount <= 0) {
            return;
        }

        if (source === "auto") {
            pendingAutoCoins += wholeAmount;
        } else {
            pendingManualCoins += wholeAmount;
            var hasPointerCoords = evt && evt.detail !== 0 && Number.isFinite(evt.clientX) && Number.isFinite(evt.clientY);
            if (hasPointerCoords) {
                lastManualPointer = {
                    clientX: evt.clientX,
                    clientY: evt.clientY
                };
            }
        }

        if (source !== "auto" && wasIdle) {
            processCoinAnimationQueue();
        }
    }

    function processCoinAnimationQueue() {
        var spawnedAutoFx = false;

        if (pendingManualCoins > 0) {
            var manualChunk = Math.min(pendingManualCoins, getAnimationChunkSize(pendingManualCoins));
            pendingManualCoins -= manualChunk;
            spawnFlyingCoin({
                amount: manualChunk,
                source: "manual",
                pointer: lastManualPointer
            });
        }

        if (pendingAutoCoins > 0) {
            var autoChunk = Math.min(pendingAutoCoins, getAnimationChunkSize(pendingAutoCoins));
            pendingAutoCoins -= autoChunk;
            spawnFlyingCoin({
                amount: autoChunk,
                source: "auto"
            });
            spawnedAutoFx = true;
        }

        if (spawnedAutoFx) {
            var now = Date.now();
            if (now - lastAutoPulseAt >= 180) {
                pulseTarget();
                lastAutoPulseAt = now;
            }
        }
    }

    function spawnFlyingCoin(options) {
        options = options || {};
        var rect = gameArea.getBoundingClientRect();
        var targetRect = target.getBoundingClientRect();
        var amount = Math.max(1, Math.floor(options.amount || 1));
        var isStack = amount >= 10;
        var size = isStack ? (amount >= 1000 ? 56 : amount >= 100 ? 48 : 42) : 34;
        var centerX = targetRect.left + targetRect.width / 2;
        var centerY = targetRect.top + targetRect.height / 2;
        var startX = centerX;
        var startY = centerY;
        var source = options.source || "manual";

        if (source === "manual") {
            var pointer = options.pointer;
            var hasPointerCoords = pointer && Number.isFinite(pointer.clientX) && Number.isFinite(pointer.clientY);
            startX = hasPointerCoords ? pointer.clientX : centerX;
            startY = hasPointerCoords ? pointer.clientY : centerY;
        } else {
            startX = centerX + (Math.random() - 0.5) * Math.min(targetRect.width * 0.4, 120);
            startY = centerY + (Math.random() - 0.5) * Math.min(targetRect.height * 0.24, 80);
        }

        var coin = document.createElement("div");
        coin.className = "flying-coin";
        coin.style.width = size + "px";
        coin.style.height = size + "px";

        var coinImage = document.createElement("img");
        coinImage.src = isStack ? "graphics/coin_multiple.png" : "graphics/coin_single.png";
        coinImage.alt = "";
        coin.appendChild(coinImage);

        if (amount > 1) {
            var amountTag = document.createElement("span");
            amountTag.className = "coin-amount";
            amountTag.textContent = "x" + formatNumber(amount);
            coin.appendChild(amountTag);
        }

        effectsLayer.appendChild(coin);

        var x = startX - rect.left - size / 2;
        var y = startY - rect.top - size / 2;
        var vx = (Math.random() * 1.8 + (isStack ? 1.3 : 1.6)) * (Math.random() < 0.5 ? -1 : 1);
        var vy = -(Math.random() * 2 + (isStack ? 4.2 : 5.2));
        var gravity = 0.28;
        var floor = rect.height - size - 6;
        var bounces = 0;
        var opacity = 1;
        var fading = false;

        function frame() {
            vy += gravity;
            x += vx;
            y += vy;

            if (x < 0) {
                x = 0;
                vx = Math.abs(vx) * 0.75;
            } else if (x > rect.width - size) {
                x = rect.width - size;
                vx = -Math.abs(vx) * 0.75;
            }

            if (y >= floor) {
                y = floor;
                if (bounces < 1) {
                    bounces += 1;
                    vy = -Math.abs(vy) * 0.46;
                    vx *= 0.88;
                } else {
                    vy = 0;
                    vx *= 0.95;
                    fading = true;
                }
            }

            if (fading) {
                opacity -= isStack ? 0.04 : 0.05;
            }

            coin.style.transform = "translate(" + x + "px, " + y + "px)";
            coin.style.opacity = String(Math.max(opacity, 0));

            if (opacity <= 0) {
                coin.remove();
                return;
            }

            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    function onTargetClick(evt) {
        var gain = getClickValue();
        state.coins += gain;
        render();
        saveState();
        pulseTarget();
        queueCoinAnimation(gain, "manual", evt);
    }

    function buyClicker(type) {
        var cfg = CLICKERS[type];
        if (!cfg) {
            return;
        }
        if (state.coins < cfg.cost) {
            return;
        }
        state.coins -= cfg.cost;
        state.clickers[type] += 1;
        render();
        saveState();
    }

    function onPrestige() {
        var nextTier = getNextTier();
        var req = getNextTierRequirement();
        if (!nextTier) {
            return;
        }
        if (req === null || state.coins < req) {
            return;
        }

        state.tierIndex += 1;
        state.coins = 0;
        state.clickers.standard = 0;
        state.clickers.platinum = 0;
        pendingManualCoins = 0;
        pendingAutoCoins = 0;
        lastManualPointer = null;

        refreshTierTargetImage();
        render();
        saveState();
    }

    function runAutoClickers() {
        var autoClicks = getAutoClicksPerSecond();
        if (autoClicks <= 0) {
            return;
        }
        var gain = autoClicks * getClickValue();
        state.coins += gain;
        render();
        saveState();
        queueCoinAnimation(gain, "auto");
    }

    loadState();
    refreshTierTargetImage();
    render();
    window.addEventListener("resize", updateTargetSize);
    target.addEventListener("click", onTargetClick);
    buyStandardBtn.addEventListener("click", function () {
        buyClicker("standard");
    });
    buyPlatinumBtn.addEventListener("click", function () {
        buyClicker("platinum");
    });
    prestigeBtn.addEventListener("click", onPrestige);
    setInterval(runAutoClickers, 1000);
    setInterval(processCoinAnimationQueue, 140);
}());
