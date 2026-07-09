# Probabilistic Language in TypeScript

A probabilistic programming language implementation written in TypeScript that enables users to write and execute probabilistic programs with support for sampling, observing, and various inference algorithms.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
  - [Building](#building)
  - [Running Programs](#running-programs)
  - [Debugging](#debugging)
- [Language Syntax](#language-syntax)
- [Architecture](#architecture)
- [Examples](#examples)
- [Contributing](#contributing)

## Overview

This project implements a probabilistic programming language that allows you to:

- Define probabilistic programs using S-expression syntax
- Use sampling and observation operations for inference
- Execute programs with multiple inference algorithms (Likelihood Weighting, Metropolis-Hastings, Sequential Monte Carlo)
- Work with various probability distributions (Normal, Beta, Uniform, etc.)

The language runtime uses a stack-based virtual machine with continuation-passing style for efficient program execution.

## Features

- **S-Expression Parser**: Parses Lisp-like syntax with support for:
  - Numeric literals (integers, floats, scientific notation)
  - Symbols and keywords
  - Lists and vectors
  - Hash maps
  
- **Probability Distributions**:
  - Normal distribution
  - Beta distribution
  - Uniform distribution
  - Exponential distribution
  - Discrete distributions
  - And more...

- **Language Constructs**:
  - `let` bindings for variable declaration
  - `if` conditionals
  - `sample` for probabilistic sampling
  - `observe` for conditioning on observations
  - Function calls and primitive operations

- **Inference Algorithms**:
  - **Likelihood Weighting**: Fast approximate inference
  - **Metropolis-Hastings**: MCMC sampling
  - **Sequential Monte Carlo**: Particle filtering

- **Debugging Support**: VS Code integration with launch configurations for debugging TypeScript and compiled JavaScript

## Project Structure

```
├── main.ts                          # Entry point for the program
├── package.json                     # Project dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── .vscode/                         # VS Code debugging configuration
│   ├── launch.json                  # Debug launch configurations
│   └── tasks.json                   # Build tasks
├── parser/
│   └── sexpr.ts                     # S-expression parser
├── language/
│   ├── distributions.ts             # Probability distribution implementations
│   └── primitives.ts                # Primitive operations and functions
├── runtime/
│   ├── machine.ts                   # Stack-based virtual machine
│   ├── Intructions.ts               # VM instruction definitions
│   └── Messages.ts                  # Message passing between VM and controllers
└── controllers/
    ├── Controller.ts                # Abstract controller base class
    ├── LikehoodWeighting.ts          # Likelihood Weighting inference
    ├── MH.ts                         # Metropolis-Hastings inference
    └── SecuentialMonteCarlo.ts       # Sequential Monte Carlo inference
```

## Installation

### Prerequisites

- Node.js v20 or higher
- npm (comes with Node.js)

### Steps

1. Clone or navigate to the project directory:
```bash
cd /path/to/Probabilistic-Language-ts
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript project:
```bash
npm run build
```

## Usage

### Building

To compile TypeScript to JavaScript:

```bash
npm run build
```

This generates compiled JavaScript files in the `dist/` directory.

### Running Programs

#### Option 1: Run compiled JavaScript (recommended for production)

```bash
npx tsc && node dist/main.js
```

#### Option 2: Run TypeScript directly with ts-node (for development)

```bash
npm run dev
```

Or manually:

```bash
node --loader ts-node/esm main.ts
```

### Debugging

The project includes VS Code debugging configurations.

#### Using VS Code Debugger

1. Open VS Code in the project directory:
```bash
code .
```

2. Go to the Run and Debug view (Ctrl+Shift+D or Cmd+Shift+D)

3. Select one of the debug configurations:
   - **Debug main.ts with ts-node**: Debug TypeScript directly without compilation
   - **Debug compiled dist/main.js**: Debug the compiled JavaScript (runs build first)

4. Press F5 to start debugging

#### Using Chrome DevTools

For debugging the compiled JavaScript with Chrome:

```bash
node --inspect-brk dist/main.js
```

Then open `chrome://inspect` in Google Chrome and connect to the process.

## Language Syntax

### Basic Syntax

The language uses S-expression (Lisp-like) syntax:

```lisp
; Numbers (integers, floats, scientific notation)
42
3.14
1e-3

; Symbols
x
my-variable
normal

; Lists
(+ 1 2 3)

; Let bindings
(let [x (sample (normal 0 1))]
  (observe (normal x 1) 2.0)
  x)

; If conditional
(if (> x 0) x (- x))

; Sampling
(sample (normal 0 1))

; Observation
(observe (normal m 1) 2.0)
```

### Primitive Operations

- **Arithmetic**: `+`, `-`, `*`, `/`, `sqrt`, `exp`, `log`, `pow`, `abs`, `floor`, `ceil`
- **Comparison**: `=`, `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `and`, `or`, `not`
- **Vector Operations**: `vector`, `get`, `put`, `first`, `last`, `rest`, `nth`, `count`
- **Matrix Operations**: `mat-mul`, `mat-add`, `mat-transpose`, `mat-tanh`, `mat-relu`

### Distribution Functions

Available distributions for sampling:

- `(normal μ σ)` - Normal distribution
- `(beta α β)` - Beta distribution
- `(uniform a b)` - Uniform distribution
- `(exponential λ)` - Exponential distribution
- And more...

## Architecture

### Parser (`parser/sexpr.ts`)

Tokenizes and parses S-expressions into an abstract syntax tree. Handles:
- Numeric literals with regex validation
- String literals with escape sequences
- Symbols and keywords
- Nested lists

### Runtime (`runtime/`)

- **Machine**: Stack-based virtual machine with:
  - Control stack for instructions
  - Value stack for operands
  - Environment for variable bindings
  
- **Instructions**: Continuation-based execution:
  - `Evaluate`: Evaluate an expression
  - `LetContinuation`: Handle let bindings
  - `IfContinuation`: Handle conditionals
  - `CallContinuation`: Handle function calls
  - `SampleContinuation`: Handle sampling
  - `ObserveContinuation`: Handle observations

### Controllers

Each inference algorithm extends `Controller`:
- Implements the `run()` method for inference
- Handles `sample()` and `observe()` messages from the VM
- Manages particle weights and convergence

### Language (`language/`)

- **Distributions**: Implementations of probability distributions with sampling and log-probability evaluation
- **Primitives**: Built-in functions and their implementations

## Examples

### Example 1: Simple Sampling

```typescript
// In main.ts
let program = "(sample (normal 0 1))"

const controller = new LikehoodWeighting()
const result = controller.run(program, Math.random, [], 3)
console.log(result)
```

### Example 2: Inference with Observations

```typescript
let program = `
(let [m (sample (normal 0 1))]
  (observe (normal m 1) 2.0)
  m)
`

const controller = new LikehoodWeighting()
const result = controller.run(program, Math.random, [], 100)
```

### Example 3: Using Different Inference Algorithms

```typescript
// Metropolis-Hastings
const mhController = new MH()
const mhResult = mhController.run(program, Math.random, [Math.random], 1000, 100)

// Sequential Monte Carlo
const smcController = new SMC()
const smcResult = smcController.run(program, Math.random, [], 500)
```

## Development Workflow

1. **Edit TypeScript files** in the source directories
2. **Compile**: `npm run build`
3. **Run**: `node dist/main.js`
4. **Debug**: Use VS Code with F5
5. **Test**: Add test expressions in `testExpresion.js` (if available)

## Contributing

1. Follow the existing code style
2. Test changes with the compiler (`npm run build`)
3. Update this README if adding new features
4. Use meaningful commit messages

## License

ISC
