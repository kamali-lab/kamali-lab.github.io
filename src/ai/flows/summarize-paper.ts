'use server';
/**
 * @fileOverview Generates a concise "elevator pitch" summary for a research paper.
 *
 * - summarizePaper - A function that generates a short summary of a paper.
 * - SummarizePaperInput - The input type for the summarizePaper function.
 * - SummarizePaperOutput - The return type for the summarizePaper function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {getPublication} from '@/services/publication';

const SummarizePaperInputSchema = z.object({
  paperTitle: z.string().describe('The title of the paper to summarize.'),
});
export type SummarizePaperInput = z.infer<typeof SummarizePaperInputSchema>;

const SummarizePaperOutputSchema = z.object({
  elevatorPitch: z.string().describe('A short, engaging summary of the paper.'),
});
export type SummarizePaperOutput = z.infer<typeof SummarizePaperOutputSchema>;

export async function summarizePaper(input: SummarizePaperInput): Promise<SummarizePaperOutput> {
  return summarizePaperFlow(input);
}

const summarizePaperPrompt = ai.definePrompt({
  name: 'summarizePaperPrompt',
  input: {
    schema: z.object({
      paperTitle: z.string().describe('The title of the paper to summarize.'),
      abstract: z.string().describe('The abstract of the paper.'),
    }),
  },
  output: {
    schema: z.object({
      elevatorPitch: z.string().describe('A short, engaging summary of the paper.'),
    }),
  },
  prompt: `You are an AI assistant that specializes in creating "elevator pitch" summaries for research papers.

  Given the title and abstract of a paper, your task is to create a concise and engaging summary that captures the essence of the paper in a way that would entice someone to read it.

  Paper Title: {{{paperTitle}}}
  Abstract: {{{abstract}}}

  Elevator Pitch Summary:`,
});

const summarizePaperFlow = ai.defineFlow<
  typeof SummarizePaperInputSchema,
  typeof SummarizePaperOutputSchema
>({
  name: 'summarizePaperFlow',
  inputSchema: SummarizePaperInputSchema,
  outputSchema: SummarizePaperOutputSchema,
},
async input => {
  const publication = await getPublication(input.paperTitle);
  const {output} = await summarizePaperPrompt({
    paperTitle: input.paperTitle,
    abstract: publication.abstract,
  });
  return output!;
});
