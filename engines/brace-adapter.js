(function defineBraceAdapter(root) {
  const python = root.CODE_GARDEN_ENGINES?.python || (typeof require === 'function' ? require('./python.js') : null);

  function splitArguments(source) {
    const result = [];
    let start = 0;
    let depth = 0;
    let quote = '';
    for (let index = 0; index < source.length; index++) {
      const char = source[index];
      if (quote) {
        if (char === quote && source[index - 1] !== '\\') quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if ('([{'.includes(char)) depth++;
      else if (')]}'.includes(char)) depth--;
      else if (char === ',' && depth === 0) {
        result.push(source.slice(start, index).trim());
        start = index + 1;
      }
    }
    result.push(source.slice(start).trim());
    return result;
  }

  function javaCollections(source) {
    let value = source;
    value = value.replace(/List\.of\(([^()]*)\)/g, '[$1]');
    value = value.replace(/Map\.of\(([^()]*)\)/g, (_, body) => {
      const parts = splitArguments(body);
      const entries = [];
      for (let index = 0; index < parts.length; index += 2) entries.push(`${parts[index]}: ${parts[index + 1]}`);
      return `{${entries.join(', ')}}`;
    });
    return value;
  }

  function normalizeExpression(source, language) {
    let value = source.trim().replace(/&&/g, ' and ').replace(/\|\|/g, ' or ')
      .replace(/\btrue\b/gi, 'True').replace(/\bfalse\b/gi, 'False');
    if (language === 'java') {
      value = javaCollections(value)
        .replace(/Integer\.parseInt\(/g, 'int(')
        .replace(/([A-Za-z_]\w*)\.size\(\)/g, 'len($1)')
        .replace(/([A-Za-z_]\w*)\.get\(([^()]+)\)/g, '$1[$2]');
    } else {
      value = value.replace(/\$([A-Za-z_]\w*)/g, '$1')
        .replace(/count\(/g, 'len(')
        .replace(/\(int\)\s*\(([^()]*)\)/g, 'int($1)')
        .replace(/\(int\)\s*("[^"]*"|'[^']*')/g, 'int($1)')
        .replace(/\[((?:"[^"]*"|'[^']*')\s*=>[^\]]+)\]/g, (_, body) => `{${body.replace(/\s*=>\s*/g, ': ')}}`);
    }
    return value.trim();
  }

  function normalize(source, language) {
    const output = [];
    let indent = 0;
    const lines = source.replace(/\r/g, '').split('\n');
    for (let index = 0; index < lines.length; index++) {
      let text = lines[index].trim();
      if (!text || text === '<?php' || text === '?>') { output.push(''); continue; }
      if (text.startsWith('//')) { output.push(`${' '.repeat(indent * 4)}#${text.slice(2)}`); continue; }
      if (/^}\s*else\s*{$/.test(text)) {
        indent = Math.max(0, indent - 1);
        output.push(`${' '.repeat(indent * 4)}else:`);
        indent++;
        continue;
      }
      if (text === 'else {') {
        output.push(`${' '.repeat(indent * 4)}else:`);
        indent++;
        continue;
      }
      if (text === '}') { indent = Math.max(0, indent - 1); continue; }
      const loop = language === 'java'
        ? text.match(/^for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\d+)\s*;\s*\w+\+\+\s*\)\s*\{$/)
        : text.match(/^for\s*\(\s*\$\w+\s*=\s*0\s*;\s*\$\w+\s*<\s*(\d+)\s*;\s*\$\w+\+\+\s*\)\s*\{$/);
      if (loop) {
        output.push(`${' '.repeat(indent * 4)}for _ in range(${loop[1]}):`);
        indent++;
        continue;
      }
      const condition = text.match(/^if\s*\((.*)\)\s*\{$/);
      if (condition) {
        output.push(`${' '.repeat(indent * 4)}if ${normalizeExpression(condition[1], language)}:`);
        indent++;
        continue;
      }
      if (text.endsWith('{')) {
        output.push(`${' '.repeat(indent * 4)}# unsupported block`);
        indent++;
        continue;
      }
      if (text.endsWith(';')) text = text.slice(0, -1).trim();
      if (language === 'java') {
        text = text.replace(/^System\.out\.println\((.*)\)$/, 'print($1)')
          .replace(/^(?:int|double|String|boolean|var|List(?:<[^>]+>)?|Map(?:<[^>]+>)?)\s+([A-Za-z_]\w*)\s*=/, '$1 =');
      } else {
        text = text.replace(/^echo\s+(.+)$/, 'print($1)').replace(/\$([A-Za-z_]\w*)/g, '$1');
      }
      const assignment = text.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
      const print = text.match(/^print\((.*)\)$/);
      const save = text.match(/^save\((.*)\)$/);
      if (assignment) text = `${assignment[1]} = ${normalizeExpression(assignment[2], language)}`;
      else if (print) text = `print(${normalizeExpression(print[1], language)})`;
      else if (save) text = `save(${normalizeExpression(save[1], language)})`;
      output.push(`${' '.repeat(indent * 4)}${text}`);
    }
    return output.join('\n');
  }

  function createEngine(id, label) {
    const engine = {
      id, label,
      normalize(source) { return normalize(source, id); },
      parseExpression(source) { return python.parseExpression(normalizeExpression(source, id)); },
      evaluateExpression: python.evaluateExpression,
      compile(source, context) {
        const punctuationErrors = source.replace(/\r/g, '').split('\n').flatMap((raw, index) => {
          const text = raw.trim();
          if (!text || text.startsWith('//') || text === '<?php' || text === '?>'
            || text === '}' || /^}\s*else\s*{$/.test(text) || text.endsWith('{')) return [];
          return text.endsWith(';') ? [] : [{ line: index + 1, text: '文の最後にセミコロン ; が必要です' }];
        });
        const result = python.compile(normalize(source, id), context);
        return { commands: result.commands, errors: [...punctuationErrors, ...result.errors] };
      },
      formatError(error) {
        return `${error.line}行目: ${error.text}`;
      }
    };
    root.CODE_GARDEN_ENGINES = root.CODE_GARDEN_ENGINES || {};
    root.CODE_GARDEN_ENGINES[id] = engine;
    root.CODE_GARDEN_LANGUAGE_REGISTRY?.registerEngine(engine);
    return engine;
  }

  root.CODE_GARDEN_BRACE_ADAPTER = { createEngine, normalize, normalizeExpression };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CODE_GARDEN_BRACE_ADAPTER;
})(typeof globalThis !== 'undefined' ? globalThis : window);
