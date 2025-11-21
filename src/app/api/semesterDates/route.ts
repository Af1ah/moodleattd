import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getLTISession } from "@/lib/session";

const prisma = new PrismaClient();

// Helper to check authentication (LTI or token-based)
async function checkAuth(request: NextRequest) {
  // Check LTI session first
  const session = await getLTISession();
  if (session) {
    return { userId: session.userId, role: session.roleShortname };
  }
  
  // Check for token-based auth (regular login)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Token exists, user is authenticated via regular login
    // You can validate the token with Moodle if needed
    return { userId: null, role: null }; // Will be handled by frontend
  }
  
  return null;
}

// GET: Fetch all semester dates or filter by admission year
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const admissionYear = searchParams.get("admissionYear");
    const currentOnly = searchParams.get("currentOnly") === "true";

    const where: any = {};
    if (admissionYear) {
      where.admissionyear = admissionYear;
    }
    if (currentOnly) {
      where.iscurrent = true;
    }

    const semesterDates = await prisma.mdl_semester_dates.findMany({
      where,
      orderBy: [
        { admissionyear: "desc" },
        { startdate: "desc" },
      ],
    });

    // Serialize BigInt values for JSON
    const serialized = semesterDates.map((s: any) => ({
      id: s.id.toString(),
      admissionyear: s.admissionyear,
      semestername: s.semestername,
      startdate: s.startdate.toISOString(),
      enddate: s.enddate.toISOString(),
      iscurrent: s.iscurrent,
      timecreated: s.timecreated.toString(),
      timemodified: s.timemodified.toString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching semester dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch semester dates" },
      { status: 500 }
    );
  }
}

// POST: Create a new semester date entry
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For token-based auth, allow all authenticated users
    // For LTI auth, check role
    if (auth.role && !["admin", "manager", "editingteacher"].includes(auth.role.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      admissionyear,
      semestername,
      startdate,
      enddate,
      iscurrent = false,
    } = body;

    // Validate required fields
    if (!admissionyear || !semestername || !startdate || !enddate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If marking as current, unmark other semesters for this admission year
    if (iscurrent) {
      await prisma.mdl_semester_dates.updateMany({
        where: { admissionyear },
        data: { iscurrent: false },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const newSemester = await prisma.mdl_semester_dates.create({
      data: {
        admissionyear,
        semestername,
        startdate: new Date(startdate),
        enddate: new Date(enddate),
        iscurrent,
        timecreated: BigInt(now),
        timemodified: BigInt(now),
        createdby: BigInt(auth.userId || 2), // Default to 2 if no userId
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedSemester = {
      id: newSemester.id.toString(),
      admissionyear: newSemester.admissionyear,
      semestername: newSemester.semestername,
      startdate: newSemester.startdate.toISOString(),
      enddate: newSemester.enddate.toISOString(),
      iscurrent: newSemester.iscurrent,
      timecreated: newSemester.timecreated.toString(),
      timemodified: newSemester.timemodified.toString(),
      createdby: newSemester.createdby.toString(),
    };

    return NextResponse.json(serializedSemester, { status: 201 });
  } catch (error: any) {
    console.error("Error creating semester date:", error);
    
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Semester with this name already exists for this admission year" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create semester date" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing semester date entry
export async function PUT(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For token-based auth, allow all authenticated users
    // For LTI auth, check role
    if (auth.role && !["admin", "manager", "editingteacher"].includes(auth.role.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, admissionyear, semestername, startdate, enddate, iscurrent } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Semester ID is required" },
        { status: 400 }
      );
    }

    // If marking as current, unmark other semesters for this admission year
    if (iscurrent && admissionyear) {
      await prisma.mdl_semester_dates.updateMany({
        where: { 
          admissionyear,
          id: { not: BigInt(id) }
        },
        data: { iscurrent: false },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const updateData: any = {
      timemodified: BigInt(now),
    };

    if (admissionyear) updateData.admissionyear = admissionyear;
    if (semestername) updateData.semestername = semestername;
    if (startdate) updateData.startdate = new Date(startdate);
    if (enddate) updateData.enddate = new Date(enddate);
    if (typeof iscurrent === "boolean") updateData.iscurrent = iscurrent;

    const updatedSemester = await prisma.mdl_semester_dates.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    // Serialize BigInt values for JSON
    const serializedSemester = {
      id: updatedSemester.id.toString(),
      admissionyear: updatedSemester.admissionyear,
      semestername: updatedSemester.semestername,
      startdate: updatedSemester.startdate.toISOString(),
      enddate: updatedSemester.enddate.toISOString(),
      iscurrent: updatedSemester.iscurrent,
      timecreated: updatedSemester.timecreated.toString(),
      timemodified: updatedSemester.timemodified.toString(),
    };

    return NextResponse.json(serializedSemester);
  } catch (error: any) {
    console.error("Error updating semester date:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update semester date" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a semester date entry
export async function DELETE(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For token-based auth, allow all authenticated users
    // For LTI auth, check role
    if (auth.role && !["admin", "manager", "editingteacher"].includes(auth.role.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Semester ID is required" },
        { status: 400 }
      );
    }

    await prisma.mdl_semester_dates.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ message: "Semester deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting semester date:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete semester date" },
      { status: 500 }
    );
  }
}
