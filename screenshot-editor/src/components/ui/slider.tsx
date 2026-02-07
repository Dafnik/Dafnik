import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import {cn} from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({className, ...props}, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none items-center select-none', className)}
    {...props}>
    <SliderPrimitive.Track className="bg-muted border-border relative h-3 w-full grow overflow-hidden border-2">
      <SliderPrimitive.Range className="bg-primary absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="bg-primary border-foreground ring-offset-background focus-visible:ring-ring block h-5 w-5 border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.7)] transition-colors focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export {Slider};
