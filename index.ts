import * as core from '@actions/core';
import * as github from '@actions/github';
import Testrail, { INewTestRun } from 'testrail-api';
import { PullRequestOpenedEvent } from '@octokit/webhooks-types';
import { stringify } from 'yaml';

const { getInput, setOutput, setFailed, debug } = core;
const { context, getOctokit } = github;

run();
async function run() {
  try {
    // Get the JSON webhook payload for the event that triggered the workflow
    const {
      number: prNumber,
      pull_request,
      repository,
    } = context.payload as PullRequestOpenedEvent;
    const {
      owner: { login },
      name,
    } = repository;
    const { title: prTitle } = pull_request;

    const octokit = getOctokit(getInput('github_token')).rest;

    const host = getInput('testrail_URL');
    const password = getInput('testrail_token');
    const user = getInput('testrail_user');
    const testrail = new Testrail({ host, password, user });

    const testrailSuite = parseInt(getInput('testrail_suite'));
    const testrailProject = parseInt(getInput('testrail_project'));

    const project = (await testrail.getProject(testrailProject)).body;
    console.log(project);

    const suite = (await testrail.getSuite(testrailSuite)).body;
    console.log(suite);

    const pullrequestComment = `This comment was auto-generated and contains information used by the TestRail/GitHub integration\nDO NOT EDIT.`;
    const pullrequestData = {
      testrailHost: host,
      testProject: project.name,
      testSuite: suite.name,
      repoOwner: login,
      repoName: name,
      pullrequest: prNumber,
      pullrequestTitle: prTitle,
    };
    const body = `${pullrequestComment}\n...\n${stringify(pullrequestData)}`;
    console.log(body);

    octokit.issues.createComment()

    const testrunDescription = `This testrun was auto-generated for a GitHub pull request. Please add test cases and run as needed. Click the "Push Results" button to send the test results to Github.\n\n##### DO NOT EDIT DESCRIPTION BELOW THIS LINE ######`;
    const testrunData = {
      testrailHost: host,
      testProject: project.name,
      testSuite: suite.name,
      repoOwner: login,
      repoName: name,
      pullrequest: prNumber,
      pullrequestTitle: prTitle,
    };
    const description = `${pullrequestComment}\n...\n${stringify(pullrequestData)}`;

    const testrunRequest = {
      suite_id: suite.id,
      name: `PR${prNumber}: ${prTitle}`,
      include_all: false,
      case_ids: [],
      refs: [prNumber],
      description
    };

    const testrun = await testrail.addRun(project.id, testrunRequest);
    console.log(testrun);
    
    const time = new Date().toTimeString();
    setOutput('testrun_URL', time);
    setOutput('testrun_ID', Math.random() * 100);
  } catch (error) {
    setFailed(error.message);
  }
}
