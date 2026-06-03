// 把 spec.html 当不可信纯文本：仅用正则定位数据岛、JSON.parse 还原。绝不执行其 HTML/JS。
const ISLAND_RE = /<script\b[^>]*\btype=["']application\/json["'][^>]*\bid=["']specloop-data["'][^>]*>([\s\S]*?)<\/script>/i;

export function extractDataIsland(htmlText, { maxBytes = 5_000_000 } = {}) {
  if (typeof htmlText !== 'string') throw new TypeError('html must be a string');
  if (Buffer.byteLength(htmlText, 'utf8') > maxBytes) throw new Error('spec html exceeds size limit');
  const m = htmlText.match(ISLAND_RE);
  if (!m) throw new Error('no #specloop-data island found');
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error('data island is not valid JSON: ' + e.message);
  }
}
