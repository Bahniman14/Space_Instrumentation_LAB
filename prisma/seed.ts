import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const seedDir = join(process.cwd(), "seed");

type LabsFile = {
  labs: {
    name: string;
    experiments: { orderIndex: number; name: string }[];
  }[];
};

type StaffFile = {
  tas: { name: string; email: string; assignedLab: string }[];
  supervisor: { name: string; email: string };
};

type StudentRow = { name: string; rollNumber: string; email: string };

function parseStudentsCsv(raw: string): StudentRow[] {
  const [headerLine, ...rows] = raw.trim().split(/\r?\n/);
  const columns = headerLine.split(",").map((c) => c.trim());

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const record = Object.fromEntries(columns.map((c, i) => [c, values[i]]));
      return {
        name: record.name,
        rollNumber: record.roll_number,
        email: record.email,
      };
    });
}

// Labs and their placeholder experiment names come from CLAUDE.md §9 — real
// experiment names are set later per-lab by each TA (Phase 4), not seeded here.
async function seedLabs(): Promise<Map<string, string>> {
  const { labs } = JSON.parse(
    readFileSync(join(seedDir, "labs.json"), "utf-8")
  ) as LabsFile;

  const labIdByName = new Map<string, string>();

  for (const lab of labs) {
    const labRow = await prisma.lab.upsert({
      where: { name: lab.name },
      update: {},
      create: { name: lab.name },
    });
    labIdByName.set(lab.name, labRow.id);

    // Experiment has no unique key to upsert on, so re-run safely by matching
    // on (labId, orderIndex) instead.
    for (const experiment of lab.experiments) {
      const existing = await prisma.experiment.findFirst({
        where: { labId: labRow.id, orderIndex: experiment.orderIndex },
      });

      if (existing) {
        await prisma.experiment.update({
          where: { id: existing.id },
          data: { name: experiment.name },
        });
      } else {
        await prisma.experiment.create({
          data: {
            labId: labRow.id,
            orderIndex: experiment.orderIndex,
            name: experiment.name,
          },
        });
      }
    }
  }

  return labIdByName;
}

async function seedStaff(labIdByName: Map<string, string>): Promise<void> {
  const staff = JSON.parse(
    readFileSync(join(seedDir, "staff.json"), "utf-8")
  ) as StaffFile;

  for (const ta of staff.tas) {
    const assignedLabId = labIdByName.get(ta.assignedLab);
    if (!assignedLabId) {
      throw new Error(
        `TA "${ta.name}": assignedLab "${ta.assignedLab}" does not match any seeded Lab name`
      );
    }

    await prisma.user.upsert({
      where: { email: ta.email },
      update: { name: ta.name, role: "TA", assignedLabId },
      create: { name: ta.name, email: ta.email, role: "TA", assignedLabId },
    });
  }

  await prisma.user.upsert({
    where: { email: staff.supervisor.email },
    update: { name: staff.supervisor.name, role: "SUPERVISOR" },
    create: {
      name: staff.supervisor.name,
      email: staff.supervisor.email,
      role: "SUPERVISOR",
    },
  });
}

async function seedStudents(): Promise<number> {
  const raw = readFileSync(join(seedDir, "students.csv"), "utf-8");
  const students = parseStudentsCsv(raw);

  for (const student of students) {
    await prisma.user.upsert({
      where: { email: student.email },
      update: {
        name: student.name,
        role: "STUDENT",
        rollNumber: student.rollNumber,
      },
      create: {
        name: student.name,
        email: student.email,
        role: "STUDENT",
        rollNumber: student.rollNumber,
      },
    });
  }

  return students.length;
}

async function main() {
  const labIdByName = await seedLabs();
  await seedStaff(labIdByName);
  const studentCount = await seedStudents();

  console.log(
    `Seeded ${labIdByName.size} labs, ${studentCount} students, 3 TAs, and 1 supervisor.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
