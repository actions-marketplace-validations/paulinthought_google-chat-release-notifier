import * as github from '@actions/github';
import * as axios from 'axios';
import { Status } from './status';
import showdown from 'showdown';

const statusColorPalette: { [key in Status]: string } = {
  success: "#2cbe4e",
  cancelled: "#ffc107",
  failure: "#ff0000"
};

const statusText: { [key in Status]: string } = {
  success: "Succeeded",
  cancelled: "Cancelled",
  failure: "Failed"
};

const textButton = (text: string, url: string) => ({
  textButton: {
    text,
    onClick: { openLink: { url } }
  }
});

export async function notify(name: string, url: string, status: Status, info: string) {
  const { owner, repo } = github.context.repo;
  const { eventName, sha, ref } = github.context;
  const { number } = github.context.issue;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const eventPath = eventName === 'pull_request' ? `/pull/${number}` : `/commit/${sha}`;
  const eventUrl = `${repoUrl}${eventPath}`;
  const checksUrl = `${repoUrl}${eventPath}/checks`;
  
  showdown.setFlavor('github');
  const converter = new showdown.Converter();
  const infoHtml = converter.makeHtml(info);

  const htmlInfoOutput = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Release Info</title>
    <meta name="description" content="Release Info">
    <meta name="author" content="Loylap">
  </head>
  <body>
  <div>${infoHtml}</div>
  </body>
  </html>`;

  const body = {
    cards: [{
      sections: [
        {
          widgets: [{
            textParagraph: {
              text: `<b>${name} <font color="${statusColorPalette[status]}">${statusText[status]}</font></b>`
            }
          }]
        },
        {
          widgets: [
            {
              keyValue: {
                topLabel: "repository",
                content: `${owner}/${repo}`,
                contentMultiline: true,
                button: textButton("OPEN REPOSITORY", repoUrl)
              }
            },
            {
              keyValue: {
                topLabel: "event name",
                content: eventName,
                button: textButton("OPEN EVENT", eventUrl)
              }
            },
            {
              keyValue: { topLabel: "ref", content: ref }
            }
          ]
        },
        {
          widgets: [{
            buttons: [textButton("OPEN CHECKS", checksUrl)]
          }]
        }
      ]
    },
    {
      sections: [
        {
          widgets: [{
            textParagraph: {
              text: `${htmlInfoOutput.replace(/\r?\n|\r/g, "")}`
          }
          }]
        }]
    }]
  };

  console.log('created card', JSON.stringify(body))
  const response = await axios.default.post(url, body);
  if (response.status !== 200) {
    throw new Error(`Google Chat notification failed. response status=${response.status}. Status: ${response.statusText}`);
  }
}