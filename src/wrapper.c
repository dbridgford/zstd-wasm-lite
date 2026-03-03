/*
 * Thin wrapper around zstd's public API for WASM export.
 * Exposes compress, decompress, and helper functions.
 */
#include "zstd.h"
#include <stdlib.h>
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
size_t zstd_compress_bound(size_t srcSize) {
    return ZSTD_compressBound(srcSize);
}

EMSCRIPTEN_KEEPALIVE
size_t zstd_compress(const void* src, size_t srcSize,
                     void* dst, size_t dstCapacity,
                     int level) {
    return ZSTD_compress(dst, dstCapacity, src, srcSize, level);
}

EMSCRIPTEN_KEEPALIVE
unsigned long long zstd_frame_content_size(const void* src, size_t srcSize) {
    return ZSTD_getFrameContentSize(src, srcSize);
}

EMSCRIPTEN_KEEPALIVE
size_t zstd_decompress(const void* src, size_t srcSize,
                       void* dst, size_t dstCapacity) {
    return ZSTD_decompress(dst, dstCapacity, src, srcSize);
}

EMSCRIPTEN_KEEPALIVE
unsigned zstd_is_error(size_t code) {
    return ZSTD_isError(code);
}
