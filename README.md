# zstd-wasm-lite

Minimal WebAssembly build of the official [facebook/zstd](https://github.com/facebook/zstd) compression library for the browser. No third-party dependencies — just the official C source compiled with Emscripten.

**~180 KB** WASM + **~10 KB** JS glue.

## API

```js
import { init, compress, decompress } from './index.js';

await init();                        // load WASM (call once)
const compressed = compress(data, 3); // Uint8Array, level 1-22
const original = decompress(compressed);
```

### `init(wasmUrl?)`

Loads the WASM module. Must be called before `compress` or `decompress`. Optionally pass a custom URL to the `.wasm` file — by default it resolves relative to `index.js`.

### `compress(data, level?)`

Compresses a `Uint8Array` or `ArrayBuffer` using zstd. Level defaults to 3 (range: 1–22, higher = smaller but slower).

### `decompress(data)`

Decompresses a zstd-compressed `Uint8Array` or `ArrayBuffer`. The compressed data must contain the original size in the frame header (standard zstd behaviour).

## Example: compressed file upload

Compress files in the browser before uploading to reduce transfer size. A 63 MB XML file compresses to ~3 MB at level 3 in under 100ms.

```html
<input type="file" id="fileInput" />

<script type="module">
  import { init, compress } from './index.js';
  await init();

  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const raw = new Uint8Array(await file.arrayBuffer());

    const t0 = performance.now();
    const compressed = compress(raw, 3);
    const elapsed = performance.now() - t0;

    console.log(`${file.name}: ${raw.length} → ${compressed.length} bytes`);
    console.log(`${(raw.length / compressed.length).toFixed(1)}x ratio in ${elapsed.toFixed(0)}ms`);

    // Upload the compressed payload
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/zstd',
        'X-Filename': file.name,
        'X-Original-Size': String(raw.length),
      },
      body: compressed,
    });

    const result = await res.json();
    console.log('Upload result:', result);
  });
</script>
```

On the server, decompress with the `zstd` CLI or any zstd library:

```bash
# Decompress stdin to stdout
zstd -d --stdout < compressed.zst > original.xml
```

## Building from source

Requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) (`emcc`).

```bash
git clone --recurse-submodules https://github.com/dbridgford/zstd-wasm-lite.git
cd zstd-wasm-lite
bash build.sh
```

This compiles the zstd C source (vendored as a git submodule) to `lib/zstd-wasm.js` + `lib/zstd-wasm.wasm`.

The build uses `-O3` with size-reduction flags (`ZSTD_STRIP_ERROR_STRINGS`, `ZSTD_NO_INLINE`, `FILESYSTEM=0`) to keep the output small.

## Serving

The `.wasm` file must be served with `Content-Type: application/wasm`. Most web servers handle this automatically. If not, configure your server — for example with Bun:

```ts
if (path.endsWith('.wasm')) {
  return new Response(await readFile(filePath), {
    headers: { 'Content-Type': 'application/wasm' },
  });
}
```

## License

BSD-3-Clause (same as zstd)
