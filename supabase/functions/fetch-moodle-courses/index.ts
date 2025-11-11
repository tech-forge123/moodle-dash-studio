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

    // Fetch courses from Moodle
    const moodleApiUrl = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_course_get_courses&moodlewsrestformat=json`;
    
    console.log('Fetching courses from Moodle...');
    const response = await fetch(moodleApiUrl);
    
    if (!response.ok) {
      console.error('Moodle API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch courses from Moodle' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const courses = await response.json();
    console.log(`Successfully fetched ${courses.length} courses`);

    // Transform Moodle course data to match our interface
    const transformedCourses = courses.map((course: any) => ({
      id: course.id,
      fullname: course.fullname,
      shortname: course.shortname,
      summary: course.summary || 'No description available',
      categoryname: course.categoryname || 'Uncategorized',
      enrolledusercount: course.enrolledusercount || 0,
      format: course.format || 'Unknown',
      imageurl: course.overviewfiles?.[0]?.fileurl || null,
    }));

    return new Response(
      JSON.stringify({ courses: transformedCourses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-moodle-courses:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
