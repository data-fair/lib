#!/bin/bash
# Create a git worktree for the given branch with full dev setup.
#
# Handles four cases:
#   1. Branch is currently checked out HERE (with or without local changes):
#      stash the changes, switch this checkout back to the main branch, move
#      the requested branch into the worktree, then re-apply the stash inside
#      the worktree.
#   2. Branch exists locally but is not active here: just check it out in the
#      worktree (e.g. coming back to a branch after a previous worktree was
#      deleted).
#   3. Branch exists only on origin: create a tracking local branch in the
#      worktree.
#   4. Brand new branch name: create from the current branch (or main if
#      current is detached).

set -e

BRANCH_NAME=$1

if [ -z "$BRANCH_NAME" ]; then
    echo "Error: Please provide a branch name." >&2
    echo "Usage: df-worktree feat-xyz" >&2
    exit 1
fi

# the branch name becomes a directory, a zellij session and a DEV_HOST label
if ! [[ "$BRANCH_NAME" =~ ^[A-Za-z0-9._-]{1,60}$ ]]; then
    echo "Error: invalid branch name \"$BRANCH_NAME\": letters, digits, '.', '_' and '-' only, no \"/\", at most 60 characters (e.g. feat-xyz)" >&2
    exit 1
fi

# the worktree goes next to the main checkout: refuse a subfolder or another worktree
TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not inside a git repository." >&2; exit 1; }
if [ "$TOPLEVEL" != "$(pwd -P)" ]; then
    echo "Error: run df-worktree from the root of the repository: cd $TOPLEVEL" >&2
    exit 1
fi
COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
if [ "$(git rev-parse --absolute-git-dir)" != "$COMMON_DIR" ]; then
    echo "Error: run df-worktree from the main checkout, not from a worktree: cd $(dirname "$COMMON_DIR")" >&2
    exit 1
fi

REPO_NAME=$(basename "$PWD")
TARGET_DIR="../${REPO_NAME}_${BRANCH_NAME}"
ORIGIN_DIR="$PWD"

# the zellij session is named after the worktree folder and its socket path is capped at 107 bytes
# (/run/user/<uid>/zellij/contract_version_1/<session>): 60 characters leave room for the prefix
SESSION_MAX=60
if [ $(( ${#REPO_NAME} + 1 + ${#BRANCH_NAME} )) -gt $SESSION_MAX ]; then
    echo "Error: branch name \"$BRANCH_NAME\" too long for this repository: the zellij session \"${REPO_NAME}_${BRANCH_NAME}\" must fit in $SESSION_MAX characters, so at most $(( SESSION_MAX - ${#REPO_NAME} - 1 )) characters for the branch" >&2
    exit 1
fi

if [ -e "$TARGET_DIR" ]; then
    echo "Error: $TARGET_DIR already exists."
    echo "Run npx --no df-worktree-delete $BRANCH_NAME first if you want to recreate it."
    exit 1
fi

# Detect main branch (main vs master) — prefer origin/HEAD, fall back to local refs
MAIN_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || true)
if [ -z "$MAIN_BRANCH" ]; then
    if git show-ref --verify --quiet refs/heads/main; then
        MAIN_BRANCH=main
    elif git show-ref --verify --quiet refs/heads/master; then
        MAIN_BRANCH=master
    else
        echo "Error: could not detect main branch (neither 'main' nor 'master' found)."
        exit 1
    fi
fi

echo "Fetching from origin"
git fetch origin --prune

CURRENT_BRANCH=$(git branch --show-current || true)
LOCAL_EXISTS=no
REMOTE_EXISTS=no
git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" && LOCAL_EXISTS=yes
git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME" && REMOTE_EXISTS=yes

STASH_SHA=""
STASH_RESTORED=no
# a failure after the stash must not leave the user's changes buried in the shared stash stack
restore_stash() {
    local code=$?
    if [ "$code" -ne 0 ] && [ -n "$STASH_SHA" ] && [ "$STASH_RESTORED" != yes ]; then
        if [ "$(git -C "$ORIGIN_DIR" branch --show-current)" = "$BRANCH_NAME" ] && git -C "$ORIGIN_DIR" stash apply -q "$STASH_SHA"; then
            drop_stash
            echo "Error: worktree setup failed, your local changes are back in $ORIGIN_DIR" >&2
        else
            echo "Error: worktree setup failed, your local changes are saved in the stash $STASH_SHA: git stash apply $STASH_SHA" >&2
        fi
    fi
}
drop_stash() {
    local ref
    ref=$(git -C "$ORIGIN_DIR" stash list --format='%gd %H' | awk -v sha="$STASH_SHA" '$2 == sha { print $1 }')
    [ -n "$ref" ] && git -C "$ORIGIN_DIR" stash drop -q "$ref"
    return 0
}
trap restore_stash EXIT

if [ "$LOCAL_EXISTS" = "yes" ] && [ "$CURRENT_BRANCH" = "$BRANCH_NAME" ]; then
    echo "Branch '$BRANCH_NAME' is currently checked out in $PWD — migrating it to the worktree."
    if [ -n "$(git status --porcelain)" ]; then
        STASH_LABEL="worktree-migration-${BRANCH_NAME}-$(date +%s)"
        echo "Stashing local changes (incl. untracked) as '$STASH_LABEL'"
        git stash push --include-untracked --message "$STASH_LABEL"
        # the stash stack is shared by every worktree: keep the sha, a stash@{n} index moves
        STASH_SHA=$(git stash list --format='%H %gs' | grep -F "$STASH_LABEL" | head -1 | awk '{print $1}')
    fi
    echo "Switching this checkout to $MAIN_BRANCH"
    git checkout "$MAIN_BRANCH"
fi

if [ "$LOCAL_EXISTS" = "yes" ]; then
    echo "Reusing existing local branch '$BRANCH_NAME' in $TARGET_DIR"
    git worktree add "$TARGET_DIR" "$BRANCH_NAME"
elif [ "$REMOTE_EXISTS" = "yes" ]; then
    echo "Creating local branch '$BRANCH_NAME' tracking origin/$BRANCH_NAME in $TARGET_DIR"
    git worktree add -b "$BRANCH_NAME" --track "$TARGET_DIR" "origin/$BRANCH_NAME"
else
    SOURCE_BRANCH="${CURRENT_BRANCH:-$MAIN_BRANCH}"
    echo "Creating new branch '$BRANCH_NAME' from '$SOURCE_BRANCH' in $TARGET_DIR"
    git worktree add -b "$BRANCH_NAME" "$TARGET_DIR" "$SOURCE_BRANCH"
fi

if [ -n "$STASH_SHA" ]; then
    echo "Re-applying stashed changes inside the worktree"
    ( cd "$TARGET_DIR" && git stash apply "$STASH_SHA" )
    STASH_RESTORED=yes
    drop_stash
fi

cd "$TARGET_DIR"

if [ -d "$OLDPWD/.claude" ]; then
    echo "Copy local Claude settings"
    mkdir -p .claude
    for f in "$OLDPWD/.claude"/*.json; do
        [ -f "$f" ] && cp "$f" .claude/
    done
fi

echo "npm ci"
npm ci

echo "df-dev setup (.env, types, UI build)"
./node_modules/.bin/df-dev setup # local bin only, never fetched from the registry

echo "-----------------------------------------------"
echo "✅ Setup Complete!"
echo "Location: $TARGET_DIR"
echo "Branch:   $BRANCH_NAME"
if [ -n "$STASH_SHA" ]; then
    echo "(Local changes from your previous checkout were migrated.)"
fi
echo "-----------------------------------------------"
echo "Next step:"
echo "   cd $TARGET_DIR && npm run dev-zellij"
