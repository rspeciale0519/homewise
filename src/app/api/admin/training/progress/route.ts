import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AgentProgress {
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  tracksCompleted: number;
  tracksTotal: number;
  contentCompleted: number;
  contentTotal: number;
  avgCompletion: number;
  lastActivity: string | null;
}

export async function GET() {
  const [totalContent, totalEnrollments, agents, allProgress, enrollments] =
    await Promise.all([
      prisma.trainingContent.count({ where: { published: true } }),
      prisma.trainingEnrollment.count(),
      prisma.userProfile.findMany({
        where: { role: "agent" },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      }),
      prisma.trainingProgress.findMany({
        where: { completed: true },
        select: { userId: true, contentId: true, completedAt: true },
      }),
      prisma.trainingEnrollment.findMany({
        include: {
          course: {
            include: { _count: { select: { items: true } } },
          },
        },
      }),
    ]);

  const now = new Date();

  const overdueCount = enrollments.filter((e) => {
    if (e.completedAt) return false;
    if (!e.course.reminderDays) return false;
    const deadline = new Date(e.createdAt);
    deadline.setDate(deadline.getDate() + e.course.reminderDays);
    return deadline < now;
  }).length;

  const progressByUser = new Map<string, Set<string>>();
  const lastActivityByUser = new Map<string, Date>();

  for (const p of allProgress) {
    let set = progressByUser.get(p.userId);
    if (!set) {
      set = new Set<string>();
      progressByUser.set(p.userId, set);
    }
    set.add(p.contentId);

    if (p.completedAt) {
      const prev = lastActivityByUser.get(p.userId);
      if (!prev || p.completedAt > prev) {
        lastActivityByUser.set(p.userId, p.completedAt);
      }
    }
  }

  const enrollmentsByUser = new Map<
    string,
    Array<{ trackItemCount: number; completed: boolean }>
  >();
  for (const e of enrollments) {
    let list = enrollmentsByUser.get(e.userId);
    if (!list) {
      list = [];
      enrollmentsByUser.set(e.userId, list);
    }
    list.push({
      trackItemCount: e.course._count.items,
      completed: e.completedAt !== null,
    });
  }

  const agentStats: AgentProgress[] = agents.map((agent) => {
    const completedContent = progressByUser.get(agent.id)?.size ?? 0;
    const userEnrollments = enrollmentsByUser.get(agent.id) ?? [];
    const tracksTotal = userEnrollments.length;
    const tracksCompleted = userEnrollments.filter((t) => t.completed).length;
    const totalTrackItems = userEnrollments.reduce(
      (sum, t) => sum + t.trackItemCount,
      0,
    );
    const avgCompletion =
      totalTrackItems > 0
        ? Math.round((completedContent / totalTrackItems) * 100)
        : 0;
    const lastAct = lastActivityByUser.get(agent.id);

    return {
      userId: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      photoUrl: agent.avatarUrl,
      tracksCompleted,
      tracksTotal,
      contentCompleted: completedContent,
      contentTotal: totalContent,
      avgCompletion: Math.min(avgCompletion, 100),
      lastActivity: lastAct ? lastAct.toISOString() : null,
    };
  });

  const avgCompletionRate =
    agentStats.length > 0
      ? Math.round(
          agentStats.reduce((sum, a) => sum + a.avgCompletion, 0) /
            agentStats.length,
        )
      : 0;

  return NextResponse.json({
    summary: {
      totalContent,
      totalEnrollments,
      avgCompletionRate,
      overdueCount,
    },
    agents: agentStats,
  });
}
