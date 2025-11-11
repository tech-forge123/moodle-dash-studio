import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const contents = await response.json();
    console.log(`Successfully fetched contents for course ${courseId}`);

    return new Response(
      JSON.stringify({ contents }),
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
