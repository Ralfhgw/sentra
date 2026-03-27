type ModuleDisabledNoticeProps = {
  title: string;
  settingCode: string;
};

export default function ModuleDisabledNotice({
  title,
  settingCode,
}: ModuleDisabledNoticeProps) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-slate-800 shadow-sm">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3">
          Das Modul ist vorhanden, aber in deinen Einstellungen ist{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-sm font-semibold">
            {settingCode}
          </code>{" "}
          aktuell nicht aktiviert.
        </p>
      </div>
    </main>
  );
}
