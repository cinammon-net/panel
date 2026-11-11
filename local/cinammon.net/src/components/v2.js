/**
 * Discord Components V2 Flags y Constantes Oficiales
 */
const IS_COMPONENTS_V2 = 1 << 15; // 32768

const ComponentType = {
    ACTION_ROW: 1,
    BUTTON: 2,
    STRING_SELECT: 3,
    SECTION: 9,
    TEXT_DISPLAY: 10,
    THUMBNAIL: 11,
    MEDIA_GALLERY: 12,
    FILE: 13,
    SEPARATOR: 14,
    CONTAINER: 17,
};

const ButtonStyle = {
    PRIMARY: 1,
    SECONDARY: 2,
    SUCCESS: 3,
    DANGER: 4,
    LINK: 5,
};

function v2Text(content) {
    return {
        type: ComponentType.TEXT_DISPLAY,
        content,
    };
}

function v2Separator(divider = true, spacing = 1) {
    return {
        type: ComponentType.SEPARATOR,
        divider,
        spacing,
    };
}

function v2Section(markdownLines, buttonAccessory) {
    const texts = (Array.isArray(markdownLines) ? markdownLines : [markdownLines]).slice(0, 3).map((t) => v2Text(t));
    return {
        type: ComponentType.SECTION,
        components: texts,
        accessory: buttonAccessory,
    };
}

function v2Button({ label, custom_id, style = ButtonStyle.PRIMARY, url = null, emoji = null }) {
    const btn = {
        type: ComponentType.BUTTON,
        style: url ? ButtonStyle.LINK : style,
        label,
    };
    if (url) {
        btn.url = url;
    } else {
        btn.custom_id = custom_id;
    }
    if (emoji) {
        btn.emoji = typeof emoji === 'string' ? { name: emoji } : emoji;
    }
    return btn;
}

function v2ActionRow(buttons) {
    return {
        type: ComponentType.ACTION_ROW,
        components: buttons,
    };
}

function v2Container({ accentColor = 0x06b6d4, children = [] }) {
    return {
        flags: IS_COMPONENTS_V2,
        components: [
            {
                type: ComponentType.CONTAINER,
                accent_color: accentColor,
                spoiler: false,
                components: children,
            },
        ],
    };
}

module.exports = {
    IS_COMPONENTS_V2,
    ComponentType,
    ButtonStyle,
    v2Text,
    v2Separator,
    v2Section,
    v2Button,
    v2ActionRow,
    v2Container,
};

