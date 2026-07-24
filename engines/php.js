(function definePhpEngine(root) {
  const adapter = root.CODE_GARDEN_BRACE_ADAPTER || (typeof require === 'function' ? require('./brace-adapter.js') : null);
  const engine = adapter.createEngine('php', 'PHP');
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
})(typeof globalThis !== 'undefined' ? globalThis : window);
