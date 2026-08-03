import { RestoreForm } from "./restore-form";

export default function AdminBackupPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="mb-2 text-lg font-medium text-foreground">Резервная копия</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Скачивает полный бэкап сайта одним архивом <code>.tgz</code>: база данных
        (позиции, категории, страницы, заявки с формы, пользователи) и все
        загруженные файлы. Архив содержит все данные сайта — храните его в
        надёжном месте, не выкладывайте в открытый доступ.
      </p>

      <a
        href="/api/admin/backup"
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        Скачать бэкап (.tgz)
      </a>

      <p className="mt-4 text-xs text-muted-foreground">
        Сбор архива занимает несколько секунд. Восстановить его можно скриптом{" "}
        <code>scripts/restore.sh</code> (см. README) — формат совпадает с бэкапом
        по SSH.
      </p>

      <RestoreForm />
    </div>
  );
}
