const markdown = `[![slack - Slack - standups - Dashcam](https://replayable-api-production.herokuapp.com/replay/65d5543860e6e600640d2757/gif?shareKey=UQqPY2VywrcFPLZXSRsWaA)](https://app.dashcam.io/replay/65d5543860e6e600640d2757?share=UQqPY2VywrcFPLZXSRsWaA)`;

const regex = /\[!\[.*?\]\(.*?\)\]\((.*?)\)/;
const match = markdown.match(regex);

if (match) {
  console.log(match);
  console.log(match[1]); // This will log the URL you're looking for
} else {
  console.log("No URL found");
}
