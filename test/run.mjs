// Oak test suite: verifies that the combined acorn (parser) + acorn-walk
// (walker) package behaves correctly.

import assert from "node:assert/strict"
import * as oak from "../dist/oak.mjs"

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok - ${name}`)
  } catch (e) {
    failed++
    console.error(`not ok - ${name}`)
    console.error(e)
  }
}

// --- acorn: parsing ---------------------------------------------------------

test("parse returns a Program node", () => {
  const ast = oak.parse("1 + 1", {ecmaVersion: 2020})
  assert.equal(ast.type, "Program")
  assert.equal(ast.body.length, 1)
  assert.equal(ast.body[0].type, "ExpressionStatement")
})

test("parse with locations attaches loc objects", () => {
  const ast = oak.parse("1 + 1", {ecmaVersion: 2020, locations: true})
  assert.ok(ast.loc)
  assert.equal(ast.loc.start.line, 1)
  assert.equal(ast.loc.start.column, 0)
})

test("parseExpressionAt parses a single expression", () => {
  const expr = oak.parseExpressionAt("1 + 1; more", 0, {ecmaVersion: 2020})
  assert.equal(expr.type, "BinaryExpression")
  assert.equal(expr.operator, "+")
})

test("parse module source type", () => {
  const ast = oak.parse("import x from 'y'", {ecmaVersion: 2020, sourceType: "module"})
  assert.equal(ast.body[0].type, "ImportDeclaration")
})

test("tokenizer yields tokens ending at eof", () => {
  const tokenizer = oak.tokenizer("1 + 1", {ecmaVersion: 2020})
  const tokens = []
  let token
  do {
    token = tokenizer.getToken()
    tokens.push(token)
  } while (token.type !== oak.tokTypes.eof)
  assert.equal(tokens[tokens.length - 1].type, oak.tokTypes.eof)
  assert.ok(tokens.length > 1)
})

test("syntax errors are thrown as SyntaxError", () => {
  assert.throws(
    () => oak.parse("1 +", {ecmaVersion: 2020}),
    SyntaxError
  )
})

test("Parser class is exported and usable", () => {
  assert.equal(typeof oak.Parser, "function")
  const ast = oak.Parser.parse("42", {ecmaVersion: 2020})
  assert.equal(ast.body[0].expression.value, 42)
})

test("tokTypes and tokContexts are exported", () => {
  assert.ok(oak.tokTypes.eof)
  assert.ok(oak.tokTypes.num)
  assert.ok(oak.tokContexts)
})

test("getLineInfo computes line/column", () => {
  const info = oak.getLineInfo("abc\ndef", 5)
  assert.equal(info.line, 2)
  assert.equal(info.column, 1)
})

// --- acorn-walk: walking ----------------------------------------------------

test("simple visits Literal nodes", () => {
  const ast = oak.parse("let x = 10 + 20", {ecmaVersion: 2020})
  const values = []
  oak.simple(ast, {
    Literal(node) { values.push(node.value) }
  })
  assert.deepEqual(values, [10, 20])
})

test("simple visits aggregate Expression nodes", () => {
  const ast = oak.parse("foo(1, 2, 3)", {ecmaVersion: 2020})
  const exprs = []
  oak.simple(ast, {
    Expression(node) { exprs.push(node.type) }
  })
  assert.ok(exprs.includes("CallExpression"))
})

test("ancestor passes the ancestor stack", () => {
  const ast = oak.parse("foo('hi')", {ecmaVersion: 2020})
  let ancestorTypes = []
  oak.ancestor(ast, {
    Literal(_node, _state, ancestors) {
      ancestorTypes = ancestors.map(n => n.type)
    }
  })
  assert.equal(ancestorTypes[ancestorTypes.length - 1], "Literal")
  assert.ok(ancestorTypes.includes("CallExpression"))
  assert.ok(ancestorTypes.includes("Program"))
})

test("full calls back for every node", () => {
  const ast = oak.parse("1 + 1", {ecmaVersion: 2020})
  const types = []
  oak.full(ast, node => { types.push(node.type) })
  assert.ok(types.includes("Program"))
  assert.ok(types.includes("BinaryExpression"))
  assert.ok(types.includes("Literal"))
})

test("make builds a custom walker from base", () => {
  const custom = oak.make({
    Literal(node, st, c) {
      st.count = (st.count || 0) + 1
    }
  })
  const ast = oak.parse("1 + 2 + 3", {ecmaVersion: 2020})
  const state = {}
  oak.recursive(ast, state, custom)
  assert.equal(state.count, 3)
})

test("findNodeAt locates a node by offset", () => {
  const ast = oak.parse("1 + 2", {ecmaVersion: 2020, locations: true, ranges: true})
  const found = oak.findNodeAt(ast, ast.body[0].expression.left.start, ast.body[0].expression.left.end, "Literal")
  assert.ok(found)
  assert.equal(found.node.value, 1)
})

test("findNodeAround finds a spanning node", () => {
  const ast = oak.parse("1 + 2", {ecmaVersion: 2020})
  const mid = 2 // inside the BinaryExpression
  const found = oak.findNodeAround(ast, mid, "BinaryExpression")
  assert.ok(found)
  assert.equal(found.node.type, "BinaryExpression")
})

test("base walker is exported", () => {
  assert.equal(typeof oak.base, "object")
  assert.equal(typeof oak.base.Program, "function")
})

// --- combined: parse + walk together ----------------------------------------

test("parse then walk end to end", () => {
  const source = "const add = (a, b) => a + b"
  const ast = oak.parse(source, {ecmaVersion: 2020})
  const identifiers = []
  const patterns = []
  oak.simple(ast, {
    Identifier(node) { identifiers.push(node.name) },
    VariablePattern(node) { patterns.push(node.name) }
  })
  // `a` and `b` in the arrow body are expression identifiers; the declared
  // `add` and the params `a`, `b` are walked as VariablePattern.
  assert.deepEqual(identifiers, ["a", "b"])
  assert.deepEqual(patterns, ["add", "a", "b"])
})

// --- extra utilities --------------------------------------------------------

test("parseAndWalk parses and walks in one call", () => {
  const values = []
  const ast = oak.parseAndWalk("1 + 2", {
    Literal(node) { values.push(node.value) }
  }, {ecmaVersion: 2020})
  assert.equal(ast.type, "Program")
  assert.deepEqual(values, [1, 2])
})

test("transform returns a new tree and leaves the original intact", () => {
  const original = oak.parse("1 + 2", {ecmaVersion: 2020})
  const doubled = oak.transform(original, {
    Literal(node) { return {...node, value: node.value * 2} }
  })
  assert.equal(original.body[0].expression.left.value, 1)
  assert.equal(original.body[0].expression.right.value, 2)
  assert.equal(doubled.body[0].expression.left.value, 2)
  assert.equal(doubled.body[0].expression.right.value, 4)
  assert.notEqual(doubled, original)
})

test("transform recurses into children before running visitors", () => {
  const ast = oak.parse("foo(bar())", {ecmaVersion: 2020})
  const seen = []
  const out = oak.transform(ast, {
    Identifier(node) {
      seen.push(node.name)
      return node
    }
  })
  // depth-first, left-to-right: callee `foo` before the argument subtree
  assert.deepEqual(seen, ["foo", "bar"])
  assert.equal(out.body[0].type, "ExpressionStatement")
})

test("collect gathers nodes matching a type string", () => {
  const ast = oak.parse("a + b + c", {ecmaVersion: 2020})
  const names = oak.collect(ast, "Identifier").map(n => n.name)
  assert.deepEqual(names, ["a", "b", "c"])
})

test("collect supports a predicate function", () => {
  const ast = oak.parse("1 + 2 + 3", {ecmaVersion: 2020})
  const values = oak.collect(ast, (type, node) => type === "Literal" ? node.value > 1 : false)
  assert.deepEqual(values.map(n => n.value), [2, 3])
})

test("collect with null test gathers every node", () => {
  const ast = oak.parse("1", {ecmaVersion: 2020})
  const all = oak.collect(ast, null)
  assert.ok(all.some(n => n.type === "Program"))
  assert.ok(all.some(n => n.type === "Literal"))
})

test("version reflects oak, not bundled acorn", () => {
  assert.equal(oak.version, "0.9.9-rc001")
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
