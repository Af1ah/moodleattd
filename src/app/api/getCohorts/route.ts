import { NextResponse } from 'next/server';
import { getAllCohorts } from '@/services/cohortService';

/**
 * Get all available cohorts
 * 
 * Usage: GET /api/getCohorts
 */
export async function GET() {
  try {
    console.log('📚 Fetching all cohorts...');
    
    const cohorts = await getAllCohorts();
    
    return NextResponse.json({
      success: true,
      totalCohorts: cohorts.length,
      cohorts: cohorts.map((cohort: { 
        id: bigint; 
        name: string; 
        idnumber: string | null; 
        description: string | null; 
        contextid: bigint; 
        timecreated: bigint; 
        timemodified: bigint; 
      }) => ({
        id: Number(cohort.id),
        name: cohort.name,
        idnumber: cohort.idnumber,
        description: cohort.description,
        contextid: Number(cohort.contextid),
        timecreated: Number(cohort.timecreated),
        timemodified: Number(cohort.timemodified),
      })),
    });
  } catch (error) {
    console.error('❌ Get cohorts API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch cohorts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
