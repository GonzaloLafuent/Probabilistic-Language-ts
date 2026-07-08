import { DISTRIBUTIONS, Distribution } from "./distributions.js";

export interface PrimitiveArray extends Array<PrimitiveValue> {}

export interface PrimitiveMap {
  [key: string]: PrimitiveValue;
}

export type PrimitiveValue =
  | number
  | boolean
  | string
  | null
  | PrimitiveArray
  | PrimitiveMap
  | Distribution
  | ((...args: PrimitiveValue[]) => Number)
  | ((...args: PrimitiveValue[]) => PrimitiveValue);

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function numValue(value: PrimitiveValue): number {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return value;
  }
  throw new TypeError("expected numeric value");
}

function add(...args: PrimitiveValue[]): PrimitiveValue {
  return args.reduce((acc, x) => {
    if (Array.isArray(acc)) {
      return (acc as any).map((value: PrimitiveValue, index: number) =>
        add(value, (x as any)[index])
      );
    }
    return numValue(acc) + numValue(x);
  }) as number;
}

function sub(...args: PrimitiveValue[]): PrimitiveValue {
  if (args.length === 1) {
    return -numValue(args[0]);
  }
  return args.slice(1).reduce((acc, x) => numValue(acc) - numValue(x), numValue(args[0]));
}

function mul(...args: PrimitiveValue[]): PrimitiveValue {
  return args.reduce((acc, x) => numValue(acc) * numValue(x), numValue(args[0]));
}

function div(...args: PrimitiveValue[]): PrimitiveValue {
  if (args.length === 1) {
    return 1.0 / numValue(args[0]);
  }
  return args.slice(1).reduce((acc, x) => numValue(acc) / numValue(x), numValue(args[0]));
}

function eq(a: PrimitiveValue, b: PrimitiveValue): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return numValue(a) === numValue(b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

function vector(...args: PrimitiveValue[]): PrimitiveValue[] {
  return [...args];
}

function hashMap(...args: PrimitiveValue[]): Record<string, PrimitiveValue> {
  if (args.length % 2 !== 0) {
    throw new Error("hash-map: odd number of arguments");
  }
  const result: Record<string, PrimitiveValue> = {};
  for (let i = 0; i < args.length; i += 2) {
    result[String(args[i])] = args[i + 1];
  }
  return result;
}

function get(coll: PrimitiveValue, key: PrimitiveValue, defaultValue: PrimitiveValue = null): PrimitiveValue {
  if (Array.isArray(coll)) {
    const index = Number(key);
    return coll[index] ?? defaultValue;
  }
  if (typeof coll === "object" && coll !== null && !(coll instanceof Distribution)) {
    return (coll as Record<string, PrimitiveValue>)[String(key)] ?? defaultValue;
  }
  return defaultValue;
}

function put(coll: PrimitiveValue, key: PrimitiveValue, value: PrimitiveValue): PrimitiveValue {
  if (Array.isArray(coll)) {
    const out = [...coll];
    out[Number(key)] = value;
    return out;
  }
  if (typeof coll === "object" && coll !== null && !(coll instanceof Distribution)) {
    return { ...(coll as Record<string, PrimitiveValue>), [String(key)]: value };
  }
  throw new TypeError("put: unsupported collection");
}

function first(v: PrimitiveValue): PrimitiveValue {
  if (!Array.isArray(v)) {
    throw new TypeError("first expects a vector");
  }
  return v[0];
}

function second(v: PrimitiveValue): PrimitiveValue {
  if (!Array.isArray(v)) {
    throw new TypeError("second expects a vector");
  }
  return v[1];
}

function last(v: PrimitiveValue): PrimitiveValue {
  if (!Array.isArray(v)) {
    throw new TypeError("last expects a vector");
  }
  return v[v.length - 1];
}

function rest(v: PrimitiveValue): PrimitiveValue[] {
  if (!Array.isArray(v)) {
    throw new TypeError("rest expects a vector");
  }
  return v.slice(1);
}

function nth(v: PrimitiveValue, i: PrimitiveValue): PrimitiveValue {
  if (!Array.isArray(v)) {
    throw new TypeError("nth expects a vector");
  }
  return v[Number(i)];
}

function conj(coll: PrimitiveValue, ...xs: PrimitiveValue[]): PrimitiveValue[] {
  if (!Array.isArray(coll)) {
    throw new TypeError("conj expects a vector");
  }
  return [...coll, ...xs];
}

function cons(x: PrimitiveValue, coll: PrimitiveValue): PrimitiveValue[] {
  if (!Array.isArray(coll)) {
    throw new TypeError("cons expects a vector");
  }
  return [x, ...coll];
}

function append(coll: PrimitiveValue, ...xs: PrimitiveValue[]): PrimitiveValue[] {
  if (!Array.isArray(coll)) {
    throw new TypeError("append expects a vector");
  }
  return [...coll, ...xs];
}

function concat(...colls: PrimitiveValue[]): PrimitiveValue[] {
  return colls.flatMap((coll) => (Array.isArray(coll) ? coll : []));
}

function count(coll: PrimitiveValue): number {
  if (Array.isArray(coll)) {
    return coll.length;
  }
  if (typeof coll === "object" && coll !== null && !(coll instanceof Distribution)) {
    return Object.keys(coll).length;
  }
  return 0;
}

function empty(coll: PrimitiveValue): boolean {
  return count(coll) === 0;
}

function peek(coll: PrimitiveValue): PrimitiveValue {
  if (!Array.isArray(coll)) {
    throw new TypeError("peek expects a vector");
  }
  return coll[coll.length - 1];
}

function range(...args: PrimitiveValue[]): number[] {
  const numbers = args.map((x) => Number(x));
  if (numbers.length === 1) {
    return Array.from({ length: numbers[0] }, (_, i) => i);
  }
  if (numbers.length === 2) {
    const [start, end] = numbers;
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }
  throw new Error("range expects one or two numeric arguments");
}

function toMat(x: PrimitiveValue): number[][] {
  if (Array.isArray(x) && Array.isArray(x[0])) {
    return x as number[][];
  }
  if (Array.isArray(x)) {
    return [x as number[]];
  }
  throw new TypeError("to-mat expects a vector or matrix");
}

function matMul(a: PrimitiveValue, b: PrimitiveValue): number[][] {
  const A = toMat(a);
  const B = toMat(b);
  const rows = A.length;
  const cols = B[0].length;
  const inner = A[0].length;
  const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      for (let k = 0; k < inner; k += 1) {
        result[i][j] += (A[i][k] as number) * (B[k][j] as number);
      }
    }
  }
  return result;
}

function matAdd(a: PrimitiveValue, b: PrimitiveValue): number[][] {
  const A = toMat(a);
  const B = toMat(b);
  return A.map((row, i) => row.map((value, j) => value + B[i][j]));
}

function matTranspose(a: PrimitiveValue): number[][] {
  const A = toMat(a);
  return A[0].map((_, j) => A.map((row) => row[j]));
}

function matTanh(a: PrimitiveValue): number[][] {
  const A = toMat(a);
  return A.map((row) => row.map((value) => Math.tanh(value)));
}

function matRelu(a: PrimitiveValue): number[][] {
  const A = toMat(a);
  return A.map((row) => row.map((value) => Math.max(value, 0))); 
}

function matRepmat(a: PrimitiveValue, r: PrimitiveValue, c: PrimitiveValue): number[][] {
  const A = toMat(a);
  const rows = Number(r);
  const cols = Number(c);
  const result: number[][] = [];
  for (let i = 0; i < rows; i += 1) {
    for (const row of A) {
      result.push([...row]);
    }
  }
  return result;
}

const PRIMITIVES: Record<string, (...args: PrimitiveValue[]) => PrimitiveValue> = {
  "+": add,
  "-": sub,
  "*": mul,
  "/": div,
  sqrt: (x) => Math.sqrt(numValue(x)),
  exp: (x) => Math.exp(numValue(x)),
  log: (x) => Math.log(numValue(x)),
  pow: (x, y) => Math.pow(numValue(x), numValue(y)),
  abs: (x) => Math.abs(numValue(x)),
  floor: (x) => Math.floor(numValue(x)),
  ceil: (x) => Math.ceil(numValue(x)),
  tanh: (x) => Math.tanh(numValue(x)),
  max: (...xs) => Math.max(...xs.map(numValue)),
  min: (...xs) => Math.min(...xs.map(numValue)),
  mod: (a, b) => numValue(a) % numValue(b),
  "=": (a, b) => eq(a, b) as PrimitiveValue,
  "==": (a, b) => eq(a, b) as PrimitiveValue,
  "!=": (a, b) => !eq(a, b) as PrimitiveValue,
  "<": (a, b) => (numValue(a) < numValue(b)) as PrimitiveValue,
  ">": (a, b) => (numValue(a) > numValue(b)) as PrimitiveValue,
  "<=": (a, b) => (numValue(a) <= numValue(b)) as PrimitiveValue,
  ">=": (a, b) => (numValue(a) >= numValue(b)) as PrimitiveValue,
  and: (...xs) => xs.every(Boolean) as PrimitiveValue,
  or: (...xs) => xs.some(Boolean) as PrimitiveValue,
  not: (x) => !Boolean(x) as PrimitiveValue,
  vector,
  list: vector,
  "hash-map": hashMap,
  get,
  put,
  assoc: put,
  first,
  second,
  last,
  rest,
  nth,
  conj,
  cons,
  append,
  concat,
  count: (coll) => count(coll) as PrimitiveValue,
  "empty?": (coll) => empty(coll) as PrimitiveValue,
  peek,
  range: (...args) => range(...args) as PrimitiveValue,
  "vector?": (x) => Array.isArray(x) as PrimitiveValue,
  "map?": (x) => (typeof x === "object" && x !== null && !Array.isArray(x) && !(x instanceof Distribution)) as PrimitiveValue,
  "number?": (x) => (typeof x === "number" && !Number.isNaN(x)) as PrimitiveValue,
  "mat-mul": matMul as any,
  "mat-add": matAdd as any,
  "mat-transpose": matTranspose as any,
  "mat-tanh": matTanh as any,
  "mat-relu": matRelu as any,
  "mat-repmat": matRepmat as any,
  ...DISTRIBUTIONS,
};

function isPrimitive(name: string): boolean {
  return name in PRIMITIVES;
}

export {PRIMITIVES, isPrimitive}
