export const palette = [
    "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3",
    "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd",
    "#ccebc5", "#ffed6f"
];

export const trial_colors = [
    "#2f4f4f", "#ff8c00", "#ffff00", "#00ff00", "#9400d3",
    "#00ffff", "#1e90ff", "#ff1493", "#ffdab9", "#228b22",
];

export const trial_colors_text = [
    "#ffffff", "#000000", "#000000", "#000000", "#ffffff",
    "#000000", "#ffffff", "#ffffff", "#000000", "#ffffff",
];

export const colorNameToHex = (color: string): string => {
    const colors: Record<string, string> = {
        white: "#ffffff",
        darkred: "#8b0000",
        darkblue: "#00008b",
        red: "#ff0000",
        blue: "#0000ff",
        green: "#008000"
    };
    return colors[color.toLowerCase()] || color;
};

export const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
};

export const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const interpolate = (color1: string, color2: string, factor: number) => {
    const rgb1 = hexToRgb(colorNameToHex(color1));
    const rgb2 = hexToRgb(colorNameToHex(color2));
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    return rgbToHex(r, g, b);
};

export const pearsonSkewness = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (3 * (mean - median)) / stdDev;
};

export const modulo = (n: number, m: number): number =>
    ((n % m) + m) % m;