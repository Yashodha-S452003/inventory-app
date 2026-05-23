import { Alert } from "@/components/ui/alert";

type SetupPanelProps = {
  title: string;
  message: string;
  variant?: "error" | "info";
};

export function SetupPanel({
  title,
  message,
  variant = "error",
}: SetupPanelProps) {
  return (
    <div className="space-y-4">
      <Alert variant={variant} title={title}>
        <p>{message}</p>
      </Alert>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
        <p className="mb-2 font-semibold text-zinc-900">Fix locally</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Set <code className="rounded bg-zinc-100 px-1">DATABASE_URL</code>{" "}
            in <code className="rounded bg-zinc-100 px-1">.env</code> (Neon,
            Supabase, etc.)
          </li>
          <li>
            Run{" "}
            <code className="rounded bg-zinc-100 px-1">npm run db:migrate</code>
          </li>
          <li>
            Run <code className="rounded bg-zinc-100 px-1">npm run db:seed</code>
          </li>
          <li>
            Restart <code className="rounded bg-zinc-100 px-1">npm run dev</code>{" "}
            and refresh
          </li>
        </ol>
      </div>
    </div>
  );
}
