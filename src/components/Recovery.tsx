import { useState } from "react";
import { download, parseBackup } from "../backup";
import { rawState, saveState } from "../storage";
export default function Recovery() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Awaited<
    ReturnType<typeof parseBackup>
  > | null>(null);
  return (
    <article>
      <h2>Recover your local data</h2>
      <p>
        The saved database could not be opened safely. Nothing has been reset.
        Export the raw record for safekeeping, or explicitly restore a validated
        JSON backup.
      </p>
      <button
        onClick={async () => {
          try {
            download(
              JSON.stringify(await rawState(), null, 2),
              "strength-raw-recovery.json",
            );
            setMessage(
              "Raw recovery file generated. Keep it for troubleshooting; it is not a normal importable backup.",
            );
          } catch (e) {
            setMessage(String(e));
          }
        }}
      >
        Export raw recovery record
      </button>
      <label>
        Restore JSON backup
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 50 * 1024 * 1024)
                throw new Error("File exceeds 50 MB.");
              const b = await parseBackup(await f.text());
              setPending(b);
            } catch (e) {
              setMessage(String(e));
            }
          }}
        />
      </label>
      {pending && (
        <>
          <p>
            Replace with {pending.state.history.length} workouts from{" "}
            {new Date(pending.exportedAt).toLocaleString()}? Export the raw
            record first.
          </p>
          <button
            onClick={async () => {
              try {
                const old = await rawState();
                await saveState(
                  pending.state,
                  old?.revision ?? 0,
                  undefined,
                  true,
                );
                location.reload();
              } catch (e) {
                setMessage(String(e));
              }
            }}
          >
            Confirm recovery replacement
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </article>
  );
}
