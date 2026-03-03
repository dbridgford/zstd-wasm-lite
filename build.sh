#!/bin/bash
set -e

ZSTD_SRC=zstd/lib

mkdir -p lib

echo "Compiling zstd to WASM..."

emcc -O3 \
  $ZSTD_SRC/common/*.c \
  $ZSTD_SRC/compress/*.c \
  $ZSTD_SRC/decompress/*.c \
  src/wrapper.c \
  -I $ZSTD_SRC \
  -I $ZSTD_SRC/common \
  -DZSTD_LIB_DICTBUILDER=0 \
  -DZSTD_LIB_DEPRECATED=0 \
  -DZSTD_STRIP_ERROR_STRINGS \
  -DZSTD_NO_INLINE \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='["_zstd_compress_bound","_zstd_compress","_zstd_decompress","_zstd_frame_content_size","_zstd_is_error","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='ZstdModule' \
  -s ENVIRONMENT='web' \
  -s FILESYSTEM=0 \
  -s SINGLE_FILE=0 \
  --no-entry \
  -o lib/zstd-wasm.js

echo ""
echo "Build complete:"
ls -lh lib/zstd-wasm.js lib/zstd-wasm.wasm
