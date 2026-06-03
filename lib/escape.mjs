// 把对象序列化成可安全嵌入 <script type="application/json"> 的字符串。
// 关键：转义 < > & 与 U+2028/2029，避免逃逸脚本上下文；结果仍是合法 JSON，可被 JSON.parse 还原。
export function htmlSafeJsonIsland(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// 把任意值转成可安全放入 HTML 文本/属性的字符串。
export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
