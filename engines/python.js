(function definePythonEngine(root) {
  const engine = {
    id: 'python',
    label: 'Python',
    compile(source, context = {}) {
      const capabilities = new Set(context.capabilities || []);
      const unavailable = (name, line) => {
        if (!capabilities.has(name)) errors.push({ line, text: `${name} はこのステージではまだ使えません` });
      };
      const valid = new Set(['move()', 'turnLeft()', 'turnRight()', 'action()', 'attack()', 'sayHello()']);
      const errors = [];
      const lines = source.split('\n').map(raw => raw.replace(/\t/g, '    '));

      function parseBlock(startIndex, indent) {
        const commands = [];
        let index = startIndex;
        while (index < lines.length) {
          const raw = lines[index];
          const text = raw.trim();
          if (!text || text.startsWith('#')) { index++; continue; }
          const spaces = raw.length - raw.trimStart().length;
          if (spaces < indent || (indent > 0 && spaces === indent - 4 && text === 'else:')) break;
          if (spaces > indent) { errors.push({ line: index + 1, text: 'インデントが多すぎます' }); index++; continue; }

          const loop = text.match(/^for\s+_\s+in\s+range\((\d+)\):$/);
          if (loop) {
            unavailable('for', index + 1);
            const parsed = parseBlock(index + 1, indent + 4);
            const repeat = Number(loop[1]);
            if (!parsed.commands.length) errors.push({ line: index + 1, text: 'for の中にインデントした命令が必要です' });
            if (repeat < 1 || repeat > 10) errors.push({ line: index + 1, text: 'range() は1〜10にしてください' });
            else for (let count = 0; count < repeat; count++) commands.push(...parsed.commands);
            index = parsed.index;
            continue;
          }

          const condition = text.match(/^if\s+([A-Za-z_]\w*)\s*==\s*(['"])(.*?)\2:$/);
          if (condition) {
            unavailable('if', index + 1);
            const thenBlock = parseBlock(index + 1, indent + 4);
            index = thenBlock.index;
            let elseCommands = [];
            if (index < lines.length && lines[index].trim() === 'else:' && lines[index].length - lines[index].trimStart().length === indent) {
              const elseBlock = parseBlock(index + 1, indent + 4);
              elseCommands = elseBlock.commands;
              index = elseBlock.index;
            } else errors.push({ line: index + 1, text: 'if に対応する else: が必要です' });
            commands.push({ command: 'conditional', line: index + 1, variable: condition[1], expected: condition[3], thenCommands: thenBlock.commands, elseCommands });
            continue;
          }

          const input = text.match(/^([A-Za-z_]\w*)\s*=\s*input\(\s*\)$/);
          if (input) unavailable('input', index + 1);
          if (input) { commands.push({ command: 'input', variable: input[1], line: index + 1 }); index++; continue; }
          const print = text.match(/^print\((.+)\)$/);
          if (print) unavailable('print', index + 1);
          if (print) {
            const value = print[1].trim();
            const quotedText = /^(['"])(.*)\1$/.test(value);
            const variableName = /^[A-Za-z_]\w*$/.test(value);
            if (!quotedText && !variableName) errors.push({ line: index + 1, text: 'print() の中は引用符で囲んだ文字か変数名にしてください' });
            commands.push({ command: 'print', value, line: index + 1 });
            index++;
            continue;
          }
          if (text === 'attack()') unavailable('attack', index + 1);
          else if (text === 'sayHello()') unavailable('sayHello', index + 1);
          else if (valid.has(text)) commands.push({ command: text, line: index + 1 });
          else errors.push({ line: index + 1, text });
          index++;
        }
        return { commands, index };
      }

      return { commands: parseBlock(0, 0).commands, errors };
    },
    formatError(error) {
      const guidance = /インデント|必要です|使えるよう|range\(\)/.test(error.text);
      return `${error.line}行目: ${guidance ? error.text : `「${error.text}」は使えない命令です`}`;
    }
  };

  root.CODE_GARDEN_ENGINES = root.CODE_GARDEN_ENGINES || {};
  root.CODE_GARDEN_ENGINES[engine.id] = engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
})(typeof globalThis !== 'undefined' ? globalThis : window);
