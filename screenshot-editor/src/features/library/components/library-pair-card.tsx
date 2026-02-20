import type {ReactNode} from 'react';
import type {LibraryPair} from '@/features/library/types';

interface LibraryPairCardProps {
  pair: LibraryPair;
  reasonLabel: string;
  actions: ReactNode;
}

export function LibraryPairCard({pair, reasonLabel, actions}: LibraryPairCardProps) {
  return (
    <article className="border-border bg-card border-2 p-3">
      <header className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase">{reasonLabel}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(pair.score * 100)}%
        </span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <figure className="border-border bg-secondary/30 border p-1">
          <img
            src={pair.darkImage.dataUrl}
            alt={`${pair.darkImage.fileName} dark preview`}
            className="h-32 w-full object-contain"
          />
          <figcaption className="text-muted-foreground mt-1 truncate text-[11px]">
            Dark: {pair.darkImage.fileName}
          </figcaption>
        </figure>
        <figure className="border-border bg-secondary/30 border p-1">
          <img
            src={pair.lightImage.dataUrl}
            alt={`${pair.lightImage.fileName} light preview`}
            className="h-32 w-full object-contain"
          />
          <figcaption className="text-muted-foreground mt-1 truncate text-[11px]">
            Light: {pair.lightImage.fileName}
          </figcaption>
        </figure>
      </div>

      <div className="flex flex-wrap gap-2">{actions}</div>
    </article>
  );
}
