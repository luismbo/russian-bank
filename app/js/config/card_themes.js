// Available card themes. Each theme is a folder below app/img/cards containing the
// 52 cards (<1..52>.<ext>) plus the two card backs (b1fv.<ext> / b2fv.<ext>).
export const CARD_THEMES = ["modern", "plain", "minimal", "classic", "fourcolour", "ghost", "blue"];
export const DEFAULT_CARD_THEME = "modern";

// Themes whose images are bitmaps instead of SVGs:
const PNG_CARD_THEMES = ["modern"];

export function getCardImageExtension(cardTheme) {
    return PNG_CARD_THEMES.indexOf(cardTheme) !== -1 ? ".png" : ".svg";
}
