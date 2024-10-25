// pages/api/create-access-identifier.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type AccessIdentifierRequest = {
  accessKey: string;
  secretKey: string;
  name: string;
  email: string;
};

type AccessIdentifierResponse = {
  accessIdentifierName?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessIdentifierResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessKey, secretKey, name, email } = req.body as AccessIdentifierRequest;

    // Validate the required fields
    if (!accessKey || !secretKey || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare Basic Authentication header
    const authHeader = `Basic ${Buffer.from(`${accessKey}:${secretKey}`).toString('base64')}`;

    // Make the API request to create an access identifier
    const response = await axios.post(
      'https://api.uat-1.monkeyscience.io/nimbus/v1/access_identifiers',
      {
        name,
        email,
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the access identifier from the response
    const accessIdentifierName = response.data.data.name;

    // Return the access identifier ID in the response
    return res.status(200).json({ accessIdentifierName });
  } catch (error) {
    console.error('Error creating access identifier:', error);

    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.message || 'Failed to create access identifier',
      });
    }

    // Handle other errors
    return res.status(500).json({ error: 'Internal server error' });
  }
}
