'use client';

import {useState, useEffect, useRef} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Separator} from '@/components/ui/separator';
import {useToast} from '@/hooks/use-toast';
import {Publication, Project, fetchPublications, fetchProjects} from '@/services/publication';
import {Skeleton} from '@/components/ui/skeleton';
import {Icons} from '@/components/icons';
import {useIsMobile} from '@/hooks/use-mobile';
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";


function LandingPage({onExploreClick}: {onExploreClick: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <motion.div
        initial={{opacity: 0, y: -50}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 1}}
      >
        <h1 className="text-5xl md:text-7xl font-bold mb-4 text-gray-800">
          Academic & Project Explorer
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-600">
          Your Gateway to Research Papers & Projects
        </p>
        <Button onClick={onExploreClick} size="lg" className="text-lg px-8 py-4">
          Explore Content
          <Icons.arrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
      <motion.div
        className="absolute bottom-10 animate-bounce"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 1, duration: 0.5}}
      >
        <Icons.arrowDown className="h-8 w-8 text-gray-500" />
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingPublications, setIsLoadingPublications] =
    useState<boolean>(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const {toast} = useToast();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingPublications(true);
        const fetchedPublications = await fetchPublications();
        setPublications(fetchedPublications);
      } catch (error) {
        console.error('Failed to fetch publications:', error);
        toast({
          title: 'Error',
          description: 'Failed to load publications. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPublications(false);
      }

      try {
        setIsLoadingProjects(true);
        const fetchedProjects = await fetchProjects();
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadData();
  }, [toast]);

  const handleExploreClick = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({behavior: 'smooth'});
    }
  };

  const renderSkeleton = (count = 6) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-8 w-24" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <LandingPage onExploreClick={handleExploreClick} />
      <div ref={mainContentRef}>
        <motion.div
          className="container mx-auto py-10 px-4"
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 1}}
        >
          <section id="about" className="mb-16">
            <h2 className="text-3xl font-semibold mb-6">About Me</h2>
            <Card className="drop-shadow-md">
              <CardContent className="py-8 text-center font-serif text-lg">
                I am an enthusiastic amateur in Data Science and Machine Learning,
                with a strong foundation in Applied Mathematics. This website
                serves as a portfolio to showcase my projects and publications.
              </CardContent>
            </Card>
          </section>

          <section id="publications" className="mb-16">
            <h2 className="text-3xl font-semibold mb-6">Publications</h2>
            {isLoadingPublications ? (
              renderSkeleton(publications.length || 3)
            ) : publications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publications.map((publication, index) => (
                  <Card
                    key={`${publication.title}-${index}`}
                    className="hover:shadow-lg transition-shadow duration-300 flex flex-col"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{publication.title}</CardTitle>
                      <CardDescription>
                        Category: {publication.category}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {publication.abstract}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p>No publications found.</p>
            )}
          </section>

          <section id="projects" className="mb-12">
            <h2 className="text-3xl font-semibold mb-6">Projects</h2>
            {isLoadingProjects ? (
              renderSkeleton(projects.length || 3)
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, index) => (
                  <Card
                    key={`${project.title}-${index}`}
                    className="hover:shadow-lg transition-shadow duration-300 flex flex-col"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription>Category: {project.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                      <p className="text-sm text-gray-600">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary">{tech}</Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="mt-auto pt-4">
                      <Link href={project.projectUrl} passHref legacyBehavior>
                        <a target="_blank" rel="noopener noreferrer" className={project.projectUrl === '#' ? 'pointer-events-none' : ''}>
                          <Button variant="outline" size="sm" disabled={project.projectUrl === '#'}>
                            View Project
                            <Icons.externalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </a>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <p>No projects found.</p>
            )}
          </section>

          <section id="contact" className="mt-16 mb-16">
            <h2 className="text-3xl font-semibold mb-6">Contact Me</h2>
            <Card>
              <CardHeader>
                <CardTitle>Send a Message</CardTitle>
                <CardDescription>Feel free to reach out for any inquiries.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input id="name" placeholder="Enter your name" type="text" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" placeholder="Enter your email" type="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Enter your message" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Send Message</Button>
              </CardFooter>
            </Card>
          </section>
        </motion.div>
      </div>
    </>
  );
}
