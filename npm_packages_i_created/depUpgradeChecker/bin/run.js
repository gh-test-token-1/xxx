#!/usr/bin/env node


const fs = require( 'fs' );
const path = require( 'path' );
const glob = require( 'glob' );
const depCheck = require( 'depcheck' );
const chalk = require( 'chalk' );
const core = require('@actions/core');
const shell = require('shelljs');
const { exec } = require('child_process')

function mergeLists(list1, list2) {
  if (!list1 && !list2) {
    return [];
  } else if (!list1) {
    return list2;
  } else if (!list2) {
    return list1;
  } else {
    return list1.concat(list2)
  }
}

function mergeObjects(obj1, obj2) {
  return Object.assign({}, obj1, obj2);
}

function findChangedDependencies(previousDeps, currentDeps) {
  const changedDependencies = [];

  for (const dependency in previousDeps) {
    if (
      currentDeps.hasOwnProperty(dependency) &&
      previousDeps[dependency] !== currentDeps[dependency]
    ) {
      changedDependencies.push({
        dependency,
        previousVersion: previousDeps[dependency],
        currentVersion: currentDeps[dependency]
      });
    }
  }

  return changedDependencies;
}

async function runBuild() {
  // Execute your Python script here
  const cwd = process.cwd();
  const packageJson = require( path.join( cwd, 'package.json' ) );
  const nonExistingCSSFiles = [];

  const depCheckOptions = {
    ignoreDirs: [ 'docs', 'build' ],
    ignoreMatches: [ 'eslint', 'eslint-plugin-ckeditor5-rules', 'husky', 'lint-staged', 'webpack-cli' ]
  };

  if ( Array.isArray( packageJson.depcheckIgnore ) ) {
    depCheckOptions.ignoreMatches.push( ...packageJson.depcheckIgnore );
  }

  console.log( 'Checking dependencies...' );

  depCheck( cwd, depCheckOptions )
    .then( unused => {

      const unusedDependencies = mergeLists(unused.dependencies, unused.devDependencies)

      const gitDiffCommand = 'git diff --name-only HEAD^..HEAD';

      exec(gitDiffCommand, { cwd: cwd }, (error, stdout, stderr) => {
      
        const changedFiles = stdout.split('\n').filter(Boolean);

        var one_dep_upgrade = false
        const contains_pkg_json = changedFiles.indexOf("package.json") !== -1
        const contains_pkg_loc_json = changedFiles.indexOf("package-lock.json") !== -1
        if (contains_pkg_json & contains_pkg_loc_json & changedFiles.length==2 ){
          one_dep_upgrade = true
        } else if (contains_pkg_json & changedFiles.length==1){
          one_dep_upgrade = true
        }

        var result = 0

        const gitRevSha = "git log -n 1 --format=\"%P\"";
        exec(gitRevSha, { cwd: cwd }, (error, stdout2, stderr) => {

          const parent_sha = stdout2.replace("\n", "")
          console.log("parent_sha",parent_sha)

          const gitCurrentSha = "git log -n 1 --format=\"%H\"";
          exec(gitCurrentSha, { cwd: cwd }, (error, stdout22, stderr) => {
  
            const current_sha = stdout22.replace("\n", "")
            console.log("current_sha",current_sha)

            const gitShow = "git show "+parent_sha+":package.json";
            console.log(gitShow)
            exec(gitShow, { cwd: cwd }, (error, stdout3, stderr) => {
              console.log("stdout3",stdout3)
              console.log("stderr",stderr)
              stdout3 = JSON.parse(stdout3)
              console.log("stdout3",stdout3)

              const gitShowCurrent = "git show "+current_sha+":package.json";
              console.log(gitShowCurrent)
              exec(gitShowCurrent, { cwd: cwd }, (error, stdout33, stderr) => {

                stdout33 = JSON.parse(stdout33)
                console.log("stdout33",stdout33)

                parent_dependencies = mergeObjects(
                  stdout3['devDependencies'],stdout3['dependencies']
                )

                console.log("parent_dependencies",parent_dependencies)

                current_dependencies = mergeObjects(
                  stdout33['devDependencies'],stdout33['dependencies']
                )

                console.log("current_dependencies",current_dependencies)

                const changedDependencies = findChangedDependencies(parent_dependencies,current_dependencies)
                console.log("changedDependencies",changedDependencies)
                console.log("unusedDependencies",unusedDependencies)

                if (changedDependencies.length == 1){
                  const changedDependency = changedDependencies[0]['dependency']
                  const isChangedDependencyUnused = unusedDependencies.includes(changedDependency);
                  if (isChangedDependencyUnused){
                    result = 1
                  }
                }

                if (result== 0) {
                  console.log('Build succeeded!');
                } else if (result == 1) {
                  console.log('Build failed. Generating log...');
                  // Logic to generate the log (e.g., writing to a file or sending an alert)
                  core.setFailed('Build failed.');
                } else {
                  console.log('Unknown error occurred during the build.');
                  core.setFailed('Unknown error occurred during the build.');
                }


              })

    

            })

          })
        })




      });   
      
      

    } ); 


}

runBuild();