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
  const [sessionData, setSessionData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      initiateLTILaunch();
    }
  }, [open, toolUrl]);

  const initiateLTILaunch = async () => {
    setLoading(true);
    setError(null);
    setIframeBlocked(false);

    try {
      // Step 1: Start OIDC login flow
      console.log('Initiating LTI login...');
      const { data: loginData, error: loginError } = await supabase.functions.invoke('lti-login');

      if (loginError) {
        throw new Error(`Login failed: ${loginError.message}`);
      }

      if (!loginData?.redirectUrl) {
        throw new Error('No redirect URL received from login endpoint');
      }

      // Store session data for validation
      setSessionData(loginData.sessionData);

      // Step 2: Redirect to Moodle OIDC endpoint
      console.log('Redirecting to Moodle OIDC...');
      const redirectWindow = window.open(loginData.redirectUrl, '_blank', 'width=800,height=600');

      if (!redirectWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for the form_post callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'lti-launch') {
          console.log('Received LTI launch callback');
          
          // Step 3: Validate the id_token
          const { data: launchData, error: launchError } = await supabase.functions.invoke('lti-launch', {
            body: {
              id_token: event.data.id_token,
              state: event.data.state,
              nonce: sessionData?.nonce,
              sessionData,
            },
          });

          if (launchError || !launchData?.success) {
            throw new Error(launchData?.error || 'Launch validation failed');
          }

          console.log('LTI launch successful:', launchData);
          setLaunchUrl(launchData.launchUrl);
          setLoading(false);

          toast({
            title: "LTI Tool Launched",
            description: "Successfully connected to the learning tool",
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    } catch (err) {
      console.error('LTI launch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to launch LTI tool');
      setLoading(false);
      toast({
        title: "Launch Failed",
        description: err instanceof Error ? err.message : 'Failed to launch LTI tool',
        variant: "destructive",
      });
    }
  };

  const handleIframeError = () => {
    setLoading(false);
    setIframeBlocked(true);
    setError("This tool cannot be embedded. Opening in a new window instead.");
  };

  const openInNewWindow = () => {
    if (launchUrl) {
      window.open(launchUrl, '_blank', 'noopener,noreferrer');
    } else {
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

        {iframeBlocked ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <p className="text-muted-foreground text-center">
              This tool cannot be embedded. Opening in a new window instead.
            </p>
            <Button onClick={openInNewWindow} size="lg">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Tool
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
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              onLoad={() => setLoading(false)}
              onError={handleIframeError}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-center">
              Authenticating with LTI provider...
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            LTI 1.3 authenticated via OIDC
          </p>
          <Button variant="outline" onClick={openInNewWindow}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Window
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
