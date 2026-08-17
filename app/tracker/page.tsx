"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createPart,
  createSprint,
  createTodo,
  deleteTodo,
  getParts,
  getSprints,
  getTodos,
  setPartStatus,
  setTeachBackDone,
  setTodoDone,
  type Part,
  type Sprint,
  type Todo,
} from "@/lib/supabase/tracker";
import { createNoteForPart, getNotesForParts } from "@/lib/supabase/notes";

const selectClassName = cn(
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

type PartDraft = { name: string; date: string };

export default function TrackerPage() {
  const router = useRouter();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notesByPart, setNotesByPart] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");

  const [newPartDrafts, setNewPartDrafts] = useState<
    Record<string, PartDraft>
  >({});

  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDue, setNewTodoDue] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState("");

  useEffect(() => {
    Promise.all([getSprints(), getParts(), getTodos()])
      .then(async ([s, p, t]) => {
        setSprints(s);
        setParts(p);
        setTodos(t);
        const partNotes = await getNotesForParts(p.map((part) => part.id));
        setNotesByPart(
          new Map(
            partNotes
              .filter((n) => n.part_id)
              .map((n) => [n.part_id as string, n.id]),
          ),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!newSprintName.trim()) return;
    try {
      const sprint = await createSprint({
        name: newSprintName.trim(),
        planned_start: newSprintStart || null,
        planned_end: newSprintEnd || null,
      });
      setSprints((prev) => [...prev, sprint]);
      setNewSprintName("");
      setNewSprintStart("");
      setNewSprintEnd("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function getDraft(sprintId: string): PartDraft {
    return newPartDrafts[sprintId] ?? { name: "", date: "" };
  }

  function updateDraft(sprintId: string, patch: Partial<PartDraft>) {
    setNewPartDrafts((prev) => ({
      ...prev,
      [sprintId]: { ...getDraft(sprintId), ...patch },
    }));
  }

  async function handleCreatePart(sprintId: string, e: React.FormEvent) {
    e.preventDefault();
    const draft = getDraft(sprintId);
    if (!draft.name.trim()) return;
    try {
      const part = await createPart({
        sprint_id: sprintId,
        name: draft.name.trim(),
        planned_completion_date: draft.date || null,
      });
      setParts((prev) => [...prev, part]);
      setNewPartDrafts((prev) => ({
        ...prev,
        [sprintId]: { name: "", date: "" },
      }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleStatus(part: Part) {
    setError(null);
    try {
      const updated = await setPartStatus(
        part.id,
        part.status !== "completed",
      );
      setParts((prev) => prev.map((p) => (p.id === part.id ? updated : p)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleTeachBack(part: Part) {
    setError(null);
    try {
      const updated = await setTeachBackDone(part.id, !part.teach_back_done);
      setParts((prev) => prev.map((p) => (p.id === part.id ? updated : p)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleOpenSummary(part: Part) {
    const existingNoteId = notesByPart.get(part.id);
    if (existingNoteId) {
      router.push(`/notes?partId=${part.id}`);
      return;
    }
    setError(null);
    try {
      const note = await createNoteForPart(part.id, part.name);
      setNotesByPart((prev) => new Map(prev).set(part.id, note.id));
      router.push(`/notes?partId=${part.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    try {
      const todo = await createTodo({
        text: newTodoText.trim(),
        due_date: newTodoDue || null,
        priority: newTodoPriority || null,
      });
      setTodos((prev) => [...prev, todo]);
      setNewTodoText("");
      setNewTodoDue("");
      setNewTodoPriority("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    setError(null);
    try {
      const updated = await setTodoDone(todo.id, !todo.done);
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteTodo(id: string) {
    setError(null);
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8 max-w-3xl mx-auto p-5">
      <h1 className="font-bold text-2xl">Study Tracker</h1>

      {error && (
        <p className="text-sm text-destructive-foreground bg-destructive/10 border border-destructive/50 rounded-md p-3">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New sprint</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateSprint}>
          <CardContent className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-sprint-name">Name</Label>
              <Input
                id="new-sprint-name"
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                placeholder="Sprint name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-sprint-start">Planned start</Label>
              <Input
                id="new-sprint-start"
                type="date"
                value={newSprintStart}
                onChange={(e) => setNewSprintStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-sprint-end">Planned end</Label>
              <Input
                id="new-sprint-end"
                type="date"
                value={newSprintEnd}
                onChange={(e) => setNewSprintEnd(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              Add sprint
            </Button>
          </CardContent>
        </form>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : sprints.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sprints yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {sprints.map((sprint) => {
            const sprintParts = parts.filter(
              (p) => p.sprint_id === sprint.id,
            );
            const draft = getDraft(sprint.id);
            return (
              <Card key={sprint.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {sprint.name}
                    {(sprint.planned_start || sprint.planned_end) && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        {sprint.planned_start ?? "?"} –{" "}
                        {sprint.planned_end ?? "?"}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {sprintParts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No parts yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sprintParts.map((part) => (
                        <div
                          key={part.id}
                          className="flex flex-col gap-1.5 border rounded-md p-3"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="flex items-center gap-1.5 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={part.status === "completed"}
                                onChange={() => handleToggleStatus(part)}
                              />
                              {part.name}
                            </label>
                            <span className="text-xs text-muted-foreground">
                              ({part.status})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Planned: {part.planned_completion_date ?? "—"}{" "}
                            &nbsp;|&nbsp; Actual:{" "}
                            {part.actual_completion_date ?? "—"}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={part.teach_back_done}
                                onChange={() => handleToggleTeachBack(part)}
                              />
                              Teach-back done
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSummary(part)}
                            >
                              {notesByPart.has(part.id)
                                ? "Open chapter summary"
                                : "Create chapter summary"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => handleCreatePart(sprint.id, e)}
                    className="flex flex-wrap gap-2 items-end"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`new-part-name-${sprint.id}`}>
                        New part
                      </Label>
                      <Input
                        id={`new-part-name-${sprint.id}`}
                        value={draft.name}
                        onChange={(e) =>
                          updateDraft(sprint.id, { name: e.target.value })
                        }
                        placeholder="Part name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`new-part-date-${sprint.id}`}>
                        Planned completion
                      </Label>
                      <Input
                        id={`new-part-date-${sprint.id}`}
                        type="date"
                        value={draft.date}
                        onChange={(e) =>
                          updateDraft(sprint.id, { date: e.target.value })
                        }
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm">
                      Add part
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateTodo}>
          <CardContent className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-todo-text">Text</Label>
              <Input
                id="new-todo-text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="What needs doing?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-todo-due">Due date</Label>
              <Input
                id="new-todo-due"
                type="date"
                value={newTodoDue}
                onChange={(e) => setNewTodoDue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-todo-priority">Priority</Label>
              <select
                id="new-todo-priority"
                className={selectClassName}
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value)}
              >
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <Button type="submit" variant="outline">
              Add todo
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col items-stretch gap-2">
          {todos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No todos yet.</p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-2 justify-between border rounded-md p-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => handleToggleTodo(todo)}
                  />
                  <span className={todo.done ? "line-through" : ""}>
                    {todo.text}
                  </span>
                  {todo.due_date && (
                    <span className="text-xs text-muted-foreground">
                      due {todo.due_date}
                    </span>
                  )}
                  {todo.priority && (
                    <span className="text-xs text-muted-foreground">
                      [{todo.priority}]
                    </span>
                  )}
                </label>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTodo(todo.id)}
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
