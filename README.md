# oak

**acorn + acorn-walk = oak**

Oak is a single JavaScript package that bundles the
[acorn](https://github.com/acornjs/acorn) ECMAScript parser together with the
[acorn-walk](https://github.com/acornjs/acorn) ESTree AST walker. It is a
**1:1 drop-in replacement** for both libraries under one import, and adds a few
extra AST utilities on top.

Install it as `@stormofhoney/oak` and everything you previously imported from
`acorn` and `acorn-walk` is available under one namespace:

```js
import * as oak from "@stormofhoney/oak"

// acorn: parse
const ast = oak.parse("1 + 1", {ecmaVersion: 2020})

// acorn-walk: walk
oak.simple(ast, {
  Literal(node) {
    console.log(`Found a literal: ${node.value}`)
  }
})
```

## Why Oak

Projects that previously depended on `acorn` and `acorn-walk` can swap both for
`@stormofhoney/oak` without changing any call sites — the parser and walker
APIs behave exactly as they did. In addition, Oak provides convenience helpers
that chain the two together and transform or inspect trees in one step.

## Installation

```sh
npm install @stormofhoney/oak
```

## Drop-in API

Everything exported by `acorn` and `acorn-walk` is available under one import,
unchanged:

- **From acorn (parser):** `parse`, `parseExpressionAt`, `tokenizer`,
  `Parser`, `tokTypes`, `tokContexts`, `keywordTypes`, `defaultOptions`,
  `getLineInfo`, `Node`, `Token`, `TokenType`, `TokContext`, `Position`,
  `SourceLocation`, `isIdentifierStart`, `isIdentifierChar`, `isNewLine`,
  `lineBreak`, `lineBreakG`, `nonASCIIwhitespace`.
- **From acorn-walk (walker):** `simple`, `ancestor`, `recursive`, `make`,
  `full`, `fullAncestor`, `findNodeAt`, `findNodeAround`, `findNodeAfter`,
  `findNodeBefore`, `base`.

`version` reflects Oak's own version.

### Migration from acorn + acorn-walk

Before:

```js
import * as acorn from "acorn"
import * as walk from "acorn-walk"

const ast = acorn.parse("1 + 1", {ecmaVersion: 2020})
walk.simple(ast, { Literal(node) { /* ... */ } })
```

After:

```js
import * as oak from "@stormofhoney/oak"

const ast = oak.parse("1 + 1", {ecmaVersion: 2020})
oak.simple(ast, { Literal(node) { /* ... */ } })
```

The function signatures and behaviour are identical — `oak.parse` is acorn's
`parse`, and `oak.simple` is acorn-walk's `simple`.

## Usage

### Parsing

```js
import * as oak from "@stormofhoney/oak"

const ast = oak.parse("let x = 10", {ecmaVersion: 2020})
console.log(ast.type) // "Program"
```

`parse(input, options)` returns an ESTree-compatible abstract syntax tree.
`options` accepts the full set of acorn options (`ecmaVersion`, `sourceType`,
`locations`, `ranges`, `onToken`, `onComment`, `allowReturnOutsideFunction`,
and so on). See the [acorn README](https://github.com/acornjs/acorn) for the
complete list.

### Walking

```js
import * as oak from "@stormofhoney/oak"

const ast = oak.parse("foo('hi')", {ecmaVersion: 2020})

// simple — visit nodes by type
oak.simple(ast, {
  Literal(node) {
    console.log(`Found a literal: ${node.value}`)
  }
})

// ancestor — callbacks also receive the ancestor stack
oak.ancestor(ast, {
  Literal(_node, _state, ancestors) {
    console.log("ancestors:", ancestors.map(n => n.type))
  }
})

// full — callback for every node
oak.full(ast, node => {
  console.log(`${node.type} at ${node.start}`)
})
```

### Extra utilities

Oak goes beyond the 1:1 API with a few helpers that build on both libraries:

**`parseAndWalk(input, visitors, options)`** — parse a source string and run a
`simple` walk over the resulting AST in one call. Returns the AST.

```js
const ast = oak.parseAndWalk("let x = 10 + 20", {
  Literal(node) { console.log(node.value) }
}, {ecmaVersion: 2020})
```

**`transform(node, visitors, state)`** — an immutable structural transform. It
returns a new tree with children transformed before each visitor runs, and
never mutates the original. Visitors `(node, state)` should return the (possibly
new) node for that type; unhandled node types are cloned with transformed
children.

```js
const original = oak.parse("1 + 2", {ecmaVersion: 2020})
const doubled = oak.transform(original, {
  Literal(node) { return {...node, value: node.value * 2} }
})
// original is unchanged; doubled has values 2 and 4
```

**`collect(node, test, base, state)`** — walk a tree and return an array of
every node satisfying `test`. `test` may be a node-type string, a
`(type, node) => boolean` predicate, or `null`/`undefined` to collect every
node.

```js
const ast = oak.parse("a + b + c", {ecmaVersion: 2020})
const names = oak.collect(ast, "Identifier").map(n => n.name)
// ["a", "b", "c"]
```

## Command line

Oak ships a CLI that wraps acorn's, with an added `--walk` flag that runs a
full walk over the parsed tree and prints the node types encountered.

```sh
# Parse a file and print its AST as JSON
oak --ecma2020 --locations file.js

# Read from stdin
cat file.js | oak --module

# Tokenize instead of parsing
oak --tokenize file.js

# Parse and walk, printing the node types in visitation order
oak --walk file.js
```

CLI flags: `--ecma3|--ecma5|--ecma6|…|--ecma2026`, `--module`, `--tokenize`,
`--walk`, `--locations`, `--allow-hash-bang`, `--allow-await-outside-function`,
`--compact`, `--silent`, `--help`.

## Building

Oak vendors the acorn and acorn-walk sources under `src/` and bundles them with
Rollup.

```sh
npm install
npm run build
```

This produces `dist/oak.js` (UMD), `dist/oak.mjs` (ESM), `dist/bin.js` (CLI),
and `dist/oak.d.ts` / `dist/oak.d.mts` (combined type declarations).

## Testing

```sh
npm test
```

The test suite parses and walks a variety of inputs, verifies the 1:1 API, and
checks the extra utilities.

## License

[MIT](./LICENSE)
