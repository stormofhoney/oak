// Type declarations for Oak's extra utilities (parseAndWalk, transform,
// collect). These are concatenated into the combined oak.d.ts by
// scripts/build-types.mjs, so the types below reference the acorn and
// acorn-walk declarations emitted earlier in the same file directly (no
// import needed).

export type TransformVisitors<TState> = {
  [type in string]?: (node: AnyNode, state: TState) => AnyNode | undefined
}

export type CollectPredicate = (type: string, node: AnyNode) => boolean

/**
 * Parse a source string and run a simple walk over the resulting AST in one
 * call. Returns the parsed AST.
 */
export function parseAndWalk<TState>(
  input: string,
  visitors: SimpleVisitors<TState>,
  options: Options
): Program

/**
 * Immutable structural transform: returns a new tree with children
 * transformed before each visitor runs. The original tree is not mutated.
 * Visitors should return the (possibly new) node; returning undefined keeps
 * the automatically cloned node.
 */
export function transform<TState>(
  node: Node,
  visitors: TransformVisitors<TState>,
  state?: TState
): Node

/**
 * Walk a tree and return every node satisfying `test`. `test` may be a node
 * type string, a predicate function, or null/undefined to collect every node.
 */
export function collect<TState>(
  node: Node,
  test: string | CollectPredicate | null | undefined,
  base?: RecursiveVisitors<TState>,
  state?: TState
): AnyNode[]
