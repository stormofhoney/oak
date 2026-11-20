import {readFile, writeFile} from "node:fs/promises"
import buble from "@rollup/plugin-buble"

const copy = (from, to) => ({
  async writeBundle() { await writeFile(to, await readFile(from)) }
})

export default [
  // The combined Oak bundle: acorn (parser) + acorn-walk (walker).
  {
    input: "src/index.js",
    output: [
      {
        file: "dist/oak.js",
        format: "umd",
        name: "oak"
      },
      {
        file: "dist/oak.mjs",
        format: "es"
      }
    ],
    plugins: [
      buble({transforms: {dangerousForOf: true}})
    ]
  },
  // Command line interface.
  {
    external: ["oak", "fs", "path"],
    input: "src/bin/oak.js",
    output: {
      file: "dist/bin.js",
      format: "cjs",
      paths: {oak: "./oak.js"}
    },
    plugins: [
      buble({transforms: {dangerousForOf: true}})
    ]
  }
]
