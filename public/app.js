"use strict";
// HTML References.
const container = document.getElementById("keys");

/*
 * TODO: 
 * [ ] 1. make divs float (rotate with sin + move up and down)
 * [x] 2. Option to enable multiplier x23
 * [x] 3. Adding your own keyrepeat rate (or get it somehow)
 * [x] 4. Make shift be a separate config that you can set to just be the big version of letter
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

