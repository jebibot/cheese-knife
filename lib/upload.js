import fs from "node:fs";
import chromeWebstoreUpload from "chrome-webstore-upload";

const store = chromeWebstoreUpload({
  extensionId: process.env.EXTENSION_ID,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
});

const res = await store.uploadExisting(fs.createReadStream("dist.crx"));
console.log(res);
if (res.uploadState === "SUCCESS") {
  const res2 = await store.publish();
  console.log(res2);
}
