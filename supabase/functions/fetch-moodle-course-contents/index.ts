import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to append token to Moodle file URLs
const appendTokenToUrl = (url: string, token: string): string => {
  if (!url) return url;
  
  // Only append token to Moodle webservice URLs
  if (url.includes('/webservice/pluginfile.php') || url.includes('/pluginfile.php')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${token}`;
  }
  
  return url;
};

// Fetch mod_page HTML content
const fetchPageContent = async (moodleUrl: string, token: string, courseId: number, pageId: number): Promise<string | null> => {
  try {
    const apiUrl = `${moodleUrl}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_page_get_pages_by_courses&courseids[0]=${courseId}&moodlewsrestformat=json`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch page content:', response.status);
      return null;
    }
    
    const data = await response.json();
    const pages = data.pages || [];
    const page = pages.find((p: any) => p.coursemodule === pageId);
    
    return page?.content || null;
  } catch (error) {
    console.error('Error fetching page content:', error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MOODLE_URL = Deno.env.get('MOODLE_URL');
    const MOODLE_TOKEN = Deno.env.get('MOODLE_TOKEN');

    if (!MOODLE_URL || !MOODLE_TOKEN) {
      console.error('Missing Moodle credentials');
      return new Response(
        JSON.stringify({ error: 'Moodle credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { courseId } = await req.json();

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'Course ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch course contents from Moodle
    const moodleApiUrl = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_course_get_contents&courseid=${courseId}&moodlewsrestformat=json`;
    
    console.log(`Fetching contents for course ID: ${courseId}`);
    const response = await fetch(moodleApiUrl);
    
    if (!response.ok) {
      console.error('Moodle API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch course contents from Moodle' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawContents = await response.json();
    
    // Check for Moodle API errors
    if (rawContents.exception || rawContents.errorcode) {
      console.error('Moodle API returned error:', rawContents);
      return new Response(
        JSON.stringify({ 
          error: rawContents.message || 'Moodle API error',
          errorcode: rawContents.errorcode 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing contents for course ${courseId}`);
    
    // Process contents: append tokens to file URLs and fetch mod_page content
    const processedContents = await Promise.all(
      rawContents.map(async (section: any) => {
        const processedModules = await Promise.all(
          (section.modules || []).map(async (module: any) => {
            // Process file contents
            const processedFiles = (module.contents || []).map((file: any) => ({
              ...file,
              fileurl: appendTokenToUrl(file.fileurl, MOODLE_TOKEN),
            }));
            
            // For mod_page, fetch the HTML content
            let pageContent = null;
            if (module.modname === 'page') {
              pageContent = await fetchPageContent(
                MOODLE_URL,
                MOODLE_TOKEN,
                courseId,
                module.id
              );
            }
            
            return {
              ...module,
              url: module.url ? appendTokenToUrl(module.url, MOODLE_TOKEN) : module.url,
              contents: processedFiles,
              pageContent, // Include fetched HTML for mod_page
            };
          })
        );
        
        return {
          ...section,
          modules: processedModules,
        };
      })
    );
    
    console.log(`Successfully processed contents for course ${courseId}`);

    return new Response(
      JSON.stringify({ contents: processedContents }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-moodle-course-contents:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
