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

// Helper function to adjust date to avoid weekends
function adjustDateForWeekend(date: Date): Date {
  const day = date.getDay();
  if (day === 0) { // Sunday
    date.setDate(date.getDate() + 1);
  } else if (day === 6) { // Saturday
    date.setDate(date.getDate() + 2);
  }
  return date;
}

// Helper function to auto-generate semesters for an admission year
async function autoGenerateSemesters(admissionYear: string) {
  const existingSemesters = await prisma.mdl_semester_dates.findMany({
    where: { admissionyear: admissionYear },
  });

  // If all semesters exist for this year, skip generation
  if (existingSemesters.length >= 8) {
    return [];
  }

  // Get all used semester numbers globally (across all years)
  const allSemesters = await prisma.mdl_semester_dates.findMany({
    select: { semestername: true }
  });
  const usedSemesterNumbers = new Set(allSemesters.map(s => s.semestername));

  const now = Math.floor(Date.now() / 1000);
  const currentDate = new Date();
  const newSemesters = [];

  // Generate semesters 1-10, skipping already used numbers globally
  for (let sem = 1; sem <= 10; sem++) {
    const semStr = sem.toString();
    
    // Skip if this semester number is already used by ANY admission year
    if (usedSemesterNumbers.has(semStr)) continue;
    
    // Skip if this year already has this semester
    const existsForThisYear = existingSemesters.some((s: any) => s.semestername === semStr);
    if (existsForThisYear) continue;

    // Calculate year offset (each year has 2 semesters)
    const yearOffset = Math.floor((sem - 1) / 2);
    const baseYear = parseInt(admissionYear) + yearOffset;

    let startDate: Date;
    let endDate: Date;

    // Odd semesters (1,3,5,7): July - November
    if (sem % 2 === 1) {
      startDate = new Date(baseYear, 6, 1); // July 1
      endDate = new Date(baseYear, 10, 30); // November 30
    } else {
      // Even semesters (2,4,6,8): December - March
      startDate = new Date(baseYear, 11, 1); // December 1
      endDate = new Date(baseYear + 1, 2, 31); // March 31 next year
    }

    // Adjust dates to avoid weekends
    startDate = adjustDateForWeekend(startDate);
    endDate = adjustDateForWeekend(endDate);

    // Check if this semester should be current based on today's date
    const isCurrent = currentDate >= startDate && currentDate <= endDate;

    newSemesters.push({
      admissionyear: admissionYear,
      semestername: semStr,
      startdate: startDate,
      enddate: endDate,
      iscurrent: isCurrent,
      timecreated: BigInt(now),
      timemodified: BigInt(now),
      createdby: BigInt(2), // Default admin user
    });
    
    // Stop after generating 8 semesters for this year
    if (newSemesters.length >= 8) break;
  }

  return newSemesters;
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
        { semestername: "asc" },
      ],
    });

    // Auto-increment to next semester only if current one has ended
    const currentDate = new Date();
    const updates = [];
    
    for (const semester of semesterDates) {
      const endDate = new Date(semester.enddate);
      
      // If current semester's end date has passed, auto-increment
      if (semester.iscurrent && currentDate > endDate) {
        // Find next available semester number
        const currentNum = parseInt(semester.semestername);
        const allUsedNumbers = semesterDates.map(s => parseInt(s.semestername));
        
        let nextNum = currentNum + 1;
        while (allUsedNumbers.includes(nextNum) && nextNum <= 10) {
          nextNum++;
        }
        
        if (nextNum <= 10) {
          // Update to next semester number
          const yearOffset = Math.floor((nextNum - 1) / 2);
          const baseYear = parseInt(semester.admissionyear) + yearOffset;
          
          let newStartDate: Date;
          let newEndDate: Date;
          
          if (nextNum % 2 === 1) {
            // Odd semester: July - November
            newStartDate = new Date(baseYear, 6, 1);
            newEndDate = new Date(baseYear, 10, 30);
          } else {
            // Even semester: December - March
            newStartDate = new Date(baseYear, 11, 1);
            newEndDate = new Date(baseYear + 1, 2, 31);
          }
          
          updates.push(
            prisma.mdl_semester_dates.update({
              where: { id: semester.id },
              data: {
                semestername: nextNum.toString(),
                startdate: adjustDateForWeekend(newStartDate),
                enddate: adjustDateForWeekend(newEndDate),
                iscurrent: true,
                timemodified: BigInt(Math.floor(Date.now() / 1000)),
              },
            })
          );
        }
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      // Refetch after updates
      const updatedSemesters = await prisma.mdl_semester_dates.findMany({
        where,
        orderBy: [
          { admissionyear: "desc" },
          { semestername: "asc" },
        ],
      });
      
      // Serialize BigInt values for JSON
      const serialized = updatedSemesters.map((s: any) => ({
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
    }

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

    // Check if semester number is already used
    const existingSemester = await prisma.mdl_semester_dates.findFirst({
      where: { semestername }
    });
    
    if (existingSemester) {
      return NextResponse.json(
        { error: `Semester ${semestername} is already used by admission year ${existingSemester.admissionyear}` },
        { status: 409 }
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
        startdate: adjustDateForWeekend(new Date(startdate)),
        enddate: adjustDateForWeekend(new Date(enddate)),
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
    if (semestername) {
      // Validate uniqueness: No two admission years can have the same semester
      const existingSemester = await prisma.mdl_semester_dates.findFirst({
        where: {
          semestername,
          id: { not: BigInt(id) }
        }
      });
      
      if (existingSemester) {
        return NextResponse.json(
          { error: `Semester ${semestername} is already used by admission year ${existingSemester.admissionyear}. Each semester must be unique across all years.` },
          { status: 409 }
        );
      }
      
      updateData.semestername = semestername;
    }
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
