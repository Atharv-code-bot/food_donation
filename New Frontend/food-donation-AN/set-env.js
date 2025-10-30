const fs = require('fs');
const path = require('path');

// Get the API URL from Vercel's environment variables
const apiUrl = process.env.API_URL;

if (!apiUrl) {
  console.error('Error: API_URL environment variable is not set.');
  process.exit(1); // Exit with an error code
}

const targetPath = path.join(__dirname, './src/environments/environment.prod.ts');

// This is the content that will be written to the file
const envConfigFile = `
export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

fs.writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.error(err);
    throw err;
  } else {
    console.log(`Successfully generated environment.prod.ts with API_URL: ${apiUrl}`);
  }
});