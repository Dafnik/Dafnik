interface DesktopOnlyPageProps {
  minWidthPx: number;
}

export function DesktopOnlyPage({minWidthPx}: DesktopOnlyPageProps) {
  return (
    <main
      className="bg-background relative flex min-h-screen w-screen items-center justify-center px-4"
      style={{
        backgroundImage: `radial-gradient(circle, oklch(var(--foreground) / 0.12) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}>
      <section className="bg-card border-border max-w-lg border-4 p-8 text-center shadow-[10px_10px_0_0_rgba(0,0,0,0.72)]">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Screenshot Editor is desktop only
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          This editor needs a larger screen and can only be used on desktop devices.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Please open this page on a desktop browser with at least {minWidthPx}px of viewport width.
        </p>
      </section>
    </main>
  );
}
