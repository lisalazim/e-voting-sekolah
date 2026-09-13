export type AnnouncementChecklistItem = {
  isReady: boolean;
  label: string;
};

export type AnnouncementStatus =
  | "not_ready"
  | "ready"
  | "counting_down"
  | "revealed";
