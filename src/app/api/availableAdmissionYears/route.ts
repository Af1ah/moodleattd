import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch all unique admission years that exist in the database
export async function GET(request: NextRequest) {
  try {
    // Query to get all unique admission years from user_info_data
    const result = await prisma.$queryRaw<Array<{ data: string }>>`
      SELECT DISTINCT d.data
      FROM mdl_user_info_data d
      JOIN mdl_user_info_field f ON d.fieldid = f.id
      WHERE f.shortname = 'adm_year'
        AND d.data != ''
        AND d.data IS NOT NULL
      ORDER BY d.data DESC
    `;

    const years = result.map(r => r.data).filter(y => y && y.length === 4);

    return NextResponse.json({
      years,
      count: years.length,
    });
  } catch (error) {
    console.error("Error fetching admission years:", error);
    return NextResponse.json(
      { error: "Failed to fetch admission years", years: [] },
      { status: 500 }
    );
  }
}
