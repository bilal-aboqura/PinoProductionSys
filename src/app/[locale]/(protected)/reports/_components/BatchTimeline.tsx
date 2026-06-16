import { Badge } from "@/components/ui/badge";

type BatchTimelineData = {
  batchNumber: string;
  recipe: string;
  warehouse: string;
  status: string;
  events: { at: string; type: string; actor: string; detail: string }[];
};

export function BatchTimeline({ timeline }: { timeline: BatchTimelineData | null }) {
  if (!timeline) {
    return (
      <div className="rounded-md border bg-white p-6 text-sm text-muted shadow-sm">
        Enter a batch number to view its chronological history.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{timeline.batchNumber}</h2>
          <p className="mt-1 text-sm text-muted">
            {timeline.recipe} - {timeline.warehouse}
          </p>
        </div>
        <Badge>{timeline.status}</Badge>
      </div>
      <ol className="mt-5 space-y-4">
        {timeline.events.map((event) => (
          <li key={`${event.at}-${event.type}-${event.detail}`} className="grid gap-2 border-l-2 border-accent pl-4 md:grid-cols-[160px_1fr]">
            <time className="text-xs font-semibold text-secondary">{new Date(event.at).toLocaleString()}</time>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{event.type}</Badge>
                <span className="text-sm font-semibold">{event.actor}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
