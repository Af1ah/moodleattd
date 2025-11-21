import { NextRequest, NextResponse } from "next/server";
import { getLTISession } from "@/lib/session";
import { 
  getUserAdmissionYear, 
  getCurrentSemester, 
  getSemestersByAdmissionYear,
  dateToTimestamp
} from "@/services/semesterService";

// GET: Fetch user's admission year and semester dates
export async function GET(request: NextRequest) {
  try {
    // Try LTI session first
    const session = await getLTISession();
    let userId: string | null = null;
    
    if (session) {
      userId = session.userId;
    } else {
      // For token-based auth, try to get userId from query params or headers
      const { searchParams } = new URL(request.url);
      userId = searchParams.get('userId');
      
      // If no userId provided, return empty response (not an error)
      if (!userId) {
        return NextResponse.json({
          admissionYear: null,
          currentSemester: null,
          allSemesters: [],
          message: "No user ID provided",
        });
      }
    }

    // Get user's admission year
    const admissionYear = await getUserAdmissionYear(userId);

    if (!admissionYear) {
      return NextResponse.json({
        admissionYear: null,
        currentSemester: null,
        allSemesters: [],
        message: "No admission year found for user",
      });
    }

    // Get current semester for this admission year
    const currentSemester = await getCurrentSemester(admissionYear);

    // Get all semesters for this admission year
    const allSemesters = await getSemestersByAdmissionYear(admissionYear);

    // Convert dates to timestamps for easier frontend usage
    const response: any = {
      admissionYear,
      currentSemester: currentSemester ? {
        ...currentSemester,
        startTimestamp: dateToTimestamp(currentSemester.startdate),
        endTimestamp: dateToTimestamp(currentSemester.enddate),
      } : null,
      allSemesters: allSemesters.map(s => ({
        ...s,
        startTimestamp: dateToTimestamp(s.startdate),
        endTimestamp: dateToTimestamp(s.enddate),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user admission year:", error);
    return NextResponse.json(
      { error: "Failed to fetch admission year and semester data" },
      { status: 500 }
    );
  }
}
