// index.js
const core = require('@actions/core');
const shell = require('shelljs');

async function runBuild() {
  // Execute your Python script here
  const result = shell.exec('python my_file.py');

  if (result.code === 0) { 
    console.log('Build succeeded!');
  } else if (result.code === 1) {
    console.log('Build failed. Generating log...');
    // Logic to generate the log (e.g., writing to a file or sending an alert)
    core.setFailed('Build failed.');
  } else {
    console.log('Unknown error occurred during the build.');
    core.setFailed('Unknown error occurred during the build.');
  }
}

runBuild();
