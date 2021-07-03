"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse_to_bytes = void 0;
/** Parse a size string into the byte equivalent */
function parse_to_bytes(str) {
    if (typeof str === 'number')
        return str;
    const size = parseInt(str, 10);
    const size_key = str.replace(/^[0-9]+/, '').toLowerCase();
    switch (size_key) {
        case 'gb':
            return size * 1E9;
        case 'mb':
            return size * 1E6;
        case 'kb':
            return size * 1E3;
        case 'b':
        default:
            return size;
    }
}
exports.parse_to_bytes = parse_to_bytes;
//# sourceMappingURL=parse_to_bytes.js.map