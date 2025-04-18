'use server';

import fs from 'fs/promises';
import path from 'path';

/**
 * Represents a publication with its title, abstract, and link to the full paper.
 */
export interface Publication {
  /**
   * The title of the publication.
   */
  title: string;
  /**
   * The abstract of the publication.
   */
  abstract: string;
  /**
   * The URL to the full paper (PDF).
   */
  pdfUrl: string;
  /**
   * The category of the publication (e.g., Data Science, ML, Applied Math).
   */
  category: string; // Keep this to distinguish from Projects if needed elsewhere
}

/**
 * Represents a project with its title, description, link, and technologies used.
 */
export interface Project {
  /**
   * The title of the project.
   */
  title: string;
  /**
   * A description of the project.
   */
  description: string;
  /**
   * The URL to the project (e.g., GitHub repo, live demo).
   */
  projectUrl: string;
  /**
   * An array of technologies used in the project.
   */
  technologies: string[];
  /**
  * The category, fixed to 'Project'.
  */
  category: 'Project'; // Fixed category for projects
}


/**
 * Asynchronously retrieves publication details by title.
 *
 * @param title The title of the publication to retrieve.
 * @returns A promise that resolves to a Publication object.
 */
export async function getPublication(title: string): Promise<Publication> {
  const publications = await fetchPublications();
  const publication = publications.find((pub) => pub.title === title);
  if (!publication) {
    throw new Error(`Publication with title "${title}" not found.`);
  }
  return publication;
}

/**
 * Asynchronously retrieves a list of publications by reading the JSON file directly.
 *
 * @returns A promise that resolves to an array of Publication objects.
 */
export async function fetchPublications(): Promise<Publication[]> {
  try {
    // Construct the absolute path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'publications.json');
    // Read the file content
    const fileContent = await fs.readFile(filePath, 'utf8');
    // Parse the JSON data
    const data = JSON.parse(fileContent) as Publication[];
    return data;
  } catch (error) {
    console.error('Error reading publications file:', error);
    return []; // Return empty array on error
  }
}

/**
 * Asynchronously retrieves project details by title.
 *
 * @param title The title of the project to retrieve.
 * @returns A promise that resolves to a Project object.
 */
export async function getProject(title: string): Promise<Project> {
  const projects = await fetchProjects();
  const project = projects.find((proj) => proj.title === title);
  if (!project) {
    throw new Error(`Project with title "${title}" not found.`);
  }
  return project;
}

/**
 * Asynchronously retrieves a list of projects by reading the JSON file directly.
 *
 * @returns A promise that resolves to an array of Project objects.
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    // Construct the absolute path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'projects.json');
    // Read the file content
    const fileContent = await fs.readFile(filePath, 'utf8');
    // Parse the JSON data
    const data = JSON.parse(fileContent) as Project[];
    return data;
  } catch (error) {
    console.error('Error reading projects file:', error);
    return []; // Return empty array on error
  }
}
