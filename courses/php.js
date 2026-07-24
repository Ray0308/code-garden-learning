(function definePhpCourse(root) {
  const content = root.CODE_GARDEN_CONTENT || (typeof require === 'function' ? require('../levels.js') : null);
  if (typeof require === 'function') require('./python-common.js');
  const tools = root.CODE_GARDEN_VARIANT_TOOLS || (typeof require === 'function' ? require('./language-variant-tools.js') : null);
  const course = tools.createCourse(content.courses.python, {
    id: 'php',
    meta: {
      label: 'PHP', fileName: 'main.php', editorLabel: 'PHPコードエディター',
      intro: 'ゲームを動かしながら、PHPの$変数・文末記号・波かっこを身につけよう。',
      functionNote: 'move(); などは研修用ゲームが用意したPHP風の専用関数です。'
    }
  });
  content.courses.php = course;
  root.CODE_GARDEN_LANGUAGE_REGISTRY?.registerCourse(course);
  if (typeof module !== 'undefined' && module.exports) module.exports = course;
})(typeof globalThis !== 'undefined' ? globalThis : window);
