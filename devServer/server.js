const FileSystem = require('fs');
const HTTP = require('http');
const ChildProcess = require('child_process');
const Path = require('path');

const utils = require('./utils');

const tsconfig = utils.readTsConfig();
const devBuildFolder = tsconfig.compilerOptions.outDir;
const styleFolder = '/style';

const port = process.env.PORT || 3000;
const folderBeingWatched = process.env.WATCH;

const httpServer = HTTP.createServer(requestListener);

let reloadTimeoutId;
let reloadPending = false;
let browserConnected = false;
let dispatchEvent = () => {};

httpServer.listen(port, () => {
    console.info(`Server is listening at http://localhost:${port}\n`);
    openBrowser();
});

if (folderBeingWatched) {
    watchFolder(folderBeingWatched, (changedFiles) => {
        console.info(`files changed:\n\t${Array.from(changedFiles.values()).join('\n\t')}`);

        if (!browserConnected) {
            return;
        }

        dispatchEvent('reload');
        changedFiles.clear();

        reloadTimeoutId = setTimeout(() => {
            console.info('pending reload');
            reloadPending = true;
        }, 250);
    });
}

function requestListener(incomingMessage, serverResponse) {
    switch (incomingMessage.url) {
        case '/sse':
            browserConnected = true;
            clearTimeout(reloadTimeoutId);
            initSSE(serverResponse);

            if (reloadPending) {
                reloadPending = false;
                dispatchEvent('reload');
            }
            return;
        case '/':
            serveIndexFile(serverResponse);
            return;
        default:
            serveFile(`.${incomingMessage.url}`, serverResponse);
    }
}

async function serveIndexFile(response) {
    const filePathsToRead = ['./index.html'];
    if (folderBeingWatched) {
        filePathsToRead.push(Path.join(__dirname, 'browserReloadListener.js'));
    }

    const [indexFile, browserReloadScript] = await Promise.all(filePathsToRead.map((path) => utils.readFile(path)));
    let fileContent = indexFile.toString();

    if (browserReloadScript) {
        const scriptToInject = `<body>\n\t<script>\n${browserReloadScript.toString()}\t</script>`;
        fileContent = fileContent.replace('<body>', scriptToInject);
    }
    fileContent = fileContent.replace('./build/', `./${devBuildFolder}/`);

    response.setHeader('Content-Type', 'text/html');
    response.end(fileContent);
}

async function serveFile(filePath, response) {
    let fileContent;

    try {
        const extension = filePath.split('.').pop();
        fileContent = await utils.readFile(filePath);
        response.setHeader('Content-Type', getContentTypeByExtension(extension));
    } catch (error) {
        console.error(`can not serve file: ${error.path}`);
    } finally {
        response.end(fileContent);
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
function initSSE(response) {
    console.info('initialize server-sent events');

    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');

    dispatchEvent = (event) => {
        console.info(`dispatch event: ${event}`);
        response.write(`data: ${event}\n\n`);
    };

    dispatchEvent('connected');
}

async function watchFolder(path, changeHandler) {
    const changedFiles = new Set();
    const delayedChangeHandler = utils.debounce(changeHandler, 100);
    const subFolders = await getFoldersRecursive(path);

    [path, ...subFolders].forEach((folderPath) => {
        FileSystem.watch(folderPath, (eventType, filename) => {
            changedFiles.add(`${folderPath}/${filename}`);
            delayedChangeHandler(changedFiles);
        });
    });

    console.info(`watching folder: ${path}\n`);
}

async function getFoldersRecursive(path, folders = []) {
    let dirEntries;

    try {
        dirEntries = await utils.readDirectory(path);
    } catch (error) {
        console.error(error);
    }

    const folderPaths = dirEntries
        .filter((dirEntry) => dirEntry.isDirectory())
        .map((dirEntry) => `${path}/${dirEntry.name}`);

    for (const folderPath of folderPaths) {
        folders.push(folderPath);
        await getFoldersRecursive(folderPath, folders);
    }

    return folders;
}

function getContentTypeByExtension(fileExtension) {
    switch (fileExtension) {
        case 'css':
            return 'text/css';
        case 'html':
            return 'text/html';
        case 'js':
            return 'application/javascript';
        case 'json':
            return 'application/json';
        default:
            return 'text/plain';
    }
}

function openBrowser(browser = 'firefox') {
    const isWindows = process.platform.includes('win');
    const browserPaths = {
        firefox: isWindows ? Path.join('C:', 'Program Files', 'Mozilla Firefox', 'firefox.exe') : 'firefox',
    };

    console.info('Opening browser');

    const childProcess = ChildProcess.spawn(browserPaths[browser], [`http://localhost:${port}/`]);
    childProcess.on('error', (e) => {
        console.error(`spawning process: "${e.path}" is failed with code: "${e.code}"`);
    });
    childProcess.unref();
}
