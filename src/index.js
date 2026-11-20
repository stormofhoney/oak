// Oak — acorn (ECMAScript parser) + acorn-walk (ESTree AST walker), combined
// into a single package and namespace.
//
//   import * as oak from "oak"
//   const ast = oak.parse("1 + 1", {ecmaVersion: 2020})
//   oak.simple(ast, { Literal(node) { console.log(node.value) } })
//
// Everything exported by acorn (parse, Parser, tokenizer, tokTypes, …) and
// everything exported by acorn-walk (simple, ancestor, full, make, base, …)
// is available here under one namespace.

export * from "./acorn/index.js"
export * from "./walk/index.js"
export * from "./extras.js"

// Oak's own version. The star export above would otherwise surface the bundled
// acorn version; a local export takes precedence over star exports.
export const version = "0.9.9-rc001"
