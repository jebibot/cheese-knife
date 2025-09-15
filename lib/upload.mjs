import fs from "node:fs";
import chromeWebstoreUpload from "chrome-webstore-upload";

const store = chromeWebstoreUpload({
  extensionId: process.env.EXTENSION_ID,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
});

const _headers = store._headers;
store._headers = (token) => ({
  ..._headers(token),
  "x-goog-upload-protocol": "raw",
  "x-goog-upload-file-name": "extension.crx",
});
const res = await store.uploadExisting(fs.createReadStream("dist.crx"));
store._headers = _headers;
console.log(res);

if (res.uploadState === "SUCCESS") {
  const res2 = await store.publish();
  console.log(res2);
}
