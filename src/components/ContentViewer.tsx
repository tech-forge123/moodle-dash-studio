import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

interface ContentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: {
    url: string;
    filename: string;
    mimetype: string;
    filesize?: number;
  } | null;
}

export const ContentViewer = ({ open, onOpenChange, content }: ContentViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!content) return null;

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-muted-foreground">Unable to display this content</p>
          <div className="flex gap-2">
            <Button asChild>
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={content.url} download>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        </div>
      );
    }

    const { mimetype, url } = content;

    // For HTML/web pages (Moodle pages), Moodle blocks iframe embedding
    // Open in new tab instead
    if (mimetype === 'text/html') {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-muted-foreground">This content will open in a new tab</p>
          <Button asChild size="lg">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Moodle Page
            </a>
          </Button>
        </div>
      );
    }

    // PDF files
    if (mimetype === 'application/pdf') {
      return (
        <div className="relative w-full h-[70vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <iframe
            src={url}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            title={content.filename}
          />
        </div>
      );
    }

    // Images
    if (mimetype.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <img
            src={url}
            alt={content.filename}
            className="max-w-full max-h-[70vh] object-contain"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    }

    // Videos
    if (mimetype.startsWith('video/')) {
      return (
        <div className="w-full">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <video
            controls
            className="w-full max-h-[70vh]"
            onLoadedData={handleLoad}
            onError={handleError}
          >
            <source src={url} type={mimetype} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio
    if (mimetype.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <audio
            controls
            className="w-full max-w-md"
            onLoadedData={handleLoad}
            onError={handleError}
          >
            <source src={url} type={mimetype} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // Text files - try to display, but might fail due to CORS
    if (mimetype.startsWith('text/') || mimetype === 'application/json') {
      return (
        <div className="relative w-full h-[70vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <iframe
            src={url}
            className="w-full h-full border-0 bg-background"
            onLoad={handleLoad}
            onError={handleError}
            title={content.filename}
            sandbox="allow-same-origin"
          />
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">Preview not available for this file type</p>
        <div className="flex gap-2">
          <Button asChild>
            <a href={url} download>
              <Download className="mr-2 h-4 w-4" />
              Download File
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </a>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate pr-4">{content.filename}</span>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" asChild>
                <a href={content.url} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={content.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Content viewer for {content.filename}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
