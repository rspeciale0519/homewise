export interface TrainingItem {
  id: string;
  title: string;
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

export interface CourseData {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  autoEnroll: boolean;
  reminderDays: number | null;
  reminderRepeat: number | null;
  items: { content: { id: string; title: string; type: string } }[];
  _count: { enrollments: number };
}

export interface UploadedFile {
  name: string;
  size: number;
  fileKey: string;
}
