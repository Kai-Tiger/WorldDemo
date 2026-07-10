#!/bin/sh
set -eu

blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
source_dir="public/assets/vegetation/ribbon-grass/optimized/models-raw"
output_dir="public/assets/vegetation/ribbon-grass/optimized/models"

"$blender" --background --python tools/convert-grass-models.py
mkdir -p "$output_dir"

for source in "$source_dir"/*.glb; do
  output="$output_dir/$(basename "$source")"
  npx --yes @gltf-transform/cli optimize "$source" "$output" \
    --compress meshopt --simplify false --texture-compress false --palette false
done

rm -rf "$source_dir"
