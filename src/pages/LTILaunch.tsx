import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * LTI Launch callback page
 * Receives form_post from Moodle OIDC and sends data to parent window
 */
const LTILaunch = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get id_token and state from form_post
    const idToken = searchParams.get('id_token');
    const state = searchParams.get('state');

    if (idToken && window.opener) {
      // Send data to parent window
      window.opener.postMessage(
        {
          type: 'lti-launch',
          id_token: idToken,
          state,
        },
        window.location.origin
      );

      // Close this window after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p className="text-muted-foreground">
          Please wait while we complete the authentication process.
        </p>
      </div>
    </div>
  );
};

export default LTILaunch;
