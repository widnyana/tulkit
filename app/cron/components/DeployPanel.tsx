"use client";

import { useId } from "react";
import type { Mode } from "../types";

interface DeployPanelProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  command: string;
  setCommand: (command: string) => void;
  user: string;
  setUser: (user: string) => void;
  fileName: string;
  setFileName: (fileName: string) => void;
  /** Ready-to-paste block from generate(); empty while invalid/blank. */
  output: string;
  /** Single schedule+command line, for the Copy line button. */
  deployLine: string;
  fileNameError: string | null;
  onCopy: (text: string, what: string) => void;
}

const INPUT_CLASS =
  "w-full px-4 py-2 font-mono text-foreground border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

/**
 * Always-visible deployment output: pick the target (per-user crontab or a
 * drop-in file under /etc/cron.d), fill in the command, and copy the
 * ready-to-paste result.
 */
export default function DeployPanel({
  mode,
  setMode,
  command,
  setCommand,
  user,
  setUser,
  fileName,
  setFileName,
  output,
  deployLine,
  fileNameError,
  onCopy,
}: DeployPanelProps) {
  const modeId = useId();
  const commandId = useId();
  const userId = useId();
  const fileNameId = useId();

  return (
    <section className="bg-card rounded-lg shadow-lg border border-border p-4 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Deploy</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Ready-to-paste output</p>

      <div className="mt-4">
        <label
          htmlFor={modeId}
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Target
        </label>
        <select
          id={modeId}
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          data-testid="cron-target"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-transparent focus:ring-2 focus:ring-blue-500"
        >
          <option value="crontab">crontab -e (per-user crontab)</option>
          <option value="cron-d">File in /etc/cron.d/</option>
        </select>
      </div>

      <div className="mt-4">
        <label
          htmlFor={commandId}
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Command
        </label>
        <input
          id={commandId}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          spellCheck={false}
          placeholder="/path/to/script.sh"
          data-testid="cron-command"
          className={INPUT_CLASS}
        />
      </div>

      {mode === "cron-d" && (
        <>
          <div className="mt-4">
            <label
              htmlFor={userId}
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Run as user{" "}
              <span className="text-muted-foreground">(required in /etc/cron.d)</span>
            </label>
            <input
              id={userId}
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              spellCheck={false}
              placeholder="root"
              data-testid="cron-user"
              className={INPUT_CLASS}
            />
          </div>
          <div className="mt-4">
            <label
              htmlFor={fileNameId}
              className="mb-2 block text-sm font-medium text-foreground"
            >
              File name <span className="text-muted-foreground">(no dots allowed)</span>
            </label>
            <input
              id={fileNameId}
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              spellCheck={false}
              placeholder="my-job"
              aria-invalid={fileNameError ? true : undefined}
              data-testid="cron-file-name"
              className={`${INPUT_CLASS} ${
                fileNameError ? "border-red-400" : ""
              }`}
            />
            {fileNameError && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {fileNameError}
              </p>
            )}
          </div>
        </>
      )}

      {output !== "" && (
        <>
          <pre
            data-testid="cron-output"
            className="mt-5 whitespace-pre-wrap rounded-lg bg-gray-900 p-4 font-mono text-sm text-gray-100 overflow-x-auto"
          >
            {output}
          </pre>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {mode === "cron-d" && (
              <p className="text-xs text-muted-foreground">
                Install with:{" "}
                <code className="font-mono">
                  sudo cp {fileName.trim() || "my-job"} /etc/cron.d/ &amp;&amp;
                  sudo chmod 644 /etc/cron.d/{fileName.trim() || "my-job"}
                </code>
              </p>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => onCopy(`${output}\n`, "crontab entry")}
                className="rounded px-4 py-1.5 text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
              >
                Copy block
              </button>
              <button
                type="button"
                onClick={() => onCopy(`${deployLine}\n`, "crontab line")}
                data-testid="cron-copy-line"
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Copy line
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
