import { 
  ListReportsResponse, 
  RetrieveReportResponse, 
  MoodleAPIParams 
} from '@/types/moodle';

const BASE_URL = 'https://moodle.aflahdev.me/webservice/rest/server.php';

class MoodleAPIService {
  private wstoken: string;

  constructor(wstoken: string) {
    this.wstoken = wstoken;
  }

  /**
   * Make a request to the Moodle API
   */
  private async makeRequest<T>(params: MoodleAPIParams): Promise<T> {
    const queryParams = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    );

    const url = `${BASE_URL}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check for Moodle API errors
      if (data.exception) {
        throw new Error(data.message || 'Moodle API Error');
      }

      return data as T;
    } catch (error) {
      console.error('Moodle API request failed:', error);
      throw error;
    }
  }

  /**
   * Get list of available reports
   * wsfunction: core_reportbuilder_list_reports
   */
  async listReports(): Promise<ListReportsResponse> {
    return this.makeRequest<ListReportsResponse>({
      wstoken: this.wstoken,
      wsfunction: 'core_reportbuilder_list_reports',
      moodlewsrestformat: 'json',
    });
  }

  /**
   * Retrieve a specific report's data (single page)
   * wsfunction: core_reportbuilder_retrieve_report
   */
  async retrieveReport(
    reportId: number, 
    page: number = 0
  ): Promise<RetrieveReportResponse> {
    return this.makeRequest<RetrieveReportResponse>({
      wstoken: this.wstoken,
      wsfunction: 'core_reportbuilder_retrieve_report',
      moodlewsrestformat: 'json',
      reportid: reportId,
      page: page,
    });
  }

  /**
   * Retrieve ALL pages of a report's data
   * Automatically fetches all pages based on totalrowcount
   * Assumes 10 rows per page (Moodle default)
   */
  async retrieveCompleteReport(reportId: number): Promise<RetrieveReportResponse> {
    // Get first page to determine total count
    const firstPage = await this.retrieveReport(reportId, 0);
    const totalRows = firstPage.data.totalrowcount;
    const rowsPerPage = 10; // Moodle default
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    console.log(`📊 Fetching complete report: ${totalRows} total rows across ${totalPages} pages`);

    // If only one page, return it
    if (totalPages <= 1) {
      return firstPage;
    }

    // Fetch remaining pages
    const pagePromises: Promise<RetrieveReportResponse>[] = [];
    for (let page = 1; page < totalPages; page++) {
      pagePromises.push(this.retrieveReport(reportId, page));
    }

    const remainingPages = await Promise.all(pagePromises);

    // Combine all rows
    const allRows = [
      ...firstPage.data.rows,
      ...remainingPages.flatMap(p => p.data.rows)
    ];

    console.log(`✅ Successfully fetched ${allRows.length} rows from ${totalPages} pages`);

    // Return combined response
    return {
      ...firstPage,
      data: {
        ...firstPage.data,
        rows: allRows,
      }
    };
  }

  /**
   * Update the token if needed
   */
  updateToken(newToken: string): void {
    this.wstoken = newToken;
  }
}

export default MoodleAPIService;
