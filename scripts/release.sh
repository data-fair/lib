#!/bin/sh
# Bump a workspace version and create its release commit.
# usage: npm run release <workspace dir> <patch|minor|major>   (e.g. npm run release vue minor)
set -e
dir="packages/$1"
if [ ! -f "$dir/package.json" ] || [ -z "$2" ]; then
  echo "usage: npm run release <$(ls packages | tr '\n' '|' | sed 's/|$//')> <patch|minor|major>"
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "the working tree is not clean, commit or stash first"
  exit 1
fi
npm version "$2" -w "$dir" --no-git-tag-version
name=$(node -p "require('./$dir/package.json').name.replace('@data-fair/', '')")
version=$(node -p "require('./$dir/package.json').version")
git commit -m "chore: release $name $version" -- "$dir/package.json" package-lock.json
echo "next: git push && npm publish -w $dir"
