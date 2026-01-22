import { SectionHeader } from "@/components/section-header";

export default function TasksPage() {
  const tasks = [
    {
      title: "Follow up on statutory approval",
      due: "24 Jan 2026",
      owner: "Aisha M.",
      status: "Open",
    },
    {
      title: "Upload inverter warranty cards",
      due: "25 Jan 2026",
      owner: "Ravi K.",
      status: "In Progress",
    },
    {
      title: "Send final quotation to client",
      due: "22 Jan 2026",
      owner: "Mustafa Q.",
      status: "Done",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tasks & Reminders"
        subtitle="Assign internal actions and automate follow-up reminders."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
            Create Task
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-solar-ink">{task.title}</p>
                <p className="text-xs text-solar-muted">
                  Owner: {task.owner} • Due {task.due}
                </p>
              </div>
              <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                {task.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
