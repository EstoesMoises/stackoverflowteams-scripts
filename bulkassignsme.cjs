//  This script accomplishes the following:
// 1. Fetches user IDs by email addresses.
// 2. Creates a user group with the fetched user IDs.
// 3. Assigns the user group to a tag.
// The script uses the following API endpoints:
// - GET /api/v3/users/by-email/{email}
// - POST /api/v3/user-groups
// - POST /api/v3/tags/{tagId}/subject-matter-experts/user-groups
// Note: This API v3 call require a bearer token with write permissions.

const readline = require('readline');
const https = require('https');

// Create an interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Helper function for HTTP requests
const httpRequest = (options, token, postData = null) => {
  return new Promise((resolve, reject) => {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Error parsing response data.'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

// Function to get user ID by email
const getUserIdByEmail = async (email, hostname, token) => {
  const options = {
    hostname: hostname,
    path: `/api/v3/users/by-email/${email}`,
    method: 'GET',
  };

  try {
    const data = await httpRequest(options, token);
    console.log(`Response for email ${email}:`, data); // Debug log
    if (!data.id) {
      console.warn(`User ID not found for email: ${email}`);
      return null;
    }
    return data.id;
  } catch (error) {
    console.error(`Error fetching user ID for email ${email}:`, error);
    return null;
  }
};

// Function to create a user group
const createUserGroup = async (userIds, groupName, groupDescription, hostname, token) => {
  const options = {
    hostname: hostname,
    path: `/api/v3/user-groups`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json-patch+json',
    }
  };

  const postData = JSON.stringify({
    name: groupName,
    description: groupDescription,
    userIds: userIds
  });

  try {
    const response = await httpRequest(options, token, postData);
    console.log('User group created successfully:', response);
    return response.id;  // Contains User Group ID
  } catch (error) {
    console.error('Error creating user group:', error);
  }
  return null;
};

// Function to assign user group to a tag, although user group will only be one it must be an array
const assignUserGroupToTag = async (userGroupId, tagId, hostname, token) => {
  const options = {
    hostname: hostname,
    path: `/api/v3/tags/${tagId}/subject-matter-experts/user-groups`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const postData = JSON.stringify([userGroupId]);

  try {
    const response = await httpRequest(options, token, postData);
    console.log('User group assigned to tag successfully:', response);
  } catch (error) {
    console.error('Error assigning user group to tag:', error);
  }
};

// Main function
const main = async () => {
  const hostname = await askQuestion('Enter the Fully Qualified Domain Name (FQDN): ');
  const bearerToken = await askQuestion('Enter your Bearer Token: ');
  const emails = await askQuestion('Enter comma-separated user email addresses: ');
  const emailArray = emails.split(',').map(email => email.trim());
  const tagId = await askQuestion('Enter the tag ID: ');
  const groupName = await askQuestion('Enter the name for the user group: ');
  const groupDescription = await askQuestion('Enter a description for the user group: ');

  // Fetch all user IDs
  const userIds = [];
  for (const email of emailArray) {
    const userId = await getUserIdByEmail(email, hostname, bearerToken);
    if (userId) {
      userIds.push(userId.toString());  // Convert to string if needed
    }
  }

  if (userIds.length > 0) {
    // Create a user group
    const userGroupId = await createUserGroup(userIds, groupName, groupDescription, hostname, bearerToken);
    if (userGroupId) {
      // Assign user group to tag
      await assignUserGroupToTag(userGroupId, tagId, hostname, bearerToken);
    }
  } else {
    console.log('No valid user IDs found.');
  }

  rl.close();
};

main();