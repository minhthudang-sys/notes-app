import { createClient } from "@/lib/supabase/client";

export type Sprint = {
  id: string;
  name: string;
  planned_start: string | null;
  planned_end: string | null;
};

export type PartStatus = "open" | "completed";

export type Part = {
  id: string;
  sprint_id: string;
  name: string;
  status: PartStatus;
  planned_completion_date: string | null;
  actual_completion_date: string | null;
  teach_back_done: boolean;
};

export type Todo = {
  id: string;
  text: string;
  due_date: string | null;
  done: boolean;
  priority: string | null;
};

export async function getSprints(): Promise<Sprint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .order("planned_start", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function createSprint(sprint: {
  name: string;
  planned_start: string | null;
  planned_end: string | null;
}): Promise<Sprint> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sprints")
    .insert(sprint)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getParts(sprintId?: string): Promise<Part[]> {
  const supabase = createClient();
  let query = supabase.from("parts").select("*").order("name");

  if (sprintId) {
    query = query.eq("sprint_id", sprintId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPart(part: {
  sprint_id: string;
  name: string;
  planned_completion_date: string | null;
}): Promise<Part> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parts")
    .insert(part)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setPartStatus(
  id: string,
  completed: boolean,
): Promise<Part> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parts")
    .update({
      status: completed ? "completed" : "open",
      actual_completion_date: completed
        ? new Date().toISOString().slice(0, 10)
        : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setTeachBackDone(
  id: string,
  done: boolean,
): Promise<Part> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parts")
    .update({ teach_back_done: done })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTodos(): Promise<Todo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function createTodo(todo: {
  text: string;
  due_date: string | null;
  priority: string | null;
}): Promise<Todo> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("todos")
    .insert(todo)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setTodoDone(id: string, done: boolean): Promise<Todo> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("todos")
    .update({ done })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTodo(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("todos").delete().eq("id", id);

  if (error) throw error;
}
