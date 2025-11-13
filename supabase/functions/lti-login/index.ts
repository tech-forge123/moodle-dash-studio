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
    const LTI_ISSUER = Deno.env.get('LTI_ISSUER');
    const LTI_CLIENT_ID = Deno.env.get('LTI_CLIENT_ID');
    const LTI_AUTH_URL = Deno.env.get('LTI_AUTH_URL');
    const LTI_DEPLOYMENT_ID = Deno.env.get('LTI_DEPLOYMENT_ID');

    if (!LTI_ISSUER || !LTI_CLIENT_ID || !LTI_AUTH_URL || !LTI_DEPLOYMENT_ID) {
      console.error('Missing LTI configuration');
      return new Response(
        JSON.stringify({ error: 'LTI configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUrl, loginHint } = await req.json();
    
    // Generate state and nonce
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    
    // Get the origin for redirect URI
    const origin = req.headers.get('origin') || 'https://id-preview--1a40197a-fb8c-40d9-96f4-3c2e67285d41.lovable.app';
    const redirectUri = `${origin}/lti/launch`;
    
    console.log('Initiating LTI login:', { 
      issuer: LTI_ISSUER,
      clientId: LTI_CLIENT_ID,
      redirectUri,
      state,
      nonce 
    });
    
    // Build OIDC authorization URL
    const authUrl = new URL(LTI_AUTH_URL);
    authUrl.searchParams.set('client_id', LTI_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('prompt', 'none');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('login_hint', loginHint || 'auto');
    
    if (targetUrl) {
      authUrl.searchParams.set('lti_message_hint', targetUrl);
    }
    
    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state,
        nonce,
        redirectUri
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in lti-login:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
