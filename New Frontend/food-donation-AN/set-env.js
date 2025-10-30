const fs = require('fs');
const path = require('path');

// --- Define all your Vercel variable names here ---
const varNames = [
  'API_URL',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_MEASUREMENT_ID',
  'FIREBASE_VAPID_KEY',
  // Add any other keys you need here
];

// Check if all variables are set
const unsetVars = varNames.filter((varName) => !process.env[varName]);

if (unsetVars.length > 0) {
  console.error(
    `Error: The following environment variables are not set: ${unsetVars.join(
      ', '
    )}`
  );
  process.exit(1);
}

// --- This is the template for your environment.prod.ts file ---
const envConfigFile = `
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: '${process.env.FIREBASE_API_KEY}',
    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}',
    projectId: '${process.env.FIREBASE_PROJECT_ID}',
    storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET}',
    messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID}',
    appId: '${process.env.FIREBASE_APP_ID}',
    measurementId: '${process.env.FIREBASE_MEASUREMENT_ID}',
    vapidKey: '${process.env.FIREBASE_VAPID_KEY}',
  },
  apiUrl: '${process.env.API_URL}',
};
`;
// --- End of template ---

const targetPath = path.join(
  __dirname,
  './src/environments/environment.prod.ts'
);

// Write the file
fs.writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.error(err);
    throw err;
  } else {
    console.log(
      `Successfully generated environment.prod.ts with all production keys.`
    );
  }
});