/**
 * zstd-wasm-lite — Minimal WASM build of official facebook/zstd
 *
 * Usage:
 *   import { init, compress, decompress } from './index.js';
 *   await init();  // or init('/path/to/zstd-wasm.wasm')
 *   const compressed = compress(data, 3);
 *   const original = decompress(compressed);
 */

let Module = null;

function heap() {
  return new Uint8Array(Module.HEAPU8.buffer);
}

/**
 * Initialize the WASM module. Must be called before compress/decompress.
 * @param {string} [wasmUrl] - Optional URL to the .wasm file
 */
export async function init(wasmUrl) {
  if (Module) return; // already initialized
  // Emscripten's MODULARIZE output assigns to global var ZstdModule
  // and uses CommonJS exports. Load via script tag in browser.
  if (typeof globalThis.ZstdModule === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./lib/zstd-wasm.js', import.meta.url).href;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  const factory = globalThis.ZstdModule;
  Module = await factory({
    locateFile: (file) => {
      if (wasmUrl) return wasmUrl;
      return new URL('./lib/' + file, import.meta.url).href;
    }
  });
}

/**
 * Compress data using zstd.
 * @param {Uint8Array|ArrayBuffer} data - Input data
 * @param {number} [level=3] - Compression level (1-22)
 * @returns {Uint8Array} Compressed data
 */
export function compress(data, level = 3) {
  if (!Module) throw new Error('Call init() first');
  const src = data instanceof Uint8Array ? data : new Uint8Array(data);
  const bound = Module._zstd_compress_bound(src.length);
  const srcPtr = Module._malloc(src.length);
  const dstPtr = Module._malloc(bound);
  try {
    heap().set(src, srcPtr);
    const size = Module._zstd_compress(srcPtr, src.length, dstPtr, bound, level);
    if (Module._zstd_is_error(size)) {
      throw new Error('zstd compression failed');
    }
    return heap().slice(dstPtr, dstPtr + size);
  } finally {
    Module._free(srcPtr);
    Module._free(dstPtr);
  }
}

/**
 * Decompress zstd-compressed data.
 * @param {Uint8Array|ArrayBuffer} data - Compressed data
 * @returns {Uint8Array} Decompressed data
 */
export function decompress(data) {
  if (!Module) throw new Error('Call init() first');
  const src = data instanceof Uint8Array ? data : new Uint8Array(data);
  const srcPtr = Module._malloc(src.length);
  heap().set(src, srcPtr);

  const frameSize = Number(Module._zstd_frame_content_size(srcPtr, src.length));
  // ZSTD_CONTENTSIZE_UNKNOWN or ZSTD_CONTENTSIZE_ERROR
  if (frameSize <= 0 || frameSize > 0x7FFFFFFF) {
    Module._free(srcPtr);
    throw new Error('Cannot determine decompressed size');
  }

  const dstPtr = Module._malloc(frameSize);
  try {
    const size = Module._zstd_decompress(srcPtr, src.length, dstPtr, frameSize);
    if (Module._zstd_is_error(size)) {
      throw new Error('zstd decompression failed');
    }
    return heap().slice(dstPtr, dstPtr + size);
  } finally {
    Module._free(srcPtr);
    Module._free(dstPtr);
  }
}
