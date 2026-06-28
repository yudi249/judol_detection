import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ActivityIcon, ShieldCheckIcon } from 'lucide-react';

function App() {
  return (
    <TooltipProvider>
      <main className="dark min-h-screen w-[380px] bg-graphite-950 p-4 text-foreground">
        <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <header className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheckIcon aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-base font-semibold leading-none">
                  JudolLens
                </h1>
                <p className="text-xs text-muted-foreground">
                  UI foundation proof
                </p>
              </div>
            </div>
            <Badge>EXT-001</Badge>
          </header>

          <Separator />

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border bg-background p-2">
              <p className="text-lg font-semibold">0</p>
              <p className="text-[11px] text-muted-foreground">Scanned</p>
            </div>
            <div className="rounded-md border bg-background p-2">
              <p className="text-lg font-semibold">0</p>
              <p className="text-[11px] text-muted-foreground">Detected</p>
            </div>
            <div className="rounded-md border bg-background p-2">
              <p className="text-lg font-semibold text-unicode-amber">0</p>
              <p className="text-[11px] text-muted-foreground">Unicode</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md bg-secondary p-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Tailwind + shadcn ready</p>
              <p className="text-xs text-muted-foreground">
                Extension-owned React UI only.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="secondary" aria-label="Status">
                  <ActivityIcon data-icon="inline-start" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Popup styling pipeline is active.</TooltipContent>
            </Tooltip>
          </div>
        </section>
      </main>
    </TooltipProvider>
  );
}

export default App;
