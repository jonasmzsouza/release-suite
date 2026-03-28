export async function generateReleaseNotesViaAPI({
  repo,
  previousTag,
  currentTag,
  token
}) {
  if (!token) {
    return {
      ok: false,
      reason: "missing-token"
    };
  }

  try {
    const projectId = encodeURIComponent(extractProjectPath(repo.url));

    const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/changelog`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: currentTag,
        from: previousTag || undefined,
        to: currentTag
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: "api-error",
        status: response.status
      };
    }

    const data = await response.json();

    return {
      ok: true,
      content: data.notes || ""
    };

  } catch (err) {
    return {
      ok: false,
      reason: "exception",
      error: err.message
    };
  }
}

function extractProjectPath(url) {
  const match = url.match(/gitlab\.com\/(.+)/);
  if (!match) {
    throw new Error("Invalid GitLab repo URL");
  }

  return match[1];
}