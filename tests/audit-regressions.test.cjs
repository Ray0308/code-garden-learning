const assert = require('node:assert/strict');
const content = require('../levels.js');
require('../courses/python-common.js');
require('../courses/python-hints.js');
const variants = require('../courses/language-variant-tools.js');
const python = require('../engines/python.js');
const modes = [['python', content.courses.python, python], ...['java', 'php', 'javascript'].map(id =>
  [id, require(`../courses/${id}.js`), require(`../engines/${id}.js`)])];

for (const [id, course, engine] of modes) {
  const convert = source => id === 'python' ? source : variants.fromPython(source, id);
  const context = floor => ({ level: course.levels[floor], capabilities: course.levels[floor].capabilities });
  for (const [floor, code] of [
    [17, '# print(mob)\nmob = input()\nsayHello()\nmove()\nmove()\naction()'],
    [27, '# int("12")\nnumber = 12\nprint(number + 3)'],
    [30, '# %\nremainder = 2\nprint(remainder)'],
    [30, 'remainder = 2\nprint("%")\nprint(remainder)']
  ]) assert.ok(engine.compile(convert(code), context(floor)).errors.length, `${id}/${floor}: comments and string literals cannot satisfy requirements`);

  const source = convert('if False:\n    print(mob)\nmob = input()');
  const parsed = engine.compile(source, { capabilities: ['if', 'input', 'print'] });
  assert.deepEqual(parsed.errors, []);
  assert.ok(engine.usedConstructs(parsed.commands).has('printMob'));
  assert.ok(!engine.usedConstructs([parsed.commands[0]], false).has('printMob'), `${id}: unexecuted branch cannot satisfy output requirement`);

  for (const text of ['true && false or True', '$mob', 'List.of(1, 2)', 'name.length', 'int("12")']) {
    const result = engine.compile(convert(`print(${JSON.stringify(text)})`), { capabilities: ['print'] });
    assert.deepEqual(result.errors, [], `${id}: parse literal ${text}`);
    assert.equal(engine.evaluateExpression(result.commands[0].value), text, `${id}: preserve literal ${text}`);
  }
  if (id === 'python') continue;
  for (const item of course.curriculum) assert.doesNotMatch(item.syntax, /\b(var var|let let)\b|\$\$|;;/, `${id}/${item.floor}: no double conversion`);
  const declaration = { java: 'var score = 10;', php: '$score = 10;', javascript: 'let score = 10;' }[id];
  assert.equal(course.curriculum.find(item => item.floor === 24).syntax, declaration);
  if (id === 'java') assert.match(convert('if mob == "enemy":\n    attack()'), /mob\.equals\("enemy"\)/);
  if (id === 'java' || id === 'javascript') {
    assert.match(course.levels[47].solution, /(?:String|let) result = "";\nif/);
    assert.doesNotMatch(course.levels[47].solution, /\n    (?:var|let) result/);
  }
  for (const code of ['if (true) {\nmove();', '}\nmove();', 'else {\nmove();\n}', 'unknown {\nmove();\n}']) {
    assert.ok(engine.compile(code, { capabilities: ['if', 'move'] }).errors.length, `${id}: reject invalid block ${code}`);
  }
  const loop = convert('for _ in range(2):\n    move()');
  assert.ok(engine.compile(loop.replace(/i < /, 'j < '), { capabilities: ['for', 'move'] }).errors.length, `${id}: loop variable must agree`);
  const error = engine.compile('if (true) {\nmove();\n}\n???;', { capabilities: ['if', 'move'] }).errors;
  assert.ok(error.some(item => item.line === 4), `${id}: preserve source line after closing brace`);
}
assert.ok(python.compile('else:\n    move()', { capabilities: ['move'] }).errors.length);
const nested = Array.from({ length: 6 }, (_, i) => `${'    '.repeat(i)}for _ in range(20):`).join('\n') + '\n' + '    '.repeat(6) + 'move()';
assert.ok(python.compile(nested, { capabilities: ['for', 'move'] }).errors.length, 'bound loop expansion before allocating millions of commands');
console.log('Audit regressions: requirements, literals, curriculum, blocks, line numbers, expansion limit passed.');
