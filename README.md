# Probabilistic Language in TypeScript

This project features a Probabilistic Programming Language (PPL) implementation written in TypeScript, designed to let users author and execute probabilistic programs utilizing primitives like sample and observe across a variety of inference algorithms. The implementation is base on the concepts of the book "An Introduction to Probabilistic Programming" by Jan-Willem van de Meent, this architecture is built for both exploration and extensibility; it allows you to explore pre-defined inference engines or easily implement your own custom inference algorithms. Leveraging TypeScript’s strong type system ensures complete transparency when interacting with the parsed expression, simplifying  debugging while making the  syntax of the language extensible.

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

Based on the concepts of the book (Cover over chapter 6), the inference engine is decoupled from the standard execution of program expressions. The syntax of a HOPL expression allows us to define an inference controller, which acts as the object responsible for executing the chosen inference algorithm.

When the program encounters an observe or sample expression, the execution flow is handed over to this controller. Within the controller, the specific behavior for these probabilistic expressions is defined based on the active inference algorithm. To support this architecture, we implement an abstract controller that provides standard interfaces for handling sample, observe, or done expressions. Depending on the specific inference method you wish to deploy, you can simply extend this abstract controller and override these specific methods. Crucially, the execution logic for non-probabilistic expressions remains identical across all inference controllers you define.

To successfully implement this architectural decoupling, a double dispatch pattern is used. When a probabilistic expression continuation is encountered, a message its sent to the inference controllet. This message accepts the controller as an argument and dispatches back to it, dynamically determining exactly which method (sample, observe, or done) the controller needs to execute based on both the controller's type and the expression's type.

This approach naturally aligns with a client/server architecture. This not only separates the probabilistic logic from standard execution but also provides the flexibility to run both components on entirely different machines.

Finally, to improve readability, maintainability, and future expansion of the language, we define a clear class hierarchy for instructions and primitive expressions. This structural design simplifies debugging and tracing the execution flow, while simultaneously allowing us to easily extend the language with new primitive instructions without altering the runtime engine.

## Features

- **S-Expression Parser**: Parses Lisp-like syntax with support for:
  - Numeric literals (integers, floats, scientific notation)
  - Symbols and keywords
  - Lists and vectors
  - Hash maps
  - One of the greatest advantages of this architecture is that the parser codifies each primitive instruction (such as let, observe, and sample) as a unique object, with each one implementing its own evaluate method. By establishing this class hierarchy, when the runtime encounters an instruction, it simply needs to invoke that specific method, completely abstracting the evaluation logic from the execution runtime itself. This decoupled design allows you to introduce new primitive instructions without needing to modify the runtime engine.
  
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
  - **Likelihood Weighting**: takes three parameters: the program expression to evaluate, a random number generator (RNG) function, and a sample size ($steps$) representing the number of independent program execution traces to generate. As the virtual machine executes each trace, the algorithm tracks and updates an importance weight based on the evidence encountered at each observe expression. The algorithm returns a pair consisting of the sampled execution values and their corresponding normalized importance weights. Because weights are accumulated in log-space to prevent numerical underflow, the final probability distribution is obtained by applying the Softmax function.
  - **Metropolis-Hastings**: this approach maintains a single, continuous execution trace, updating its state based on an acceptance probability, $\alpha$. This parameter determines whether the runtime transitions to a newly execution state or retains the current one. However, tracking these execution traces requires address codification.
  - **Sequential Monte Carlo**: The algorithm executes multiple instances of the same program simultaneously, tracking them as a population of particles. When the execution encounters an observe expression, a resampling step is triggered to dynamically replicate particles with higher importance weights and eliminate those with lower weights. The final output is an array containing the values obtained from each surviving particle trace at the end of the execution.

  - Every inference algorithm implements its own statistical mean. This allows us to compare the performance and execution results of completely different inference algorithms while running them against the exact program. Main.ts possess some examples on how to invoke the mean method for every controller.

  - For nos probabilistic expression the parameters and mean methods are useless. It will evealute the expression whituot reaching the controllers

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
│   ├── Execution.ts                 # Stack-based virtual machine
│   ├── Intructions.ts               # VM instruction definitions
│   └── Messages.ts                  # Message passing between VM and controllers
└── controllers/
    ├── Controller.ts                # Abstract controller base class
    ├── LikehoodWeighting.ts          # Likelihood Weighting inference
    ├── MetropolisHasting.ts          # Metropolis-Hastings inference
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
- Primitive expressions

### Runtime (`runtime/`)

- **Execution**: Stack-based virtual machine with:
  - Control stack for instructions
  - Value stack for operands
  - Environment for variable bindings
  - Contains useful instruccions to modify the value and control stack
  
- **Instructions**: Continuation-based execution:
  - `Evaluate`: Evaluate an expression. The way every primitive expression its evaluated can be found on the sexpr.ts file.
  - `LetContinuation`: Handle let bindings
  - `IfContinuation`: Handle conditionals
  - `CallContinuation`: Handle function calls
  - `SampleContinuation`: Handle sampling
  - `ObserveContinuation`: Handle observations

### Controllers

Each inference algorithm extends `Controller`:
- Implements the `run()` method for inference
- Handles `sample()` and `observe()` messages from the Runtime. A `done()` method its also provided, which determiantes when inference finish
- Manages particle weights
- Inside many private methods can be implemented to improve the logic of your own controller

### Language (`language/`)

- **Distributions**: Implementations of probability distributions with sampling and log-probability evaluation
- **Primitives**: Built-in functions and their implementations

## Examples

### Example 1: Simple Sampling

```typescript
// In main.ts
let program = "(sample (normal 0 1))"

const controller = new LikehoodWeighting()
const result = controller.run(program, {rng:Math.random, steps: 3})
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
const result = controller.run(program, {rng: Math.random, steps: 100000})
```

### Example 3: Using Different Inference Algorithms

```typescript
// Metropolis-Hastings
const mhController = new MetropolisHasting()
const mhResult = mhController.run(program, {rng: Math.random, steps: 60000, warmup: 3000})

// Sequential Monte Carlo
const smcController = new SecuentialMonteCarlo()
const smcResult = smcController.run(program, {rng:Math.random, rngs: new Array(20000).fill(Math.random), steps: 20000})
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

## Future Improvements
- Incorporate named function to the sintaxis of the lengauge
- Improve address codification for Metropolis Hasting
- Incorporate automatic testing
- Incorporate visualizers for the inference controllers
- Improve error handling
