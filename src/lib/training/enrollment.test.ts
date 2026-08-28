import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrollAgentInAutomaticCourses } from "./enrollment";

const findMany = vi.fn();
const createMany = vi.fn();
const database = {
  trainingCourse: { findMany },
  trainingEnrollment: { createMany },
};

describe("enrollAgentInAutomaticCourses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enrolls an agent only in eligible automatic courses", async () => {
    findMany.mockResolvedValue([{ id: "course-1" }, { id: "course-2" }]);
    createMany.mockResolvedValue({ count: 2 });

    await expect(enrollAgentInAutomaticCourses(
      "user-1",
      database as never,
    )).resolves.toBe(2);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        autoEnroll: true,
        audience: { in: ["agent_only", "both"] },
      },
      select: { id: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", courseId: "course-1" },
        { userId: "user-1", courseId: "course-2" },
      ],
      skipDuplicates: true,
    });
  });

  it("does not write when no automatic course exists", async () => {
    findMany.mockResolvedValue([]);

    await expect(enrollAgentInAutomaticCourses(
      "user-1",
      database as never,
    )).resolves.toBe(0);

    expect(createMany).not.toHaveBeenCalled();
  });
});
