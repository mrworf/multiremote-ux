#!/bin/bash

OPACITY=30
SIZE=1920
QUALITY=65

for SRC in originals/*.jpg; do
	DST=$(basename "${SRC}")
	convert "${SRC}" -compose blend -define compose:args=${OPACITY} -background white -flatten -resize ${SIZE} -quality ${QUALITY} "${DST}"
done
