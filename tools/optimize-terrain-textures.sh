#!/bin/sh
set -eu

source_dir="public/assets/terrain/materials"
output_dir="$source_dir/optimized"
toktx="${TOKTX:-toktx}"
transcoder_source="node_modules/three/examples/jsm/libs/basis"
transcoder_output="public/basis"

mkdir -p "$output_dir"
mkdir -p "$transcoder_output"

if ! command -v "$toktx" >/dev/null 2>&1 && [ ! -x "$toktx" ]; then
  echo "toktx was not found; set TOKTX to the Khronos KTX-Software binary." >&2
  exit 1
fi

cp "$transcoder_source/basis_transcoder.js" "$transcoder_output/basis_transcoder.js"
cp "$transcoder_source/basis_transcoder.wasm" "$transcoder_output/basis_transcoder.wasm"

for tier in 1k 2k; do
  if [ "$tier" = "1k" ]; then
    size=1024
  else
    size=2048
  fi

  for name in moss_albedo dry_grass_albedo; do
    "$toktx" --t2 --encode etc1s --clevel 1 --qlevel 140 \
      --genmipmap --lower_left_maps_to_s0t0 --assign_oetf srgb \
      --resize "${size}x${size}" \
      "$output_dir/${name}_${tier}.ktx2" "$source_dir/$name.png"
  done

  for name in moss_normal dry_grass_normal; do
    "$toktx" --t2 --encode uastc --uastc_quality 1 \
      --zcmp 3 --genmipmap --lower_left_maps_to_s0t0 \
      --assign_oetf linear --input_swizzle rgb1 --normalize \
      --resize "${size}x${size}" \
      "$output_dir/${name}_${tier}.ktx2" "$source_dir/$name.png"
  done

  "$toktx" --t2 --encode uastc --uastc_quality 1 \
    --zcmp 3 --genmipmap --lower_left_maps_to_s0t0 \
    --assign_oetf linear --input_swizzle rgb1 \
    --resize "${size}x${size}" \
    "$output_dir/blend_mask_splat_${tier}.ktx2" "$source_dir/blend_mask_splat.png"
done
