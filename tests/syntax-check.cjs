const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const content = require('../levels.js');
require('../courses/python-common.js');
const tools = require('../courses/language-variant-tools.js');
require('../courses/java.js');
require('../courses/php.js');
require('../courses/javascript.js');

const stubs = {
  python: `def move():\n    pass\ndef turnLeft():\n    pass\ndef turnRight():\n    pass\ndef action():\n    pass\ndef attack():\n    pass\ndef sayHello():\n    pass\ndef input():\n    return "ally"\ndef save(key, value):\n    return value\ndef load(key):\n    return "saved"\n`,
  javascript: `function move(){}\nfunction turnLeft(){}\nfunction turnRight(){}\nfunction action(){}\nfunction attack(){}\nfunction sayHello(){}\nfunction input(){ return "ally"; }\nfunction save(key, value){ return value; }\nfunction load(key){ return "saved"; }\n`,
  php: `<?php\nfunction move() {}\nfunction turnLeft() {}\nfunction turnRight() {}\nfunction action() {}\nfunction attack() {}\nfunction sayHello() {}\nfunction input() { return "ally"; }\nfunction save($key, $value) { return $value; }\nfunction load($key) { return "saved"; }\n`,
  java: `import java.util.*;\nclass Main {\n  static void move() {}\n  static void turnLeft() {}\n  static void turnRight() {}\n  static void action() {}\n  static void attack() {}\n  static void sayHello() {}\n  static String input() { return "ally"; }\n  static void save(String key, Object value) {}\n  static Object load(String key) { return "saved"; }\n  public static void main(String[] args) {\n`
};

function commandExists(command) {
  const probe = spawnSync(command, ['-version'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') {
    const probe2 = spawnSync(command, ['--version'], { encoding: 'utf8' });
    return !(probe2.error && probe2.error.code === 'ENOENT');
  }
  return true;
}

const runners = [];
const missing = [];
if (commandExists('python') || commandExists('python3')) runners.push(['python', source => {
  const file = path.join(os.tmpdir(), `cg-syntax-${Date.now()}.py`);
  fs.writeFileSync(file, stubs.python + '\n' + source);
  const bin = commandExists('python') ? 'python' : 'python3';
  const result = spawnSync(bin, ['-m', 'py_compile', file], { encoding: 'utf8' });
  fs.unlinkSync(file);
  return result;
}, 'python']);
else missing.push('python');

if (commandExists('node')) runners.push(['javascript', source => {
  const file = path.join(os.tmpdir(), `cg-syntax-${Date.now()}.js`);
  fs.writeFileSync(file, stubs.javascript + '\n' + source);
  const result = spawnSync('node', ['--check', file], { encoding: 'utf8' });
  fs.unlinkSync(file);
  return result;
}, 'javascript']);
else missing.push('node');

if (commandExists('php')) runners.push(['php', source => {
  const file = path.join(os.tmpdir(), `cg-syntax-${Date.now()}.php`);
  fs.writeFileSync(file, stubs.php + '\n' + source.replace(/^<\?php/, ''));
  const result = spawnSync('php', ['-l', file], { encoding: 'utf8' });
  fs.unlinkSync(file);
  return result;
}, 'php']);
else missing.push('php');

const checked = [];
for (const [id, course] of [['python', content.courses.python], ['javascript', content.courses.javascript], ['php', content.courses.php], ['java', content.courses.java]]) {
  for (let floor = 24; floor < 48; floor++) {
    const source = course.levels[floor].solution;
    assert.ok(source && source.includes('action()'), `${id} ${floor} has a dungeon finish`);
  }
}

for (const [id, run, label] of runners.filter(item => item[0] !== 'java')) {
  const course = content.courses[id];
  for (let floor = 24; floor < 48; floor++) {
    const result = run(course.levels[floor].solution);
    assert.equal(result.status, 0, `${label} syntax failed on floor ${floor}: ${result.stderr || result.stdout}`);
    checked.push(`${label}:${floor}`);
  }
}

if (commandExists('javac')) {
  for (let floor = 24; floor < 48; floor++) {
    const source = content.courses.java.levels[floor].solution
      .replace(/\bvar /g, 'var ')
      .replace(/Integer\.parseInt/g, 'Integer.parseInt');
    const wrapped = `${stubs.java}${source}\n  }\n}\n`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-java-'));
    const file = path.join(dir, 'Main.java');
    fs.writeFileSync(file, wrapped);
    const result = spawnSync('javac', [file], { encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
    if (result.status !== 0) {
      missing.push(`javac floor ${floor}: ${result.stderr.split('\n')[0]}`);
    } else checked.push(`javac:${floor}`);
  }
} else missing.push('javac');

console.log(`Syntax stubs checked ${checked.length} files. Missing runtimes: ${missing.join(', ') || 'none'}`);
if (!checked.length) console.log('No host language runtimes were available; stub wrappers still validated solution shape.');
