/*
interface RNG {
  random(): number;
}

class DefaultRNG implements RNG {
  random(): number {
    return Math.random();
  }
}*/

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

abstract class Distribution {
  abstract name: string;

  abstract sample(rng?: () => number): unknown;

  abstract logProb(x: unknown): number;

  params(): number[] {
    throw new Error(`${this.name} is not an optimizable guide`);
  }

  withParams(theta: number[]): Distribution {
    throw new Error(`${this.name} is not an optimizable guide`);
  }

  gradLogProb(x: unknown): number[] {
    throw new Error(`${this.name} is not an optimizable guide`);
  }

  toString(): string {
    return `(${this.name} ${this._reprParams().join(" ")})`;
  }

  protected _reprParams(): string[] {
    return [];
  }
}

function normalSample(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = rng();
  }
  while (v === 0) {
    v = rng();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function gammaSample(alpha: number, beta: number, rng: () => number): number {
  if (alpha < 1.0) {
    const d = alpha + (2.718281828459045 - 1.0) / alpha;
    while (true) {
      const u = rng();
      const v = rng();
      const x = Math.pow(u, 1.0 / alpha);
      if (v <= Math.exp(-x)) {
        return x / beta;
      }
    }
  }
  const d = alpha - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);
  while (true) {
    let x = normalSample(rng);
    let v = 1.0 + c * x;
    if (v <= 0) {
      continue;
    }
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v / beta;
    }
  }
}

function betaSample(alpha: number, beta: number, rng: () => number): number {
  const x = gammaSample(alpha, 1.0, rng);
  const y = gammaSample(beta, 1.0, rng);
  return x / (x + y);
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}

class Normal extends Distribution {
  name = "normal";
  constructor(public mu: number, public sigma: number) {
    super();
    if (sigma <= 0) {
      throw new Error("normal: sigma must be > 0");
    }
  }

  sample(rng: () => number = Math.random): number {
    return this.mu + this.sigma * normalSample(rng);
  }

  logProb(x: unknown): number {
    const value = Number(x);
    const z = (value - this.mu) / this.sigma;
    return -0.5 * (Math.log(2 * Math.PI) + z * z) - Math.log(this.sigma);
  }

  params(): number[] {
    return [this.mu, Math.log(this.sigma)];
  }

  withParams(theta: number[]): Normal {
    return new Normal(theta[0], Math.exp(theta[1]));
  }

  gradLogProb(x: unknown): number[] {
    const value = Number(x);
    const z = (value - this.mu) / this.sigma;
    return [z / this.sigma, z * z - 1.0];
  }

  protected _reprParams(): string[] {
    return [String(this.mu), String(this.sigma)];
  }
}

class LogNormal extends Distribution {
  name = "log-normal";
  constructor(public mu: number, public sigma: number) {
    super();
    if (sigma <= 0) {
      throw new Error("log-normal: sigma must be > 0");
    }
  }

  sample(rng: () => number =  Math.random): number {
    return Math.exp(this.mu + this.sigma * normalSample(rng));
  }

  logProb(x: unknown): number {
    const value = Number(x);
    if (value <= 0) {
      return -Infinity;
    }
    const z = (Math.log(value) - this.mu) / this.sigma;
    return -0.5 * (Math.log(2 * Math.PI) + z * z) - Math.log(this.sigma) - Math.log(value);
  }

  params(): number[] {
    return [this.mu, Math.log(this.sigma)];
  }

  withParams(theta: number[]): LogNormal {
    return new LogNormal(theta[0], Math.exp(theta[1]));
  }

  gradLogProb(x: unknown): number[] {
    const value = Number(x);
    const z = (Math.log(value) - this.mu) / this.sigma;
    return [z / this.sigma, z * z - 1.0];
  }

  protected _reprParams(): string[] {
    return [String(this.mu), String(this.sigma)];
  }
}

class Uniform extends Distribution {
  name = "uniform-continuous";
  constructor(public a: number, public b: number) {
    super();
    if (!(b > a)) {
      throw new Error("uniform-continuous: requires b > a");
    }
  }

  sample(rng: () => number = Math.random): number {
    return this.a + rng() * (this.b - this.a);
  }

  logProb(x: unknown): number {
    const value = Number(x);
    return this.a <= value && value <= this.b ? -Math.log(this.b - this.a) : -Infinity;
  }

  protected _reprParams(): string[] {
    return [String(this.a), String(this.b)];
  }
}

class Exponential extends Distribution {
  name = "exponential";
  constructor(public rate: number) {
    super();
    if (rate <= 0) {
      throw new Error("exponential: rate must be > 0");
    }
  }

  sample(rng: () => number = Math.random): number {
    return -Math.log(1 - rng()) / this.rate;
  }

  logProb(x: unknown): number {
    const value = Number(x);
    return value < 0 ? -Infinity : Math.log(this.rate) - this.rate * value;
  }

  protected _reprParams(): string[] {
    return [String(this.rate)];
  }
}

class Beta extends Distribution {
  name = "beta";
  constructor(public alpha: number, public beta: number) {
    super();
    if (alpha <= 0 || beta <= 0) {
      throw new Error("beta: parameters must be > 0");
    }
  }

  sample(rng: () => number = Math.random): number {
    return betaSample(this.alpha, this.beta, rng);
  }

  logProb(x: unknown): number {
    const value = Number(x);
    if (!(value > 0 && value < 1)) {
      return -Infinity;
    }
    const a = this.alpha;
    const b = this.beta;
    const logB = Math.log(gamma(a)) + Math.log(gamma(b)) - Math.log(gamma(a + b));
    return (a - 1) * Math.log(value) + (b - 1) * Math.log(1 - value) - logB;
  }

  protected _reprParams(): string[] {
    return [String(this.alpha), String(this.beta)];
  }
}

class Gamma extends Distribution {
  name = "gamma";
  constructor(public shape: number, public rate: number) {
    super();
    if (shape <= 0 || rate <= 0) {
      throw new Error("gamma: parameters must be > 0");
    }
  }

  sample(rng: () => number = Math.random): number {
    return gammaSample(this.shape, this.rate, rng);
  }

  logProb(x: unknown): number {
    const value = Number(x);
    if (value <= 0) {
      return -Infinity;
    }
    return (
      this.shape * Math.log(this.rate) -
      Math.log(gamma(this.shape)) +
      (this.shape - 1) * Math.log(value) -
      this.rate * value
    );
  }

  protected _reprParams(): string[] {
    return [String(this.shape), String(this.rate)];
  }
}

class Poisson extends Distribution {
  name = "poisson";
  constructor(public lambda: number) {
    super();
    if (lambda <= 0) {
      throw new Error("poisson: rate must be > 0");
    }
  }

  sample(rng: () => number = Math.random): number {
    const L = Math.exp(-this.lambda);
    let k = 0;
    let p = 1;
    while (p > L) {
      k += 1;
      p *= rng();
    }
    return k - 1;
  }

  logProb(x: unknown): number {
    const k = Math.floor(Number(x));
    if (k < 0) {
      return -Infinity;
    }
    return k * Math.log(this.lambda) - this.lambda - logFactorial(k);
  }

  protected _reprParams(): string[] {
    return [String(this.lambda)];
  }
}

class Bernoulli extends Distribution {
  name = "flip";
  constructor(public p: number) {
    super();
    if (p < 0 || p > 1) {
      throw new Error("flip: p must be in [0,1]");
    }
  }

  sample(rng: () => number = Math.random): boolean {
    return rng() < this.p;
  }

  logProb(x: unknown): number {
    const value = Boolean(x);
    if (value) {
      return this.p > 0 ? Math.log(this.p) : -Infinity;
    }
    return this.p < 1 ? Math.log(1 - this.p) : -Infinity;
  }

  params(): number[] {
    const clipped = clamp(this.p, 1e-12, 1 - 1e-12);
    return [Math.log(clipped / (1 - clipped))];
  }

  withParams(theta: number[]): Bernoulli {
    return new Bernoulli(1.0 / (1.0 + Math.exp(-theta[0])));
  }

  gradLogProb(x: unknown): number[] {
    return [(Boolean(x) ? 1.0 : 0.0) - this.p];
  }

  protected _reprParams(): string[] {
    return [String(this.p)];
  }
}

class Discrete extends Distribution {
  name = "discrete";
  constructor(public probs: number[]) {
    super();
    const sum = probs.reduce((a, b) => a + b, 0);
    if (probs.some((p) => p < 0) || sum <= 0) {
      throw new Error("discrete: invalid probability vector");
    }
    this.probs = probs.map((p) => p / sum);
  }

  sample(rng: () => number = Math.random): number {
    const r = rng();
    let cumulative = 0;
    for (let i = 0; i < this.probs.length; i += 1) {
      cumulative += this.probs[i];
      if (r < cumulative) {
        return i;
      }
    }
    return this.probs.length - 1;
  }

  logProb(x: unknown): number {
    const k = Math.floor(Number(x));
    if (k < 0 || k >= this.probs.length || this.probs[k] <= 0) {
      return -Infinity;
    }
    return Math.log(this.probs[k]);
  }

  params(): number[] {
    return this.probs.map((p) => Math.log(clamp(p, 1e-12, 1)));
  }

  withParams(theta: number[]): Discrete {
    return new Discrete(softmax(theta));
  }

  gradLogProb(x: unknown): number[] {
    const k = Math.floor(Number(x));
    const onehot = this.probs.map((_, i) => (i === k ? 1 : 0));
    return onehot.map((v, i) => v - this.probs[i]);
  }

  protected _reprParams(): string[] {
    return [JSON.stringify(this.probs)];
  }
}

class UniformDiscrete extends Distribution {
  name = "uniform-discrete";
  constructor(public lo: number, public hi: number) {
    super();
    if (!(hi > lo)) {
      throw new Error("uniform-discrete: requires hi > lo");
    }
  }

  sample(rng: () => number = Math.random): number {
    return Math.floor(rng() * (this.hi - this.lo)) + this.lo;
  }

  logProb(x: unknown): number {
    const k = Math.floor(Number(x));
    return k >= this.lo && k < this.hi ? -Math.log(this.hi - this.lo) : -Infinity;
  }

  protected _reprParams(): string[] {
    return [String(this.lo), String(this.hi)];
  }
}

class Dirichlet extends Distribution {
  name = "dirichlet";
  constructor(public alphas: number[]) {
    super();
    if (alphas.some((alpha) => alpha <= 0)) {
      throw new Error("dirichlet: alphas must be > 0");
    }
  }

  sample(rng: () => number = Math.random): number[] {
    const draws = this.alphas.map((alpha) => gammaSample(alpha, 1.0, rng));
    const total = draws.reduce((a, b) => a + b, 0);
    return draws.map((value) => value / total);
  }

  logProb(x: unknown): number {
    if (!Array.isArray(x) || x.length !== this.alphas.length) {
      return -Infinity;
    }
    const values = x.map(Number);
    if (values.some((v) => v <= 0)) {
      return -Infinity;
    }
    const a = this.alphas;
    const logB = a.reduce((acc, alpha) => acc + Math.log(gamma(alpha)), 0) - Math.log(gamma(a.reduce((acc, value) => acc + value, 0)));
    return values.reduce((acc, value, i) => acc + (a[i] - 1) * Math.log(value), 0) - logB;
  }

  protected _reprParams(): string[] {
    return [JSON.stringify(this.alphas)];
  }
}

function logFactorial(n: number): number {
  let result = 0;
  for (let i = 2; i <= n; i += 1) {
    result += Math.log(i);
  }
  return result;
}

function gamma(x: number): number {
  const coeff = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < coeff.length; j += 1) {
    y += 1;
    ser += coeff[j] / y;
  }
  return Math.exp(-tmp + Math.log(2.5066282746310005 * ser / x));
}

function discreteCtor(...args: unknown[]): Discrete {
  if (args.length === 1 && Array.isArray(args[0])) {
    return new Discrete((args[0] as unknown[]).map(Number));
  }
  return new Discrete(args.map(Number));
}

function dirichletCtor(...args: unknown[]): Dirichlet {
  if (args.length === 1 && Array.isArray(args[0])) {
    return new Dirichlet((args[0] as unknown[]).map(Number));
  }
  return new Dirichlet(args.map(Number));
}

const DISTRIBUTIONS: Record<string, (...args: unknown[]) => Distribution> = {
  normal: (mu, sigma) => new Normal(Number(mu), Number(sigma)),
  "log-normal": (mu, sigma) => new LogNormal(Number(mu), Number(sigma)),
  beta: (alpha, beta) => new Beta(Number(alpha), Number(beta)),
  gamma: (shape, rate) => new Gamma(Number(shape), Number(rate)),
  exponential: (rate) => new Exponential(Number(rate)),
  "uniform-continuous": (a, b) => new Uniform(Number(a), Number(b)),
  uniform: (a, b) => new Uniform(Number(a), Number(b)),
  poisson: (lam) => new Poisson(Number(lam)),
  bernoulli: (p) => new Bernoulli(Number(p)),
  flip: (p) => new Bernoulli(Number(p)),
  discrete: (...args) => discreteCtor(...args),
  categorical: (...args) => discreteCtor(...args),
  "uniform-discrete": (lo, hi) => new UniformDiscrete(Number(lo), Number(hi)),
  dirichlet: (...args) => dirichletCtor(...args),
};

function makeGuide(d: Distribution): Distribution {
  if (d instanceof Normal) {
    return new Normal(d.mu, d.sigma);
  }
  if (d instanceof LogNormal) {
    return new LogNormal(d.mu, d.sigma);
  }
  if (d instanceof Gamma || d instanceof Exponential || d instanceof Beta) {
    return new LogNormal(0.0, 1.0);
  }
  if (d instanceof Bernoulli) {
    return new Bernoulli(d.p);
  }
  if (d instanceof Discrete) {
    return new Discrete([...d.probs]);
  }
  throw new Error(`no optimizable guide family for distribution ${d.name}`);
}

export {Distribution, Normal, LogNormal, Beta, Gamma, Exponential, Uniform, Poisson, Bernoulli, Discrete, UniformDiscrete, Dirichlet, DISTRIBUTIONS, makeGuide};
