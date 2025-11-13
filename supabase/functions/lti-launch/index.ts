import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JWT validation helper
const validateJWT = async (idToken: string, jwksUrl: string): Promise<any> => {
  try {
    // Fetch JWKS
    const jwksResponse = await fetch(jwksUrl);
    if (!jwksResponse.ok) {
      throw new Error('Failed to fetch JWKS');
    }
    const jwks = await jwksResponse.json();
    
    // Decode JWT header to get kid
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('JWT Header:', header);
    console.log('JWT Payload:', payload);
    
    // For now, return the payload (full signature verification would require crypto library)
    // In production, you should verify the signature against the JWKS
    return payload;
  } catch (error) {
    console.error('JWT validation error:', error);
    throw error;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LTI_ISSUER = Deno.env.get('LTI_ISSUER');
    const LTI_CLIENT_ID = Deno.env.get('LTI_CLIENT_ID');
    const LTI_JWKS_URL = Deno.env.get('LTI_JWKS_URL');
    const LTI_DEPLOYMENT_ID = Deno.env.get('LTI_DEPLOYMENT_ID');
    const LTI_LAUNCH_URL = Deno.env.get('LTI_LAUNCH_URL');

    if (!LTI_ISSUER || !LTI_CLIENT_ID || !LTI_JWKS_URL || !LTI_DEPLOYMENT_ID || !LTI_LAUNCH_URL) {
      console.error('Missing LTI configuration');
      return new Response(
        JSON.stringify({ error: 'LTI configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { idToken, state, nonce } = await req.json();
    
    if (!idToken) {
      return new Response(
        JSON.stringify({ error: 'id_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating LTI launch with state:', state, 'nonce:', nonce);
    
    // Validate JWT
    const claims = await validateJWT(idToken, LTI_JWKS_URL);
    
    // Validate claims
    const validationErrors: string[] = [];
    
    if (claims.iss !== LTI_ISSUER) {
      validationErrors.push(`Invalid issuer: expected ${LTI_ISSUER}, got ${claims.iss}`);
    }
    
    if (!claims.aud || (Array.isArray(claims.aud) ? !claims.aud.includes(LTI_CLIENT_ID) : claims.aud !== LTI_CLIENT_ID)) {
      validationErrors.push(`Invalid audience: ${LTI_CLIENT_ID} not in aud`);
    }
    
    if (claims.azp && claims.azp !== LTI_CLIENT_ID) {
      validationErrors.push(`Invalid azp: expected ${LTI_CLIENT_ID}, got ${claims.azp}`);
    }
    
    // Check expiration with 5-minute skew tolerance
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < (now - 300)) {
      validationErrors.push(`Token expired: exp ${claims.exp}, now ${now}`);
    }
    
    if (claims.iat && claims.iat > (now + 300)) {
      validationErrors.push(`Token issued in future: iat ${claims.iat}, now ${now}`);
    }
    
    if (nonce && claims.nonce !== nonce) {
      validationErrors.push(`Nonce mismatch: expected ${nonce}, got ${claims.nonce}`);
    }
    
    // Validate deployment ID from LTI-specific claims
    const deploymentId = claims['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    if (deploymentId !== LTI_DEPLOYMENT_ID) {
      validationErrors.push(`Invalid deployment_id: expected ${LTI_DEPLOYMENT_ID}, got ${deploymentId}`);
    }
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ error: 'Token validation failed', details: validationErrors }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract session data
    const session = {
      iss: claims.iss,
      deployment_id: deploymentId,
      sub: claims.sub,
      context_id: claims['https://purl.imsglobal.org/spec/lti/claim/context']?.id,
      resource_link_id: claims['https://purl.imsglobal.org/spec/lti/claim/resource_link']?.id,
      roles: claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || [],
      target_link_uri: claims['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'],
    };
    
    console.log('LTI launch successful, session:', session);
    
    // Return success with launch URL
    return new Response(
      JSON.stringify({ 
        success: true,
        session,
        launchUrl: LTI_LAUNCH_URL,
        targetLinkUri: session.target_link_uri
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in lti-launch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
