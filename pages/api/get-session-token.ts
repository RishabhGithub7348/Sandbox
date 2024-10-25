import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type SessionTokenRequest = {
  accessKey: string;
  secretKey: string;
  accessIdentifierName: string;
};

type SessionTokenResponse = {
  token?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionTokenResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessKey, secretKey, accessIdentifierName } = req.body as SessionTokenRequest;

    // Ensure all required fields are present
    if (!accessKey || !secretKey || !accessIdentifierName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Construct Basic Authentication header
    const authHeader = `Basic ${Buffer.from(`${accessKey}:${secretKey}`).toString('base64')}`;

    // Make the API call to get the session token
    const response = await axios.post(
      `https://api.uat-1.monkeyscience.io/nimbus/v1/access_identifiers/${accessIdentifierName}/sessions`,
      {
        duration_in_days: 5, // Pass the required body parameter
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the token from the response and send it
    const token = response.data.data.token;
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error getting session token:', error);

    if (axios.isAxiosError(error)) {
      // Check for Axios-specific errors
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.message || 'Failed to get session token',
      });
    }

    // Handle other unexpected errors
    return res.status(500).json({ error: 'Internal server error' });
  }
}
