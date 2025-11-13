import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LTI_AUTH_URL = Deno.env.get('LTI_AUTH_URL');
    const LTI_CLIENT_ID = Deno.env.get('LTI_CLIENT_ID');
    
    if (!LTI_AUTH_URL || !LTI_CLIENT_ID) {
      throw new Error('LTI configuration missing');
    }

    // Generate state and nonce
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    
    // Store state and nonce in a temporary table or use a simple in-memory approach
    // For production, you'd want to store these in a database table with expiry
    const sessionData = {
      state,
      nonce,
      timestamp: Date.now(),
    };

    // Get the origin from the request
    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/lti/launch`;

    // Build OIDC login URL
    const authUrl = new URL(LTI_AUTH_URL);
    authUrl.searchParams.set('client_id', LTI_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('prompt', 'none');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    console.log('Starting LTI login flow:', {
      authUrl: authUrl.toString(),
      redirectUri,
    });

    return new Response(
      JSON.stringify({ 
        redirectUrl: authUrl.toString(),
        sessionData,
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in lti-login:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
