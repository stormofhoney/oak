// Oak's extra capabilities — built on top of the bundled acorn parser and
// acorn-walk walker. These go beyond the 1:1 acorn + acorn-walk API.

import {parse} from "./acorn/index.js"
import {full, simple} from "./walk/index.js"

// parseAndWalk(input, visitors, options) parses a source string and runs a
// simple walk over the resulting AST in a single call. The parsed AST is
// returned so callers can still use it after the walk.
//
// This is a convenience wrapper around `parse` + `simple`, removing the need
// to import and chain both steps manually.
export function parseAndWalk(input, visitors, options) {
  const ast = parse(input, options)
  simple(ast, visitors)
  return ast
}

function isNode(value) {
  return value != null && typeof value === "object" && typeof value.type === "string"
}

// transform(node, visitors, state) performs a generic, immutable structural
// transform of an ESTree-compatible tree and returns a new tree.
//
// Visitors are called as (node, state) and should return the (possibly new)
// node for that type. Node types without a visitor are cloned with their
// children recursively transformed. The original tree is never mutated.
//
// Children are transformed before the visitor runs, so a visitor always sees
// its child nodes already transformed.
export function transform(node, visitors, state) {
  return transformNode(node, state, visitors)
}

function transformNode(node, state, visitors) {
  const children = transformChildren(node, state, visitors)
  const clone = Object.assign({}, node, children)
  const fn = visitors[node.type]
  const result = fn ? fn(clone, state) : clone
  return result !== undefined ? result : clone
}

function transformChildren(node, state, visitors) {
  const out = {}
  for (let key of Object.keys(node)) {
    if (key === "type") continue
    const value = node[key]
    if (isNode(value)) {
      out[key] = transformNode(value, state, visitors)
    } else if (Array.isArray(value)) {
      out[key] = value.map(item => isNode(item) ? transformNode(item, state, visitors) : item)
    } else {
      out[key] = value
    }
  }
  return out
}

// collect(node, test, base, state) walks a tree and returns an array of every
// node that satisfies the predicate `test`.
//
// `test` may be a string (a node type) or a function (type, node) => boolean.
// Passing `null`/`undefined` collects every node. This complements the
// acorn-walk find* helpers, which return a single node.
export function collect(node, test, base, state) {
  const result = []
  let predicate
  if (typeof test === "string") {
    predicate = (type) => type === test
  } else if (!test) {
    predicate = () => true
  } else {
    predicate = test
  }
  full(node, (n, st, type) => {
    if (predicate(type, n)) result.push(n)
  }, base, state)
  return result
}
