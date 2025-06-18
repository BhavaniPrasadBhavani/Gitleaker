import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'GitLab token is required' }, { status: 400 });
    }

    const gitlabResponse = await fetch('https://gitlab.com/api/v4/projects?membership=true', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!gitlabResponse.ok) {
      const errorData = await gitlabResponse.json();
      return NextResponse.json(
        { error: 'Failed to fetch projects from GitLab', details: errorData.message },
        { status: gitlabResponse.status }
      );
    }

    const data = await gitlabResponse.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 