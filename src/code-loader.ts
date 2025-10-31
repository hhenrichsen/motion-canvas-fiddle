/**
 * Utility functions for loading code from external sources
 */

/**
 * Fetch code from a GitHub Gist
 * @param gistId - The Gist ID or full Gist URL
 * @returns The code content from the first file in the Gist
 */
export async function fetchFromGist(gistId: string): Promise<string> {
  // Extract just the ID if a full URL was provided
  const idMatch = gistId.match(/gist\.github\.com\/(?:[^\/]+\/)?([a-f0-9]+)/i);
  const id = idMatch ? idMatch[1] : gistId;

  try {
    const response = await fetch(`https://api.github.com/gists/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Gist: ${response.statusText}`);
    }

    const data = await response.json();

    // Get the first file from the gist
    const files = data.files;
    const firstFileName = Object.keys(files)[0];

    if (!firstFileName) {
      throw new Error("Gist has no files");
    }

    return files[firstFileName].content;
  } catch (error) {
    throw new Error(
      `Failed to load Gist: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convert a GitHub URL to a raw.githubusercontent.com URL
 * @param url - The GitHub URL
 * @returns The raw content URL
 */
function convertGitHubUrlToRaw(url: string): string {
  // Convert github.com URLs to raw.githubusercontent.com
  // Example: https://github.com/user/repo/blob/main/file.ts
  // Becomes: https://raw.githubusercontent.com/user/repo/main/file.ts
  const githubMatch = url.match(
    /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/i,
  );

  if (githubMatch) {
    const [, user, repo, branch, path] = githubMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

  return url;
}

/**
 * Fetch code from a URL
 * @param url - The URL to fetch from (can be a GitHub URL or raw URL)
 * @returns The code content
 */
export async function fetchFromUrl(url: string): Promise<string> {
  // Convert GitHub URLs to raw URLs
  const fetchUrl = convertGitHubUrlToRaw(url);

  try {
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    throw new Error(
      `Failed to load from URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
