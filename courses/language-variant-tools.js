(function defineLanguageVariantTools(root) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function replaceOutsideStrings(source, replacer) {
    return source.split(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g)
      .map((part, index) => index % 2 ? part : replacer(part))
      .join('');
  }

  function phpVariables(source, names) {
    return replaceOutsideStrings(source, part => part.replace(/(?<!\$)\b[A-Za-z_]\w*\b/g, word => names.has(word) ? `$${word}` : word));
  }

  function expression(source, language, names = new Set()) {
    let value = source.trim();
    if (language === 'javascript') {
      return value.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
        .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||')
        .replace(/\bint\(/g, 'parseInt(').replace(/\blen\(([^()]+)\)/g, '$1.length');
    }
    if (language === 'java') {
      value = value.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
        .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||')
        .replace(/\bint\(/g, 'Integer.parseInt(').replace(/\blen\(([^()]+)\)/g, '$1.size()');
      value = value.replace(/^\{((?:"[^"]*"|'[^']*')\s*:\s*[^{}]+)\}$/, (_, body) => `Map.of(${body.replace(/\s*:\s*/g, ', ')})`);
      value = value.replace(/\b(\w+)\[([^\]]+)\]/g, '$1.get($2)');
      value = value.replace(/^\[([^\[\]]*)\]$/, 'List.of($1)');
      return value;
    }
    value = value.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
      .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||')
      .replace(/\bint\(/g, '(int)(').replace(/\blen\(/g, 'count(');
    value = value.replace(/\{((?:"[^"]*"|'[^']*')\s*:\s*[^{}]+)\}/g, (_, body) => `[${body.replace(/\s*:\s*/g, ' => ')}]`);
    return phpVariables(value, names);
  }

  function collectVariables(source) {
    const names = new Set();
    for (const line of source.split('\n')) {
      const match = line.trim().match(/^([A-Za-z_]\w*)\s*=/);
      if (match) names.add(match[1]);
    }
    return names;
  }

  function statement(text, language, names, declared) {
    const print = text.match(/^print\((.*)\)$/);
    if (print) {
      if (language === 'java') return `System.out.println(${expression(print[1], language, names)});`;
      if (language === 'javascript') return `console.log(${expression(print[1], language, names)});`;
      return `echo ${expression(print[1], language, names)};`;
    }
    const input = text.match(/^([A-Za-z_]\w*)\s*=\s*input\(\)$/);
    const load = text.match(/^([A-Za-z_]\w*)\s*=\s*load\((.*)\)$/);
    const assign = text.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
    const match = input || load || assign;
    if (match) {
      const name = match[1];
      const rawValue = input ? 'input()' : load ? `load(${expression(load[2], language, names)})` : expression(assign[2], language, names);
      if (language === 'php') return `$${name} = ${rawValue};`;
      if (language === 'javascript') {
        const prefix = declared.has(name) ? '' : 'let ';
        declared.add(name);
        return `${prefix}${name} = ${rawValue};`;
      }
      const prefix = declared.has(name) ? '' : 'var ';
      declared.add(name);
      return `${prefix}${name} = ${rawValue};`;
    }
    const save = text.match(/^save\((.*),\s*(.*)\)$/);
    if (save) return `save(${expression(save[1], language, names)}, ${expression(save[2], language, names)});`;
    return `${text};`;
  }

  function fromPython(source, language) {
    if (!source) return source;
    const names = collectVariables(source);
    const declared = new Set();
    const output = [];
    const stack = [];
    for (const raw of source.replace(/\t/g, '    ').split('\n')) {
      const trimmed = raw.trim();
      const indent = raw.length - raw.trimStart().length;
      if (!trimmed) { output.push(''); continue; }
      while (stack.length && indent < stack.at(-1)) {
        output.push(`${' '.repeat(stack.length * 4 - 4)}}`);
        stack.pop();
      }
      if (trimmed === 'else:') {
        output.push(`${' '.repeat(stack.length * 4)}else {`);
        stack.push(indent + 4);
        continue;
      }
      const prefix = ' '.repeat(stack.length * 4);
      if (trimmed.startsWith('#')) {
        output.push(`${prefix}//${translatedSyntax(trimmed.slice(1), language)}`);
        continue;
      }
      const loop = trimmed.match(/^for\s+_\s+in\s+range\((\d+)\):$/);
      if (loop) {
        output.push(language === 'java'
          ? `${prefix}for (int i = 0; i < ${loop[1]}; i++) {`
          : language === 'javascript'
            ? `${prefix}for (let i = 0; i < ${loop[1]}; i++) {`
            : `${prefix}for ($i = 0; $i < ${loop[1]}; $i++) {`);
        stack.push(indent + 4);
        continue;
      }
      const condition = trimmed.match(/^if\s+(.+):$/);
      if (condition) {
        output.push(`${prefix}if (${expression(condition[1], language, names)}) {`);
        stack.push(indent + 4);
        continue;
      }
      output.push(`${prefix}${statement(trimmed, language, names, declared)}`);
    }
    while (stack.length) {
      output.push(`${' '.repeat(stack.length * 4 - 4)}}`);
      stack.pop();
    }
    return output.join('\n');
  }

  function translatedSyntax(syntax, language) {
    const table = language === 'java' ? [
      ['print(', 'System.out.println('], ['True', 'true'], ['False', 'false'], [' and ', ' && '], [' or ', ' || '],
      ['int("12")', 'Integer.parseInt("12")'], ['len(items)', 'items.size()'], ['items[2]', 'items.get(2)'],
      ['items = [2, 4, 6]', 'var items = List.of(2, 4, 6)'], ['user["name"]', 'user.get("name")'],
      ['if score >= 60:', 'if (score >= 60) { ... }'], ['number % 2 == 0', 'number % 2 == 0'],
      ['for / if / %', 'for / if / %'], ['score = 10', 'var score = 10;']
    ] : language === 'javascript' ? [
      ['print(', 'console.log('], ['True', 'true'], ['False', 'false'], [' and ', ' && '], [' or ', ' || '],
      ['int("12")', 'parseInt("12")'], ['len(items)', 'items.length'], ['items = [2, 4, 6]', 'let items = [2, 4, 6];'],
      ['if score >= 60:', 'if (score >= 60) { ... }'], ['score = 10', 'let score = 10;']
    ] : [
      ['True', 'true'], ['False', 'false'], [' and ', ' && '], [' or ', ' || '],
      ['int("12")', '(int) "12"'], ['len(items)', 'count($items)'], ['items[2]', '$items[2]'],
      ['items = [2, 4, 6]', '$items = [2, 4, 6];'], ['user["name"]', '$user["name"]'],
      ['if score >= 60:', 'if ($score >= 60) { ... }'], ['number % 2 == 0', '$number % 2 == 0'],
      ['score = 10', '$score = 10;']
    ];
    let result = syntax;
    for (const [before, after] of table) result = result.split(before).join(after);
    const conversionName = language === 'java' ? 'Integer.parseInt()'
      : language === 'javascript' ? 'parseInt()' : '(int)';
    const lengthName = language === 'java' ? 'size()'
      : language === 'javascript' ? 'length' : 'count()';
    result = result.replace(/\bint\(\)/g, conversionName)
      .replace(/\blen\(\)/g, lengthName)
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||');
    if (language === 'java') {
      result = result.replace(/for _ in range\((\w+)\):/g, 'for (int i = 0; i < $1; i++) {')
        .replace(/range\(\)の回数/g, 'for文の繰り返し回数').replace(/range\(\)/g, 'for文');
    } else if (language === 'javascript') {
      result = result.replace(/for _ in range\((\w+)\):/g, 'for (let i = 0; i < $1; i++) {')
        .replace(/range\(\)の回数/g, 'for文の繰り返し回数').replace(/range\(\)/g, 'for文');
    } else {
      result = result.replace(/print\(([^()\n]*)\)/g, 'echo $1')
        .replace(/for _ in range\((\w+)\):/g, 'for ($i = 0; $i < $1; $i++) {')
        .replace(/range\(\)の回数/g, 'for文の繰り返し回数').replace(/range\(\)/g, 'for文');
      result = phpVariables(result, new Set([
        'score','name','ready','number','total','items','level','age','has_key','has_pass',
        'key','passcode','user','mob','value','remainder','answer','message','price','count','result'
      ]));
    }
    return result;
  }

  function createCourse(base, options) {
    const course = {
      id: options.id,
      meta: options.meta,
      curriculum: clone(base.curriculum).map(item => ({ ...item, language: options.id })),
      levels: clone(base.levels)
    };
    for (const level of Object.values(course.levels)) {
      level.mission = translatedSyntax(level.mission, options.id);
      level.description = translatedSyntax(level.description, options.id);
      level.goal = translatedSyntax(level.goal, options.id);
      level.starter = fromPython(level.starter, options.id);
      level.solution = fromPython(level.solution, options.id);
      if (level.support) {
        level.support.instruction = translatedSyntax(level.support.instruction, options.id);
        level.support.initialCode = fromPython(level.support.initialCode, options.id);
        level.support.example = fromPython(level.support.example, options.id);
        level.support.hints = (level.support.hints || []).map(hint => translatedSyntax(hint, options.id));
      }
    }
    course.curriculum.forEach(item => {
      item.topic = translatedSyntax(item.topic, options.id);
      item.syntax = /^[A-Za-z_]\w*\s*=(?!=)/.test(item.syntax.trim())
        ? translatedSyntax(fromPython(item.syntax, options.id), options.id)
        : translatedSyntax(item.syntax, options.id);
    });
    const loopWord = options.id === 'java' ? 'for (int i = 0; i < 3; i++)'
      : options.id === 'javascript' ? 'for (let i = 0; i < 3; i++)'
        : 'for ($i = 0; $i < 3; $i++)';
    course.levels[8].description = `${loopWord} の波かっこ { } の内側が繰り返す処理です。読みやすくするため内側を字下げしますが、処理範囲は波かっこで決まります。`;
    course.levels[8].support.instruction = 'お手本を入力し、波かっこの内側に書いたmove()が3回実行されることを確かめよう。';
    course.levels[8].support.hints = ['for文の末尾に開始の波かっこ { が必要です。', '繰り返すmove()は { と } の間へ書きます。'];
    course.levels[11].starter = course.levels[11].starter.replace(/^\/\/.*$/m, '// 最初のforの波かっこの中が空です');
    course.levels[11].support.initialCode = (course.levels[11].support.initialCode || course.levels[11].starter)
      .replace(/^\/\/.*$/m, '// 最初のforの波かっこの中が空です');
    course.levels[11].support.instruction = '空になっている最初のforへ、外に出ているmove()を移動しよう。';
    course.levels[11].support.hints = ['最初の { と } の間に命令がありません。', '直後のmove()を最初の波かっこの内側へ移動します。'];
    return course;
  }

  root.CODE_GARDEN_VARIANT_TOOLS = { fromPython, createCourse, translatedSyntax };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CODE_GARDEN_VARIANT_TOOLS;
})(typeof globalThis !== 'undefined' ? globalThis : window);
