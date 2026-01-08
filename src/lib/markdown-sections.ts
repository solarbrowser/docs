/**
 * Parse markdown content into sections based on h2 headings
 */
export interface MarkdownSection {
  id: string;
  heading: string;
  level: number;
  content: string;
}

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];

  let currentSection: MarkdownSection | null = null;
  let contentBuffer: string[] = [];
  let introBuffer: string[] = [];
  let foundFirstH2 = false;
  let skipH1 = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is an h1 heading (skip it in intro)
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match && !foundFirstH2) {
      skipH1 = true;
      continue; // Skip h1 line
    }

    // Check if this is an h2 heading
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h2Match) {
      // If this is the first h2, save intro content
      if (!foundFirstH2 && introBuffer.length > 0) {
        const introContent = introBuffer.join('\n').trim();
        if (introContent) {
          sections.push({
            id: 'intro',
            heading: '',
            level: 0,
            content: introContent
          });
        }
        foundFirstH2 = true;
      }

      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n');
        sections.push(currentSection);
      }

      // Start new section
      const heading = h2Match[1].trim();
      const id = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

      currentSection = {
        id,
        heading,
        level: 2,
        content: ''
      };

      contentBuffer = [line]; // Include the heading in content
    } else {
      if (!foundFirstH2) {
        // Before first h2, collect intro content
        introBuffer.push(line);
      } else {
        // After first h2, add to current section
        contentBuffer.push(line);
      }
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n');
    sections.push(currentSection);
  }

  // If no h2 found, entire content is intro
  if (!foundFirstH2 && introBuffer.length > 0) {
    const introContent = introBuffer.join('\n').trim();
    if (introContent) {
      sections.push({
        id: 'intro',
        heading: '',
        level: 0,
        content: introContent
      });
    }
  }

  return sections;
}
