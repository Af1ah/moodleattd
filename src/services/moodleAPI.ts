import { 
  ListReportsResponse, 
  RetrieveReportResponse, 
  MoodleAPIParams 
} from '@/types/moodle';

class MoodleAPIService {
  private wstoken: string;

  constructor(wstoken: string) {
    this.wstoken = wstoken;
  }

  /**
   * Make a request to the Moodle API via Next.js API route (bypasses CORS)
   */
  private async makeRequest<T>(params: MoodleAPIParams): Promise<T> {
    // Use Next.js API route as proxy to bypass CORS
    const url = '/api/moodle';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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
   * Uses optimized parallel fetching with batch control
   */
  async retrieveCompleteReport(reportId: number, sequential = false): Promise<RetrieveReportResponse> {
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

    const allRows = [...firstPage.data.rows];

    // If sequential mode or very large report, fetch one at a time
    if (sequential || totalPages > 50) {
      console.log('📥 Using sequential mode for reliability...');
      
      for (let page = 1; page < totalPages; page++) {
        try {
          console.log(`📄 Fetching page ${page + 1} of ${totalPages}...`);
          const pageData = await this.retrieveReport(reportId, page);
          allRows.push(...pageData.data.rows);
          
          // Small delay between requests for sequential mode
          if (page < totalPages - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.warn(`Failed to fetch page ${page + 1}, retrying...`, err);
          await new Promise(resolve => setTimeout(resolve, 1000));
          const pageData = await this.retrieveReport(reportId, page);
          allRows.push(...pageData.data.rows);
        }
      }
    } else {
      // Optimized parallel batch mode for better performance
      const BATCH_SIZE = 5; // Increased from 3 for faster loading

      for (let batchStart = 1; batchStart < totalPages; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalPages);
        const batchPages = [];
        
        console.log(`📥 Fetching pages ${batchStart + 1} to ${batchEnd} of ${totalPages}...`);

        for (let page = batchStart; page < batchEnd; page++) {
          batchPages.push(page);
        }

        // Fetch all pages in batch simultaneously
        const batchPromises = batchPages.map(async (page) => {
          try {
            return await this.retrieveReport(reportId, page);
          } catch (err) {
            console.warn(`Failed to fetch page ${page + 1}, retrying...`, err);
            // Single retry with minimal delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return await this.retrieveReport(reportId, page);
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Add rows from this batch in order
        batchResults.forEach(result => {
          allRows.push(...result.data.rows);
        });

        // Reduced delay between batches for faster loading
        if (batchEnd < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

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
