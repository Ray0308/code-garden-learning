(function definePythonEngine(root) {
  const commandNames = new Set(['move()', 'turnLeft()', 'turnRight()', 'action()', 'attack()', 'sayHello()']);

  function tokenize(source) {
    const tokens = [];
    const pattern = /\s*(?:(\d+(?:\.\d+)?)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|([A-Za-z_]\w*)|(==|!=|<=|>=|\/\/|[+\-*/%<>()\[\]{},:]))/gy;
    let index = 0;
    while (index < source.length) {
      pattern.lastIndex = index;
      const match = pattern.exec(source);
      if (!match || match.index !== index) throw new Error(`式の「${source.slice(index).trim()}」を解釈できません`);
      tokens.push(match[1] ? { type: 'number', value: Number(match[1]) }
        : match[2] ? { type: 'string', value: JSON.parse(match[2].replace(/^'/, '"').replace(/'$/, '"')) }
          : match[3] ? { type: 'name', value: match[3] }
            : { type: 'symbol', value: match[4] });
      index = pattern.lastIndex;
    }
    return tokens;
  }

  function parseExpression(source) {
    const tokens = tokenize(source);
    let cursor = 0;
    const peek = value => tokens[cursor]?.value === value;
    const take = value => {
      const token = tokens[cursor];
      if (!token || (value !== undefined && token.value !== value)) throw new Error(`「${value || '値'}」が必要です`);
      cursor++;
      return token;
    };

    function primary() {
      const token = tokens[cursor];
      if (!token) throw new Error('式が途中で終わっています');
      if (token.type === 'number' || token.type === 'string') { cursor++; return { type: 'literal', value: token.value }; }
      if (token.type === 'name') {
        cursor++;
        if (token.value === 'True' || token.value === 'False') return { type: 'literal', value: token.value === 'True' };
        let node;
        if (peek('(')) {
          take('(');
          const argument = expression();
          take(')');
          node = { type: 'call', name: token.value, argument };
        } else node = { type: 'variable', name: token.value };
        while (peek('[')) { take('['); const key = expression(); take(']'); node = { type: 'index', object: node, key }; }
        return node;
      }
      if (peek('(')) { take('('); const node = expression(); take(')'); return node; }
      if (peek('[')) {
        take('[');
        const items = [];
        while (!peek(']')) { items.push(expression()); if (!peek(',')) break; take(','); }
        take(']');
        return { type: 'list', items };
      }
      if (peek('{')) {
        take('{');
        const entries = [];
        while (!peek('}')) {
          const key = expression(); take(':'); const value = expression(); entries.push([key, value]);
          if (!peek(',')) break; take(',');
        }
        take('}');
        return { type: 'dict', entries };
      }
      throw new Error(`「${token.value}」は式の先頭に使えません`);
    }

    function unary() {
      if (peek('-') || peek('not')) { const operator = take().value; return { type: 'unary', operator, value: unary() }; }
      return primary();
    }
    function binary(next, operators) {
      let node = next();
      while (tokens[cursor] && operators.includes(tokens[cursor].value)) {
        const operator = take().value;
        node = { type: 'binary', operator, left: node, right: next() };
      }
      return node;
    }
    const product = () => binary(unary, ['*', '/', '//', '%']);
    const sum = () => binary(product, ['+', '-']);
    const compare = () => binary(sum, ['==', '!=', '<', '>', '<=', '>=']);
    const and = () => binary(compare, ['and']);
    const expression = () => binary(and, ['or']);
    const ast = expression();
    if (cursor !== tokens.length) throw new Error(`式の「${tokens[cursor].value}」以降を解釈できません`);
    return ast;
  }

  function evaluate(ast, variables = {}) {
    if (ast.type === 'literal') return ast.value;
    if (ast.type === 'variable') {
      if (!Object.hasOwn(variables, ast.name)) throw new Error(`${ast.name} という変数が見つかりません`);
      return variables[ast.name];
    }
    if (ast.type === 'list') return ast.items.map(item => evaluate(item, variables));
    if (ast.type === 'dict') return Object.fromEntries(ast.entries.map(([key, value]) => [evaluate(key, variables), evaluate(value, variables)]));
    if (ast.type === 'call') {
      const value = evaluate(ast.argument, variables);
      if (ast.name === 'int') return Number.parseInt(value, 10);
      if (ast.name === 'float') return Number(value);
      if (ast.name === 'str') return String(value);
      if (ast.name === 'len') return value.length;
      throw new Error(`${ast.name}() は使えません`);
    }
    if (ast.type === 'index') {
      const object = evaluate(ast.object, variables);
      const key = evaluate(ast.key, variables);
      if (object == null || !(key in object)) throw new Error(`${String(key)} という要素が見つかりません`);
      return object[key];
    }
    if (ast.type === 'unary') {
      const value = evaluate(ast.value, variables);
      return ast.operator === 'not' ? !value : -value;
    }
    const left = evaluate(ast.left, variables);
    if (ast.operator === 'and') return left && evaluate(ast.right, variables);
    if (ast.operator === 'or') return left || evaluate(ast.right, variables);
    const right = evaluate(ast.right, variables);
    const operations = {
      '+': () => left + right, '-': () => left - right, '*': () => left * right,
      '/': () => left / right, '//': () => Math.floor(left / right), '%': () => left % right,
      '==': () => left === right, '!=': () => left !== right, '<': () => left < right,
      '>': () => left > right, '<=': () => left <= right, '>=': () => left >= right
    };
    if (!operations[ast.operator]) throw new Error(`${ast.operator} は使えません`);
    return operations[ast.operator]();
  }

  const engine = {
    id: 'python',
    label: 'Python',
    parseExpression,
    evaluateExpression: evaluate,
    compile(source, context = {}) {
      const capabilities = new Set(context.capabilities || []);
      const errors = [];
      const lines = source.split('\n').map(raw => raw.replace(/\t/g, '    '));
      const unavailable = (name, line) => {
        if (!capabilities.has(name)) errors.push({ line, text: `${name} はこのステージではまだ使えません` });
      };
      const expressionAst = (text, line) => {
        try { return parseExpression(text); }
        catch (error) { errors.push({ line, text: error.message }); return { type: 'literal', value: null }; }
      };

      function parseBlock(startIndex, indent) {
        const commands = [];
        let index = startIndex;
        while (index < lines.length) {
          const raw = lines[index];
          const text = raw.trim();
          if (!text || text.startsWith('#')) { index++; continue; }
          const spaces = raw.length - raw.trimStart().length;
          if (spaces < indent || (spaces === indent && text === 'else:')) break;
          if (spaces > indent) { errors.push({ line: index + 1, text: 'インデントが多すぎます' }); index++; continue; }
          const line = index + 1;

          const loop = text.match(/^for\s+_\s+in\s+range\((\d+)\):$/);
          if (loop) {
            unavailable('for', line);
            const parsed = parseBlock(index + 1, indent + 4);
            const repeat = Number(loop[1]);
            if (!parsed.commands.length) errors.push({ line, text: 'for の中にインデントした命令が必要です' });
            if (repeat < 1 || repeat > 20) errors.push({ line, text: 'range() は1〜20にしてください' });
            else for (let count = 0; count < repeat; count++) commands.push(...parsed.commands);
            index = parsed.index;
            continue;
          }
          const condition = text.match(/^if\s+(.+):$/);
          if (condition) {
            unavailable('if', line);
            const thenBlock = parseBlock(index + 1, indent + 4);
            if (!thenBlock.commands.length) errors.push({ line, text: 'if の中にインデントした命令が必要です' });
            index = thenBlock.index;
            let elseCommands = [];
            if (index < lines.length && lines[index].trim() === 'else:' && lines[index].length - lines[index].trimStart().length === indent) {
              const elseLine = index + 1;
              const elseBlock = parseBlock(index + 1, indent + 4);
              elseCommands = elseBlock.commands;
              if (!elseCommands.length) errors.push({ line: elseLine, text: 'else の中にインデントした命令が必要です' });
              index = elseBlock.index;
            }
            commands.push({ command: 'conditional', line, condition: expressionAst(condition[1], line), thenCommands: thenBlock.commands, elseCommands });
            continue;
          }
          const input = text.match(/^([A-Za-z_]\w*)\s*=\s*input\(\s*\)$/);
          if (input) {
            unavailable('input', line);
            commands.push({ command: 'input', variable: input[1], line }); index++; continue;
          }
          const load = text.match(/^([A-Za-z_]\w*)\s*=\s*load\((.+)\)$/);
          if (load) {
            unavailable('storage', line);
            commands.push({ command: 'load', variable: load[1], key: expressionAst(load[2], line), line }); index++; continue;
          }
          const assign = text.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
          if (assign) {
            unavailable('variables', line);
            commands.push({ command: 'assign', variable: assign[1], value: expressionAst(assign[2], line), line }); index++; continue;
          }
          const print = text.match(/^print\((.+)\)$/);
          if (print) {
            unavailable('print', line);
            commands.push({ command: 'print', value: expressionAst(print[1], line), line }); index++; continue;
          }
          const save = text.match(/^save\((.+),\s*(.+)\)$/);
          if (save) {
            unavailable('storage', line);
            commands.push({ command: 'save', key: expressionAst(save[1], line), value: expressionAst(save[2], line), line }); index++; continue;
          }
          if (text === 'attack()') unavailable('attack', line);
          if (text === 'sayHello()') unavailable('sayHello', line);
          if (commandNames.has(text)) commands.push({ command: text, line });
          else errors.push({ line, text: `「${text}」は使えない命令です` });
          index++;
        }
        return { commands, index };
      }
      return { commands: parseBlock(0, 0).commands, errors };
    },
    formatError(error) {
      return `${error.line}行目: ${error.text}`;
    }
  };

  root.CODE_GARDEN_ENGINES = root.CODE_GARDEN_ENGINES || {};
  root.CODE_GARDEN_ENGINES[engine.id] = engine;
  root.CODE_GARDEN_LANGUAGE_REGISTRY?.registerEngine(engine);
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
})(typeof globalThis !== 'undefined' ? globalThis : window);
