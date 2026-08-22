import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "connected" });
  } catch (error) {
    return Response.json(
      { status: "error", db: "unreachable", message: (error as Error).message },
      { status: 500 }
    );
  }
}
