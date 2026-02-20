import type {ReactNode} from 'react';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';

interface ShortcutTooltipProps {
  content: string;
  children: ReactNode;
}

export function ShortcutTooltip({content, children}: ShortcutTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
