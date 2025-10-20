/**
 * API Response Examples - Based on actual Moodle API
 * 
 * This file contains example responses from the Moodle Web Services API
 * to help understand the data structure.
 */

// Example 1: core_reportbuilder_list_reports
export const LIST_REPORTS_EXAMPLE = {
  reports: [
    {
      name: "best my",
      source: "mod_attendance\\reportbuilder\\datasource\\attendance",
      type: 0,
      uniquerows: false,
      conditiondata: "[]",
      id: 13,
      // ... other fields
    },
    // More reports...
  ],
};

// Example 2: core_reportbuilder_retrieve_report
export const RETRIEVE_REPORT_EXAMPLE = {
  data: {
    headers: [
      "Student Name",
      "Course",
      "Monday, 20 October 2025, 12:00 PM",
      "Tuesday, 21 October 2025, 12:00 PM",
      // More session dates...
    ],
    rows: [
      {
        "Student Name": "Geetha Balachandran",
        Course: "Best Course",
        "Monday, 20 October 2025, 12:00 PM": "P",
        "Tuesday, 21 October 2025, 12:00 PM": "A",
        // More sessions...
      },
      // More students...
    ],
  },
  details: {
    name: "Attendance Report",
    source: "mod_attendance\\reportbuilder\\datasource\\attendance",
  },
};

// Example wstoken format
export const TOKEN_EXAMPLE = "7970b778005353e144525d58937ebce9";

// Example API call parameters
export const API_PARAMS_EXAMPLE = {
  wstoken: "7970b778005353e144525d58937ebce9",
  wsfunction: "core_reportbuilder_list_reports",
  moodlewsrestformat: "json",
};

// Example for retrieve_report
export const RETRIEVE_PARAMS_EXAMPLE = {
  wstoken: "7970b778005353e144525d58937ebce9",
  wsfunction: "core_reportbuilder_retrieve_report",
  moodlewsrestformat: "json",
  reportid: "13",
  page: "0",
};
