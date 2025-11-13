import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JWT verification using Web Crypto API
async function verifyJWT(token: string, jwksUrl: string) {
  // Fetch JWKS
  const jwksResponse = await fetch(jwksUrl);
  const jwks = await jwksResponse.json();
  
  // Decode JWT header to get kid
  const [headerB64] = token.split('.');
  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
  
  // Find matching key
  const key = jwks.keys.find((k: any) => k.kid === header.kid);
  if (!key) {
    throw new Error('No matching key found in JWKS');
  }

  // Import the public key
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Split token
  const [headerB64Part, payloadB64, signatureB64] = token.split('.');
  const dataToVerify = new TextEncoder().encode(`${headerB64Part}.${payloadB64}`);
  
  // Decode signature
  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  // Verify signature
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature,
    dataToVerify
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  // Decode payload
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  return payload;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LTI_ISSUER = Deno.env.get('LTI_ISSUER');
    const LTI_CLIENT_ID = Deno.env.get('LTI_CLIENT_ID');
    const LTI_DEPLOYMENT_ID = Deno.env.get('LTI_DEPLOYMENT_ID');
    const LTI_JWKS_URL = Deno.env.get('LTI_JWKS_URL');
    
    if (!LTI_ISSUER || !LTI_CLIENT_ID || !LTI_DEPLOYMENT_ID || !LTI_JWKS_URL) {
      throw new Error('LTI configuration missing');
    }

    const { id_token, state, nonce, sessionData } = await req.json();

    if (!id_token) {
      throw new Error('Missing id_token');
    }

    console.log('Validating LTI launch token...');

    // Verify JWT
    const payload = await verifyJWT(id_token, LTI_JWKS_URL);

    // Validate claims
    if (payload.iss !== LTI_ISSUER) {
      throw new Error(`Invalid issuer: expected ${LTI_ISSUER}, got ${payload.iss}`);
    }

    if (!Array.isArray(payload.aud) && payload.aud !== LTI_CLIENT_ID) {
      throw new Error('Invalid audience');
    }

    if (Array.isArray(payload.aud) && !payload.aud.includes(LTI_CLIENT_ID)) {
      throw new Error('Invalid audience array');
    }

    if (payload.azp && payload.azp !== LTI_CLIENT_ID) {
      throw new Error('Invalid azp');
    }

    // Validate exp and iat (5 minute skew)
    const now = Math.floor(Date.now() / 1000);
    const skew = 300;
    
    if (payload.exp && payload.exp < now - skew) {
      throw new Error('Token expired');
    }

    if (payload.iat && payload.iat > now + skew) {
      throw new Error('Token issued in the future');
    }

    // Validate nonce and state if provided
    if (sessionData) {
      if (state && state !== sessionData.state) {
        throw new Error('State mismatch');
      }
      if (payload.nonce !== sessionData.nonce) {
        throw new Error('Nonce mismatch');
      }
    }

    // Validate deployment_id
    const deploymentClaim = payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    if (deploymentClaim !== LTI_DEPLOYMENT_ID) {
      throw new Error(`Invalid deployment_id: expected ${LTI_DEPLOYMENT_ID}, got ${deploymentClaim}`);
    }

    console.log('LTI launch validated successfully');

    // Extract LTI claims
    const contextClaim = payload['https://purl.imsglobal.org/spec/lti/claim/context'];
    const resourceLinkClaim = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link'];

    // Create session data
    const session = {
      iss: payload.iss,
      deployment_id: deploymentClaim,
      sub: payload.sub,
      context_id: contextClaim?.id,
      resource_link_id: resourceLinkClaim?.id,
      resource_link_title: resourceLinkClaim?.title,
      validated_at: new Date().toISOString(),
    };

    console.log('LTI session created:', session);

    return new Response(
      JSON.stringify({ 
        success: true,
        session,
        launchUrl: Deno.env.get('LTI_LAUNCH_URL'),
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in lti-launch:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
