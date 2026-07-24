(function defineJavaScriptCourse(root) {
  const content = root.CODE_GARDEN_CONTENT || (typeof require === 'function' ? require('../levels.js') : null);
  if (typeof require === 'function') require('./python-common.js');
  const tools = root.CODE_GARDEN_VARIANT_TOOLS || (typeof require === 'function' ? require('./language-variant-tools.js') : null);
  const course = tools.createCourse(content.courses.python, {
    id: 'javascript',
    meta: {
      label: 'JavaScript', fileName: 'main.js', editorLabel: 'JavaScriptコードエディター',
      intro: 'ゲームを動かしながら、JavaScriptのlet変数・波かっこ・配列を身につけよう。',
      functionNote: 'move(); などは研修用ゲームが用意したJavaScriptの専用関数です。'
    }
  });
  content.courses.javascript = course;
  root.CODE_GARDEN_LANGUAGE_REGISTRY?.registerCourse(course);
  if (typeof module !== 'undefined' && module.exports) module.exports = course;
})(typeof globalThis !== 'undefined' ? globalThis : window);
