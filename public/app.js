// HTML References.
const container = document.getElementById("keys");

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
    prevElement: null,
    prevCommon: false,
    keys: []
};

function isCommon(keyName) {
    return COMMONS.includes(keyName);
}


function mapKey(keyName, modifiers) {
    let shiftPressed = false;
    if (modifiers.includes("Shift_L") || modifiers.includes("Shift_R")) {
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
            console.log("keycode!!");
            return String.fromCharCode(keyName.charCodeAt(0) + 32);
        }
    }
    return keyName;
}

function onKeyPress(keyName) {
    if (config.modifierKeys.hasOwnProperty(keyName)) {
        data.modChanged = true;
        data.prevCommon = false;
        data.modifiers.push(keyName);
        return;
    }
    let parsedKey = mapKey(keyName, data.modifiers);

    if (data.modChanged === true || data.prevCommon !== isCommon(parsedKey)) {
        const keyElement = document.createElement("div");
        keyElement.classList.add("key");
        applyConfigStyling(keyElement);

        data.modifiers = data.modifiers.sort(sortModifiers);

        for (const mod of data.modifiers) {
            keyElement.innerText += mapKey(mod, data.modifiers) + " + ";
        }
        keyElement.innerText += parsedKey;

        data.keys.push(keyElement);
        container.appendChild(keyElement);
        prevElement = keyElement;

        if (data.keys.length > 20) {
            data.keys.shift().remove();
        }
    } else {
        prevElement.innerText += parsedKey;
    }




    if (prevElement.innerText.length > 20) {
        data.modChanged = true;
    } else {
        data.modChanged = false;
    }
    data.prevCommon = isCommon(keyName);
    data.lastKey = keyName;
}

function onKeyRelease(keyName) {
    let index = data.modifiers.indexOf(keyName);
    if (index !== -1) {
        data.modifiers.splice(index, 1);
        data.modChanged = true;
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

