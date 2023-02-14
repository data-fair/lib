# Contribution guidelines

For convenience you might want add an alias to the `docker compose` command, the rest of the document will abbreviate it as `dc`, also `docker compose run --rm` will be abbreviated as `dcr`.

```bash
# in ~/.bash_aliases
alias dc="docker compose"
alias dcr="docker compose run --rm"
```

Some types are managed using [JSON Type Definitions](https://jsontypedef.com/) and [jtd-codegen](https://github.com/jsontypedef/json-typedef-codegen).

```
dcr jtd jtd-codegen types/session-user/session-user.jtd.json --typescript-out types/session-user/
```