"use strict";
// HTML References.
const container = document.getElementById("keys");

/*
 * TODO: 
 * [x] 1. make divs float (rotate with sin + move up and down)
 * [x] 2. Option to enable multiplier x23
 * [x] 3. Adding your own keyrepeat rate (or get it somehow)
 * [x] 4. Make shift be a separate config that you can set to just be the big version of letter
 * [x] 5. Fix breakOnInput (it'll spam output)
 * [x] 6. Animation system
 */

// Config provider.
let config = {
    options: {
        rowLayout: "",
    },
    modifierKeys: [],
    keyMapping: {},
    keyStyle: {},
};

function setConfig(newConfig) {
    config = newConfig;

    container.classList.add(config.options.rowLayout);
    document.getElementById("wrapper").classList.add(config.options.rowLayout);

    animationJankSetup();
    if (config.options.enableRepeat === true) {
        data.repeatRateMs = 1000.0 / config.options.repeatRate;
        setInterval(repeatKeys, 17);
    }
}

fetch("/config.json")
    .then((res) => res.json())
    .then(setConfig);

// Mapping and utils.
const COMMONS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split("");

function applyStyleConfig(element, configKey, styleName = configKey) {
    const cfg = config["keyStyle"][configKey];
    if (cfg) {
        element.style[styleName] = cfg;
    }
}

function applyConfigStyling(element) {
    applyStyleConfig(element, "fontSize");
    applyStyleConfig(element, "textColor", "color");
    applyStyleConfig(element, "backgroundColor");
    applyStyleConfig(element, "borderRadius");
    applyStyleConfig(element, "padding");
}

function animationJankSetup() {
    data.animationStyles = config.options.animationStyle.split("-");

    let animations = [];
    let animationCompositions = [];

    if (data.animationStyles.includes("default")) {
        animationCompositions.push("replace");
        animations.push("anim-default 100ms ease-in forwards");
    }

    if (data.animationStyles.includes("shutter")) {
        animationCompositions.push("replace");
        animations.push("anim-shutter 100ms ease-in forwards");
    }

    if (data.animationStyles.includes("sway")) {
        animationCompositions.push("add");
        animations.push("anim-sway 10s linear infinite");
    }

    if (data.animationStyles.includes("float")) {
        animationCompositions.push("add");
        animations.push("anim-float 7s linear infinite");
    }
    data.animationStyleText = animations.map((anim) => anim).join(", ");
    data.animationCompositions = animationCompositions.map((comp) => comp).join(", ");

    // combos
    data.animationCombos = config.options.animationCombo.split("-");

    let combos = [];
    let comboCompositions = [];

    if (data.animationCombos.includes("combo")) {
        comboCompositions.push("accumulate");
        combos.push("anim-combo 1s ease-in-out both");
    }
    if (data.animationCombos.includes("shake")) {
        comboCompositions.push("add");
        combos.push("anim-shake 0.5s linear 2");
    }
    if (animations.length > 0) {
        data.animationCombosText += ", ";
        data.animationComboCompositions += ", ";
    }
    data.animationCombosText += combos.map((comb) => comb).join(", ");
    data.animationComboCompositions += comboCompositions.map((comp) => comp).join(", ");
}

function animationJank(element) {
    if (data.animationStyles.includes("default")) {
        element.style.opacity = 0;
    }
    if (data.animationStyles.includes("shutter")) {
        element.style.transform = "rotateX(-90deg)";
    }
    element.style.animation = data.animationStyleText;
    element.style["animation-composition"] = data.animationCompositions;
}

function animationComboJank() {
    let splitOnX = data.repeatComboString.split("x");

    if (splitOnX < 2) {
        return;
    }
    let oldVal = Number(splitOnX.slice(-1)[0]);
    if (oldVal === NaN) {
        return;
    }
    if (Math.floor(oldVal / 100) === Math.floor(data.repeat / 100)) {
        return;
    }
    data.prevElement.style.animation += data.animationCombosText;
    data.prevElement.style["animation-composition"] += data.animationComboCompositions;
}

const sortModifiers = (a, b) => {
    if (config.modifierKeys[a] > config.modifierKeys[b]) {
        return 1;
    }
    if (config.modifierKeys[a] < config.modifierKeys[b]) {
        return -1;
    }
    return 0;
}

const data = {
    animationStyles: [],
    animaitonStyleText: "",
    animationCompositions: "",
    animationCombos: [],
    animationCombosText: "",
    animationComboCompositions: "",
    lastKey: "",
    modifiers: [],
    modChanged: true,
    repeat: 1,
    repeatStarted: new Date(),
    repeatLast: new Date(),
    repeatPastDelay: false,
    repeatComboString: "",
    repeatRateMs: 10,
    prevElement: null,
    keyDown: false,
    shiftChanged: false,
    keys: []
};

function isCommon(keyName) {
    return COMMONS.includes(keyName);
}

function createDisplayText(parsedKey) {
    let displayText = "";
    data.modifiers = data.modifiers.sort(sortModifiers);

    for (const mod of data.modifiers) {
        if (config.options.shiftNotRealModifier === false || !(mod === "Shift_L" || mod === "Shift_R")) {
            displayText += mapKey(mod, data.modifiers) + " + ";
        }
    }
    displayText += parsedKey;
    return displayText;

}

function createNewBlock(parsedKey) {
    const keyElement = document.createElement("div");
    keyElement.classList.add("key");
    animationJank(keyElement);
    applyConfigStyling(keyElement);

    keyElement.innerText += createDisplayText(parsedKey);

    data.keys.push(keyElement);
    container.appendChild(keyElement);
    data.prevElement = keyElement;

    if (data.keys.length > config.options.maxElements) {
        data.keys.shift().remove();
    }
}

function updateRepeatOutput() {
    let parsedLastKey = mapKey(data.lastKey);

    if (config.options.comboRepeat) {
        let ln = data.repeatComboString.length;

        if (config.options.shiftNotRealModifier && data.shiftChanged) {
            data.shiftChanged = false;
            data.repeat = 1;
            createNewBlock(parsedLastKey);
            data.repeatComboString = "";
            ln = 0;
        } else if (ln === 0 && config.options.separateRepeats) {
            let lastKeyText = createDisplayText(parsedLastKey)
            let keyLength = lastKeyText.length;
            if (keyLength < data.prevElement.innerText.length) {
                data.prevElement.innerText =
                    data.prevElement.innerText.substring(0, data.prevElement.innerText.length - parsedLastKey.length);
                createNewBlock(parsedLastKey);
            }
        }
        if (data.repeat > 1) {
            animationComboJank();

            data.repeatComboString = " x" + data.repeat;
            data.prevElement.innerText = 
                data.prevElement.innerText.substring(0, data.prevElement.innerText.length - ln) +
                    data.repeatComboString;
        }
    } else {
        breakIfNeeded(data.lastKey, parsedLastKey);
        if (data.modChanged === true) {
            createNewBlock(parsedLastKey);
            data.modChanged = false;
        } else {
            data.prevElement.innerText += parsedLastKey;
        }
    }
}

function repeatKeys() {
    if (data.keyDown) {
        if (data.modChanged === true && !config.breakOnInput.includes(data.lastKey)) {
            handleKeyPress(data.lastKey);
        }
        let rn = Date.now();
        let newLast = new Date(data.repeatLast.getTime());
        let didDelay = rn - data.repeatStarted - config.options.repeatDelay;

        let editOutput = false;

        if (didDelay > 0) {
            if (!data.repeatPastDelay) {
                data.repeat++;
                editOutput = true;
                newLast = new Date(data.repeatLast.valueOf() + config.options.repeatDelay);
            }

            let msDiff = rn - newLast;
            let rep = Math.floor(msDiff / data.repeatRateMs);
            newLast = new Date(newLast.valueOf() + rep * data.repeatRateMs);
            if (rep > 0) {
                editOutput = true;
                data.repeat += rep;
            }
            data.repeatPastDelay = true;
        }
        data.repeatLast = newLast;
        if (editOutput) {
            updateRepeatOutput();
        }
    }
}


function mapKey(keyName, modifiers) {
    let shiftHeld = false;
    if (data.modifiers.includes("Shift_L") || data.modifiers.includes("Shift_R")) {
        shiftHeld = true;
    }

    let mapped = config.keyMapping[keyName];
    if (mapped) {
        return mapped;
    }

    if (shiftHeld) {
        let mappedShift = config.shiftKey[keyName];
        if (mappedShift) {
            return mappedShift;
        }
    } else if (keyName.length === 1) {
        return keyName.toLowerCase();
    }
    return keyName;
}

function onKeyPress(keyName) {
    if (config.modifierKeys.hasOwnProperty(keyName)) {
        if (!(config.options.shiftNotRealModifier && (keyName === "Shift_L" || keyName === "Shift_R"))) {
            data.modChanged = true;
        } else {
            data.shiftChanged = true;
        }
        data.modifiers.push(keyName);
        return;
    }

    if (config.options.enableRepeat) {
        if (data.repeat > 1 && keyName !== data.lastKey) {
            data.modChanged = true;
        }
    }
    handleKeyPress(keyName);
}

function breakIfNeeded(keyName, parsedKey) {
    if ((data.prevElement.innerText.length + parsedKey.length) > config.options.maxLength || config.breakOnInput.includes(keyName)) {
        data.modChanged = true;
    } else {
        data.modChanged = false;
    }
}

function handleKeyPress(keyName) {
    let parsedKey = mapKey(keyName, data.modifiers);

    if (data.modChanged === true) {
        createNewBlock(parsedKey);

        data.repeat = 1;
        data.repeatComboString = "";

    }

    // repeat
    if (config.options.enableRepeat) {
        if (keyName === data.lastKey && data.modChanged === false) {
            data.repeat++;
            data.repeatStarted = new Date(Date.now());
            data.repeatLast = new Date(Date.now());
            data.repeatPastDelay = false;
            updateRepeatOutput();
        } else {
            if (data.modChanged === false) {
                data.prevElement.innerText += parsedKey;
            }
            data.repeat = 1;
            data.repeatComboString = "";
            data.repeatStarted = new Date(Date.now());
            data.repeatLast = new Date(Date.now());
            data.repeatPastDelay = false;
        }
    } else {
        if (data.modChanged === false) {
            data.prevElement.innerText += parsedKey;
        }
    }
    breakIfNeeded(keyName, parsedKey);

    data.lastKey = keyName;
    data.keyDown = true;
}

function onKeyRelease(keyName) {
    let index = data.modifiers.indexOf(keyName);
    if (index !== -1) {
        data.modifiers.splice(index, 1);
        if (!(config.options.shiftNotRealModifier && (keyName === "Shift_L" || keyName === "Shift_R"))) {
            data.modChanged = true;
        } else {
            data.shiftChanged = true;
        }
    } else if (data.lastKey == keyName) {
        data.keyDown = false;
    }
}

// Socket connection.
const socket = io();

socket.on("connect", () => {
    console.log("Connected socket to backend.");
});

socket.on("input", (packet) => {
    const split = packet.split(" ");
    const key = split[0];
    const press_type = split[1];

    if (press_type == "1") {
        onKeyPress(key);
    } else if (press_type == "0") {
        onKeyRelease(key);
    }
});

