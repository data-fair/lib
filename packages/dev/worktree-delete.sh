#!/bin/bash
# Delete a worktree, its branch, and its docker containers/volumes/local images
# (when the worktree has a compose file).
#
# Refuses to proceed if the worktree has uncommitted changes or commits not
# pushed to any origin ref, unless the branch was squash-merged into origin's
# default branch (its remote ref is usually gone after a `fetch --prune`).
# Pass -f / --force to bypass these checks; the deleted branch's commit is
# printed to recover it.

set -e

FORCE=false
BRANCH_NAME=""

while [ $# -gt 0 ]; do
    case "$1" in
        -f|--force) FORCE=true ;;
        -h|--help)
            echo "Usage: df-worktree-delete <branch> [-f|--force]" >&2
            echo "  --force / -f  skip uncommitted/unpushed safety checks (the branch is deleted all the same)"
            exit 0
            ;;
        -*)
            echo "Error: unknown flag '$1'" >&2
            echo "Usage: df-worktree-delete <branch> [-f|--force]" >&2
            exit 1
            ;;
        *)
            if [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            else
                echo "Error: too many positional arguments" >&2
                exit 1
            fi
            ;;
    esac
    shift
done

if [ -z "$BRANCH_NAME" ]; then
    echo "Error: Please provide a branch name." >&2
    echo "Usage: df-worktree-delete <branch> [-f|--force]" >&2
    exit 1
fi

# the branch name becomes a directory, a zellij session and a DEV_HOST label
if ! [[ "$BRANCH_NAME" =~ ^[A-Za-z0-9._-]{1,60}$ ]]; then
    echo "Error: invalid branch name \"$BRANCH_NAME\": letters, digits, '.', '_' and '-' only, no \"/\", at most 60 characters (e.g. feat-xyz)" >&2
    exit 1
fi

# the worktrees live next to the main checkout: refuse a subfolder or another worktree
TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not inside a git repository." >&2; exit 1; }
if [ "$TOPLEVEL" != "$(pwd -P)" ]; then
    echo "Error: run df-worktree-delete from the root of the repository: cd $TOPLEVEL" >&2
    exit 1
fi
COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
if [ "$(git rev-parse --absolute-git-dir)" != "$COMMON_DIR" ]; then
    echo "Error: run df-worktree-delete from the main checkout, not from a worktree: cd $(dirname "$COMMON_DIR")" >&2
    exit 1
fi

REPO_NAME=$(basename "$PWD")
TARGET_DIR="../${REPO_NAME}_${BRANCH_NAME}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Worktree directory $TARGET_DIR does not exist."
    exit 1
fi

ORIGIN_DIR="$PWD"

if [ "$FORCE" != true ]; then
    echo "Checking $TARGET_DIR for uncommitted / unpushed work…"
    cd "$TARGET_DIR"

    # Refresh remote refs so the "unpushed" check is accurate
    git fetch origin --quiet 2>/dev/null || true

    DIRTY=$(git status --porcelain)
    if [ -n "$DIRTY" ]; then
        echo
        echo "❌ Refusing to delete: $TARGET_DIR has uncommitted changes:"
        echo "$DIRTY" | sed 's/^/    /'
        echo
        echo "Commit / push / stash them, or pass -f / --force to bypass."
        exit 1
    fi

    # Commits reachable from HEAD but NOT reachable from any origin/* ref.
    # Catches: never-pushed branches, branches ahead of upstream, detached HEAD with unique commits.
    UNPUSHED_COUNT=$(git rev-list --count HEAD --not --remotes=origin 2>/dev/null || echo 0)
    SQUASHED_INTO=""
    if [ "$UNPUSHED_COUNT" -gt 0 ]; then
        # A squash-merge rewrites the commits, and once the merged remote branch is pruned they are on
        # no origin ref: accept them when the whole branch diff, squashed onto its merge base, has the
        # same patch-id as a commit of origin's default branch.
        for ref in $(git symbolic-ref -q --short refs/remotes/origin/HEAD) origin/main origin/master; do
            git rev-parse -q --verify "$ref^{commit}" >/dev/null || continue
            BASE=$(git merge-base "$ref" HEAD) || continue
            SQUASH=$(git commit-tree "HEAD^{tree}" -p "$BASE" -m squash)
            if git cherry "$ref" "$SQUASH" | grep -q '^-'; then
                SQUASHED_INTO="$ref"
                break
            fi
        done
    fi
    if [ "$UNPUSHED_COUNT" -gt 0 ] && [ -z "$SQUASHED_INTO" ]; then
        echo
        echo "❌ Refusing to delete: $TARGET_DIR has $UNPUSHED_COUNT commit(s) not present on any origin ref:"
        git --no-pager log --oneline HEAD --not --remotes=origin | sed 's/^/    /'
        echo
        echo "Push them (e.g. 'git push -u origin $BRANCH_NAME'), or pass -f / --force to bypass."
        exit 1
    fi

    cd "$ORIGIN_DIR"
    if [ -n "$SQUASHED_INTO" ]; then
        echo "✓ working tree clean and branch squash-merged into $SQUASHED_INTO"
    else
        echo "✓ working tree clean and all commits present on origin"
    fi
fi

# the branch checked out in the worktree, deleted with it when it is the one named (not a detached HEAD)
WORKTREE_BRANCH=$(git -C "$TARGET_DIR" branch --show-current)

cd "$TARGET_DIR"
# a repository without containers has no compose file: docker compose would fail, or find a parent's
HAS_COMPOSE=false
for f in compose.yaml compose.yml docker-compose.yaml docker-compose.yml; do
    [ -f "$f" ] && HAS_COMPOSE=true
done
if [ "$HAS_COMPOSE" = true ]; then
    echo "Stopping & removing docker compose services in $TARGET_DIR (with volumes and orphans)"
    # --profile '*' : catch every container the worktree may have started, whatever the repo names its profiles
    # -v : drop named volumes (mongo, elasticsearch, s3mock, clamav…) — data is worktree-scoped
    # --remove-orphans : sweep any container left over from a previous compose file
    # --rmi local : remove images built locally for this worktree (keeps remote-pulled images)
    docker compose --profile '*' down -v --remove-orphans --rmi local
fi

echo "Removing git worktree at $TARGET_DIR"
cd "$ORIGIN_DIR"
if [ "$FORCE" = true ]; then
    git worktree remove --force "$TARGET_DIR" # untracked files (generated types, UI builds) would block a plain remove
else
    git worktree remove "$TARGET_DIR"
fi
zellij delete-session "$(basename "$TARGET_DIR")" --force >/dev/null 2>&1 || true

if [ "$WORKTREE_BRANCH" = "$BRANCH_NAME" ]; then
    # without --force every commit is on origin; with it, the printed commit is the way back
    echo "Deleting branch $BRANCH_NAME (was $(git rev-parse --short "$BRANCH_NAME"))"
    git branch -q -D "$BRANCH_NAME"
fi

echo "-----------------------------------------------"
echo "✅ Worktree $BRANCH_NAME deleted!"
echo "-----------------------------------------------"
