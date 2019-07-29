'use strict';
const fs = require('fs');
const fetch = require('node-fetch');

const RESIZER_WASM = 'resizer.wasm'
// 🐶🐶🐶
const DEFAULT_IMAGE = 'https://bit.ly/2ZlP838'
const DEFAULT_WIDTH = '250'

// Used to cache loaded WASM instance and memory reference
// between warm invocations.
let wasm

async function load_wasm (path) {
  if (!wasm) {
    const bytes = fs.readFileSync(path);
    const wasmModule = new WebAssembly.Module(bytes);

    // Instantiate the WebAssembly module with 32MB of memory.
    const wasmMemory = new WebAssembly.Memory({initial: 512});
    const env = { memory: wasmMemory }
    const wasmInstance = new WebAssembly.Instance(
      wasmModule,
      // This second parameter is the imports object. Our module imports its memory object (so that
      // we can allocate it ourselves), but doesn't require any other imports.
      {env: {memory: wasmMemory}})

    wasm = { resizer: wasmInstance.exports, memoryBytes: new Uint8Array(wasmMemory.buffer) }
  }
  
  return wasm
}

async function main({ url = DEFAULT_IMAGE, width = DEFAULT_WIDTH }) {
  // Forward the request to our origin.
  console.time('fetch')
  let response = await fetch(url)
  console.timeEnd('fetch')

  if (!response.ok) throw new Error('Unable to fetch URL.')
  const type = response.headers.get("Content-Type") || ""
  if (!type.startsWith("image/")) throw new Error('URL is not an image.')

  console.time('load_wasm')
  const { resizer, memoryBytes } = await load_wasm(RESIZER_WASM)
  console.timeEnd('load_wasm')

  // OK, we're going to resize. First, read the image data into memory.
  let bytes = new Uint8Array(await response.arrayBuffer())

  console.log(`${bytes.length} byte image ready for resizing...`)
  // Call our WebAssembly module's init() function to allocate space for
  // the image.
  console.time('init')
  const ptr = resizer.init(bytes.length)
  console.timeEnd('init')

  // Copy the image into WebAssembly memory.
  memoryBytes.set(bytes, ptr)

  console.time('resize')
  // Call our WebAssembly module's resize() function to perform the resize.
  const newSize = resizer.resize(bytes.length, parseInt(width, 10))
  console.timeEnd('resize')

  if (newSize == 0) {
    throw new Error('Failed to process image.')
  }

  // Extract the result bytes from WebAssembly memory.
  const resultBytes = memoryBytes.slice(ptr, ptr + newSize)
  const body = Buffer.from(resultBytes).toString('base64');
  const headers = { 'Content-Type': 'image/jpeg' }

  // Return the response.
  return { headers, body };
}

module.exports = { main }
