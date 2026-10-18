interface PlaceholderPageProps {
  title: string;
  milestone: "M3" | "M4";
}

export function PlaceholderPage({ title, milestone }: PlaceholderPageProps) {
  return (
    <section className="flex min-h-[60dvh] items-center py-12">
      <div className="max-w-xl">
        <p className="font-jyutping text-sm font-bold text-ember-dark dark:text-sky-300">{milestone}</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">{title}</h1>
        <p className="mt-5 text-2xl font-black text-ember-dark dark:text-sky-300">即將推出</p>
        <p className="mt-3 text-stone-600 dark:text-stone-300">專案依照里程碑交付。呢個模組而家只保留路由同版面位置。</p>
      </div>
    </section>
  );
}
