import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LTILauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolUrl: string;
  toolName: string;
  courseId: string;
}

export const LTILauncher = ({ open, onOpenChange, toolUrl, toolName, courseId }: LTILauncherProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [ltiState, setLtiState] = useState<{ state: string; nonce: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && toolUrl) {
      initiateLTILaunch();
    }
  }, [open, toolUrl]);

  const initiateLTILaunch = async () => {
    setLoading(true);
    setError(null);
    setIframeBlocked(false);
    
    try {
      console.log('Initiating LTI 1.3 launch for:', toolUrl);
      
      // Step 1: Call lti-login to get authorization URL
      const { data: loginData, error: loginError } = await supabase.functions.invoke('lti-login', {
        body: {
          targetUrl: toolUrl,
          loginHint: 'auto'
        }
      });

      if (loginError) {
        throw new Error(loginError.message || 'Failed to initiate LTI login');
      }

      console.log('LTI login initiated:', loginData);
      
      // Store state and nonce for validation
      setLtiState({
        state: loginData.state,
        nonce: loginData.nonce
      });

      // Step 2: Open authorization URL in a hidden iframe or popup to get id_token
      // For now, we'll use a form POST approach by opening in a popup
      const authWindow = window.open(loginData.authUrl, 'lti_auth', 'width=800,height=600');
      
      if (!authWindow) {
        throw new Error('Popup blocked. Please allow popups for LTI authentication.');
      }

      // Listen for the response (in production, this would come via form_post callback)
      // For now, we'll simulate receiving the id_token after authorization
      const checkAuth = setInterval(async () => {
        try {
          // Check if auth window closed
          if (authWindow.closed) {
            clearInterval(checkAuth);
            
            // In production, the id_token would be posted back to /lti/launch
            // For this demo, we'll call lti-launch with mock data
            // Real implementation would receive id_token via form POST
            
            toast({
              title: "LTI Authentication",
              description: "Please complete authentication in the opened window.",
            });
            
            setLoading(false);
            setIframeBlocked(true);
            setError("LTI 1.3 authentication requires completing the flow in the opened window.");
          }
        } catch (e) {
          // Window access error - expected for cross-origin
        }
      }, 500);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
        if (!authWindow.closed) {
          authWindow.close();
        }
      }, 120000);
      
    } catch (err: any) {
      console.error('LTI launch error:', err);
      setError(err.message || 'Failed to launch LTI tool');
      setIframeBlocked(true);
      setLoading(false);
      
      toast({
        title: "LTI Launch Error",
        description: err.message || 'Failed to launch LTI tool',
        variant: "destructive",
      });
    }
  };

  const handleIframeError = () => {
    setLoading(false);
    setIframeBlocked(true);
    setError("This tool cannot be embedded due to frame-ancestors policy.");
  };

  const openInNewWindow = () => {
    if (toolUrl) {
      window.open(toolUrl, '_blank', 'noopener,noreferrer');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{toolName}</DialogTitle>
          <DialogDescription>
            External learning tool - Course ID: {courseId}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {iframeBlocked || error ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center max-w-md">
              {error || "This tool requires opening in a separate window for LTI 1.3 authentication."}
            </p>
            <Button onClick={openInNewWindow} size="lg">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Moodle
            </Button>
          </div>
        ) : launchUrl ? (
          <div className="relative w-full h-[70vh]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            <iframe
              src={launchUrl}
              className="w-full h-full border-0"
              title={toolName}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              onLoad={() => setLoading(false)}
              onError={handleIframeError}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Initializing LTI authentication...</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            LTI 1.3 (Advantage) authentication via OIDC
          </p>
          <Button variant="outline" onClick={openInNewWindow}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Moodle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
