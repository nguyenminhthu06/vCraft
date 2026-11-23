// QR Model 2, version 5-L, byte mode, mask 0. Version 5-L uses one RS block.
function qrMatrix(value) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 106) return null;
  const bits = [];
  const append = (data, size) => {
    for (let i = size - 1; i >= 0; i--) bits.push((data >>> i) & 1);
  };
  append(4, 4);
  append(bytes.length, 8);
  for (const byte of bytes) append(byte, 8);
  append(0, 4);
  while (bits.length % 8) bits.push(0);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => byte * 2 + bit, 0));
  }
  for (let i = 0; codewords.length < 108; i++) codewords.push(i % 2 ? 17 : 236);

  function multiply(x, y) {
    let result = 0;
    while (y) {
      if (y & 1) result ^= x;
      y >>>= 1;
      x = (x << 1) ^ ((x & 128) ? 0x11d : 0);
    }
    return result;
  }

  let divisor = [1];
  for (let i = 0, root = 1; i < 26; i++, root = multiply(root, 2)) {
    divisor = [...divisor, 0].map((coefficient, j) => coefficient ^ multiply(divisor[j - 1] || 0, root));
  }
  const remainder = Array(26).fill(0);
  for (const byte of codewords) {
    const factor = byte ^ remainder.shift();
    remainder.push(0);
    for (let i = 0; i < remainder.length; i++) remainder[i] ^= multiply(divisor[i + 1], factor);
  }
  const data = [...codewords, ...remainder];
  const size = 37;
  const cells = Array.from({length: size}, () => Array(size).fill(null));
  const set = (x, y, dark) => {
    if (x >= 0 && x < size && y >= 0 && y < size) cells[y][x] = Number(dark);
  };
  for (let i = 0; i < size; i++) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }
  for (const [x, y] of [[3, 3], [33, 3], [3, 33]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(x + dx, y + dy, distance !== 2 && distance !== 4);
      }
    }
  }
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) set(30 + dx, 30 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const format = i => (0x77c4 >>> i) & 1;
  for (let i = 0; i <= 5; i++) set(8, i, format(i));
  set(8, 7, format(6));
  set(8, 8, format(7));
  set(7, 8, format(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, format(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, format(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, format(i));
  set(8, size - 8, true);

  let offset = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let i = 0; i < size; i++) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? size - 1 - i : i;
      for (const x of [right, right - 1]) {
        if (cells[y][x] !== null) continue;
        const bit = ((data[offset >>> 3] || 0) >>> (7 - (offset & 7))) & 1;
        set(x, y, bit ^ ((x + y) % 2 === 0));
        offset++;
      }
    }
  }
  return cells;
}

function qrImage(value) {
  const cells = qrMatrix(value);
  if (!cells) return '';
  const modules = cells.flatMap((row, y) => row.map((dark, x) => dark ? 'M' + (x + 4) + ',' + (y + 4) + 'h1v1h-1z' : '')).join('');
  return '<svg class="qr" viewBox="0 0 45 45" role="img" aria-label="Mã QR dẫn tới trang truy xuất của lô" shape-rendering="crispEdges"><rect width="45" height="45" fill="white"/><path d="' + modules + '"/></svg>';
}
