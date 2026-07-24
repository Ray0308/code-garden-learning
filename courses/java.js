(function defineJavaCourse(root) {
  const content = root.CODE_GARDEN_CONTENT || (typeof require === 'function' ? require('../levels.js') : null);
  if (typeof require === 'function') require('./python-common.js');
  const tools = root.CODE_GARDEN_VARIANT_TOOLS || (typeof require === 'function' ? require('./language-variant-tools.js') : null);
  const course = tools.createCourse(content.courses.python, {
    id: 'java',
    meta: {
      label: 'Java', fileName: 'Main.java', editorLabel: 'Javaコードエディター',
      intro: 'ゲームを動かしながら、Javaの文末記号・型・波かっこを身につけよう。',
      functionNote: 'move(); などは研修用ゲームが用意したJava風の専用メソッドです。'
    }
  });
  content.courses.java = course;
  root.CODE_GARDEN_LANGUAGE_REGISTRY?.registerCourse(course);
  if (typeof module !== 'undefined' && module.exports) module.exports = course;
})(typeof globalThis !== 'undefined' ? globalThis : window);
