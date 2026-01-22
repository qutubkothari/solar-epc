"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { TaskForm } from "@/components/task-form";
import { formatDate } from "@/lib/format";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  createdBy?: {
    name: string;
  };
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tasks & Reminders"
        subtitle="Assign internal actions and automate follow-up reminders."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Create Task
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        {loading ? (
          <div className="text-center text-sm text-solar-muted">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-sm text-solar-muted">
            No tasks yet. Create your first task.
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">{task.title}</p>
                  <p className="text-xs text-solar-muted">
                    Owner: {task.createdBy?.name || "System"} • Due {formatDate(task.dueDate)}
                  </p>
                </div>
                <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchTasks();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
