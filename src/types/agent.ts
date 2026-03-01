export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  languages: string[];
  designations: string[];
  bio: string | null;
  active: boolean;
}

export interface AgentFilters {
  language?: string;
  letter?: string;
  search?: string;
  page?: number;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
  totalPages: number;
  currentPage: number;
}
