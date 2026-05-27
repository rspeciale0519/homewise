export interface TrainingItem {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  body: string | null;
  category: string;
  audience: string;
  type: string;
  url: string | null;
  fileKey: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  tags: string[];
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSectionData {
  id: string;
  title: string;
  sortOrder: number;
  dripDays: number | null;
  items: {
    contentId: string;
    sortOrder: number;
    content: { id: string; title: string; type: string };
  }[];
}

export interface CourseData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  audience: "agent_only" | "public_only" | "both";
  required: boolean;
  autoEnroll: boolean;
  dueDays: number | null;
  recurDays: number | null;
  passThreshold: number;
  reminderDays: number | null;
  reminderRepeat: number | null;
  /** Legacy flat list — kept for backwards compat while curriculum
   * builder rolls out. New code should iterate `sections`. */
  items: { content: { id: string; title: string; type: string } }[];
  sections?: CourseSectionData[];
  _count: { enrollments: number };
}

export interface UploadedFile {
  name: string;
  size: number;
  fileKey: string;
}
