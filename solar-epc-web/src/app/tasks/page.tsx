"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { TaskForm } from "@/components/task-form";
import { ModalShell } from "@/components/modal-shell";
import { formatDate } from "@/lib/format";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string | null;
  status: string;
  assignedToId?: string | null;
  createdBy?: {
    name: string;
  };
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);

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

  const handleDeleteTask = async (id: string) => {
    const confirmDelete = window.confirm("Delete this task?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTasks();
      if (viewTask?.id === id) setViewTask(null);
    }
  };

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
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                    {task.status}
                  </span>
                  <button
                    onClick={() => setViewTask(task)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setEditingTask(task)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
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

      {editingTask && (
        <TaskForm
          taskId={editingTask.id}
          initialData={{
            title: editingTask.title,
            description: editingTask.description || "",
            dueDate: editingTask.dueDate,
            assignedToId: editingTask.assignedToId || "",
            status: editingTask.status,
          }}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            fetchTasks();
            setEditingTask(null);
          }}
        />
      )}

      {viewTask && (
        <ModalShell
          title="Task Details"
          subtitle={viewTask.title}
          onClose={() => setViewTask(null)}
          size="md"
        >
          <div className="space-y-2 text-sm text-solar-ink">
            <div className="flex justify-between">
              <span className="text-solar-muted">Status</span>
              <span className="font-semibold">{viewTask.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Due</span>
              <span className="font-semibold">{formatDate(viewTask.dueDate)}</span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-solar-muted">Description</p>
              <p className="text-sm text-solar-ink">{viewTask.description || "—"}</p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
