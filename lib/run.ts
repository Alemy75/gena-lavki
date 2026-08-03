import { spawn } from "node:child_process";
import type { Readable } from "node:stream";

/**
 * Запускает команду, копит stdout в Buffer; реджектит при ненулевом коде выхода
 * (в тексте ошибки — начало stderr). opts.stdin пайпится в stdin процесса —
 * так restore льёт дамп в psql потоком, не держа его в памяти.
 */
export function run(
  cmd: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; stdin?: Readable } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: opts.env ?? process.env });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout!.on("data", (c: Buffer) => out.push(c));
    child.stderr!.on("data", (c: Buffer) => err.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out));
      } else {
        reject(
          new Error(
            `${cmd} завершился с кодом ${code}: ${Buffer.concat(err).toString("utf8").slice(0, 500)}`,
          ),
        );
      }
    });
    if (opts.stdin) {
      opts.stdin.on("error", reject);
      opts.stdin.pipe(child.stdin!);
    }
  });
}
