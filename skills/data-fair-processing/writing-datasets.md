# Writing to a dataset

How a processing must create and update datasets so that a bad source never silently replaces good data, and so that a failed write never ends as a green run.

An inventory of the 46 plugins of the fleet showed that each one had reinvented this part, with the same failures everywhere: files published without any compatibility check, runs that end green while data-fair rejected the data, replays that duplicate every line. The rules below come from that inventory and from the data-fair code (`api/src/datasets/routes/write.ts`, `utils/patch.ts`, `utils/rest.ts`, `workers/batch-processor/process-file.ts`).

## The four write paths

A file dataset and an editable (REST) dataset are **not written by the same call**, and the type of a dataset never changes after creation (`isRest`, `isVirtual`, `isMetaOnly` are only accepted at creation).

| Case | Call | Traps |
|---|---|---|
| Create a file dataset | `POST api/v1/datasets`, multipart part `file` (`dataset` is an alias) | the response comes before the file is processed |
| Update a file dataset | `POST api/v1/datasets/{id}`, multipart part `file` | **without `?draft=` the file is published with no compatibility check** — see below |
| Create an editable dataset | `POST api/v1/datasets` (or `PUT api/v1/datasets/{id}`), JSON `{ isRest: true, title, schema, primaryKey }` | the schema is never inferred from the data; attaching a file → 400 "cannot be of several types at once" |
| Update an editable dataset | `POST api/v1/datasets/{id}/_bulk_lines` (ndjson, json, `text/csv`, or multipart part `actions`) | posting a file on `api/v1/datasets/{id}` → 400 "this dataset is not file based"; `_bulk_lines` never changes the schema |

## Updating a file dataset: choose the draft mode

Every file posted on an existing dataset goes through a draft. The `draft` query parameter decides what happens to it when the new file breaks the schema (removed or retyped column) or the validation rules:

| `?draft=` | Mode | Breaking change or validation errors |
|---|---|---|
| *(absent)* or `always` | `always` | **published anyway** |
| `true` or `compatible` | `compatible` | kept as a pending draft, to validate or cancel by hand |
| `compatibleOrCancel` | `compatibleOrCancel` | draft **cancelled automatically**, the published data stays online, report in `api/v1/datasets/{id}/cancelled-draft-diagnostic.csv` |

**Rule — the plugin does not own the schema** (it downloads a file it does not control: transfer-file, xml, rss, json-file…):

- send `?draft=compatibleOrCancel` by default — a source server answering with an HTML error page must not replace the dataset;
- add a `forceUpdate` boolean to the update branch of the config, titled "Force the schema update", that switches to `?draft=always`, for users whose file must always win;
- follow the journal (next section) so that a rejected file fails the run.

**The plugin owns the schema** (it builds the file and its schema itself: transform-csv, majic, gtfs…): pushing the file and the schema directly is fine, but still follow the journal to report processing errors.

Avoid `?draft=true` (`compatible`): the pending draft waits for a human who is not told about it, and data-fair turns `true` into `never` (never published automatically) as soon as the dataset has a `DigitalDocument` column.

Do not keep a home-made header check in front of it (`head.includes(schema.slice(0, head.length - 1))` passes as soon as a prefix matches, and some plugins check another file than the one they upload): `compatibleOrCancel` does the same check on the platform side, on the real file.

## Follow the journal: a file write is asynchronous

The upload response only says that the file was received. Parsing, the compatibility check, the validation rules and the indexing all run afterwards in a data-fair worker. A run that ends after the HTTP response is **optimistic**: a rejected or broken file leaves it green while the dataset still shows its old data.

Wait for the outcome on `context.ws`, and subscribe **before** the upload when the dataset id is known:

| Journal event | Meaning | Run |
|---|---|---|
| `finalize-end` | the file is published (`draft: true` on it means it is still a pending draft) | success |
| `validation-error` without `hasDiagnosticFile` | breaking schema changes; a `draft-cancelled` follows in `compatibleOrCancel`, the file is published anyway in `always` | wait for the next event; with `forceUpdate`, log it as a warning |
| `draft-cancelled` | data-fair rejected the new file | **fail**, quote `event.data` and the diagnostic URL when `hasDiagnosticFile` |
| `validation-error` with `hasDiagnosticFile` | lines break the validation rules of a dataset updated without draft; the dataset is left in error, nothing follows | **fail** |
| `error` | data-fair could not process the file | **fail** |
| `error-retry` | data-fair will retry by itself | keep waiting, log a warning |

`ws.waitForJournal(id, 'finalize-end')` only stops on `finalize-end` and `error`: use `ws.waitFor('datasets/<id>/journal', filter, timeout)` to see the other events. Use a long timeout (the processing of a large file takes minutes) and only warn when it expires. Race the wait against the stop signal so that `stop()` does not wait for it.

Reference implementation: `processing-transfer-file/lib/finalize.ts` (`watchFinalization`) and its tests in `test-it/unit/transfer.test.ts` (a fake `ws.waitFor` replaying journal events).

## Writing lines: `_bulk_lines` answers 200 with errors

`_bulk_lines` answers **400 only when no line went through**. As soon as one line is accepted, rejected lines come back in a **200** with `nbErrors > 0` and `errors: [{ line, error }]`; an error after the first batch is reported the same way (`line: -1`), and with `?drop=true` the whole operation is cancelled (`cancelled: true`). Checking the HTTP status is not enough.

- **`nbErrors > 0` or `cancelled` must fail the run**: log the first errors, then throw. Reference: `processing-import-api/lib/upload.ts`, `processing-france-parcelles-coords/lib/execute.ts`.
- **Never move a cursor or delete the source after rejected lines**: a `lastProcessedDay`, a "max `_updatedAt` already in the dataset" restart point, a `processAndDelete` of the remote file — all of them make the rejected lines unrecoverable.
- **Never swallow a write error**: no `catch` without `throw`, and log `err.response?.data ?? err.data` (data-fair's reason), not `JSON.stringify(err)`, which drops it.
- A `POST`/`PATCH` is not retried by `context.axios`: wrap it in a retry on 429 (see the `context.axios` section of the skill), but never replay a line write on a gateway error when the lines have no `_id` — a hidden success would insert them twice.

## Primary key: without it, every replay duplicates the dataset

A line written without `_id` gets a random `nanoid()`. Every run of a plugin that rewrites the same source then duplicates all the lines.

- When the plugin creates the editable dataset, declare a `primaryKey` (or compute a deterministic `_id`, e.g. a hash of the natural key).
- When it writes into a dataset chosen by the user, read `rest.primaryKey` and at least warn when it is empty (as `processing-import-api` does), unless the run replaces everything with `?drop=true`.
- Do not put a mutable value (an amount, a label) in the key: a change creates a new line instead of updating the old one.

## Schema of an existing editable dataset

The schema sent at creation is frozen unless the plugin updates it: a column added to the plugin later never reaches the datasets created before.

- Either PATCH the schema before sending the lines (`PATCH api/v1/datasets/{id}` with `schema`), keeping the columns added by hand — reference: `processing-datasets-list`, `processing-gbfs`;
- or compare the schema with the expected columns and throw with a clear message — reference: `processing-historique-rge` — optionally with an opt-in to update it — reference: `processing-json-mapping` (`forceUpdate`).

## Choosing the target dataset

A dataset selector that lists every dataset invites a configuration that cannot work (a file posted on an editable dataset, lines posted on a file dataset).

- Best: **detect the type** after a `GET api/v1/datasets/{id}` (`dataset.isRest`) and pick the write path from it — reference: `processing-gpkg`, `processing-import-api`, `processing-json-file`.
- Otherwise, filter the `getItems` url: `&file=true` for a file update, `&rest=true` for a lines update, and check the type at run time anyway.
- Never retrieve "the" dataset by slug among all the datasets of the account: a dataset that does not belong to the processing gets overwritten. Keep the id given by `patchConfig`.

## Smaller rules

- **Do not resend the configured `title` on every update**: it overwrites a rename made by hand on the dataset. Send it at creation only.
- **Merge `extras`**, do not replace them with `{ processingId }`.
- **An empty source is an error**, not a reason to publish an empty file over the data or to `return` with a green run after a `log.error`.
- **Option labels say exactly what the option does**: a "Force the schema update" that only removes `?draft=true` and sends no schema is a lie the users will act on.
