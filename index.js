const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

const LANG_KEYS = [
    "af","ak","sq","am","ar","an","hy","as","av","ae","ay","az","bm","ba","eu","be","bn","bh","bi","bs","br","bg","my","ca","ch","ce","ny","zh","cv","kw","co","cr","hr","cs","da","dv","nl","dz","en","eo","et","ee","fo","fj","fi","fr","ff","gl","ka","de","el","gn","gu","ht","ha","he","hz","hi","ho","hu","ia","id","ie","ga","ig","ik","io","is","it","iu","ja","jv","kl","kn","kr","ks","kk","km","ki","rw","ky","kv","kg","ko","ku","kj","la","lb","lg","li","ln","lo","lt","lu","lv","gv","mk","mg","ms","ml","mt","mi","mr","mh","mn","na","nv","nd","ne","ng","nb","nn","no","ii","nr","oc","oj","cu","om","or","os","pa","pi","fa","pl","ps","pt","qu","rm","rn","ro","ru","sa","sc","sd","se","sm","sg","sr","gd","sn","si","sk","sl","so","st","es","su","sw","ss","sv","ta","te","tg","th","ti","bo","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur","uz","ve","vi","vo","wa","cy","wo","fy","xh","yi","yo","za","zu"
]

async function run() {
    try {
        const githubToken = core.getInput('github_access_token', { required: true });
        const qontractToken = core.getInput('qontract_access_token', { required: true });
        const baseBranch = core.getInput('base_branch', { required: true });
        const baseLanguageKey = core.getInput('base_language_key', { required: true });

        if (!LANG_KEYS.includes(baseLanguageKey)) {
            core.setFailed(`Invalid base language key: ${baseLanguageKey}. Valid keys are: ${LANG_KEYS.join(', ')}`);
            return;
        }

        const octokit = github.getOctokit(githubToken);
        
        const repo = await octokit.request('GET /repos/{owner}/{repo}', {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        const baseFile = await getBaseFile(baseBranch, octokit);

        if (!baseFile) {
            core.setFailed("Failed to get config file from " + baseBranch + " branch");
            return;
        }

        const fileContent = Buffer.from(baseFile.content, 'base64').toString('utf-8');
        const fileJson = JSON.parse(fileContent);

        const watchedFile = fileJson.base_file;

        if (!watchedFile) {
            core.setFailed("Failed to get base file from config file. Make sure it has the 'base_file' key.");
            return;
        }

        const commit = await octokit.request('GET /repos/{owner}/{repo}/commits/{sha}', {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            sha: github.context.sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        const modifiedFiles = commit.data.files.filter(file => file.status === 'modified');

        if(modifiedFiles.length === 0 || !modifiedFiles.some(file => file.filename === watchedFile)) {
            console.log("No modified files or base file not modified. Skipping Qontract call...");
            return;
        }
        const sourceBranch = await baseBranchRef(baseBranch, octokit);

        if (!sourceBranch) {
            core.setFailed("Failed to get base branch ref for " + baseBranch + " Make sure the branch exists on remote repository.");
            return;
        }

        const qontractPayload = {
            "repository": {
                "id": repo.data.id.toString(),
                "name": repo.data.name,
                "url": repo.data.html_url
            },
            "base_branch": sourceBranch,
            "head_commit": {
                "modified": modifiedFiles.map(file => file.filename),
            },
            "github_actions": {
                "access_token": githubToken,
                "qontract_access_token": qontractToken,
                "source_branch": github.context.ref
            },
            "base_language_key": baseLanguageKey
        }
        const qontractApiUrl = `https://api.qontract.org/integrations/github-actions/webhook`;

        const headers = {
            'Content-Type': 'application/json',
            "X-GitHub-Event": "github-actions"
        }

        console.log(qontractPayload)
        
        await axios.post(qontractApiUrl, qontractPayload, { headers }).catch(error => {
            console.error(error.response.data);
            return;
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function getBaseFile(baseBranch, octokit) {
    try {
    const baseFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: baseBranch,
        path: `qconfig.json`,
        });
        return baseFile.data;
    } catch (error) {
        return null;
    }
}

async function baseBranchRef(baseBranch, octokit) {
    try {
        const baseBranchRef = await octokit.rest.git.getRef({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            ref: `heads/${baseBranch}`,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        return baseBranchRef.data.ref;
    } catch (error) {
        return null;
    }
}

run();
