const core = require('@actions/core');
const github = require('@actions/github');


github_token = core.getInput('github_access_token');
qontract_token = core.getInput('qontract_access_token');
test = core.getInput('test');

console.log(github.context);