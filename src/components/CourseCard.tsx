import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Clock } from "lucide-react";
import courseDefaultImage from "@/assets/course-default.jpg";

export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  categoryname?: string;
  enrolledusercount?: number;
  format?: string;
  imageurl?: string;
}

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-elegant)]">
      <div className="relative h-48 overflow-hidden">
        <img
          src={course.imageurl || courseDefaultImage}
          alt={course.fullname}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {course.categoryname && (
          <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
            {course.categoryname}
          </Badge>
        )}
      </div>
      
      <CardHeader>
        <CardTitle className="line-clamp-2 text-xl">{course.fullname}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {course.shortname}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{course.summary || "No description available"}</p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{course.format || "Course"}</span>
          </div>
          {course.enrolledusercount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{course.enrolledusercount} students</span>
            </div>
          )}
        </div>
        
        <Button className="w-full" variant="default">
          View Course
        </Button>
      </CardContent>
    </Card>
  );
};
