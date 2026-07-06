export type SymbolToken = { kind: "Symbol"; name: string };

export type SExpr = SymbolToken | number | boolean | string | SExpr[] | null;

function makeSymbol(name: string): SymbolToken {
  return { kind: "Symbol", name };
}

function isSymbol(value: unknown): value is SymbolToken {
  return typeof value === "object" && value !== null && (value as any).kind === "Symbol";
}

function quoteString(value: string): string {
  return '"' + value.replace(/"/g, '\\"') + '"';
}

function isSExprArray(expr: SExpr): expr is SExpr[] {
  return Array.isArray(expr);
}

function tokenize(text: string) : Array<string | SymbolToken> {
    const tokens: Array<string | SymbolToken> = [];
    
    let i = 0;
    const n = text.length;
    while (i < n) {
        const c = text[i];
        if (" \t\n\r,".includes(c)) {
            i += 1;
        } else if (c === ";") {
            while (i < n && text[i] !== "\n") {
                i += 1;
            }
        } else if (c === "(" || c === ")" || c === "[" || c === "]") {
            tokens.push(c === "(" || c === "[" ? "(" : ")");
            i += 1;
        } else if (c === '"') {
            let j = i + 1;
            let buffer = "";
            while (j < n && text[j] !== '"') {
                if (text[j] === "\\" && j + 1 < n) {
                    j += 1;
                    buffer += text[j];
                } else {
                    buffer += text[j];
                }
                j += 1;
            }
            if (j >= n) {
                throw new SyntaxError("unterminated string literal");
            }
            tokens.push(buffer);
            i = j + 1;
        } else {
            let j = i;
            while (j < n && !" \t\n\r,()[];\"".includes(text[j])) {
                j += 1;
            }
            tokens.push(text.slice(i, j));
            i = j;
        }
    }
    return tokens;
}

function atom(token: string | SymbolToken): SExpr {
  if (typeof token !== "string") {
    return token;
  }
  if (token === "true") {
    return true;
  }
  if (token === "false") {
    return false;
  }
  if (token === "nil") {
    return null;
  }
  const intValue = Number.parseInt(token, 10);
  if (!Number.isNaN(intValue) && intValue.toString() === token) {
    return intValue;
  }
  const floatValue = Number.parseFloat(token);
  if (!Number.isNaN(floatValue) && floatValue.toString() === token) {
    return floatValue;
  }
  return makeSymbol(token);
}


function readExpression(tokens: Array<string | SymbolToken>, pos: number): { expr: SExpr; next: number } {
  if (pos >= tokens.length) {
    throw new SyntaxError("unexpected end of input");
  }
  const tok = tokens[pos];
  if (tok === "(") {
    const form: SExpr[] = [];
    let next = pos + 1;
    while (true) {
      if (next >= tokens.length) {
        throw new SyntaxError("missing closing parenthesis");
      }
      if (tokens[next] === ")") {
        return { expr: form, next: next + 1 };
      }
      const sub = readExpression(tokens, next);
      form.push(sub.expr);
      next = sub.next;
    }
  }
  if (tok === ")") {
    throw new SyntaxError("unexpected )");
  }
  return { expr: atom(tok), next: pos + 1 };
}

function parse(text: string): SExpr[] {
  const tokens = tokenize(text);
  const forms: SExpr[] = [];
  let pos = 0;
  while (pos < tokens.length) {
    const result = readExpression(tokens, pos);
    forms.push(result.expr);
    pos = result.next;
  }
  return forms;
}
function parseOne(text: string): SExpr {
  const forms = parse(text);
  if (forms.length !== 1) {
    throw new SyntaxError(`expected exactly one form, got ${forms.length}`);
  }
  return forms[0];
}

function toStringExpr(form: SExpr): string {
  if (isSymbol(form)) {
    return form.name;
  }
  if (typeof form === "boolean") {
    return form ? "true" : "false";
  }
  if (form === null) {
    return "nil";
  }
  if (typeof form === "string") {
    return quoteString(form);
  }
  if (Array.isArray(form)) {
    return "(" + form.map(toStringExpr).join(" ") + ")";
  }
  return String(form);
}

export {toStringExpr, parseOne, parse, tokenize, isSymbol, makeSymbol, isSExprArray}