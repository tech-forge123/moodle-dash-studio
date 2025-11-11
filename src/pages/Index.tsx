import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CourseCard, Course } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, RefreshCw } from "lucide-react";
import heroImage from "@/assets/hero-learning.jpg";

const Index = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-moodle-courses');
      
      if (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: "Error",
          description: "Failed to fetch courses from Moodle",
          variant: "destructive",
        });
        return;
      }

      setCourses(data.courses);
      toast({
        title: "Success",
        description: `Loaded ${data.courses.length} courses from Moodle`,
      });
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

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 py-16 md:py-24">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm">
                <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Connected to Moodle</span>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Your Learning Journey
                <span className="block text-primary mt-2">Starts Here</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl">
                Access all your Moodle courses in a modern, intuitive interface. 
                Track your progress, engage with content, and achieve your learning goals.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Browse Courses
                </Button>
                <Button size="lg" variant="outline" onClick={fetchCourses} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroImage}
                  alt="Students learning together"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-secondary/20 rounded-full blur-3xl -z-10" />
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-primary/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="container px-4 py-12 md:py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Available Courses</h2>
          <p className="text-muted-foreground">
            {loading ? "Loading courses..." : `${courses.length} courses available`}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No courses found. Connect to your Moodle instance to see courses.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
