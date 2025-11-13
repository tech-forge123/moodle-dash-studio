import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setIframeBlocked(false);
      
      // Simulate checking if iframe is allowed (in production, this would check X-Frame-Options)
      const checkTimeout = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(checkTimeout);
    }
  }, [open, toolUrl]);

  const handleIframeError = () => {
    setLoading(false);
    setIframeBlocked(true);
    setError("This tool cannot be embedded. Opening in a new window instead.");
  };

  const openInNewWindow = () => {
    window.open(toolUrl, '_blank', 'noopener,noreferrer');
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
              This tool requires opening in a separate window for security reasons.
            </p>
            <Button onClick={openInNewWindow} size="lg">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Tool
            </Button>
          </div>
        ) : (
          <div className="relative w-full h-[70vh]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            <iframe
              src={toolUrl}
              className="w-full h-full border-0"
              title={toolName}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              onLoad={() => setLoading(false)}
              onError={handleIframeError}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Note: LTI 1.3 deep authentication is not yet implemented
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
