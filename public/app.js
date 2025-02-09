"use strict";
// HTML References.
const container = document.getElementById("keys");

/*
 * TODO: 
 * [ ] 1. make divs float (rotate with sin + move up and down)
 * [x] 2. Option to enable multiplier x23
 * [x] 3. Adding your own keyrepeat rate (or get it somehow)
 * [ ] 4. Make shift be a separate config that you can set to just be the big version of letter
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

    if (config.options.enableRepeat === true) {
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
    lastKey: "",
    modifiers: [],
    modChanged: true,
    repeat: 1,
    repeatStarted: new Date(),
    repeatLast: new Date(),
    repeatPastDelay: false,
    repeatComboString: "",
    prevElement: null,
    keyDown: false,
    keys: []
};

function isCommon(keyName) {
    return COMMONS.includes(keyName);
}

function createDisplayText(parsedKey) {
    let displayText = "";
    data.modifiers = data.modifiers.sort(sortModifiers);

    for (const mod of data.modifiers) {
        displayText += mapKey(mod, data.modifiers) + " + ";
    }
    displayText += parsedKey;
    return displayText;

}

function createNewBlock(parsedKey) {
    const keyElement = document.createElement("div");
    keyElement.classList.add("key");
    applyConfigStyling(keyElement);

    keyElement.innerText += createDisplayText(parsedKey);

    data.keys.push(keyElement);
    container.appendChild(keyElement);
    data.prevElement = keyElement;

    if (data.keys.length > 20) {
        data.keys.shift().remove();
    }
}

function updateRepeatComboString() {
    if (config.options.comboRepeat) {
        let ln = data.repeatComboString.length;

        if (ln === 0 && config.options.separateRepeats) {
            let parsedLastKey = mapKey(data.lastKey);
            let lastKeyText = createDisplayText(parsedLastKey)
            let keyLength = lastKeyText.length;
            if (keyLength < data.prevElement.innerText.length) {
                data.prevElement.innerText =
                    data.prevElement.innerText.substring(0, data.prevElement.innerText.length - parsedLastKey.length);
                createNewBlock(parsedLastKey);
            }
        }
        data.repeatComboString = " x" + data.repeat;
        data.prevElement.innerText = 
            data.prevElement.innerText.substring(0, data.prevElement.innerText.length - ln) +
                data.repeatComboString;
    }
}

function repeatKeys() {
    if (data.keyDown) {
        if (data.modChanged === true) {
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
                data.repeatPastDelay = true;
                newLast = new Date(data.repeatLast.valueOf() + config.options.repeatDelay);
            }

            let msDiff = rn - newLast - config.options.repeatDelay;
            let rep = Math.floor(msDiff / config.options.repeatRate);
            newLast = new Date(newLast.valueOf() + rep * config.options.repeatRate);
            if (rep > 0) {
                editOutput = true;
                data.repeat += rep;
            }
            data.repeatPastDelay = true;
        }
        data.repeatLast = newLast;
        if (editOutput) {
            updateRepeatComboString();
        }
    }
}


function mapKey(keyName, modifiers) {
    let shiftPressed = false;
    if (data.modifiers.includes("Shift_L") || data.modifiers.includes("Shift_R")) {
        shiftPressed = true;
    }

    let mapped = config.keyMapping[keyName];
    if (mapped) {
        return mapped;
    }

    if (shiftPressed) {
        let mappedShift = config.shiftKey[keyName];
        if (mappedShift) {
            return mappedShift;
        }
    } else if (keyName.length === 1) {
        let charVal = keyName.charCodeAt(0);
        if (64 < charVal && charVal < 91) {
            return String.fromCharCode(keyName.charCodeAt(0) + 32);
        }
    }
    return keyName;
}

function onKeyPress(keyName) {
    if (config.modifierKeys.hasOwnProperty(keyName)) {
        data.modChanged = true;
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
            updateRepeatComboString();
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

    if (data.prevElement.innerText.length > config.options.maxLength) {
        data.modChanged = true;
    } else {
        data.modChanged = false;
    }
    data.lastKey = keyName;
    data.keyDown = true;
}

function onKeyRelease(keyName) {
    let index = data.modifiers.indexOf(keyName);
    if (index !== -1) {
        data.modifiers.splice(index, 1);
        data.modChanged = true;
    } else {
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

