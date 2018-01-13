#!/usr/bin/env node
var ncp = require('ncp').ncp;
var fs = require('fs');
var execSync = require('child_process').execSync;
var rimraf = require('rimraf');
var ghpages = require('gh-pages');
var path = require('path');
var packageJson = require('../../package.json');
var repository = packageJson['homepage'] || null;
var isWin = require('os').platform().indexOf('win') === 0;

async function pushToGhPages () {
    await ghpages.publish('docs', {
        branch: 'master',
        dest: 'docs',
        repo: repository + '.git'
    },
    function (err) {
        if (err) {
            console.log('Push to remote failed, please double check that the homepage field in your package.json links to the correct repository.')
            console.log('The build has completed but has not been pushed to github.')
        } else {
            console.log('Finished! production build is ready for gh-pages');
            console.log('Pushed to gh-pages branch')
        }
    });
}

async function copy404 () {
    await ncp('404.html', 'docs/404.html', function (err) {
        if (err) {
            console.error(err);
        }
    });
}

async function copyCNAME () {
    await ncp('CNAME', 'docs/CNAME', function (err) {
        if (err) {
            console.error(err);
        }
    });
}


async function editForProduction () {
    console.log('Preparing files for github pages');

    await fs.readFile('docs/index.html', 'utf-8', async (err, data) => {
        if (err) throw err;

        var newValue = data.replace(/src=\//g, 'src=');

        await fs.writeFile('docs/index.html', newValue, 'utf-8', async (err) => {
            if (err) throw err;
            await fs.readFile('docs/index.html', 'utf-8', async (err, data) => {
                if (err) throw err;
                var newValue2 = data.replace(/href=\//, 'href=');
                await fs.writeFile('docs/index.html', newValue2, 'utf-8', async (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
            });
        });
    });
}

function checkIfYarn () {
    return fs.existsSync(path.resolve('./' || process.cwd(), 'yarn.lock'));
}

async function runBuild () {
    // Create development build
    console.log('Creating production build...');

    const packageManagerName = await checkIfYarn() ? 'yarn' : 'npm';

    execSync(`${packageManagerName} run build`);
    ncp.limit = 16;

    await ncp('dist', 'docs', async (err) => {
        if (err) {
            return console.error(err);
        }
        console.log('Build Complete.');
        const pathToBuild = 'dist';
        var removeDist = 'rm -r ' + pathToBuild;
        if (isWin) {
            removeDist = 'rd /s /q "' + pathToBuild + '"';
        }
        execSync(removeDist);
        if (err) {
            console.error(err)
        } else {
            if (fs.existsSync('CNAME')) {
                await copyCNAME();
            }
            if (fs.existsSync('404.html')) {
                await copy404();
            }
            await editForProduction();
            if (repository !== null) {
                pushToGhPages();
            }
        }
    });
}

async function removeDocsFolder () {
    if (fs.existsSync('docs')) {
        var pathToDocs = 'docs';
        await rimraf(pathToDocs, () => { return 0; });
    }
}

async function main () {
    await removeDocsFolder();
    await runBuild();
}

main();
