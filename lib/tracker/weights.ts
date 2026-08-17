// Course configuration: part kind → weight, used by the projection engine
// (lib/tracker/projection.ts) to turn a mix of reading parts and projects
// into comparable "units" of work.

export type PartKind =
  | "part"
  | "mid_project"
  | "project"
  | "career"
  | "capstone";

export const KIND_WEIGHTS: Record<PartKind, number> = {
  part: 1,
  mid_project: 1.5,
  project: 2,
  career: 1,
  capstone: 3,
};
