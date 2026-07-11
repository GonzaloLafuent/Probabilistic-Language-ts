import { Closure } from "../language/primitives.js";
import { Evaluate, IfContinuation, Instruction, LetContinuation, ObserveContinuation, SampleContinuation } from "../runtime/Intructions.js";
import { Address, Environment, Machine } from "../runtime/machine.js";

export type SymbolToken = { kind: "Symbol"; name: string };

export type SExpr = SymbolToken | number | boolean | string | SExpr[] | null | PrimitiveExpression;

abstract class PrimitiveExpression {
    public abstract name: string

    abstract execute(expression: SExpr, machine: Machine, Environment: Environment, Address: Address) : void
}

class Let extends PrimitiveExpression {
    name = 'let'

    execute(expression: SExpr, machine: Machine, environment: Environment, address: Address): void {
      const [, binds, ...body] = expression as Array<SExpr>;
      if (binds){
          machine.ControlStack.push(new LetContinuation(binds, 0, body, environment, address))  
          machine.ControlStack.push(new Evaluate((binds as Array<SExpr>)[1], environment, address.append('let',0)))                                      
      } else 
      {
          machine.pushBody(body,environment,address)
      }
    }
}

class If extends PrimitiveExpression {
    name = 'if'

    execute(expression: SExpr, machine: Machine, environment: Environment, address: Address): void {
      const [, test, then, els] = expression as Array<SExpr>
      machine.ControlStack.push(new IfContinuation(then,els, environment, address))
      machine.ControlStack.push(new Evaluate(test, environment, address.append('test')))
    }
}

class Fn extends PrimitiveExpression {
    name = 'fn'

    execute(expression: SExpr, machine: Machine, environment: Environment, address: Address): void {
        let rawParams: SExpr
        let body: SExpr
        [, rawParams, ...body] = expression as Array<SExpr>

        const params = rawParams as SymbolToken[];

        machine.ValueStack.push(new Closure(body as Array<SExpr>, params, environment))
    }
}

class Sample extends PrimitiveExpression {
    name = 'sample'

    execute(expression: SExpr, machine: Machine, environment: Environment, address: Address): void {
        machine.ControlStack.push(new SampleContinuation(address));
        machine.ControlStack.push(new Evaluate((expression as Array<SExpr>)[1], environment, address.append('d')))
    }
}

class Observe extends PrimitiveExpression {
    name = 'observe'

    execute(expression: SExpr, machine: Machine, environment: Environment, address: Address): void {
        machine.ControlStack.push(new ObserveContinuation(address))
        machine.ControlStack.push(new Evaluate((expression as Array<SExpr>)[2], environment, address.append('v')))
        machine.ControlStack.push(new Evaluate((expression as Array<SExpr>)[1], environment, address.append('d')))
    }
}

const PRIMITIVE_EXPRESSIONS = {
    'let': new Let(),
    'if': new If(),
    'fn': new Fn(),
    'sample': new Sample(),
    'observe': new Observe()
} as Record<string, PrimitiveExpression>

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

function isPrimitiveExpression(expr: SExpr): expr is PrimitiveExpression {
    return expr instanceof PrimitiveExpression 
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
    if (typeof token !== "string") return token;
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "nil") return null;

    const numberRe = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    if (numberRe.test(token)) {
      const n = Number(token);
      if (!Number.isNaN(n)) return n;
    }

    return token in PRIMITIVE_EXPRESSIONS? PRIMITIVE_EXPRESSIONS[token] : makeSymbol(token);
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

export {toStringExpr, parseOne, parse, tokenize, isSymbol, makeSymbol, isSExprArray, isPrimitiveExpression, PrimitiveExpression}