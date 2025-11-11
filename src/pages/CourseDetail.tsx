import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Video, Link as LinkIcon, Eye, Image as ImageIcon, Music } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ContentViewer } from "@/components/ContentViewer";

interface Module {
  id: number;
  name: string;
  modules: ContentModule[];
  summary?: string;
}

interface ContentModule {
  id: number;
  name: string;
  modname: string;
  url?: string;
  description?: string;
  contents?: {
    filename: string;
    fileurl: string;
    filesize: number;
    mimetype: string;
  }[];
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerContent, setViewerContent] = useState<{
    url: string;
    filename: string;
    mimetype: string;
    filesize?: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourseContents();
  }, [courseId]);

  const fetchCourseContents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-moodle-course-contents', {
        body: { courseId: parseInt(courseId || '0') }
      });
      
      if (error) {
        console.error('Error fetching course contents:', error);
        toast({
          title: "Error",
          description: "Failed to fetch course contents from Moodle",
          variant: "destructive",
        });
        return;
      }

      setModules(data.contents || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (modname: string) => {
    switch (modname) {
      case 'resource':
      case 'folder':
        return <FileText className="h-5 w-5" />;
      case 'url':
        return <LinkIcon className="h-5 w-5" />;
      case 'page':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (mimetype.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimetype.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (mimetype === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const handleViewContent = (url: string, filename: string, mimetype: string, filesize?: number) => {
    setViewerContent({ url, filename, mimetype, filesize });
  };

  const handleViewModuleUrl = (module: ContentModule) => {
    if (module.url) {
      setViewerContent({
        url: module.url,
        filename: module.name,
        mimetype: 'text/html',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="container px-4 py-8 md:py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course Content</h1>
          <p className="text-muted-foreground">
            {loading ? "Loading course materials..." : `${modules.length} sections available`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : modules.length > 0 ? (
          <Accordion type="single" collapsible className="space-y-4">
            {modules.map((section) => (
              <AccordionItem 
                key={section.id} 
                value={`section-${section.id}`}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">{section.name}</h3>
                    {section.summary && (
                      <p className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: section.summary }} />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-3 pt-3">
                    {section.modules.map((module) => (
                      <Card key={module.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                              {getModuleIcon(module.modname)}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {module.url ? (
                                  <button
                                    onClick={() => handleViewModuleUrl(module)}
                                    className="hover:text-primary transition-colors text-left"
                                  >
                                    {module.name}
                                  </button>
                                ) : (
                                  module.name
                                )}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {module.modname.charAt(0).toUpperCase() + module.modname.slice(1)}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        {module.description && (
                          <CardContent className="pt-0 pb-3">
                            <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: module.description }} />
                          </CardContent>
                        )}
                        {module.contents && module.contents.length > 0 && (
                          <CardContent className="pt-0 pb-3">
                            <div className="space-y-2">
                              {module.contents.map((file, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleViewContent(file.fileurl, file.filename, file.mimetype, file.filesize)}
                                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm w-full text-left"
                                >
                                  <div className="text-primary">
                                    {getFileIcon(file.mimetype)}
                                  </div>
                                  <span className="flex-1 truncate">{file.filename}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(file.filesize)}
                                  </span>
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </button>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No course content available.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <ContentViewer
        open={!!viewerContent}
        onOpenChange={(open) => !open && setViewerContent(null)}
        content={viewerContent}
      />
    </div>
  );
};

export default CourseDetail;
