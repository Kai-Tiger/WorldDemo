#!/bin/sh
set -eu

source_dir="public/assets/vegetation/ribbon-grass/optimized"
output_dir="$source_dir/ktx2"
toktx="${TOKTX:-toktx}"

mkdir -p "$output_dir"

if ! command -v "$toktx" >/dev/null 2>&1 && [ ! -x "$toktx" ]; then
  echo "toktx was not found; set TOKTX to the Khronos KTX-Software binary." >&2
  exit 1
fi

for tier in 1k 2k; do
  if [ "$tier" = "1k" ]; then
    size=1024
  else
    size=2048
  fi

  for name in BaseColor Translucency Billboard_BaseColor; do
    "$toktx" --t2 --encode etc1s --clevel 1 --qlevel 140 \
      --genmipmap --lower_left_maps_to_s0t0 --assign_oetf srgb \
      --resize "${size}x${size}" \
      "$output_dir/Ribbon_Grass_${name}_${tier}.ktx2" \
      "$source_dir/Ribbon_Grass_tbdpec3r_2K_${name}.jpg"
  done

  for name in Roughness AO Opacity Billboard_Opacity; do
    "$toktx" --t2 --encode etc1s --clevel 1 --qlevel 160 \
      --genmipmap --lower_left_maps_to_s0t0 --assign_oetf linear \
      --resize "${size}x${size}" \
      "$output_dir/Ribbon_Grass_${name}_${tier}.ktx2" \
      "$source_dir/Ribbon_Grass_tbdpec3r_2K_${name}.jpg"
  done

  for name in Normal Billboard_Normal; do
    "$toktx" --t2 --encode uastc --uastc_quality 1 --zcmp 3 \
      --genmipmap --lower_left_maps_to_s0t0 --assign_oetf linear \
      --input_swizzle rgb1 --normalize --resize "${size}x${size}" \
      "$output_dir/Ribbon_Grass_${name}_${tier}.ktx2" \
      "$source_dir/Ribbon_Grass_tbdpec3r_2K_${name}.jpg"
  done
done
