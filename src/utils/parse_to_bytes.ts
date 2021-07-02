/** Parse a size string into the byte equivalent */
export function parse_to_bytes(str: (string|number)): number {
  if (typeof str === 'number') return str;

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