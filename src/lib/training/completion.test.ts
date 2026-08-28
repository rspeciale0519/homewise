import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  contentFind: vi.fn(),
  enrollmentFind: vi.fn(),
  enrollmentFindMany: vi.fn(),
  enrollmentUpdateMany: vi.fn(),
  progressFindMany: vi.fn(),
  progressUpsert: vi.fn(),
  progressUpdateMany: vi.fn(),
}));

const tx = {
  trainingContent: { findUnique: mocks.contentFind },
  trainingEnrollment: {
    findFirst: mocks.enrollmentFind,
    findMany: mocks.enrollmentFindMany,
    updateMany: mocks.enrollmentUpdateMany,
  },
  trainingProgress: {
    findMany: mocks.progressFindMany,
    upsert: mocks.progressUpsert,
    updateMany: mocks.progressUpdateMany,
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { completeTrainingContent, reopenTrainingContent } from "./completion";

describe("training completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    mocks.progressUpsert.mockResolvedValue({});
    mocks.progressUpdateMany.mockResolvedValue({ count: 1 });
    mocks.enrollmentUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects unpublished or non-agent content without writing progress", async () => {
    mocks.contentFind.mockResolvedValue({
      published: false,
      status: "draft",
      audience: "agent_only",
      courseItems: [],
    });

    await expect(completeTrainingContent("user-1", "content-1"))
      .resolves.toBe(false);
    expect(mocks.progressUpsert).not.toHaveBeenCalled();
  });

  it("requires enrollment before completing course content", async () => {
    mocks.contentFind.mockResolvedValue({
      published: true,
      status: "published",
      audience: "agent_only",
      courseItems: [{
        courseId: "course-1",
        course: { audience: "agent_only" },
      }],
    });
    mocks.enrollmentFind.mockResolvedValue(null);

    await expect(completeTrainingContent("user-1", "content-1"))
      .resolves.toBe(false);
    expect(mocks.progressUpsert).not.toHaveBeenCalled();
  });

  it("completes standalone published agent content", async () => {
    mocks.contentFind.mockResolvedValue({
      published: true,
      status: "published",
      audience: "both",
      courseItems: [],
    });

    await expect(completeTrainingContent("user-1", "content-1"))
      .resolves.toBe(true);
    expect(mocks.progressUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_contentId: { userId: "user-1", contentId: "content-1" },
      },
    }));
  });

  it("finishes a course when every visible agent module is complete", async () => {
    mocks.contentFind.mockResolvedValue({
      published: true,
      status: "published",
      audience: "agent_only",
      courseItems: [{
        courseId: "course-1",
        course: { audience: "agent_only" },
      }],
    });
    mocks.enrollmentFind.mockResolvedValue({ id: "enrollment-1" });
    mocks.enrollmentFindMany.mockResolvedValue([{
      id: "enrollment-1",
      course: {
        items: [
          {
            contentId: "content-1",
            content: { published: true, status: "published", audience: "agent_only" },
          },
          {
            contentId: "content-2",
            content: { published: true, status: "published", audience: "both" },
          },
          {
            contentId: "hidden-draft",
            content: { published: false, status: "draft", audience: "agent_only" },
          },
        ],
      },
    }]);
    mocks.progressFindMany.mockResolvedValue([
      { contentId: "content-1" },
      { contentId: "content-2" },
    ]);

    await expect(completeTrainingContent("user-1", "content-1"))
      .resolves.toBe(true);
    expect(mocks.progressFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        completed: true,
        contentId: { in: ["content-1", "content-2"] },
      },
      select: { contentId: true },
    });
    expect(mocks.enrollmentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ["enrollment-1"] },
        userId: "user-1",
      }),
    }));
  });

  it("reopens progress and an eligible enrolled course atomically", async () => {
    mocks.contentFind.mockResolvedValue({
      published: true,
      status: "published",
      audience: "agent_only",
      courseItems: [{
        courseId: "course-1",
        course: { audience: "both" },
      }],
    });
    mocks.enrollmentFind.mockResolvedValue({ id: "enrollment-1" });

    await expect(reopenTrainingContent("user-1", "content-1"))
      .resolves.toBe(true);
    expect(mocks.progressUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", contentId: "content-1" },
      data: { completed: false, completedAt: null },
    });
    expect(mocks.enrollmentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: "user-1",
        courseId: { in: ["course-1"] },
      }),
    }));
  });
});
